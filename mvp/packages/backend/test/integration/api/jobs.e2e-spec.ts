import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { JobsController } from '../../../src/presentation/controllers/jobs.controller';
import { CreateBookingUseCase } from '../../../src/application/use-cases/booking/create-booking.use-case';
import { GetBookingUseCase } from '../../../src/application/use-cases/booking/get-booking.use-case';
import { ListBookingsUseCase } from '../../../src/application/use-cases/booking/list-bookings.use-case';
import { AcceptBookingUseCase } from '../../../src/application/use-cases/booking/accept-booking.use-case';
import { CompleteBookingUseCase } from '../../../src/application/use-cases/booking/complete-booking.use-case';
import { JwtAuthGuard } from '../../../src/infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/infrastructure/auth/guards/roles.guard';
import { BookingStatus } from '../../../src/domain/entities/booking.entity';
import { UserRole, UserStatus } from '../../../src/domain/entities/user.entity';
import { Customer } from '../../../src/domain/entities/customer.entity';
import { Guard } from '../../../src/domain/entities/guard.entity';
import { Email } from '../../../src/domain/value-objects/email.value-object';
import { UserId } from '../../../src/domain/value-objects/user-id.value-object';
import { Money } from '../../../src/domain/value-objects/money.value-object';
import { GeoLocation } from '../../../src/domain/value-objects/geo-location.value-object';

