import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { IUserRepository } from '../../ports/user.repository.interface';
import { Email } from '../../../domain/value-objects/email.value-object';
import { LoginUserDto, LoginUserResponseDto } from '../../dtos/auth.dto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

@Injectable()
export class LoginUserUseCase {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
  private readonly JWT_EXPIRES_IN = '1h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: LoginUserDto): Promise<LoginUserResponseDto> {
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

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.getId().getValue(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        fullName: user.getFullName(),
      },
    };
  }
}
