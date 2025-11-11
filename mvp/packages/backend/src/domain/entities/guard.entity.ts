import { User, UserRole, UserStatus, UserProps } from './user.entity';
import { Email, UserId, Money, GeoLocation } from '../value-objects';

export interface GuardProps extends Omit<UserProps, 'role'> {
  licenseNumber?: string;
  hourlyRate: Money;
  rating: number;
  isAvailable: boolean;
  currentLocation?: GeoLocation;
  lastLocationUpdate?: Date;
  stripeConnectAccountId?: string;
}

export class Guard extends User {
  private licenseNumber?: string;
  private hourlyRate: Money;
  private rating: number;
  private isAvailable: boolean;
  private currentLocation?: GeoLocation;
  private lastLocationUpdate?: Date;
  private stripeConnectAccountId?: string;

  constructor(props: GuardProps) {
    super({
      ...props,
      role: UserRole.GUARD,
    });

    this.licenseNumber = props.licenseNumber;
    this.hourlyRate = props.hourlyRate;
    this.rating = props.rating;
    this.isAvailable = props.isAvailable;
    this.currentLocation = props.currentLocation;
    this.lastLocationUpdate = props.lastLocationUpdate;
    this.stripeConnectAccountId = props.stripeConnectAccountId;

    this.validateGuardSpecific();
  }

  private validateGuardSpecific(): void {
    if (this.rating < 0 || this.rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
  }

  static create(
    email: Email,
    passwordHash: string,
    fullName: string,
    hourlyRate: Money,
    phone?: string,
    licenseNumber?: string,
  ): Guard {
    return new Guard({
      email,
      passwordHash,
      fullName,
      phone,
      licenseNumber,
      hourlyRate,
      rating: 5.0,
      isAvailable: false,
      status: UserStatus.ACTIVE,
    });
  }

  static reconstitute(props: GuardProps & { id: UserId }): Guard {
    return new Guard(props);
  }

  // Getters
  getLicenseNumber(): string | undefined {
    return this.licenseNumber;
  }

  getHourlyRate(): Money {
    return this.hourlyRate;
  }

  getRating(): number {
    return this.rating;
  }

  getIsAvailable(): boolean {
    return this.isAvailable;
  }

  getCurrentLocation(): GeoLocation | undefined {
    return this.currentLocation;
  }

  getLastLocationUpdate(): Date | undefined {
    return this.lastLocationUpdate;
  }

  getStripeConnectAccountId(): string | undefined {
    return this.stripeConnectAccountId;
  }

  // Business methods
  setAvailable(available: boolean): void {
    if (!this.isActive()) {
      throw new Error('Cannot change availability of inactive guard');
    }
    this.isAvailable = available;
    this.touch();
  }

  updateLocation(location: GeoLocation): void {
    if (!this.isActive()) {
      throw new Error('Cannot update location of inactive guard');
    }
    this.currentLocation = location;
    this.lastLocationUpdate = new Date();
    this.touch();
  }

  updateHourlyRate(newRate: Money): void {
    this.hourlyRate = newRate;
    this.touch();
  }

  updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    this.rating = newRating;
    this.touch();
  }

  setStripeConnectAccountId(accountId: string): void {
    this.stripeConnectAccountId = accountId;
    this.touch();
  }

  canAcceptBooking(): boolean {
    return this.isActive() && this.isAvailable;
  }

  hasRecentLocation(): boolean {
    if (!this.lastLocationUpdate) {
      return false;
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastLocationUpdate > fiveMinutesAgo;
  }
}