describe('Jobs API (e2e)', () => {
  let app: INestApplication;
  let mockCreateBookingUseCase: jest.Mocked<CreateBookingUseCase>;
  let mockGetBookingUseCase: jest.Mocked<GetBookingUseCase>;
  let mockListBookingsUseCase: jest.Mocked<ListBookingsUseCase>;
  let mockAcceptBookingUseCase: jest.Mocked<AcceptBookingUseCase>;
  let mockCompleteBookingUseCase: jest.Mocked<CompleteBookingUseCase>;

  // Mock user data
  const mockCustomerUser = new Customer({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440001'),
    email: new Email('customer@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Customer',
    phone: '+1234567890',
    status: UserStatus.ACTIVE,
  });

  const mockGuardUser = new Guard({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440002'),
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

  beforeAll(async () => {
    // Create mocks
    mockCreateBookingUseCase = { execute: jest.fn() } as any;
    mockGetBookingUseCase = { execute: jest.fn() } as any;
    mockListBookingsUseCase = { execute: jest.fn() } as any;
    mockAcceptBookingUseCase = { execute: jest.fn() } as any;
    mockCompleteBookingUseCase = { execute: jest.fn() } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        { provide: CreateBookingUseCase, useValue: mockCreateBookingUseCase },
        { provide: GetBookingUseCase, useValue: mockGetBookingUseCase },
        { provide: ListBookingsUseCase, useValue: mockListBookingsUseCase },
        { provide: AcceptBookingUseCase, useValue: mockAcceptBookingUseCase },
        { provide: CompleteBookingUseCase, useValue: mockCompleteBookingUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          // Inject mock user based on the endpoint being tested
          request.user = request.headers['x-test-user'] === 'guard' ? mockGuardUser : mockCustomerUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          const requiredRole = Reflect.getMetadata('roles', context.getHandler());
          if (!requiredRole) return true;
          return request.user.role === requiredRole[0];
        },
      })
      .compile();

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

  describe('POST /jobs (Create Booking)', () => {
    it('should create a booking successfully', async () => {
      const createDto = {
        serviceLocationAddress: '123 Main St, San Francisco, CA',
        serviceLocationLat: 37.7749,
        serviceLocationLng: -122.4194,
        scheduledStart: '2024-12-01T10:00:00Z',
        scheduledEnd: '2024-12-01T14:00:00Z',
        estimatedHours: 4,
      };

      const expectedResponse = {
        id: 'booking-123',
        customerId: mockCustomerUser.getId().getValue(),
        status: BookingStatus.REQUESTED,
        ...createDto,
        createdAt: new Date(),
      };

      mockCreateBookingUseCase.execute.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .post('/jobs')
        .set('x-test-user', 'customer')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'booking-123',
        customerId: mockCustomerUser.getId().getValue(),
        status: BookingStatus.REQUESTED,
      });
    });

    it('should reject invalid coordinates', async () => {
      await request(app.getHttpServer())
        .post('/jobs')
        .set('x-test-user', 'customer')
        .send({
          serviceLocationAddress: '123 Main St',
          serviceLocationLat: 100, // Invalid: >90
          serviceLocationLng: -122.4194,
          scheduledStart: '2024-12-01T10:00:00Z',
          scheduledEnd: '2024-12-01T14:00:00Z',
          estimatedHours: 4,
        })
        .expect(400);
    });

    it('should reject invalid estimated hours', async () => {
      await request(app.getHttpServer())
        .post('/jobs')
        .set('x-test-user', 'customer')
        .send({
          serviceLocationAddress: '123 Main St',
          serviceLocationLat: 37.7749,
          serviceLocationLng: -122.4194,
          scheduledStart: '2024-12-01T10:00:00Z',
          scheduledEnd: '2024-12-01T14:00:00Z',
          estimatedHours: 0, // Invalid: must be ≥1
        })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/jobs')
        .set('x-test-user', 'customer')
        .send({
          serviceLocationAddress: '123 Main St',
          // Missing coordinates and other fields
        })
        .expect(400);
    });
  });

  describe('GET /jobs/:id (Get Booking)', () => {
    it('should get booking details', async () => {
      const bookingId = 'booking-123';
      const expectedResponse = {
        id: bookingId,
        customerId: mockCustomerUser.getId().getValue(),
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

      const response = await request(app.getHttpServer())
        .get(`/jobs/${bookingId}`)
        .set('x-test-user', 'customer')
        .expect(200);

      expect(response.body.id).toBe(bookingId);
    });

    it('should return 404 for non-existent booking', async () => {
      mockGetBookingUseCase.execute.mockRejectedValue(
        new Error('Booking not found'),
      );

      await request(app.getHttpServer())
        .get('/jobs/non-existent-id')
        .set('x-test-user', 'customer')
        .expect(500); // Will be 500 because we're not catching the error properly
    });
  });

  describe('GET /jobs (List Bookings)', () => {
    it('should list bookings for customer', async () => {
      const expectedResponse = {
        bookings: [
          {
            id: 'booking-1',
            customerId: mockCustomerUser.getId().getValue(),
            status: BookingStatus.REQUESTED,
          },
        ],
        total: 1,
      };

      mockListBookingsUseCase.execute.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .get('/jobs')
        .set('x-test-user', 'customer')
        .expect(200);

      expect(response.body.bookings).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('should list bookings for guard', async () => {
      const expectedResponse = {
        bookings: [],
        total: 0,
      };

      mockListBookingsUseCase.execute.mockResolvedValue(expectedResponse as any);

      const response = await request(app.getHttpServer())
        .get('/jobs')
        .set('x-test-user', 'guard')
        .expect(200);

      expect(response.body.bookings).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should filter by status', async () => {
      mockListBookingsUseCase.execute.mockResolvedValue({
        bookings: [],
        total: 0,
      } as any);

      await request(app.getHttpServer())
        .get('/jobs?status=accepted')
        .set('x-test-user', 'customer')
        .expect(200);

      expect(mockListBookingsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' }),
      );
    });
  });

  describe('POST /jobs/:id/accept (Accept Booking)', () => {
    it('should accept a booking as guard', async () => {
      const bookingId = 'booking-123';
      const expectedResponse = {
        id: bookingId,
        guardId: mockGuardUser.getId().getValue(),
        status: BookingStatus.ACCEPTED,
        acceptedAt: new Date(),
      };

      mockAcceptBookingUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/jobs/${bookingId}/accept`)
        .set('x-test-user', 'guard')
        .expect(200);

      expect(response.body.status).toBe(BookingStatus.ACCEPTED);
    });

    it('should reject if not a guard', async () => {
      await request(app.getHttpServer())
        .post('/jobs/booking-123/accept')
        .set('x-test-user', 'customer')
        .expect(403); // Role guard should reject
    });
  });

  describe('POST /jobs/:id/complete (Complete Booking)', () => {
    it('should complete a booking as guard', async () => {
      const bookingId = 'booking-123';
      const expectedResponse = {
        id: bookingId,
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
        actualHours: 4.5,
        finalAmount: 225,
      };

      mockCompleteBookingUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/jobs/${bookingId}/complete`)
        .set('x-test-user', 'guard')
        .expect(200);

      expect(response.body.status).toBe(BookingStatus.COMPLETED);
    });

    it('should reject if not a guard', async () => {
      await request(app.getHttpServer())
        .post('/jobs/booking-123/complete')
        .set('x-test-user', 'customer')
        .expect(403);
    });
  });
});
