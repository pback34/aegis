import { Injectable, NotFoundException } from '@nestjs/common';
import { IBookingRepository } from '../../ports/booking.repository.interface';
import { IUserRepository } from '../../ports/user.repository.interface';
import { Booking, BookingStatus } from '../../../domain/entities/booking.entity';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { SimpleMatchingService } from '../../../domain/services/simple-matching.service';
import { PricingService } from '../../../domain/services/pricing.service';
import {
  CreateBookingDto,
  CreateBookingResponseDto,
} from '../../dtos/booking.dto';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly userRepository: IUserRepository,
    private readonly matchingService: SimpleMatchingService,
    private readonly pricingService: PricingService,
  ) {}

  async execute(
    customerId: string,
    dto: CreateBookingDto,
  ): Promise<CreateBookingResponseDto> {
    // Verify customer exists
    const customer = await this.userRepository.findCustomerById(
      new UserId(customerId),
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Create service location
    const serviceLocation = new GeoLocation(
      dto.serviceLocationLat,
      dto.serviceLocationLng,
    );

    // Parse dates
    const scheduledStart = new Date(dto.scheduledStart);
    const scheduledEnd = new Date(dto.scheduledEnd);

    // Create booking with REQUESTED status
    const booking = new Booking({
      customerId: customer.getId(),
      status: BookingStatus.REQUESTED,
      serviceLocationAddress: dto.serviceLocationAddress,
      serviceLocation,
      scheduledStart,
      scheduledEnd,
      estimatedHours: dto.estimatedHours,
    });

    // Try to match with an available guard
    const availableGuards = await this.userRepository.findAvailableGuards();
    const matchedGuard = this.matchingService.findNearestGuard(
      availableGuards,
      serviceLocation,
      10, // max distance in km
    );

    if (matchedGuard) {
      // Match found - assign guard and calculate pricing
      booking.assignGuard(matchedGuard.getId());

      const { estimatedTotal } = this.pricingService.calculateBookingCost(
        matchedGuard.getHourlyRate(),
        dto.estimatedHours,
      );

      booking.updatePricing(matchedGuard.getHourlyRate(), estimatedTotal);
    }

    // Save booking
    const savedBooking = await this.bookingRepository.save(booking);

    // Return response
    return {
      id: savedBooking.getId(),
      customerId: savedBooking.getCustomerId().getValue(),
      guardId: savedBooking.getGuardId()?.getValue(),
      status: savedBooking.getStatus(),
      serviceLocationAddress: savedBooking.getServiceLocationAddress(),
      serviceLocationLat: savedBooking.getServiceLocation().getLatitude(),
      serviceLocationLng: savedBooking.getServiceLocation().getLongitude(),
      scheduledStart: savedBooking.getScheduledStart(),
      scheduledEnd: savedBooking.getScheduledEnd(),
      estimatedHours: savedBooking.getEstimatedHours(),
      estimatedTotal: savedBooking.getEstimatedTotal()?.getAmount(),
      hourlyRate: savedBooking.getHourlyRate()?.getAmount(),
      createdAt: savedBooking.getCreatedAt(),
    };
  }
}
