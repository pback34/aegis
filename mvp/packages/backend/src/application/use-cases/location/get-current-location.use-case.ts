import { Injectable, NotFoundException } from '@nestjs/common';
import { ILocationRepository } from '../../ports/location.repository.interface';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { GetCurrentLocationResponseDto } from '../../dtos/location.dto';

@Injectable()
export class GetCurrentLocationUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(bookingId: string): Promise<GetCurrentLocationResponseDto> {
    // Verify booking exists
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Get latest location
    const locationUpdate =
      await this.locationRepository.getLatestLocationForBooking(bookingId);
    if (!locationUpdate) {
      throw new NotFoundException('No location updates found for this booking');
    }

    return {
      bookingId: locationUpdate.bookingId,
      guardId: locationUpdate.guardId.getValue(),
      latitude: locationUpdate.location.getLatitude(),
      longitude: locationUpdate.location.getLongitude(),
      timestamp: locationUpdate.timestamp,
      accuracyMeters: locationUpdate.accuracyMeters,
    };
  }
}
