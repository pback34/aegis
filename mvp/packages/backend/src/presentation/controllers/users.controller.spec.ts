import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UpdateUserProfileUseCase } from '../../application/use-cases/user/update-user-profile.use-case';
import { Customer } from '../../domain/entities/customer.entity';
import { Guard } from '../../domain/entities/guard.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { UserRole, UserStatus } from '../../domain/entities/user.entity';
import { Money } from '../../domain/value-objects/money.value-object';
import { GeoLocation } from '../../domain/value-objects/geo-location.value-object';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUpdateUserProfileUseCase: jest.Mocked<UpdateUserProfileUseCase>;

  const mockCustomer = new Customer({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440002'),
    email: new Email('customer@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Customer',
    phone: '+1234567890',
    status: UserStatus.ACTIVE,
  });

  const mockGuard = new Guard({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440003'),
    email: new Email('guard@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Guard',
    phone: '+1234567890',
    status: UserStatus.ACTIVE,
    hourlyRate: new Money(50),
    rating: 4.8,
    isAvailable: true,
    licenseNumber: 'LIC-12345',
    currentLocation: new GeoLocation(37.7749, -122.4194),
  });

  beforeEach(async () => {
    mockUpdateUserProfileUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UpdateUserProfileUseCase, useValue: mockUpdateUserProfileUseCase },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getProfile', () => {
    it('should return customer profile', async () => {
      const result = await controller.getProfile(mockCustomer);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Test Customer',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        createdAt: expect.any(Date),
      });
    });

    it('should return guard profile with guard-specific fields', async () => {
      const result = await controller.getProfile(mockGuard);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'guard@example.com',
        role: UserRole.GUARD,
        fullName: 'Test Guard',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        createdAt: expect.any(Date),
        licenseNumber: 'LIC-12345',
        hourlyRate: 50,
        rating: 4.8,
        isAvailable: true,
        currentLatitude: 37.7749,
        currentLongitude: -122.4194,
      });
    });

    it('should handle guard without current location', async () => {
      const guardWithoutLocation = new Guard({
        id: UserId.fromString('550e8400-e29b-41d4-a716-446655440004'),
        email: new Email('guard2@example.com'),
        passwordHash: 'hashed-password',
        fullName: 'Test Guard 2',
        status: UserStatus.ACTIVE,
        hourlyRate: new Money(50),
        rating: 5.0,
        isAvailable: false,
      });

      const result = await controller.getProfile(guardWithoutLocation);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440004',
        email: 'guard2@example.com',
        role: UserRole.GUARD,
        fullName: 'Test Guard 2',
        phone: undefined,
        status: UserStatus.ACTIVE,
        createdAt: expect.any(Date),
        licenseNumber: undefined,
        hourlyRate: 50,
        rating: 5.0,
        isAvailable: false,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update customer profile', async () => {
      const updateDto = {
        fullName: 'Updated Customer',
        phone: '+9876543210',
      };

      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Updated Customer',
        phone: '+9876543210',
        updatedAt: new Date(),
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.updateProfile(mockCustomer, updateDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUpdateUserProfileUseCase.execute).toHaveBeenCalledWith(
        mockCustomer.getId(),
        updateDto,
      );
    });

    it('should update guard profile with guard-specific fields', async () => {
      const updateDto = {
        fullName: 'Updated Guard',
        phone: '+9876543210',
        isAvailable: false,
        hourlyRate: 60,
      };

      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'guard@example.com',
        role: UserRole.GUARD,
        fullName: 'Updated Guard',
        phone: '+9876543210',
        updatedAt: new Date(),
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.updateProfile(mockGuard, updateDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUpdateUserProfileUseCase.execute).toHaveBeenCalledWith(
        mockGuard.getId(),
        updateDto,
      );
    });

    it('should update only specified fields', async () => {
      const updateDto = {
        phone: '+9876543210',
      };

      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Test Customer',
        phone: '+9876543210',
        updatedAt: new Date(),
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.updateProfile(mockCustomer, updateDto);

      expect(result).toEqual(expectedResponse);
      expect(mockUpdateUserProfileUseCase.execute).toHaveBeenCalledWith(
        mockCustomer.getId(),
        updateDto,
      );
    });
  });
});
