import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { AcceptBookingResponseDto } from '../../dtos/booking.dto';

@Injectable()
export class AcceptBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    guardId: string,
    bookingId: string,
  ): Promise<AcceptBookingResponseDto> {
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

    // Check if guard already has an active booking
    const activeBooking =
      await this.bookingRepository.findActiveBookingForGuard(guard.getId());
    if (activeBooking && activeBooking.getId() !== bookingId) {
      throw new BadRequestException(
        'You already have an active booking',
      );
    }

    // Accept booking
    booking.acceptByGuard();

    // Update guard availability
    guard.setAvailable(false);
    await this.userRepository.updateGuardLocation(guard);

    // Save booking
    const updatedBooking = await this.bookingRepository.update(booking);

    const finalGuardId = updatedBooking.getGuardId();
    if (!finalGuardId) {
      throw new Error('Guard ID not found after booking acceptance');
    }

    return {
      id: updatedBooking.getId(),
      guardId: finalGuardId.getValue(),
      status: updatedBooking.getStatus(),
      acceptedAt: updatedBooking.getUpdatedAt(),
    };
  }
}
