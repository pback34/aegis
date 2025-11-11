import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { PaymentsController } from '../../../src/presentation/controllers/payments.controller';
import { AuthorizePaymentUseCase } from '../../../src/application/use-cases/payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from '../../../src/application/use-cases/payment/capture-payment.use-case';
import { JwtAuthGuard } from '../../../src/infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/infrastructure/auth/guards/roles.guard';
import { PaymentStatus } from '../../../src/domain/entities/payment.entity';
import { UserRole } from '../../../src/domain/entities/user.entity';

describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let mockAuthorizePaymentUseCase: jest.Mocked<AuthorizePaymentUseCase>;
  let mockCapturePaymentUseCase: jest.Mocked<CapturePaymentUseCase>;

  const mockUser = {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user@example.com',
    role: UserRole.CUSTOMER,
  };

  beforeAll(async () => {
    mockAuthorizePaymentUseCase = { execute: jest.fn() } as any;
    mockCapturePaymentUseCase = { execute: jest.fn() } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: AuthorizePaymentUseCase, useValue: mockAuthorizePaymentUseCase },
        { provide: CapturePaymentUseCase, useValue: mockCapturePaymentUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
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

  describe('POST /payments/authorize', () => {
    it('should authorize a payment successfully', async () => {
      const authorizeDto = {
        bookingId: 'booking-123',
        amount: 200,
        currency: 'USD',
      };

      const expectedResponse = {
        paymentId: 'payment-123',
        bookingId: 'booking-123',
        stripePaymentIntentId: 'pi_xyz123',
        clientSecret: 'secret_xyz123',
        amount: 200,
        status: PaymentStatus.AUTHORIZED,
        createdAt: new Date(),
      };

      mockAuthorizePaymentUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/payments/authorize')
        .send(authorizeDto)
        .expect(200);

      expect(response.body).toMatchObject({
        paymentId: 'payment-123',
        bookingId: 'booking-123',
        amount: 200,
        status: PaymentStatus.AUTHORIZED,
      });
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('stripePaymentIntentId');
    });

    it('should reject negative amount', async () => {
      await request(app.getHttpServer())
        .post('/payments/authorize')
        .send({
          bookingId: 'booking-123',
          amount: -50, // Invalid: must be ≥0
          currency: 'USD',
        })
        .expect(400);
    });

    it('should reject missing booking ID', async () => {
      await request(app.getHttpServer())
        .post('/payments/authorize')
        .send({
          amount: 200,
          currency: 'USD',
        })
        .expect(400);
    });

    it('should reject missing amount', async () => {
      await request(app.getHttpServer())
        .post('/payments/authorize')
        .send({
          bookingId: 'booking-123',
          currency: 'USD',
        })
        .expect(400);
    });

    it('should accept authorization without currency (defaults to USD)', async () => {
      const authorizeDto = {
        bookingId: 'booking-123',
        amount: 200,
      };

      mockAuthorizePaymentUseCase.execute.mockResolvedValue({
        paymentId: 'payment-123',
        bookingId: 'booking-123',
        stripePaymentIntentId: 'pi_xyz123',
        clientSecret: 'secret_xyz123',
        amount: 200,
        status: PaymentStatus.AUTHORIZED,
        createdAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/payments/authorize')
        .send(authorizeDto)
        .expect(200);
    });

    it('should reject zero amount', async () => {
      await request(app.getHttpServer())
        .post('/payments/authorize')
        .send({
          bookingId: 'booking-123',
          amount: 0, // Invalid: must be >0
          currency: 'USD',
        })
        .expect(400);
    });
  });

  describe('POST /payments/capture', () => {
    it('should capture full authorized amount', async () => {
      const captureDto = {
        paymentId: 'payment-123',
      };

      const expectedResponse = {
        paymentId: 'payment-123',
        bookingId: 'booking-123',
        stripePaymentIntentId: 'pi_xyz123',
        amount: 200,
        platformFee: 20,
        guardPayout: 180,
        status: PaymentStatus.CAPTURED,
        capturedAt: new Date(),
      };

      mockCapturePaymentUseCase.execute.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/payments/capture')
        .send(captureDto)
        .expect(200);

      expect(response.body).toMatchObject({
        paymentId: 'payment-123',
        amount: 200,
        platformFee: 20,
        guardPayout: 180,
        status: PaymentStatus.CAPTURED,
      });
    });

    it('should capture partial amount', async () => {
      const captureDto = {
        paymentId: 'payment-123',
        amount: 150, // Partial capture
      };

      mockCapturePaymentUseCase.execute.mockResolvedValue({
        paymentId: 'payment-123',
        bookingId: 'booking-123',
        stripePaymentIntentId: 'pi_xyz123',
        amount: 150,
        platformFee: 15,
        guardPayout: 135,
        status: PaymentStatus.CAPTURED,
        capturedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/payments/capture')
        .send(captureDto)
        .expect(200);

      expect(response.body.amount).toBe(150);
    });

    it('should reject missing payment ID', async () => {
      await request(app.getHttpServer())
        .post('/payments/capture')
        .send({
          amount: 200,
        })
        .expect(400);
    });

    it('should reject negative capture amount', async () => {
      await request(app.getHttpServer())
        .post('/payments/capture')
        .send({
          paymentId: 'payment-123',
          amount: -50, // Invalid
        })
        .expect(400);
    });

    it('should reject zero capture amount', async () => {
      await request(app.getHttpServer())
        .post('/payments/capture')
        .send({
          paymentId: 'payment-123',
          amount: 0, // Invalid: must be >0
        })
        .expect(400);
    });
  });
});
