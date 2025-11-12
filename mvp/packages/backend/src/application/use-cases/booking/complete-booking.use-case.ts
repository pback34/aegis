import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { IPaymentRepository } from '../../ports/payment.repository.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { CompleteBookingResponseDto } from '../../dtos/booking.dto';
import { CapturePaymentUseCase } from '../payment/capture-payment.use-case';
import { PaymentStatus } from '../../../domain/entities/payment.entity';

@Injectable()
export class CompleteBookingUseCase {
  private readonly logger = new Logger(CompleteBookingUseCase.name);

  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
    private readonly capturePaymentUseCase: CapturePaymentUseCase,
  ) {}

  async execute(
    guardId: string,
    bookingId: string,
  ): Promise<CompleteBookingResponseDto> {
    // Verify guard exists
    const guard = await this.userRepository.findGuardById(UserId.fromString(guardId));
    if (!guard) {
      throw new NotFoundException('Guard not found');
    }

    // Find booking
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify guard is assigned to this booking
    const bookingGuardId = booking.getGuardId();
    if (!bookingGuardId || bookingGuardId.getValue() !== guardId) {
      throw new ForbiddenException(
        'You are not assigned to this booking',
      );
    }

    // Complete booking
    booking.completeJob();

    // Update guard availability
    guard.setAvailable(true);
    await this.userRepository.updateGuardLocation(guard);

    // Save booking
    const updatedBooking = await this.bookingRepository.update(booking);

    // Attempt to capture payment if one exists and is authorized
    try {
      const payment = await this.paymentRepository.findByBookingId(bookingId);

      if (payment && payment.getStatus() === PaymentStatus.AUTHORIZED) {
        this.logger.log(`Capturing payment for booking ${bookingId}`);

        await this.capturePaymentUseCase.execute({
          paymentId: payment.getId(),
        });

        this.logger.log(`Payment captured successfully for booking ${bookingId}`);
      } else if (payment) {
        this.logger.warn(
          `Payment for booking ${bookingId} is in status ${payment.getStatus()}, cannot capture`,
        );
      } else {
        this.logger.warn(`No payment found for booking ${bookingId}`);
      }
    } catch (error) {
      // Log payment capture failure but don't fail the booking completion
      this.logger.error(
        `Failed to capture payment for booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue with booking completion even if payment capture fails
    }

    // Calculate actual hours
    let actualHours: number | undefined;
    const actualStart = updatedBooking.getActualStart();
    const actualEnd = updatedBooking.getActualEnd();
    if (actualStart && actualEnd) {
      const durationMs = actualEnd.getTime() - actualStart.getTime();
      actualHours = durationMs / (1000 * 60 * 60); // convert to hours
    }

    return {
      id: updatedBooking.getId(),
      status: updatedBooking.getStatus(),
      completedAt: updatedBooking.getUpdatedAt(),
      actualHours,
      finalAmount: updatedBooking.getEstimatedTotal()?.getAmount(),
    };
  }
}
