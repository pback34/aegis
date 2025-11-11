import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UpdateLocationUseCase } from './update-location.use-case';
import { ILocationRepository, LocationUpdate } from '../../ports/location.repository.interface';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { ILocationService } from '../../ports/location-service.interface';
import { Guard } from '../../../domain/entities/guard.entity';
import { Booking } from '../../../domain/entities/booking.entity';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { Email } from '../../../domain/value-objects/email.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { UserStatus } from '../../../domain/entities/user.entity';
import { BookingStatus } from '../../../domain/entities/booking.entity';
import { UpdateLocationDto } from '../../dtos/location.dto';

describe('UpdateLocationUseCase', () => {
  let useCase: UpdateLocationUseCase;
  let mockLocationRepository: jest.Mocked<ILocationRepository>;
  let mockBookingRepository: jest.Mocked<IBookingRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockLocationService: jest.Mocked<ILocationService>;

  beforeEach(() => {
    mockLocationRepository = {
      save: jest.fn(),
      getLatestLocationForBooking: jest.fn(),
      findByBookingId: jest.fn(),
      deleteOlderThan: jest.fn(),
    };

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

    mockLocationService = {
      publishLocationUpdate: jest.fn(),
      subscribeToLocationUpdates: jest.fn(),
    };

    // Direct instantiation
    useCase = new UpdateLocationUseCase(
      mockLocationRepository,
      mockBookingRepository,
      mockUserRepository,
      mockLocationService,
    );
  });

  describe('Successful Location Updates', () => {
    it('should update guard location and publish to location service', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const customerId = UserId.create();
      const bookingId = 'booking_123';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC123',
        hourlyRate: new Money(50, 'USD'),
        rating: 4.5,
        isAvailable: true,
        currentLocation: new GeoLocation(40.7128, -74.006),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        guardId: UserId.fromString(guardId),
        serviceLocation: new GeoLocation(40.7128, -74.006),
        serviceLocationAddress: '123 Main St',
        scheduledStart: new Date('2024-01-15T10:00:00Z'),
        scheduledEnd: new Date('2024-01-15T18:00:00Z'),
        estimatedHours: 8,
        hourlyRate: new Money(50, 'USD'),
        estimatedTotal: new Money(400, 'USD'),
        status: BookingStatus.IN_PROGRESS,
      });

      const dto: UpdateLocationDto = {
        latitude: 40.7138,
        longitude: -74.007,
        accuracyMeters: 10,
      };

      const savedLocationUpdate: LocationUpdate = {
        id: 'location_123',
        bookingId,
        guardId: UserId.fromString(guardId),
        location: new GeoLocation(dto.latitude, dto.longitude),
        accuracyMeters: dto.accuracyMeters,
        timestamp: new Date('2024-01-15T10:30:00Z'),
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);
      mockLocationRepository.save.mockResolvedValue(savedLocationUpdate);
      mockUserRepository.updateGuardLocation.mockResolvedValue(guard);
      mockLocationService.publishLocationUpdate.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(guardId, bookingId, dto);

      // Assert
      expect(mockUserRepository.findGuardById).toHaveBeenCalledWith(
        UserId.fromString(guardId),
      );
      expect(mockBookingRepository.findById).toHaveBeenCalledWith(bookingId);
      expect(mockLocationRepository.save).toHaveBeenCalledWith({
        bookingId,
        guardId: guard.getId(),
        location: expect.any(GeoLocation),
        accuracyMeters: dto.accuracyMeters,
        timestamp: expect.any(Date),
      });
      expect(mockUserRepository.updateGuardLocation).toHaveBeenCalledWith(guard);
      expect(mockLocationService.publishLocationUpdate).toHaveBeenCalledWith({
        bookingId,
        guardId: guardId,
        location: expect.any(GeoLocation),
        timestamp: savedLocationUpdate.timestamp,
      });

      expect(result).toEqual({
        bookingId,
        guardId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timestamp: savedLocationUpdate.timestamp,
      });
    });

    it('should handle location update without accuracy meters', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const customerId = UserId.create();
      const bookingId = 'booking_456';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'Jane Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC456',
        hourlyRate: new Money(60, 'USD'),
        rating: 4.8,
        isAvailable: true,
        currentLocation: new GeoLocation(40.7128, -74.006),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        guardId: UserId.fromString(guardId),
        serviceLocation: new GeoLocation(40.7128, -74.006),
        serviceLocationAddress: '456 Oak Ave',
        scheduledStart: new Date('2024-01-16T09:00:00Z'),
        scheduledEnd: new Date('2024-01-16T17:00:00Z'),
        estimatedHours: 8,
        hourlyRate: new Money(60, 'USD'),
        estimatedTotal: new Money(480, 'USD'),
        status: BookingStatus.IN_PROGRESS,
      });

      const dto: UpdateLocationDto = {
        latitude: 40.7148,
        longitude: -74.008,
        // No accuracyMeters
      };

      const savedLocationUpdate: LocationUpdate = {
        id: 'location_456',
        bookingId,
        guardId: UserId.fromString(guardId),
        location: new GeoLocation(dto.latitude, dto.longitude),
        timestamp: new Date('2024-01-16T09:30:00Z'),
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);
      mockLocationRepository.save.mockResolvedValue(savedLocationUpdate);
      mockUserRepository.updateGuardLocation.mockResolvedValue(guard);
      mockLocationService.publishLocationUpdate.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(guardId, bookingId, dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.latitude).toBe(dto.latitude);
      expect(result.longitude).toBe(dto.longitude);
    });

    it('should update guard location multiple times for same booking', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const customerId = UserId.create();
      const bookingId = 'booking_789';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'Bob Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC789',
        hourlyRate: new Money(55, 'USD'),
        rating: 4.7,
        isAvailable: true,
        currentLocation: new GeoLocation(40.7128, -74.006),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        guardId: UserId.fromString(guardId),
        serviceLocation: new GeoLocation(40.7128, -74.006),
        serviceLocationAddress: '789 Pine St',
        scheduledStart: new Date('2024-01-17T08:00:00Z'),
        scheduledEnd: new Date('2024-01-17T16:00:00Z'),
        estimatedHours: 8,
        hourlyRate: new Money(55, 'USD'),
        estimatedTotal: new Money(440, 'USD'),
        status: BookingStatus.IN_PROGRESS,
      });

      // First location update
      const dto1: UpdateLocationDto = {
        latitude: 40.7138,
        longitude: -74.007,
        accuracyMeters: 10,
      };

      const savedLocationUpdate1: LocationUpdate = {
        id: 'location_789_1',
        bookingId,
        guardId: UserId.fromString(guardId),
        location: new GeoLocation(dto1.latitude, dto1.longitude),
        accuracyMeters: dto1.accuracyMeters,
        timestamp: new Date('2024-01-17T08:30:00Z'),
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);
      mockLocationRepository.save.mockResolvedValue(savedLocationUpdate1);
      mockUserRepository.updateGuardLocation.mockResolvedValue(guard);
      mockLocationService.publishLocationUpdate.mockResolvedValue(undefined);

      // Act - First update
      const result1 = await useCase.execute(guardId, bookingId, dto1);

      // Second location update
      const dto2: UpdateLocationDto = {
        latitude: 40.7148,
        longitude: -74.008,
        accuracyMeters: 8,
      };

      const savedLocationUpdate2: LocationUpdate = {
        id: 'location_789_2',
        bookingId,
        guardId: UserId.fromString(guardId),
        location: new GeoLocation(dto2.latitude, dto2.longitude),
        accuracyMeters: dto2.accuracyMeters,
        timestamp: new Date('2024-01-17T09:00:00Z'),
      };

      mockLocationRepository.save.mockResolvedValue(savedLocationUpdate2);

      // Act - Second update
      const result2 = await useCase.execute(guardId, bookingId, dto2);

      // Assert
      expect(result1.latitude).toBe(dto1.latitude);
      expect(result2.latitude).toBe(dto2.latitude);
      expect(mockLocationRepository.save).toHaveBeenCalledTimes(2);
      expect(mockLocationService.publishLocationUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Cases - Guard Not Found', () => {
    it('should throw NotFoundException when guard does not exist', async () => {
      // Arrange
      const guardId = '5f3a700f-13d5-4569-a44c-3affed9b7778'; // Valid UUID that doesn't exist
      const bookingId = 'booking_123';
      const dto: UpdateLocationDto = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockUserRepository.findGuardById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        'Guard not found',
      );

      expect(mockBookingRepository.findById).not.toHaveBeenCalled();
      expect(mockLocationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - Booking Not Found', () => {
    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const bookingId = 'nonexistent_booking';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC123',
        hourlyRate: new Money(50, 'USD'),
        rating: 4.5,
        isAvailable: true,
        currentLocation: new GeoLocation(40.7128, -74.006),
        lastLocationUpdate: new Date(),
      });

      const dto: UpdateLocationDto = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        'Booking not found',
      );

      expect(mockLocationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - Guard Not Assigned to Booking', () => {
    it('should throw ForbiddenException when guard is not assigned to booking', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const differentGuardId = UserId.create();
      const customerId = UserId.create();
      const bookingId = 'booking_123';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC123',
        hourlyRate: new Money(50, 'USD'),
        rating: 4.5,
        isAvailable: true,
        currentLocation: new GeoLocation(40.7128, -74.006),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        guardId: differentGuardId,
        serviceLocation: new GeoLocation(40.7128, -74.006),
        serviceLocationAddress: '123 Main St',
        scheduledStart: new Date('2024-01-15T10:00:00Z'),
        scheduledEnd: new Date('2024-01-15T18:00:00Z'),
        estimatedHours: 8,
        hourlyRate: new Money(50, 'USD'),
        estimatedTotal: new Money(400, 'USD'),
        status: BookingStatus.IN_PROGRESS,
      });

      const dto: UpdateLocationDto = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);

      // Act & Assert
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        'You are not assigned to this booking',
      );

      expect(mockLocationRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when booking has no guard assigned', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const customerId = UserId.create();
      const bookingId = 'booking_456';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC123',
        hourlyRate: new Money(50, 'USD'),
        rating: 4.5,
        isAvailable: true,
        currentLocation: new GeoLocation(40.7128, -74.006),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        serviceLocation: new GeoLocation(40.7128, -74.006),
        serviceLocationAddress: '123 Main St',
        scheduledStart: new Date('2024-01-15T10:00:00Z'),
        scheduledEnd: new Date('2024-01-15T18:00:00Z'),
        estimatedHours: 8,
        estimatedTotal: new Money(400, 'USD'),
        status: BookingStatus.REQUESTED,
      });
      // No guard assigned

      const dto: UpdateLocationDto = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);

      // Act & Assert
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute(guardId, bookingId, dto)).rejects.toThrow(
        'You are not assigned to this booking',
      );

      expect(mockLocationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle location at equator and prime meridian', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const customerId = UserId.create();
      const bookingId = 'booking_equator';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC123',
        hourlyRate: new Money(50, 'USD'),
        rating: 4.5,
        isAvailable: true,
        currentLocation: new GeoLocation(0, 0),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        guardId: UserId.fromString(guardId),
        serviceLocation: new GeoLocation(0, 0),
        serviceLocationAddress: 'Null Island',
        scheduledStart: new Date('2024-01-15T10:00:00Z'),
        scheduledEnd: new Date('2024-01-15T18:00:00Z'),
        estimatedHours: 8,
        hourlyRate: new Money(50, 'USD'),
        estimatedTotal: new Money(400, 'USD'),
        status: BookingStatus.IN_PROGRESS,
      });

      const dto: UpdateLocationDto = {
        latitude: 0,
        longitude: 0,
      };

      const savedLocationUpdate: LocationUpdate = {
        id: 'location_null_island',
        bookingId,
        guardId: UserId.fromString(guardId),
        location: new GeoLocation(0, 0),
        timestamp: new Date(),
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);
      mockLocationRepository.save.mockResolvedValue(savedLocationUpdate);
      mockUserRepository.updateGuardLocation.mockResolvedValue(guard);
      mockLocationService.publishLocationUpdate.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(guardId, bookingId, dto);

      // Assert
      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
    });

    it('should handle extreme valid coordinates', async () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const customerId = UserId.create();
      const bookingId = 'booking_extreme';

      const guard = new Guard({
        id: UserId.fromString(guardId),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword',
        fullName: 'John Guard',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        licenseNumber: 'LIC123',
        hourlyRate: new Money(50, 'USD'),
        rating: 4.5,
        isAvailable: true,
        currentLocation: new GeoLocation(89.9, 179.9),
        lastLocationUpdate: new Date(),
      });

      const booking = new Booking({
        customerId,
        guardId: UserId.fromString(guardId),
        serviceLocation: new GeoLocation(89.9, 179.9),
        serviceLocationAddress: 'Near North Pole',
        scheduledStart: new Date('2024-01-15T10:00:00Z'),
        scheduledEnd: new Date('2024-01-15T18:00:00Z'),
        estimatedHours: 8,
        hourlyRate: new Money(50, 'USD'),
        estimatedTotal: new Money(400, 'USD'),
        status: BookingStatus.IN_PROGRESS,
      });

      const dto: UpdateLocationDto = {
        latitude: 89.9,
        longitude: 179.9,
      };

      const savedLocationUpdate: LocationUpdate = {
        id: 'location_extreme',
        bookingId,
        guardId: UserId.fromString(guardId),
        location: new GeoLocation(89.9, 179.9),
        timestamp: new Date(),
      };

      mockUserRepository.findGuardById.mockResolvedValue(guard);
      mockBookingRepository.findById.mockResolvedValue(booking);
      mockLocationRepository.save.mockResolvedValue(savedLocationUpdate);
      mockUserRepository.updateGuardLocation.mockResolvedValue(guard);
      mockLocationService.publishLocationUpdate.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(guardId, bookingId, dto);

      // Assert
      expect(result.latitude).toBe(89.9);
      expect(result.longitude).toBe(179.9);
    });
  });
});
