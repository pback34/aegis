import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUserRepository } from '../../ports/user.repository.interface';
import { Email } from '../../../domain/value-objects/email.value-object';
import { User } from '../../../domain/entities/user.entity';
import { LoginUserDto } from '../../dtos/auth.dto';

/**
 * Login User Use Case
 * Handles user authentication (credential validation)
 * Token generation is handled by the AuthService in the presentation layer
 */
@Injectable()
export class LoginUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: LoginUserDto): Promise<User> {
    // Validate email format
    const email = new Email(dto.email);

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.getPasswordHash(),
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return the authenticated user
    // Token generation will be handled by AuthService in the controller
    return user;
  }
}
