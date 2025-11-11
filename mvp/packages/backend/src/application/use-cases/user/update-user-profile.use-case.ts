import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUserRepository } from '../../ports/user.repository.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { UpdateUserProfileDto, UpdateUserProfileResponseDto } from '../../dtos/user.dto';
import { Guard } from '../../../domain/entities/guard.entity';
import { Money } from '../../../domain/value-objects/money.value-object';

/**
 * Update User Profile Use Case
 * Handles updating user profile information (fullName, phone)
 * Also handles guard-specific updates (isAvailable, hourlyRate)
 */
@Injectable()
export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    userId: UserId,
    dto: UpdateUserProfileDto,
  ): Promise<UpdateUserProfileResponseDto> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update base profile fields
    if (dto.fullName !== undefined || dto.phone !== undefined) {
      user.updateProfile(
        dto.fullName || user.getFullName(),
        dto.phone !== undefined ? dto.phone : user.getPhone(),
      );
    }

    // Handle guard-specific updates
    if (user instanceof Guard) {
      if (dto.isAvailable !== undefined) {
        user.setAvailable(dto.isAvailable);
      }
      if (dto.hourlyRate !== undefined) {
        user.updateHourlyRate(new Money(dto.hourlyRate));
      }
    } else {
      // Non-guards can't update guard-specific fields
      if (dto.isAvailable !== undefined || dto.hourlyRate !== undefined) {
        throw new BadRequestException(
          'Cannot update guard-specific fields for non-guard users',
        );
      }
    }

    // Save updated user
    await this.userRepository.save(user);

    return {
      id: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      fullName: user.getFullName(),
      phone: user.getPhone(),
      updatedAt: user.getUpdatedAt(),
    };
  }
}
