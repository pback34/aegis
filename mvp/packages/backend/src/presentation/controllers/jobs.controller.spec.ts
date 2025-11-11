import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { CreateBookingUseCase } from '../../application/use-cases/booking/create-booking.use-case';
import { GetBookingUseCase } from '../../application/use-cases/booking/get-booking.use-case';
import { ListBookingsUseCase } from '../../application/use-cases/booking/list-bookings.use-case';
import { AcceptBookingUseCase } from '../../application/use-cases/booking/accept-booking.use-case';
import { CompleteBookingUseCase } from '../../application/use-cases/booking/complete-booking.use-case';
import { Customer } from '../../domain/entities/customer.entity';
import { Guard } from '../../domain/entities/guard.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';
import { UserStatus } from '../../domain/entities/user.entity';
import { Money } from '../../domain/value-objects/money.value-object';
import { BookingStatus } from '../../domain/entities/booking.entity';

describe('JobsController', () => {
  let controller: JobsController;
  let mockCreateBookingUseCase: jest.Mocked<CreateBookingUseCase>;
  let mockGetBookingUseCase: jest.Mocked<GetBookingUseCase>;
  let mockListBookingsUseCase: jest.Mocked<ListBookingsUseCase>;
  let mockAcceptBookingUseCase: jest.Mocked<AcceptBookingUseCase>;
  let mockCompleteBookingUseCase: jest.Mocked<CompleteBookingUseCase>;

  const mockCustomer = new Customer({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440005'),
    email: new Email('customer@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Customer',
    status: UserStatus.ACTIVE,
  });

  const mockGuard = new Guard({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440006'),
    email: new Email('guard@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Guard',
    status: UserStatus.ACTIVE,
    hourlyRate: new Money(50),
    rating: 5.0,
    isAvailable: true,
  });

  beforeEach(async () => {
    mockCreateBookingUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetBookingUseCase = {
      execute: jest.fn(),
    } as any;

    mockListBookingsUseCase = {
      execute: jest.fn(),
    } as any;

    mockAcceptBookingUseCase = {
      execute: jest.fn(),
    } as any;

    mockCompleteBookingUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        { provide: CreateBookingUseCase, useValue: mockCreateBookingUseCase },
        { provide: GetBookingUseCase, useValue: mockGetBookingUseCase },
        { provide: ListBookingsUseCase, useValue: mockListBookingsUseCase },
        { provide: AcceptBookingUseCase, useValue: mockAcceptBookingUseCase },
        { provide: CompleteBookingUseCase, useValue: mockCompleteBookingUseCase },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
  });

  describe('createBooking', () => {
    it('should create a booking for a customer', async () => {
      const createDto = {
        serviceLocationAddress: '123 Main St',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: '2024-12-01T10:00:00Z',
        scheduledEnd: '2024-12-01T14:00:00Z',
        estimatedHours: 4,
      };

      const expectedResponse = {
        id: 'booking-id',
        customerId: '550e8400-e29b-41d4-a716-446655440005',
        status: BookingStatus.REQUESTED,
        ...createDto,
        createdAt: new Date(),
      };

      mockCreateBookingUseCase.execute.mockResolvedValue(expectedResponse as any);

      const result = await controller.createBooking(mockCustomer, createDto);

      expect(result).toEqual(expectedResponse);
      expect(mockCreateBookingUseCase.execute).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440005', createDto);
    });
  });

  describe('getBooking', () => {
    it('should get booking details', async () => {
      const bookingId = 'booking-id';
      const expectedResponse = {
        id: bookingId,
        customerId: '550e8400-e29b-41d4-a716-446655440005',
        status: BookingStatus.REQUESTED,
        serviceLocationAddress: '123 Main St',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: new Date(),
        scheduledEnd: new Date(),
        estimatedHours: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetBookingUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getBooking(bookingId);

      expect(result).toEqual(expectedResponse);
      expect(mockGetBookingUseCase.execute).toHaveBeenCalledWith(bookingId);
    });
  });

  describe('listBookings', () => {
    it('should list bookings for a customer', async () => {
      const query = {};
      const expectedResponse = {
        bookings: [],
        total: 0,
      };

      mockListBookingsUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.listBookings(mockCustomer, query);

      expect(result).toEqual(expectedResponse);
      expect(mockListBookingsUseCase.execute).toHaveBeenCalledWith({
        customerId: '550e8400-e29b-41d4-a716-446655440005',
      });
    });

    it('should list bookings for a guard', async () => {
      const query = {};
      const expectedResponse = {
        bookings: [],
        total: 0,
      };

      mockListBookingsUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.listBookings(mockGuard, query);

      expect(result).toEqual(expectedResponse);
      expect(mockListBookingsUseCase.execute).toHaveBeenCalledWith({
        guardId: '550e8400-e29b-41d4-a716-446655440006',
      });
    });
  });

  describe('acceptBooking', () => {
    it('should accept a booking as a guard', async () => {
      const bookingId = 'booking-id';
      const expectedResponse = {
        id: bookingId,
        guardId: '550e8400-e29b-41d4-a716-446655440006',
        status: BookingStatus.ACCEPTED,
        acceptedAt: new Date(),
      };

      mockAcceptBookingUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.acceptBooking(mockGuard, bookingId);

      expect(result).toEqual(expectedResponse);
      expect(mockAcceptBookingUseCase.execute).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440006', bookingId);
    });
  });

  describe('completeBooking', () => {
    it('should complete a booking as a guard', async () => {
      const bookingId = 'booking-id';
      const expectedResponse = {
        id: bookingId,
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
        actualHours: 4.5,
        finalAmount: 225,
      };

      mockCompleteBookingUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.completeBooking(mockGuard, bookingId);

      expect(result).toEqual(expectedResponse);
      expect(mockCompleteBookingUseCase.execute).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440006', bookingId);
    });
  });
});
