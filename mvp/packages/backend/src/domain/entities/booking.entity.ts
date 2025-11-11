import { UserId } from '../value-objects/user-id.value-object';
import { GeoLocation } from '../value-objects/geo-location.value-object';
import { Money } from '../value-objects/money.value-object';
import { v4 as uuidv4 } from 'uuid';

export enum BookingStatus {
  REQUESTED = 'requested',
  MATCHED = 'matched',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface BookingProps {
  id?: string;
  customerId: UserId;
  guardId?: UserId;
  status: BookingStatus;
  serviceLocationAddress: string;
  serviceLocation: GeoLocation;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  hourlyRate?: Money;
  estimatedHours: number;
  estimatedTotal?: Money;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Booking {
  private readonly id: string;
  private readonly customerId: UserId;
  private guardId?: UserId;
  private status: BookingStatus;
  private readonly serviceLocationAddress: string;
  private readonly serviceLocation: GeoLocation;
  private readonly scheduledStart: Date;
  private readonly scheduledEnd: Date;
  private actualStart?: Date;
  private actualEnd?: Date;
  private hourlyRate?: Money;
  private readonly estimatedHours: number;
  private estimatedTotal?: Money;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: BookingProps) {
    this.id = props.id || uuidv4();
    this.customerId = props.customerId;
    this.guardId = props.guardId;
    this.status = props.status;
    this.serviceLocationAddress = props.serviceLocationAddress;
    this.serviceLocation = props.serviceLocation;
    this.scheduledStart = props.scheduledStart;
    this.scheduledEnd = props.scheduledEnd;
    this.actualStart = props.actualStart;
    this.actualEnd = props.actualEnd;
    this.hourlyRate = props.hourlyRate;
    this.estimatedHours = props.estimatedHours;
    this.estimatedTotal = props.estimatedTotal;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  private validate(): void {
    if (this.estimatedHours <= 0) {
      throw new Error('Estimated hours must be greater than 0');
    }
    if (this.scheduledEnd <= this.scheduledStart) {
      throw new Error('Scheduled end must be after scheduled start');
    }
    if (!this.serviceLocationAddress || this.serviceLocationAddress.trim().length < 5) {
      throw new Error('Service location address must be at least 5 characters');
    }
  }

  static create(
    customerId: UserId,
    serviceLocationAddress: string,
    serviceLocation: GeoLocation,
    scheduledStart: Date,
    scheduledEnd: Date,
    estimatedHours: number,
  ): Booking {
    return new Booking({
      customerId,
      serviceLocationAddress,
      serviceLocation,
      scheduledStart,
      scheduledEnd,
      estimatedHours,
      status: BookingStatus.REQUESTED,
    });
  }

  static reconstitute(props: BookingProps & { id: string }): Booking {
    return new Booking(props);
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getCustomerId(): UserId {
    return this.customerId;
  }

  getGuardId(): UserId | undefined {
    return this.guardId;
  }

  getStatus(): BookingStatus {
    return this.status;
  }

  getServiceLocationAddress(): string {
    return this.serviceLocationAddress;
  }

  getServiceLocation(): GeoLocation {
    return this.serviceLocation;
  }

  getScheduledStart(): Date {
    return this.scheduledStart;
  }

  getScheduledEnd(): Date {
    return this.scheduledEnd;
  }

  getActualStart(): Date | undefined {
    return this.actualStart;
  }

  getActualEnd(): Date | undefined {
    return this.actualEnd;
  }

  getHourlyRate(): Money | undefined {
    return this.hourlyRate;
  }

  getEstimatedHours(): number {
    return this.estimatedHours;
  }

  getEstimatedTotal(): Money | undefined {
    return this.estimatedTotal;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // State machine transitions
  assignGuard(guardId: UserId, hourlyRate: Money): void {
    if (this.status !== BookingStatus.REQUESTED) {
      throw new Error(`Cannot assign guard in status: ${this.status}`);
    }
    this.guardId = guardId;
    this.hourlyRate = hourlyRate;
    this.estimatedTotal = hourlyRate.multiply(this.estimatedHours);
    this.status = BookingStatus.MATCHED;
    this.touch();
  }

  acceptByGuard(): void {
    if (this.status !== BookingStatus.MATCHED) {
      throw new Error(`Cannot accept booking in status: ${this.status}`);
    }
    if (!this.guardId) {
      throw new Error('Cannot accept booking without assigned guard');
    }
    this.status = BookingStatus.ACCEPTED;
    this.touch();
  }

  startJob(): void {
    if (this.status !== BookingStatus.ACCEPTED) {
      throw new Error(`Cannot start job in status: ${this.status}`);
    }
    this.actualStart = new Date();
    this.status = BookingStatus.IN_PROGRESS;
    this.touch();
  }

  completeJob(): void {
    if (this.status !== BookingStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete job in status: ${this.status}`);
    }
    this.actualEnd = new Date();
    this.status = BookingStatus.COMPLETED;
    this.touch();
  }

  cancel(): void {
    if (this.status === BookingStatus.COMPLETED || this.status === BookingStatus.CANCELLED) {
      throw new Error(`Cannot cancel booking in status: ${this.status}`);
    }
    this.status = BookingStatus.CANCELLED;
    this.touch();
  }

  // Business queries
  isActive(): boolean {
    return (
      this.status === BookingStatus.REQUESTED ||
      this.status === BookingStatus.MATCHED ||
      this.status === BookingStatus.ACCEPTED ||
      this.status === BookingStatus.IN_PROGRESS
    );
  }

  isCompleted(): boolean {
    return this.status === BookingStatus.COMPLETED;
  }

  isCancelled(): boolean {
    return this.status === BookingStatus.CANCELLED;
  }

  hasGuard(): boolean {
    return this.guardId !== undefined;
  }

  getActualDuration(): number | undefined {
    if (!this.actualStart || !this.actualEnd) {
      return undefined;
    }
    const durationMs = this.actualEnd.getTime() - this.actualStart.getTime();
    return durationMs / (1000 * 60 * 60); // Convert to hours
  }

  calculateFinalAmount(): Money | undefined {
    if (!this.hourlyRate || !this.actualStart || !this.actualEnd) {
      return undefined;
    }
    const actualHours = this.getActualDuration() || 0;
    return this.hourlyRate.multiply(actualHours);
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
