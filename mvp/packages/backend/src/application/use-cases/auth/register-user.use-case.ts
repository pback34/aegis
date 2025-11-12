import { Injectable, ConflictException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUserRepository } from '../../ports/user.repository.interface';
import { Customer } from '../../../domain/entities/customer.entity';
import { Guard } from '../../../domain/entities/guard.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { RegisterUserDto, RegisterUserResponseDto } from '../../dtos/auth.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: RegisterUserDto): Promise<RegisterUserResponseDto> {
    // Validate email format
    const email = new Email(dto.email);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user entity based on role
    let user;
    if (dto.role === UserRole.CUSTOMER) {
      user = new Customer({
        id: UserId.create(),
        email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (dto.role === UserRole.GUARD) {
      // For guards, require license number and hourly rate
      if (!dto.licenseNumber || !dto.hourlyRate) {
        throw new Error('Guards must provide license number and hourly rate');
      }

      user = new Guard({
        id: UserId.create(),
        email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
        licenseNumber: dto.licenseNumber,
        hourlyRate: new Money(dto.hourlyRate),
        rating: 5.0, // Default rating
        isAvailable: false, // Default to not available
        currentLocation: new GeoLocation(0, 0), // Default location, will be updated
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      throw new Error('Invalid user role');
    }

    // Save user
    const savedUser = await this.userRepository.save(user);

    // Return response
    return {
      id: savedUser.getId().getValue(),
      email: savedUser.getEmail().getValue(),
      role: savedUser.getRole(),
      fullName: savedUser.getFullName(),
      phone: savedUser.getPhone(),
      createdAt: savedUser.getCreatedAt(),
    };
  }
}
