import { ConflictException } from '@nestjs/common';
import { RegisterUserUseCase } from './register-user.use-case';
import { IUserRepository } from '../../ports/user.repository.interface';
import { Email } from '../../../domain/value-objects/email.value-object';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { Customer } from '../../../domain/entities/customer.entity';
import { Guard } from '../../../domain/entities/guard.entity';
import { RegisterUserDto } from '../../dtos/auth.dto';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    // Create mock repository
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
    useCase = new RegisterUserUseCase(mockUserRepository);
  });

  describe('Customer Registration', () => {
    it('should successfully register a new customer', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'customer@test.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
        fullName: 'John Doe',
        phone: '+1234567890',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockImplementation(async (user) => user);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.email).toBe(dto.email);
      expect(result.role).toBe(UserRole.CUSTOMER);
      expect(result.fullName).toBe(dto.fullName);
      expect(result.phone).toBe(dto.phone);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.any(Email),
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.any(Customer),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'existing@test.com',
        password: 'password123',
        role: UserRole.CUSTOMER,
        fullName: 'Jane Doe',
      };

      const existingCustomer = new Customer({
        id: UserId.create(),
        email: new Email(dto.email),
        passwordHash: 'hashedpassword',
        fullName: 'Existing User',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should hash the password before saving', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'customer@test.com',
        password: 'plainPassword123',
        role: UserRole.CUSTOMER,
        fullName: 'John Doe',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      let savedUser: any;
      mockUserRepository.save.mockImplementation(async (user) => {
        savedUser = user;
        return user;
      });

      // Act
      await useCase.execute(dto);

      // Assert
      expect(savedUser).toBeDefined();
      expect(savedUser.getPasswordHash()).not.toBe(dto.password);
      expect(savedUser.getPasswordHash()).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash format
    });
  });

  describe('Guard Registration', () => {
    it('should successfully register a new guard with required fields', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'guard@test.com',
        password: 'password123',
        role: UserRole.GUARD,
        fullName: 'Mike Guard',
        phone: '+1234567891',
        licenseNumber: 'LIC-001',
        hourlyRate: 50.0,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockImplementation(async (user) => user);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.email).toBe(dto.email);
      expect(result.role).toBe(UserRole.GUARD);
      expect(result.fullName).toBe(dto.fullName);
      expect(result.id).toBeDefined();

      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.any(Guard));
    });

    it('should throw error if guard is missing license number', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'guard@test.com',
        password: 'password123',
        role: UserRole.GUARD,
        fullName: 'Mike Guard',
        hourlyRate: 50.0,
        // licenseNumber missing
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        'Guards must provide license number and hourly rate',
      );
    });

    it('should throw error if guard is missing hourly rate', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'guard@test.com',
        password: 'password123',
        role: UserRole.GUARD,
        fullName: 'Mike Guard',
        licenseNumber: 'LIC-001',
        // hourlyRate missing
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        'Guards must provide license number and hourly rate',
      );
    });

    it('should set default values for guard', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'guard@test.com',
        password: 'password123',
        role: UserRole.GUARD,
        fullName: 'Mike Guard',
        licenseNumber: 'LIC-001',
        hourlyRate: 50.0,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      let savedGuard: Guard;
      mockUserRepository.save.mockImplementation(async (user) => {
        savedGuard = user as Guard;
        return user;
      });

      // Act
      await useCase.execute(dto);

      // Assert
      expect(savedGuard!).toBeDefined();
      expect(savedGuard!.getRating()).toBe(5.0); // Default rating
      expect(savedGuard!.getIsAvailable()).toBe(false); // Default availability
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      // Arrange
      const dto: RegisterUserDto = {
        email: 'invalid-email',
        password: 'password123',
        role: UserRole.CUSTOMER,
        fullName: 'John Doe',
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow();
    });
  });
});
