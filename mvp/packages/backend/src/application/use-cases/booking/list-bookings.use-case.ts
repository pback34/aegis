import { Injectable, Inject } from '@nestjs/common';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { BookingStatus } from '../../../domain/entities/booking.entity';
import {
  ListBookingsQueryDto,
  ListBookingsResponseDto,
  GetBookingResponseDto,
} from '../../dtos/booking.dto';

@Injectable()
export class ListBookingsUseCase {
  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(
    query: ListBookingsQueryDto,
  ): Promise<ListBookingsResponseDto> {
    let bookings;

    if (query.customerId) {
      bookings = await this.bookingRepository.findByCustomerId(
        UserId.fromString(query.customerId),
      );
    } else if (query.guardId) {
      bookings = await this.bookingRepository.findByGuardId(
        UserId.fromString(query.guardId),
      );
    } else if (query.status) {
      bookings = await this.bookingRepository.findByStatus(
        query.status as BookingStatus,
      );
    } else {
      // Return available bookings by default (REQUESTED status)
      bookings = await this.bookingRepository.findAvailableBookings();
    }

    const bookingDtos: GetBookingResponseDto[] = bookings.map((booking) => ({
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
    }));

    return {
      bookings: bookingDtos,
      total: bookingDtos.length,
    };
  }
}
