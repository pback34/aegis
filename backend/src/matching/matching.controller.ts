import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { FindGuardsDto, RequestGuardDto } from './dto/match-request.dto';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * POST /api/v1/matching/find-guards
   * Find available guards matching criteria
   */
  @Post('find-guards')
  @HttpCode(HttpStatus.OK)
  async findGuards(@Body() dto: FindGuardsDto) {
    return this.matchingService.findGuards(dto);
  }

  /**
   * POST /api/v1/matching/request-guard
   * Request a specific guard for a booking
   */
  @Post('request-guard')
  @HttpCode(HttpStatus.OK)
  async requestGuard(@Body() dto: RequestGuardDto) {
    return this.matchingService.requestGuard(dto.bookingId, dto.guardId);
  }

  /**
   * GET /api/v1/matching/available-count
   * Get count of available guards in area
   */
  @Get('available-count')
  async getAvailableCount(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 10;

    return this.matchingService.getAvailableCount(latitude, longitude, radiusKm);
  }
}
