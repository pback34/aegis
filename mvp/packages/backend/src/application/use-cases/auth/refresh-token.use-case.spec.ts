import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { RefreshTokenDto } from '../../dtos/auth.dto';
import * as jwt from 'jsonwebtoken';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshTokenUseCase],
    }).compile();

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
  });

  describe('Successful Token Refresh', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      const payload = {
        sub: 'user-id-123',
        email: 'user@test.com',
        role: 'customer',
      };

      const validRefreshToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'development-secret',
        { expiresIn: '7d' },
      );

      const dto: RefreshTokenDto = {
        refreshToken: validRefreshToken,
      };

      // Wait 1 second to ensure new token has different iat timestamp
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessToken).not.toBe(validRefreshToken);
      expect(result.refreshToken).not.toBe(validRefreshToken);

      // Verify new tokens contain same user data
      const decodedAccess = jwt.decode(result.accessToken) as any;
      expect(decodedAccess.sub).toBe(payload.sub);
      expect(decodedAccess.email).toBe(payload.email);
      expect(decodedAccess.role).toBe(payload.role);
    });

    it('should generate new tokens with fresh expiration times', async () => {
      // Arrange
      const payload = {
        sub: 'user-id-123',
        email: 'user@test.com',
        role: 'customer',
      };

      const validRefreshToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'development-secret',
        { expiresIn: '7d' },
      );

      const dto: RefreshTokenDto = {
        refreshToken: validRefreshToken,
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert
      const decodedAccess = jwt.decode(result.accessToken) as any;
      const decodedRefresh = jwt.decode(result.refreshToken) as any;

      const now = Math.floor(Date.now() / 1000);

      // Tokens should be freshly issued (within last 5 seconds)
      expect(decodedAccess.iat).toBeGreaterThanOrEqual(now - 5);
      expect(decodedRefresh.iat).toBeGreaterThanOrEqual(now - 5);

      // Access token expires in 1 hour
      expect(decodedAccess.exp - decodedAccess.iat).toBe(3600);

      // Refresh token expires in 7 days
      expect(decodedRefresh.exp - decodedRefresh.iat).toBe(7 * 24 * 3600);
    });
  });

  describe('Failed Token Refresh', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'invalid.token.string',
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(dto)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      // Arrange
      const payload = {
        sub: 'user-id-123',
        email: 'user@test.com',
        role: 'customer',
      };

      const expiredToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'development-secret',
        { expiresIn: '-1h' }, // Expired 1 hour ago
      );

      const dto: RefreshTokenDto = {
        refreshToken: expiredToken,
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for token with wrong secret', async () => {
      // Arrange
      const payload = {
        sub: 'user-id-123',
        email: 'user@test.com',
        role: 'customer',
      };

      const tokenWithWrongSecret = jwt.sign(payload, 'wrong-secret', {
        expiresIn: '7d',
      });

      const dto: RefreshTokenDto = {
        refreshToken: tokenWithWrongSecret,
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for malformed token', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'not.a.valid.jwt.token',
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Token Payload Preservation', () => {
    it('should preserve all user claims from original token', async () => {
      // Arrange
      const payload = {
        sub: 'user-id-456',
        email: 'guard@test.com',
        role: 'guard',
      };

      const validRefreshToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'development-secret',
        { expiresIn: '7d' },
      );

      const dto: RefreshTokenDto = {
        refreshToken: validRefreshToken,
      };

      // Act
      const result = await useCase.execute(dto);

      // Assert
      const decodedAccess = jwt.decode(result.accessToken) as any;
      const decodedRefresh = jwt.decode(result.refreshToken) as any;

      // All user claims should be preserved
      expect(decodedAccess.sub).toBe(payload.sub);
      expect(decodedAccess.email).toBe(payload.email);
      expect(decodedAccess.role).toBe(payload.role);

      expect(decodedRefresh.sub).toBe(payload.sub);
      expect(decodedRefresh.email).toBe(payload.email);
      expect(decodedRefresh.role).toBe(payload.role);
    });
  });
});
