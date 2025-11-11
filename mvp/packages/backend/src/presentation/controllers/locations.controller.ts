import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UpdateLocationUseCase } from '../../application/use-cases/location/update-location.use-case';
import { GetCurrentLocationUseCase } from '../../application/use-cases/location/get-current-location.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../infrastructure/auth/decorators/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/decorators/current-user.decorator';
import { Public } from '../../infrastructure/auth/decorators/public.decorator';
import { User } from '../../domain/entities/user.entity';
import {
  UpdateLocationDto,
  UpdateLocationResponseDto,
  GetCurrentLocationResponseDto,
  GetMapConfigResponseDto,
} from '../../application/dtos/location.dto';

/**
 * Location Controller
 * Handles location updates, queries, and map configuration
 */
@Controller()
export class LocationsController {
  constructor(
    private readonly updateLocationUseCase: UpdateLocationUseCase,
    private readonly getCurrentLocationUseCase: GetCurrentLocationUseCase,
  ) {}

  /**
   * Get Mapbox configuration (public endpoint)
   * GET /map/config
   */
  @Public()
  @Get('map/config')
  async getMapConfig(): Promise<GetMapConfigResponseDto> {
    return {
      mapboxToken: process.env.MAPBOX_TOKEN || '',
      mapboxStyle: process.env.MAPBOX_STYLE || 'mapbox://styles/mapbox/streets-v11',
      defaultCenter: {
        lat: parseFloat(process.env.DEFAULT_MAP_CENTER_LAT || '37.7749'),
        lng: parseFloat(process.env.DEFAULT_MAP_CENTER_LNG || '-122.4194'),
      },
      defaultZoom: parseInt(process.env.DEFAULT_MAP_ZOOM || '12', 10),
    };
  }

  /**
   * Update guard location for a job (guard only)
   * POST /jobs/:id/location
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('guard')
  @Post('jobs/:id/location')
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @CurrentUser() user: User,
    @Param('id') bookingId: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<UpdateLocationResponseDto> {
    const guardId = user.getId().getValue();
    return this.updateLocationUseCase.execute(guardId, bookingId, dto);
  }

  /**
   * Get current guard location for a job
   * GET /jobs/:id/location
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('jobs/:id/location')
  async getCurrentLocation(
    @Param('id') bookingId: string,
  ): Promise<GetCurrentLocationResponseDto> {
    return this.getCurrentLocationUseCase.execute(bookingId);
  }
}
