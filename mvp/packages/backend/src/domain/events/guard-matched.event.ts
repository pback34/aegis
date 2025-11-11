import { BaseDomainEvent } from './domain-event.interface';
import { Money } from '../value-objects';

export class GuardMatchedEvent extends BaseDomainEvent {
  constructor(
    public readonly bookingId: string,
    public readonly guardId: string,
    public readonly customerId: string,
    public readonly hourlyRate: Money,
    public readonly estimatedTotal: Money,
  ) {
    super('GuardMatched', bookingId);
  }
}
