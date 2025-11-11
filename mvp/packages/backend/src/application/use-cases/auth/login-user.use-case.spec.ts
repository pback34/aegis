import { UnauthorizedException } from '@nestjs/common';
import { LoginUserUseCase } from './login-user.use-case';
import { IUserRepository } from '../../ports/user.repository.interface';
import { Email } from '../../../domain/value-objects/email.value-object';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { Customer } from '../../../domain/entities/customer.entity';
import { LoginUserDto } from '../../dtos/auth.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAllGuards: jest.fn(),
      findAvailableGuards: jest.fn(),
      findGuardById: jest.fn(),
      findCustomerById: jest.fn(),
      updateGuardLocation: jest.fn(),
    };

    // Direct instantiation instead of NestJS module
    useCase = new LoginUserUseCase(mockUserRepository);
  });

  describe('Successful Login', () => {
    it('should successfully login a user with correct credentials', async () => {
      // Arrange
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);

      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash,
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: LoginUserDto = {
        email: 'customer@test.com',
        password,
      };

      mockUserRepository.findByEmail.mockResolvedValue(customer);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: customer.getId().getValue(),
        email: customer.getEmail().getValue(),
        role: customer.getRole(),
        fullName: customer.getFullName(),
      });

      // Verify JWT tokens
      const decodedAccess = jwt.decode(result.accessToken) as any;
      expect(decodedAccess.sub).toBe(customer.getId().getValue());
      expect(decodedAccess.email).toBe(customer.getEmail().getValue());
      expect(decodedAccess.role).toBe(customer.getRole());

      const decodedRefresh = jwt.decode(result.refreshToken) as any;
      expect(decodedRefresh.sub).toBe(customer.getId().getValue());
    });

    it('should call repository with correct email', async () => {
      // Arrange
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);

      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash,
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: LoginUserDto = {
        email: 'customer@test.com',
        password,
      };

      mockUserRepository.findByEmail.mockResolvedValue(customer);

      // Act
      await useCase.execute(dto);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failed Login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      // Arrange
      const dto: LoginUserDto = {
        email: 'nonexistent@test.com',
        password: 'password123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      const correctPassword = 'correctPassword123';
      const passwordHash = await bcrypt.hash(correctPassword, 10);

      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash,
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: LoginUserDto = {
        email: 'customer@test.com',
        password: 'wrongPassword123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(customer);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should validate email format', async () => {
      // Arrange
      const dto: LoginUserDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow();
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT tokens with correct expiration', async () => {
      // Arrange
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);

      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash,
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: LoginUserDto = {
        email: 'customer@test.com',
        password,
      };

      mockUserRepository.findByEmail.mockResolvedValue(customer);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      const decodedAccess = jwt.decode(result.accessToken) as any;
      const decodedRefresh = jwt.decode(result.refreshToken) as any;

      // Access token should expire in 1 hour
      expect(decodedAccess.exp - decodedAccess.iat).toBe(3600);

      // Refresh token should expire in 7 days
      expect(decodedRefresh.exp - decodedRefresh.iat).toBe(7 * 24 * 3600);
    });

    it('should include all required claims in JWT payload', async () => {
      // Arrange
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 10);

      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash,
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: LoginUserDto = {
        email: 'customer@test.com',
        password,
      };

      mockUserRepository.findByEmail.mockResolvedValue(customer);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      const decoded = jwt.decode(result.accessToken) as any;
      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });
});
