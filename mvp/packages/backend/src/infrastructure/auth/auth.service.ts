import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Authentication Service
 * Handles JWT token generation and management
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m', // Short-lived access token
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d', // Long-lived refresh token
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify a token (useful for refresh token validation)
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verify<JwtPayload>(token);
  }
}

/**
 * Token pair structure
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
