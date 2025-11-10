import { BaseDomainEvent } from './domain-event.interface';
import { GeoLocation } from '../value-objects';

export class BookingRequestedEvent extends BaseDomainEvent {
  constructor(
    public readonly bookingId: string,
    public readonly customerId: string,
    public readonly serviceLocation: GeoLocation,
    public readonly scheduledStart: Date,
    public readonly scheduledEnd: Date,
    public readonly estimatedHours: number,
  ) {
    super('BookingRequested', bookingId);
  }
}
