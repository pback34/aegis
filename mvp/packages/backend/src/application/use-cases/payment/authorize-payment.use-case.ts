import { Injectable, NotFoundException } from '@nestjs/common';
import { IPaymentRepository } from '../../ports/payment.repository.interface';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { IPaymentGateway } from '../../ports/payment-gateway.interface';
import { Payment, PaymentStatus } from '../../../domain/entities/payment.entity';
import { Money } from '../../../domain/value-objects/money.value-object';
import { PricingService } from '../../../domain/services/pricing.service';
import {
  AuthorizePaymentDto,
  AuthorizePaymentResponseDto,
} from '../../dtos/payment.dto';

@Injectable()
export class AuthorizePaymentUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly userRepository: IUserRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly pricingService: PricingService,
  ) {}

  async execute(dto: AuthorizePaymentDto): Promise<AuthorizePaymentResponseDto> {
    // Find booking
    const booking = await this.bookingRepository.findById(dto.bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify guard is assigned
    if (!booking.getGuardId()) {
      throw new Error('Cannot authorize payment - no guard assigned');
    }

    // Get customer and guard
    const customer = await this.userRepository.findCustomerById(
      booking.getCustomerId(),
    );
    const guard = await this.userRepository.findGuardById(
      booking.getGuardId(),
    );

    if (!customer || !guard) {
      throw new NotFoundException('Customer or guard not found');
    }

    // Calculate payment breakdown
    const amount = new Money(dto.amount, dto.currency || 'USD');
    const { platformFee, guardPayout } = this.pricingService.calculatePaymentBreakdown(amount);

    // Authorize payment via Stripe
    const paymentIntent = await this.paymentGateway.authorizePayment(
      amount,
      customer.getStripeCustomerId() || customer.getId().getValue(),
      {
        bookingId: booking.getId(),
        customerId: customer.getId().getValue(),
        guardId: guard.getId().getValue(),
      },
    );

    // Create payment entity
    const payment = new Payment({
      bookingId: booking.getId(),
      customerId: customer.getId(),
      guardId: guard.getId(),
      amount,
      platformFee,
      guardPayout,
      status: PaymentStatus.AUTHORIZED,
      stripePaymentIntentId: paymentIntent.paymentIntentId,
    });

    // Save payment
    const savedPayment = await this.paymentRepository.save(payment);

    return {
      paymentId: savedPayment.getId(),
      bookingId: savedPayment.getBookingId(),
      stripePaymentIntentId: savedPayment.getStripePaymentIntentId(),
      clientSecret: paymentIntent.clientSecret,
      amount: savedPayment.getAmount().getAmount(),
      status: savedPayment.getStatus(),
      createdAt: savedPayment.getCreatedAt(),
    };
  }
}
