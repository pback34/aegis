import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ILocationRepository } from '../../ports/location.repository.interface';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { ILocationService } from '../../ports/location-service.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import {
  UpdateLocationDto,
  UpdateLocationResponseDto,
} from '../../dtos/location.dto';

@Injectable()
export class UpdateLocationUseCase {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly userRepository: IUserRepository,
    private readonly locationService: ILocationService,
  ) {}

  async execute(
    guardId: string,
    bookingId: string,
    dto: UpdateLocationDto,
  ): Promise<UpdateLocationResponseDto> {
    // Verify guard exists
    const guard = await this.userRepository.findGuardById(UserId.fromString(guardId));
    if (!guard) {
      throw new NotFoundException('Guard not found');
    }

    // Verify booking exists
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify guard is assigned to this booking
    const bookingGuardId = booking.getGuardId();
    if (
      !bookingGuardId ||
      bookingGuardId.getValue() !== guardId
    ) {
      throw new ForbiddenException(
        'You are not assigned to this booking',
      );
    }

    // Create location
    const location = new GeoLocation(dto.latitude, dto.longitude);

    // Save location update to database
    const locationUpdate = await this.locationRepository.save({
      bookingId,
      guardId: guard.getId(),
      location,
      accuracyMeters: dto.accuracyMeters,
      timestamp: new Date(),
    });

    // Update guard's current location
    guard.updateLocation(location);
    await this.userRepository.updateGuardLocation(guard);

    // Publish location update to real-time channel
    await this.locationService.publishLocationUpdate({
      bookingId,
      guardId: guard.getId().getValue(),
      location,
      timestamp: locationUpdate.timestamp,
    });

    return {
      bookingId: locationUpdate.bookingId,
      guardId: locationUpdate.guardId.getValue(),
      latitude: locationUpdate.location.getLatitude(),
      longitude: locationUpdate.location.getLongitude(),
      timestamp: locationUpdate.timestamp,
    };
  }
}
