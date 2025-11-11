import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthorizePaymentUseCase } from '../../application/use-cases/payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from '../../application/use-cases/payment/capture-payment.use-case';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/guards/roles.guard';
import {
  AuthorizePaymentDto,
  AuthorizePaymentResponseDto,
  CapturePaymentDto,
  CapturePaymentResponseDto,
} from '../../application/dtos/payment.dto';

/**
 * Payments Controller
 * Handles payment authorization and capture
 * All routes require authentication
 */
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly authorizePaymentUseCase: AuthorizePaymentUseCase,
    private readonly capturePaymentUseCase: CapturePaymentUseCase,
  ) {}

  /**
   * Authorize a payment for a booking
   * POST /payments/authorize
   *
   * Creates a Stripe payment intent and authorizes the payment
   * Returns client secret for frontend to confirm payment
   */
  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  async authorize(
    @Body() dto: AuthorizePaymentDto,
  ): Promise<AuthorizePaymentResponseDto> {
    return this.authorizePaymentUseCase.execute(dto);
  }

  /**
   * Capture a previously authorized payment
   * POST /payments/capture
   *
   * Captures the authorized payment after job completion
   */
  @Post('capture')
  @HttpCode(HttpStatus.OK)
  async capture(
    @Body() dto: CapturePaymentDto,
  ): Promise<CapturePaymentResponseDto> {
    return this.capturePaymentUseCase.execute(dto);
  }
}
