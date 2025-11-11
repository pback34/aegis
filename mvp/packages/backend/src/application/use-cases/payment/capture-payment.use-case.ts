import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IPaymentRepository } from '../../ports/payment.repository.interface';
import { IPaymentGateway } from '../../ports/payment-gateway.interface';
import { PaymentStatus } from '../../../domain/entities/payment.entity';
import { Money } from '../../../domain/value-objects/money.value-object';
import {
  CapturePaymentDto,
  CapturePaymentResponseDto,
} from '../../dtos/payment.dto';

@Injectable()
export class CapturePaymentUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(dto: CapturePaymentDto): Promise<CapturePaymentResponseDto> {
    // Find payment
    const payment = await this.paymentRepository.findById(dto.paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify payment is in authorized state
    if (payment.getStatus() !== PaymentStatus.AUTHORIZED) {
      throw new BadRequestException(
        `Cannot capture payment in ${payment.getStatus()} status`,
      );
    }

    // Determine amount to capture
    const amountToCapture = dto.amount
      ? new Money(dto.amount)
      : payment.getAmount();

    // Capture payment via Stripe
    const captureResult = await this.paymentGateway.capturePayment(
      payment.getStripePaymentIntentId(),
      amountToCapture,
    );

    // Update payment status
    payment.capture();

    // Update amount if different
    if (dto.amount && dto.amount !== payment.getAmount().getAmount()) {
      // Recalculate fees with new amount
      // For now, we'll keep the original breakdown
      // In production, you'd recalculate based on actual captured amount
    }

    // Save updated payment
    const updatedPayment = await this.paymentRepository.update(payment);

    return {
      paymentId: updatedPayment.getId(),
      bookingId: updatedPayment.getBookingId(),
      stripePaymentIntentId: updatedPayment.getStripePaymentIntentId(),
      amount: updatedPayment.getAmount().getAmount(),
      platformFee: updatedPayment.getPlatformFee().getAmount(),
      guardPayout: updatedPayment.getGuardPayout().getAmount(),
      status: updatedPayment.getStatus(),
      capturedAt: updatedPayment.getUpdatedAt(),
    };
  }
}
