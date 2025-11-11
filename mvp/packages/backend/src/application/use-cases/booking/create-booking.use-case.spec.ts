import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreateBookingUseCase } from './create-booking.use-case';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { SimpleMatchingService } from '../../../domain/services/simple-matching.service';
import { PricingService } from '../../../domain/services/pricing.service';
import { Customer } from '../../../domain/entities/customer.entity';
import { Guard } from '../../../domain/entities/guard.entity';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { Email } from '../../../domain/value-objects/email.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { UserStatus } from '../../../domain/entities/user.entity';
import { BookingStatus } from '../../../domain/entities/booking.entity';
import { CreateBookingDto } from '../../dtos/booking.dto';

describe('CreateBookingUseCase', () => {
  let useCase: CreateBookingUseCase;
  let mockBookingRepository: jest.Mocked<IBookingRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let matchingService: SimpleMatchingService;
  let pricingService: PricingService;

  beforeEach(async () => {
    mockBookingRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findByCustomerId: jest.fn(),
      findByGuardId: jest.fn(),
      findByStatus: jest.fn(),
      findActiveBookingForGuard: jest.fn(),
      findAvailableBookings: jest.fn(),
    };

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

    matchingService = new SimpleMatchingService();
    pricingService = new PricingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBookingUseCase,
        {
          provide: 'IBookingRepository',
          useValue: mockBookingRepository,
        },
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
        {
          provide: SimpleMatchingService,
          useValue: matchingService,
        },
        {
          provide: PricingService,
          useValue: pricingService,
        },
      ],
    }).compile();

    useCase = new CreateBookingUseCase(
      mockBookingRepository,
      mockUserRepository,
      matchingService,
      pricingService,
    );
  });

  describe('Successful Booking Creation', () => {
    it('should create a booking and match with available guard', async () => {
      // Arrange
      const customerId = UserId.generate().getValue();
      const customer = new Customer({
        id: new UserId(customerId),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const guard = new Guard({
        id: UserId.generate(),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'Mike Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001',
        hourlyRate: new Money(50),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194), // SF
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: CreateBookingDto = {
        serviceLocationAddress: '123 Main St, San Francisco, CA',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1hr
        estimatedHours: 1,
      };

      mockUserRepository.findCustomerById.mockResolvedValue(customer);
      mockUserRepository.findAvailableGuards.mockResolvedValue([guard]);
      mockBookingRepository.save.mockImplementation(async (booking) => booking);

      // Act
      const result = await useCase.execute(customerId, dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.customerId).toBe(customerId);
      expect(result.guardId).toBe(guard.getId().getValue());
      expect(result.status).toBe(BookingStatus.MATCHED);
      expect(result.serviceLocationAddress).toBe(dto.serviceLocationAddress);
      expect(result.hourlyRate).toBe(50);
      expect(result.estimatedTotal).toBe(50); // 1hr * $50
      expect(result.estimatedHours).toBe(1);

      expect(mockBookingRepository.save).toHaveBeenCalled();
    });

    it('should create booking without guard if none available', async () => {
      // Arrange
      const customerId = UserId.generate().getValue();
      const customer = new Customer({
        id: new UserId(customerId),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: CreateBookingDto = {
        serviceLocationAddress: '123 Main St, San Francisco, CA',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: new Date(Date.now() + 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
        estimatedHours: 2,
      };

      mockUserRepository.findCustomerById.mockResolvedValue(customer);
      mockUserRepository.findAvailableGuards.mockResolvedValue([]); // No guards available
      mockBookingRepository.save.mockImplementation(async (booking) => booking);

      // Act
      const result = await useCase.execute(customerId, dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.customerId).toBe(customerId);
      expect(result.guardId).toBeUndefined();
      expect(result.status).toBe(BookingStatus.REQUESTED);
      expect(result.hourlyRate).toBeUndefined();
      expect(result.estimatedTotal).toBeUndefined();
    });

    it('should match with nearest available guard', async () => {
      // Arrange
      const customerId = UserId.generate().getValue();
      const customer = new Customer({
        id: new UserId(customerId),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Guard in SF (near service location)
      const nearGuard = new Guard({
        id: UserId.generate(),
        email: new Email('near-guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'Near Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001',
        hourlyRate: new Money(50),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194), // SF
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Guard in LA (far from service location)
      const farGuard = new Guard({
        id: UserId.generate(),
        email: new Email('far-guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'Far Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-002',
        hourlyRate: new Money(45),
        rating: 4.8,
        isAvailable: true,
        currentLocation: new GeoLocation(34.0522, -118.2437), // LA
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: CreateBookingDto = {
        serviceLocationAddress: '123 Main St, San Francisco, CA',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194, // SF
        scheduledStart: new Date(Date.now() + 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
        estimatedHours: 1,
      };

      mockUserRepository.findCustomerById.mockResolvedValue(customer);
      mockUserRepository.findAvailableGuards.mockResolvedValue([
        farGuard,
        nearGuard,
      ]);
      mockBookingRepository.save.mockImplementation(async (booking) => booking);

      // Act
      const result = await useCase.execute(customerId, dto);

      // Assert - Should match with near guard, not far guard
      expect(result.guardId).toBe(nearGuard.getId().getValue());
      expect(result.hourlyRate).toBe(50);
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundException if customer does not exist', async () => {
      // Arrange
      const customerId = 'non-existent-id';
      const dto: CreateBookingDto = {
        serviceLocationAddress: '123 Main St',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: new Date(Date.now() + 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
        estimatedHours: 1,
      };

      mockUserRepository.findCustomerById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(customerId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(customerId, dto)).rejects.toThrow(
        'Customer not found',
      );
    });
  });

  describe('Pricing Calculation', () => {
    it('should calculate correct pricing when guard is matched', async () => {
      // Arrange
      const customerId = UserId.generate().getValue();
      const customer = new Customer({
        id: new UserId(customerId),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const guard = new Guard({
        id: UserId.generate(),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'Mike Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001',
        hourlyRate: new Money(60),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dto: CreateBookingDto = {
        serviceLocationAddress: '123 Main St',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: new Date(Date.now() + 86400000).toISOString(),
        scheduledEnd: new Date(Date.now() + 90000000).toISOString(),
        estimatedHours: 3,
      };

      mockUserRepository.findCustomerById.mockResolvedValue(customer);
      mockUserRepository.findAvailableGuards.mockResolvedValue([guard]);
      mockBookingRepository.save.mockImplementation(async (booking) => booking);

      // Act
      const result = await useCase.execute(customerId, dto);

      // Assert
      expect(result.hourlyRate).toBe(60);
      expect(result.estimatedTotal).toBe(180); // 3hrs * $60
    });
  });

  describe('Date Handling', () => {
    it('should correctly parse ISO date strings', async () => {
      // Arrange
      const customerId = UserId.generate().getValue();
      const customer = new Customer({
        id: new UserId(customerId),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const startDate = new Date(Date.now() + 86400000);
      const endDate = new Date(Date.now() + 90000000);

      const dto: CreateBookingDto = {
        serviceLocationAddress: '123 Main St',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        estimatedHours: 1,
      };

      mockUserRepository.findCustomerById.mockResolvedValue(customer);
      mockUserRepository.findAvailableGuards.mockResolvedValue([]);
      mockBookingRepository.save.mockImplementation(async (booking) => booking);

      // Act
      const result = await useCase.execute(customerId, dto);

      // Assert
      expect(result.scheduledStart).toBeInstanceOf(Date);
      expect(result.scheduledEnd).toBeInstanceOf(Date);
      expect(result.scheduledStart.getTime()).toBe(startDate.getTime());
      expect(result.scheduledEnd.getTime()).toBe(endDate.getTime());
    });
  });
});
