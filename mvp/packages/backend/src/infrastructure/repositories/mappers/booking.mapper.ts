import { Booking, BookingStatus } from '../../../domain/entities/booking.entity';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { BookingEntity } from '../../database/entities/booking.entity';

export class BookingMapper {
  static toDomain(entity: BookingEntity): Booking {
    return new Booking({
      id: entity.id,
      customerId: new UserId(entity.customer_id),
      guardId: entity.guard_id ? new UserId(entity.guard_id) : undefined,
      status: entity.status as BookingStatus,
      serviceLocationAddress: entity.service_location_address,
      serviceLocation: new GeoLocation(
        entity.service_location_lat,
        entity.service_location_lng,
      ),
      scheduledStart: entity.scheduled_start,
      scheduledEnd: entity.scheduled_end,
      actualStart: entity.actual_start || undefined,
      actualEnd: entity.actual_end || undefined,
      hourlyRate: entity.hourly_rate ? new Money(entity.hourly_rate) : undefined,
      estimatedHours: entity.estimated_hours,
      estimatedTotal: entity.estimated_total ? new Money(entity.estimated_total) : undefined,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    });
  }

  static toPersistence(booking: Booking): Partial<BookingEntity> {
    return {
      id: booking.getId(),
      customer_id: booking.getCustomerId().getValue(),
      guard_id: booking.getGuardId()?.getValue() || null,
      status: booking.getStatus(),
      service_location_address: booking.getServiceLocationAddress(),
      service_location_lat: booking.getServiceLocation().getLatitude(),
      service_location_lng: booking.getServiceLocation().getLongitude(),
      scheduled_start: booking.getScheduledStart(),
      scheduled_end: booking.getScheduledEnd(),
      actual_start: booking.getActualStart() || null,
      actual_end: booking.getActualEnd() || null,
      hourly_rate: booking.getHourlyRate()?.getAmount() || null,
      estimated_hours: booking.getEstimatedHours(),
      estimated_total: booking.getEstimatedTotal()?.getAmount() || null,
      created_at: booking.getCreatedAt(),
      updated_at: booking.getUpdatedAt(),
    };
  }
}
