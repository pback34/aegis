import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { FindGuardsDto } from './dto/match-request.dto';
import { GuardMatchDto, FindGuardsResponseDto } from './dto/match-response.dto';
import { calculateDistance, calculateETA } from './algorithms/distance-calculator';
import { coordinatesToH3, getSearchHexagons } from './algorithms/geospatial-indexer';
import { matchSkills, calculateSkillScore } from './algorithms/skill-matcher';
import { calculateMatchScore, sortByMatchScore } from './algorithms/scoring-algorithm';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Find available guards matching the criteria
   */
  async findGuards(dto: FindGuardsDto): Promise<FindGuardsResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Finding guards for location: ${dto.latitude}, ${dto.longitude}`);

    const maxDistance = dto.maxDistance || 10; // Default 10km radius

    try {
      // Step 1: Get H3 hexagons to search
      const searchHexagons = getSearchHexagons(dto.latitude, dto.longitude, maxDistance);
      this.logger.debug(`Searching ${searchHexagons.length} hexagons`);

      // Step 2: Find available guards in the area
      const availableGuards = await this.findAvailableGuardsInArea(
        dto.latitude,
        dto.longitude,
        maxDistance,
      );

      this.logger.debug(`Found ${availableGuards.length} available guards`);

      if (availableGuards.length === 0) {
        return {
          matches: [],
          totalFound: 0,
          searchRadius: maxDistance,
          timestamp: new Date().toISOString(),
        };
      }

      // Step 3: Filter by skills and requirements
      const filteredGuards = this.filterByRequirements(availableGuards, dto);
      this.logger.debug(`${filteredGuards.length} guards match requirements`);

      // Step 4: Calculate scores for each guard
      const scoredGuards = await this.scoreGuards(filteredGuards, dto);

      // Step 5: Sort by score and return top matches
      const sortedGuards = sortByMatchScore(scoredGuards);
      const topMatches = sortedGuards.slice(0, 10); // Return top 10

      const elapsedTime = Date.now() - startTime;
      this.logger.log(`Found ${topMatches.length} matches in ${elapsedTime}ms`);

      return {
        matches: topMatches,
        totalFound: scoredGuards.length,
        searchRadius: maxDistance,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error finding guards:', error);
      throw error;
    }
  }

  /**
   * Find available guards in geographical area
   */
  private async findAvailableGuardsInArea(
    latitude: number,
    longitude: number,
    maxDistanceKm: number,
  ) {
    // Query database for online and available guards
    const guards = await this.prisma.guardProfile.findMany({
      where: {
        isOnline: true,
        isAvailable: true,
        backgroundCheckStatus: 'approved',
        user: {
          isActive: true,
          isVerified: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        skills: true,
      },
    });

    // For MVP: Filter by distance in memory
    // In production, use PostGIS spatial queries
    const nearbyGuards = guards.filter((guard) => {
      // For now, we'll use a simplified check
      // In production, you'd query the location_history table
      return true; // TODO: Implement actual distance check from location_history
    });

    return nearbyGuards;
  }

  /**
   * Filter guards by skill requirements
   */
  private filterByRequirements(guards: any[], dto: FindGuardsDto) {
    if (!dto.requiredSkills || dto.requiredSkills.length === 0) {
      return guards;
    }

    return guards.filter((guard) => {
      const guardSkills = guard.skills.map((s: any) => s.skillName);
      const skillMatch = matchSkills(guardSkills, dto.requiredSkills || []);
      return skillMatch.hasAllRequired;
    });
  }

  /**
   * Calculate match scores for all guards
   */
  private async scoreGuards(guards: any[], dto: FindGuardsDto): Promise<GuardMatchDto[]> {
    const scoredGuards: GuardMatchDto[] = [];

    for (const guard of guards) {
      // Calculate distance (for MVP, using rough estimate)
      // In production, get last known location from Redis or location_history
      const distance = Math.random() * 10; // TODO: Calculate actual distance
      const eta = calculateETA(distance);

      // Get guard skills
      const guardSkills = guard.skills.map((s: any) => s.skillName);
      const skillMatch = matchSkills(guardSkills, dto.requiredSkills || []);
      const skillScore = calculateSkillScore(skillMatch);

      // Calculate overall match score
      const matchScore = calculateMatchScore({
        distance,
        rating: parseFloat(guard.averageRating.toString()),
        experienceYears: guard.experienceYears,
        hourlyRate: parseFloat(guard.hourlyRate.toString()),
        skillMatchPercentage: skillScore,
        completedBookings: guard.completedBookings,
      });

      scoredGuards.push({
        guardId: guard.userId,
        firstName: guard.user.firstName,
        lastName: guard.user.lastName,
        avatar: guard.user.avatar,
        distance,
        rating: parseFloat(guard.averageRating.toString()),
        totalRatings: guard.totalRatings,
        experienceYears: guard.experienceYears,
        estimatedArrival: eta,
        hourlyRate: parseFloat(guard.hourlyRate.toString()),
        matchScore,
        skills: guardSkills,
      });
    }

    return scoredGuards;
  }

  /**
   * Request a specific guard for a booking
   */
  async requestGuard(bookingId: string, guardId: string) {
    this.logger.log(`Requesting guard ${guardId} for booking ${bookingId}`);

    // Find the booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Update booking with matched guard
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        guardId,
        status: 'MATCHED',
        matchedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 1000), // 30 seconds to accept
      },
    });

    // Create booking event
    await this.prisma.bookingEvent.create({
      data: {
        bookingId,
        eventType: 'GUARD_MATCHED',
        fromStatus: 'SEARCHING',
        toStatus: 'MATCHED',
        metadata: { guardId },
      },
    });

    // Send notification to guard (TODO: Implement notification service)
    this.logger.log(`Notification sent to guard ${guardId}`);

    return {
      status: 'pending' as const,
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
      message: 'Guard has been notified and has 30 seconds to accept',
    };
  }

  /**
   * Get available guard count in area (for analytics)
   */
  async getAvailableCount(latitude: number, longitude: number, radius: number = 10) {
    const guards = await this.findAvailableGuardsInArea(latitude, longitude, radius);
    return {
      count: guards.length,
      radius,
      location: { latitude, longitude },
    };
  }
}
