import { Injectable, NotFoundException } from '@nestjs/common';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { GetBookingResponseDto } from '../../dtos/booking.dto';

@Injectable()
export class GetBookingUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(bookingId: string): Promise<GetBookingResponseDto> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      id: booking.getId(),
      customerId: booking.getCustomerId().getValue(),
      guardId: booking.getGuardId()?.getValue(),
      status: booking.getStatus(),
      serviceLocationAddress: booking.getServiceLocationAddress(),
      serviceLocationLat: booking.getServiceLocation().getLatitude(),
      serviceLocationLng: booking.getServiceLocation().getLongitude(),
      scheduledStart: booking.getScheduledStart(),
      scheduledEnd: booking.getScheduledEnd(),
      actualStart: booking.getActualStart(),
      actualEnd: booking.getActualEnd(),
      estimatedHours: booking.getEstimatedHours(),
      estimatedTotal: booking.getEstimatedTotal()?.getAmount(),
      hourlyRate: booking.getHourlyRate()?.getAmount(),
      createdAt: booking.getCreatedAt(),
      updatedAt: booking.getUpdatedAt(),
    };
  }
}
