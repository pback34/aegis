import { Guard } from '../entities/guard.entity';
import { GeoLocation } from '../value-objects';

export interface GuardMatch {
  guard: Guard;
  distance: number; // in kilometers
}

export class SimpleMatchingService {
  /**
   * Find the nearest available guard to a service location
   * @param availableGuards List of available guards
   * @param serviceLocation The location where service is needed
   * @param maxDistance Maximum distance in kilometers (default: 50km)
   * @returns The matched guard and distance, or null if no match found
   */
  findNearestGuard(
    availableGuards: Guard[],
    serviceLocation: GeoLocation,
    maxDistance: number = 50,
  ): GuardMatch | null {
    if (availableGuards.length === 0) {
      return null;
    }

    // Filter guards that can accept bookings and have a recent location
    const eligibleGuards = availableGuards.filter(
      (guard) => guard.canAcceptBooking() && guard.getCurrentLocation() !== undefined,
    );

    if (eligibleGuards.length === 0) {
      return null;
    }

    // Calculate distances and find the nearest guard
    const guardsWithDistance: GuardMatch[] = eligibleGuards
      .map((guard) => {
        const guardLocation = guard.getCurrentLocation()!;
        const distance = serviceLocation.distanceTo(guardLocation);
        return { guard, distance };
      })
      .filter((match) => match.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    if (guardsWithDistance.length === 0) {
      return null;
    }

    return guardsWithDistance[0];
  }

  /**
   * Find top N nearest guards to a service location
   * @param availableGuards List of available guards
   * @param serviceLocation The location where service is needed
   * @param count Number of guards to return
   * @param maxDistance Maximum distance in kilometers (default: 50km)
   * @returns Array of matched guards with distances
   */
  findNearestGuards(
    availableGuards: Guard[],
    serviceLocation: GeoLocation,
    count: number,
    maxDistance: number = 50,
  ): GuardMatch[] {
    if (availableGuards.length === 0 || count <= 0) {
      return [];
    }

    // Filter guards that can accept bookings and have a recent location
    const eligibleGuards = availableGuards.filter(
      (guard) => guard.canAcceptBooking() && guard.getCurrentLocation() !== undefined,
    );

    if (eligibleGuards.length === 0) {
      return [];
    }

    // Calculate distances and sort by distance
    const guardsWithDistance: GuardMatch[] = eligibleGuards
      .map((guard) => {
        const guardLocation = guard.getCurrentLocation()!;
        const distance = serviceLocation.distanceTo(guardLocation);
        return { guard, distance };
      })
      .filter((match) => match.distance <= maxDistance)
      .sort((a, b) => {
        // Sort by distance first, then by rating if distance is equal
        if (Math.abs(a.distance - b.distance) < 0.1) {
          return b.guard.getRating() - a.guard.getRating();
        }
        return a.distance - b.distance;
      })
      .slice(0, count);

    return guardsWithDistance;
  }

  /**
   * Find best guard considering both distance and rating
   * @param availableGuards List of available guards
   * @param serviceLocation The location where service is needed
   * @param maxDistance Maximum distance in kilometers (default: 50km)
   * @param distanceWeight Weight for distance (0-1, default: 0.7)
   * @returns The best matched guard, or null if no match found
   */
  findBestGuard(
    availableGuards: Guard[],
    serviceLocation: GeoLocation,
    maxDistance: number = 50,
    distanceWeight: number = 0.7,
  ): GuardMatch | null {
    if (distanceWeight < 0 || distanceWeight > 1) {
      throw new Error('Distance weight must be between 0 and 1');
    }

    const eligibleGuards = availableGuards.filter(
      (guard) => guard.canAcceptBooking() && guard.getCurrentLocation() !== undefined,
    );

    if (eligibleGuards.length === 0) {
      return null;
    }

    const ratingWeight = 1 - distanceWeight;

    // Calculate scores for each guard
    const guardsWithScores = eligibleGuards
      .map((guard) => {
        const guardLocation = guard.getCurrentLocation()!;
        const distance = serviceLocation.distanceTo(guardLocation);

        if (distance > maxDistance) {
          return null;
        }

        // Normalize distance (0-1, where 1 is best/closest)
        const normalizedDistance = 1 - Math.min(distance / maxDistance, 1);

        // Normalize rating (0-1, where 1 is best)
        const normalizedRating = guard.getRating() / 5;

        // Calculate weighted score
        const score = distanceWeight * normalizedDistance + ratingWeight * normalizedRating;

        return { guard, distance, score };
      })
      .filter((match) => match !== null)
      .sort((a, b) => b!.score - a!.score);

    if (guardsWithScores.length === 0) {
      return null;
    }

    const best = guardsWithScores[0]!;
    return { guard: best.guard, distance: best.distance };
  }
}
