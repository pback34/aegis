import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from '../../../src/presentation/controllers/users.controller';
import { UpdateUserProfileUseCase } from '../../../src/application/use-cases/user/update-user-profile.use-case';
import { JwtAuthGuard } from '../../../src/infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/infrastructure/auth/guards/roles.guard';
import { Customer } from '../../../src/domain/entities/customer.entity';
import { Guard } from '../../../src/domain/entities/guard.entity';
import { Email } from '../../../src/domain/value-objects/email.value-object';
import { UserId } from '../../../src/domain/value-objects/user-id.value-object';
import { UserRole, UserStatus } from '../../../src/domain/entities/user.entity';
import { Money } from '../../../src/domain/value-objects/money.value-object';
import { GeoLocation } from '../../../src/domain/value-objects/geo-location.value-object';

describe('Users API (e2e)', () => {
  let app: INestApplication;
  let mockUpdateUserProfileUseCase: jest.Mocked<UpdateUserProfileUseCase>;

  const mockCustomer = new Customer({
    id: UserId.fromString('550e8400-e29b-41d4-a716-446655440001'),
    email: new Email('customer@example.com'),
    passwordHash: 'hashed-password',
    fullName: 'Test Customer',
    phone: '+1234567890',
    status: UserStatus.ACTIVE,
  });

  const mockGuard = new Guard({
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
    mockUpdateUserProfileUseCase = { execute: jest.fn() } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UpdateUserProfileUseCase, useValue: mockUpdateUserProfileUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          // Inject mock user based on test header
          request.user = request.headers['x-test-user'] === 'guard' ? mockGuard : mockCustomer;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
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

  describe('GET /users/profile', () => {
    it('should return customer profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('x-test-user', 'customer')
        .expect(200);

      expect(response.body).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Test Customer',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
      });
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return guard profile with guard-specific fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('x-test-user', 'guard')
        .expect(200);

      expect(response.body).toMatchObject({
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'guard@example.com',
        role: UserRole.GUARD,
        fullName: 'Test Guard',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-12345',
        hourlyRate: 50,
        rating: 4.8,
        isAvailable: true,
        currentLatitude: 37.7749,
        currentLongitude: -122.4194,
      });
    });
  });

  describe('PATCH /users/profile', () => {
    it('should update customer profile', async () => {
      const updateDto = {
        fullName: 'Updated Customer',
        phone: '+14155552671',
      };

      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Updated Customer',
        phone: '+14155552671',
        updatedAt: new Date(),
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('x-test-user', 'customer')
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        fullName: 'Updated Customer',
        phone: '+14155552671',
      });
    });

    it('should update guard profile with guard-specific fields', async () => {
      const updateDto = {
        fullName: 'Updated Guard',
        phone: '+14155552672',
        isAvailable: false,
        hourlyRate: 60,
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'guard@example.com',
        role: UserRole.GUARD,
        fullName: 'Updated Guard',
        phone: '+14155552672',
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('x-test-user', 'guard')
        .send(updateDto)
        .expect(200);

      expect(response.body.fullName).toBe('Updated Guard');
      expect(mockUpdateUserProfileUseCase.execute).toHaveBeenCalledWith(
        mockGuard.getId(),
        updateDto,
      );
    });

    it('should update only specified fields', async () => {
      const updateDto = {
        phone: '+14155552673',
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Test Customer',
        phone: '+14155552673',
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('x-test-user', 'customer')
        .send(updateDto)
        .expect(200);

      expect(response.body.phone).toBe('+14155552673');
    });

    it('should allow empty update (no changes)', async () => {
      mockUpdateUserProfileUseCase.execute.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Test Customer',
        phone: '+1234567890',
        updatedAt: new Date(),
      });

      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('x-test-user', 'customer')
        .send({})
        .expect(200);
    });

    it('should strip unknown fields', async () => {
      const updateDto = {
        fullName: 'Updated Customer',
        unknownField: 'should be stripped',
      };

      mockUpdateUserProfileUseCase.execute.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        fullName: 'Updated Customer',
        phone: '+1234567890',
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('x-test-user', 'customer')
        .send(updateDto)
        .expect(200);

      expect(response.body).not.toHaveProperty('unknownField');
    });
  });
});
