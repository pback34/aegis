import { BaseDomainEvent } from './domain-event.interface';
import { Money } from '../value-objects';

export class BookingCompletedEvent extends BaseDomainEvent {
  constructor(
    public readonly bookingId: string,
    public readonly guardId: string,
    public readonly customerId: string,
    public readonly actualStart: Date,
    public readonly actualEnd: Date,
    public readonly finalAmount?: Money,
  ) {
    super('BookingCompleted', bookingId);
  }
}
