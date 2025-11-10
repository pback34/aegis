import { BaseDomainEvent } from './domain-event.interface';

export class BookingAcceptedEvent extends BaseDomainEvent {
  constructor(
    public readonly bookingId: string,
    public readonly guardId: string,
    public readonly customerId: string,
  ) {
    super('BookingAccepted', bookingId);
  }
}
