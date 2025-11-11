import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../../../src/presentation/controllers/auth.controller';
import { RegisterUserUseCase } from '../../../src/application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../src/application/use-cases/auth/login-user.use-case';
import { RefreshTokenUseCase } from '../../../src/application/use-cases/auth/refresh-token.use-case';
import { AuthService } from '../../../src/infrastructure/auth/auth.service';
import { Customer } from '../../../src/domain/entities/customer.entity';
import { Email } from '../../../src/domain/value-objects/email.value-object';
import { UserId } from '../../../src/domain/value-objects/user-id.value-object';
import { UserRole, UserStatus } from '../../../src/domain/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let mockRegisterUseCase: jest.Mocked<RegisterUserUseCase>;
  let mockLoginUseCase: jest.Mocked<LoginUserUseCase>;
  let mockRefreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeAll(async () => {
    // Create mocks
    mockRegisterUseCase = {
      execute: jest.fn(),
    } as any;

    mockLoginUseCase = {
      execute: jest.fn(),
    } as any;

    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    } as any;

    mockAuthService = {
      generateTokens: jest.fn(),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUserUseCase, useValue: mockRegisterUseCase },
        { provide: LoginUserUseCase, useValue: mockLoginUseCase },
        { provide: RefreshTokenUseCase, useValue: mockRefreshTokenUseCase },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new customer successfully', async () => {
      const registerDto = {
        email: 'newcustomer@example.com',
        password: 'securePassword123',
        role: UserRole.CUSTOMER,
        fullName: 'New Customer',
      };

      const registerResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'newcustomer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'New Customer',
        createdAt: new Date(),
      };

      const tokens = {
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-xyz',
      };

      mockRegisterUseCase.execute.mockResolvedValue(registerResponse);
      mockAuthService.generateTokens.mockResolvedValue(tokens);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual({
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'newcustomer@example.com',
          role: UserRole.CUSTOMER,
          fullName: 'New Customer',
        },
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-xyz',
      });
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          role: UserRole.CUSTOMER,
          fullName: 'Test User',
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password, role, fullName
        })
        .expect(400);
    });

    it('should reject weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          role: UserRole.CUSTOMER,
          fullName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
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
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-abc',
      };

      mockLoginUseCase.execute.mockResolvedValue(mockUser);
      mockAuthService.generateTokens.mockResolvedValue(tokens);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      mockLoginUseCase.execute.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);
    });

    it('should reject missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const refreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRefreshTokenUseCase.execute.mockResolvedValue(newTokens);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(200);

      expect(response.body).toEqual(newTokens);
    });

    it('should reject expired refresh token', async () => {
      mockRefreshTokenUseCase.execute.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'expired-token',
        })
        .expect(401);
    });

    it('should reject missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });
});
