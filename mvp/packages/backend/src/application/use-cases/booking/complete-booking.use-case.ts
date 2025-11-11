import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { CompleteBookingResponseDto } from '../../dtos/booking.dto';

@Injectable()
export class CompleteBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    guardId: string,
    bookingId: string,
  ): Promise<CompleteBookingResponseDto> {
    // Verify guard exists
    const guard = await this.userRepository.findGuardById(new UserId(guardId));
    if (!guard) {
      throw new NotFoundException('Guard not found');
    }

    // Find booking
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify guard is assigned to this booking
    if (
      !booking.getGuardId() ||
      booking.getGuardId().getValue() !== guardId
    ) {
      throw new ForbiddenException(
        'You are not assigned to this booking',
      );
    }

    // Complete booking
    booking.complete();

    // Update guard availability
    guard.setAvailable(true);
    await this.userRepository.updateGuardLocation(guard);

    // Save booking
    const updatedBooking = await this.bookingRepository.update(booking);

    // Calculate actual hours
    let actualHours: number | undefined;
    if (updatedBooking.getActualStart() && updatedBooking.getActualEnd()) {
      const durationMs =
        updatedBooking.getActualEnd().getTime() -
        updatedBooking.getActualStart().getTime();
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
