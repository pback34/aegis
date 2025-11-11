import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token.use-case';
import { AuthService } from '../../infrastructure/auth/auth.service';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';

describe('AuthController', () => {
  let controller: AuthController;
  let mockRegisterUserUseCase: jest.Mocked<RegisterUserUseCase>;
  let mockLoginUserUseCase: jest.Mocked<LoginUserUseCase>;
  let mockRefreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    // Create mocks
    mockRegisterUserUseCase = {
      execute: jest.fn(),
    } as any;

    mockLoginUserUseCase = {
      execute: jest.fn(),
    } as any;

    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    } as any;

    mockAuthService = {
      generateTokens: jest.fn(),
      verifyToken: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUserUseCase, useValue: mockRegisterUserUseCase },
        { provide: LoginUserUseCase, useValue: mockLoginUserUseCase },
        { provide: RefreshTokenUseCase, useValue: mockRefreshTokenUseCase },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
        fullName: 'Test User',
      };

      const registerResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Test User',
        createdAt: new Date(),
      };

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockRegisterUserUseCase.execute.mockResolvedValue(registerResponse);
      mockAuthService.generateTokens.mockResolvedValue(tokens);

      const result = await controller.register(registerDto);

      expect(result).toEqual({
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: UserRole.CUSTOMER,
          fullName: 'Test User',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockRegisterUserUseCase.execute).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.generateTokens).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = new Customer({
        id: UserId.fromString('550e8400-e29b-41d4-a716-446655440000'),
        email: new Email('test@example.com'),
        passwordHash: 'hashed-password',
        fullName: 'Test User',
        status: UserStatus.ACTIVE,
      });

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockLoginUserUseCase.execute.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue(tokens);

      const result = await controller.login(loginDto);

      expect(result).toEqual({
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          role: UserRole.CUSTOMER,
          fullName: 'Test User',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockLoginUserUseCase.execute).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const refreshDto = {
        refreshToken: 'old-refresh-token',
      };

      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRefreshTokenUseCase.execute.mockResolvedValue(tokens);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(tokens);
      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith(refreshDto);
    });
  });
});
