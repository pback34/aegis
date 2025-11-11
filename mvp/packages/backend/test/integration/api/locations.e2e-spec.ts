import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { LocationsController } from '../../../src/presentation/controllers/locations.controller';
import { UpdateLocationUseCase } from '../../../src/application/use-cases/location/update-location.use-case';
import { GetCurrentLocationUseCase } from '../../../src/application/use-cases/location/get-current-location.use-case';
import { JwtAuthGuard } from '../../../src/infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/infrastructure/auth/guards/roles.guard';
import { UserRole, UserStatus } from '../../../src/domain/entities/user.entity';
import { Customer } from '../../../src/domain/entities/customer.entity';
import { Guard } from '../../../src/domain/entities/guard.entity';
import { Email } from '../../../src/domain/value-objects/email.value-object';
import { UserId } from '../../../src/domain/value-objects/user-id.value-object';
import { Money } from '../../../src/domain/value-objects/money.value-object';
import { GeoLocation } from '../../../src/domain/value-objects/geo-location.value-object';

describe('Locations API (e2e)', () => {
  let app: INestApplication;
  let mockUpdateLocationUseCase: jest.Mocked<UpdateLocationUseCase>;
  let mockGetCurrentLocationUseCase: jest.Mocked<GetCurrentLocationUseCase>;

  const mockGuardUser = new Guard({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440001'),
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

  const mockCustomerUser = new Customer({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440002'),
    email: new Email('customer@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Customer',
    phone: '+1234567890',
    status: UserStatus.ACTIVE,
  });

  beforeAll(async () => {
    // Set up environment variables for map config
    process.env.MAPBOX_TOKEN = 'test-mapbox-token-xyz';
    process.env.MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v11';
    process.env.DEFAULT_MAP_CENTER_LAT = '37.7749';
    process.env.DEFAULT_MAP_CENTER_LNG = '-122.4194';
    process.env.DEFAULT_MAP_ZOOM = '12';

    mockUpdateLocationUseCase = { execute: jest.fn() } as any;
    mockGetCurrentLocationUseCase = { execute: jest.fn() } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        { provide: UpdateLocationUseCase, useValue: mockUpdateLocationUseCase },
        { provide: GetCurrentLocationUseCase, useValue: mockGetCurrentLocationUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          const isPublic = Reflect.getMetadata('isPublic', context.getHandler());
          if (isPublic) return true;
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

  describe('GET /map/config (Public)', () => {
    it('should return Mapbox configuration without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/map/config')
        .expect(200);

      expect(response.body).toEqual({
        mapboxToken: 'test-mapbox-token-xyz',
        mapboxStyle: 'mapbox://styles/mapbox/streets-v11',
        defaultCenter: {
          lat: 37.7749,
          lng: -122.4194,
        },
        defaultZoom: 12,
      });
    });

    it('should use default values when env vars are not set', async () => {
      // Temporarily clear env vars
      const originalToken = process.env.MAPBOX_TOKEN;
      const originalStyle = process.env.MAPBOX_STYLE;
      delete process.env.MAPBOX_TOKEN;
      delete process.env.MAPBOX_STYLE;

      const response = await request(app.getHttpServer())
        .get('/map/config')
        .expect(200);

      expect(response.body.mapboxToken).toBe('');
      expect(response.body.mapboxStyle).toBe('mapbox://styles/mapbox/streets-v11');

      // Restore env vars
      process.env.MAPBOX_TOKEN = originalToken;
      process.env.MAPBOX_STYLE = originalStyle;
    });
  });

  describe('POST /jobs/:id/location (Update Location)', () => {
    it('should update guard location successfully', async () => {
      const bookingId = 'booking-123';
      const locationDto = {
        latitude: 37.7849,
        longitude: -122.4094,
        accuracyMeters: 10,
      };

      const expectedResponse = {
        bookingId,
        guardId: mockGuardUser.getId().getValue(),
        latitude: 37.7849,
        longitude: -122.4094,
        timestamp: new Date(),
      };

      mockUpdateLocationUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/jobs/${bookingId}/location`)
        .set('x-test-user', 'guard')
        .send(locationDto)
        .expect(200);

      expect(response.body).toMatchObject({
        bookingId,
        guardId: mockGuardUser.getId().getValue(),
        latitude: 37.7849,
        longitude: -122.4094,
      });
    });

    it('should reject invalid latitude', async () => {
      await request(app.getHttpServer())
        .post('/jobs/booking-123/location')
        .set('x-test-user', 'guard')
        .send({
          latitude: 100, // Invalid: >90
          longitude: -122.4194,
          accuracyMeters: 10,
        })
        .expect(400);
    });

    it('should reject invalid longitude', async () => {
      await request(app.getHttpServer())
        .post('/jobs/booking-123/location')
        .set('x-test-user', 'guard')
        .send({
          latitude: 37.7749,
          longitude: -200, // Invalid: <-180
          accuracyMeters: 10,
        })
        .expect(400);
    });

    it('should reject negative accuracy', async () => {
      await request(app.getHttpServer())
        .post('/jobs/booking-123/location')
        .set('x-test-user', 'guard')
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracyMeters: -5, // Invalid: must be ≥0
        })
        .expect(400);
    });

    it('should reject if not a guard', async () => {
      await request(app.getHttpServer())
        .post('/jobs/booking-123/location')
        .set('x-test-user', 'customer')
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracyMeters: 10,
        })
        .expect(403); // Role guard should reject
    });

    it('should accept location without accuracy', async () => {
      const bookingId = 'booking-123';
      const locationDto = {
        latitude: 37.7849,
        longitude: -122.4094,
      };

      mockUpdateLocationUseCase.execute.mockResolvedValue({
        bookingId,
        guardId: mockGuardUser.getId().getValue(),
        latitude: 37.7849,
        longitude: -122.4094,
        timestamp: new Date(),
      });

      await request(app.getHttpServer())
        .post(`/jobs/${bookingId}/location`)
        .set('x-test-user', 'guard')
        .send(locationDto)
        .expect(200);
    });
  });

  describe('GET /jobs/:id/location (Get Current Location)', () => {
    it('should get current guard location', async () => {
      const bookingId = 'booking-123';
      const expectedResponse = {
        bookingId,
        guardId: mockGuardUser.getId().getValue(),
        latitude: 37.7849,
        longitude: -122.4094,
        timestamp: new Date(),
        accuracyMeters: 10,
      };

      mockGetCurrentLocationUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/jobs/${bookingId}/location`)
        .set('x-test-user', 'customer')
        .expect(200);

      expect(response.body).toMatchObject({
        bookingId,
        guardId: mockGuardUser.getId().getValue(),
        latitude: 37.7849,
        longitude: -122.4094,
      });
    });

    it('should allow guard to get location', async () => {
      mockGetCurrentLocationUseCase.execute.mockResolvedValue({
        bookingId: 'booking-123',
        guardId: mockGuardUser.getId().getValue(),
        latitude: 37.7849,
        longitude: -122.4094,
        timestamp: new Date(),
        accuracyMeters: 10,
      });

      await request(app.getHttpServer())
        .get('/jobs/booking-123/location')
        .set('x-test-user', 'guard')
        .expect(200);
    });
  });
});
