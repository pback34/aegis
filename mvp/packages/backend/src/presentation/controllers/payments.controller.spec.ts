import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { AuthorizePaymentUseCase } from '../../application/use-cases/payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from '../../application/use-cases/payment/capture-payment.use-case';
import { PaymentStatus } from '../../domain/entities/payment.entity';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockAuthorizePaymentUseCase: jest.Mocked<AuthorizePaymentUseCase>;
  let mockCapturePaymentUseCase: jest.Mocked<CapturePaymentUseCase>;

  beforeEach(async () => {
    mockAuthorizePaymentUseCase = {
      execute: jest.fn(),
    } as any;

    mockCapturePaymentUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: AuthorizePaymentUseCase, useValue: mockAuthorizePaymentUseCase },
        { provide: CapturePaymentUseCase, useValue: mockCapturePaymentUseCase },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  describe('authorize', () => {
    it('should authorize a payment', async () => {
      const authorizeDto = {
        bookingId: 'booking-id',
        amount: 200,
        currency: 'USD',
      };

      const expectedResponse = {
        paymentId: 'payment-id',
        bookingId: 'booking-id',
        stripePaymentIntentId: 'pi_123',
        clientSecret: 'secret_123',
        amount: 200,
        status: PaymentStatus.AUTHORIZED,
        createdAt: new Date(),
      };

      mockAuthorizePaymentUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.authorize(authorizeDto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthorizePaymentUseCase.execute).toHaveBeenCalledWith(authorizeDto);
    });
  });

  describe('capture', () => {
    it('should capture a payment', async () => {
      const captureDto = {
        paymentId: 'payment-id',
        amount: 200,
      };

      const expectedResponse = {
        paymentId: 'payment-id',
        bookingId: 'booking-id',
        stripePaymentIntentId: 'pi_123',
        amount: 200,
        platformFee: 20,
        guardPayout: 180,
        status: PaymentStatus.CAPTURED,
        capturedAt: new Date(),
      };

      mockCapturePaymentUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.capture(captureDto);

      expect(result).toEqual(expectedResponse);
      expect(mockCapturePaymentUseCase.execute).toHaveBeenCalledWith(captureDto);
    });

    it('should capture full authorized amount when amount not specified', async () => {
      const captureDto = {
        paymentId: 'payment-id',
      };

      const expectedResponse = {
        paymentId: 'payment-id',
        bookingId: 'booking-id',
        stripePaymentIntentId: 'pi_123',
        amount: 200,
        platformFee: 20,
        guardPayout: 180,
        status: PaymentStatus.CAPTURED,
        capturedAt: new Date(),
      };

      mockCapturePaymentUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.capture(captureDto);

      expect(result).toEqual(expectedResponse);
      expect(mockCapturePaymentUseCase.execute).toHaveBeenCalledWith(captureDto);
    });
  });
});
