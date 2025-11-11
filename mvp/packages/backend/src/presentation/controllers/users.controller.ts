import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UpdateUserProfileUseCase } from '../../application/use-cases/user/update-user-profile.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import { CurrentUser } from '../../infrastructure/auth/decorators/current-user.decorator';
import { User } from '../../domain/entities/user.entity';
import { Guard } from '../../domain/entities/guard.entity';
import {
  GetUserProfileResponseDto,
  UpdateUserProfileDto,
  UpdateUserProfileResponseDto,
} from '../../application/dtos/user.dto';

/**
 * Users Controller
 * Handles user profile operations
 * All routes require authentication
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
  ) {}

  /**
   * Get current user profile
   * GET /users/profile
   *
   * Returns the authenticated user's profile information
   */
  @Get('profile')
  async getProfile(
    @CurrentUser() user: User,
  ): Promise<GetUserProfileResponseDto> {
    const profile: GetUserProfileResponseDto = {
      id: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      fullName: user.getFullName(),
      phone: user.getPhone(),
      status: user.getStatus(),
      createdAt: user.getCreatedAt(),
    };

    // Add guard-specific fields if user is a guard
    if (user instanceof Guard) {
      profile.licenseNumber = user.getLicenseNumber();
      profile.hourlyRate = user.getHourlyRate().getAmount();
      profile.rating = user.getRating();
      profile.isAvailable = user.getIsAvailable();

      const currentLocation = user.getCurrentLocation();
      if (currentLocation) {
        profile.currentLatitude = currentLocation.getLatitude();
        profile.currentLongitude = currentLocation.getLongitude();
      }
    }

    return profile;
  }

  /**
   * Update user profile
   * PATCH /users/profile
   *
   * Updates the authenticated user's profile information
   * Customers can update: fullName, phone
   * Guards can additionally update: isAvailable, hourlyRate
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<UpdateUserProfileResponseDto> {
    return this.updateUserProfileUseCase.execute(user.getId(), dto);
  }
}
