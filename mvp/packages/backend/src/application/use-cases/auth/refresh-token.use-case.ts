import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from '../../dtos/auth.dto';

/**
 * JWT Payload interface
 * Note: This is duplicated from the JWT strategy for now
 * TODO: Refactor to use AuthService for token operations
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class RefreshTokenUseCase {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
  private readonly JWT_EXPIRES_IN = '1h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  async execute(dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(dto.refreshToken, this.JWT_SECRET) as JwtPayload;

      // Generate new tokens
      const payload: JwtPayload = {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
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
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
