import { User, UserRole, UserStatus, UserProps } from './user.entity';
import { Email, UserId } from '../value-objects';

export interface CustomerProps extends Omit<UserProps, 'role'> {
  stripeCustomerId?: string;
}

export class Customer extends User {
  private stripeCustomerId?: string;

  constructor(props: CustomerProps) {
    super({
      ...props,
      role: UserRole.CUSTOMER,
    });
    this.stripeCustomerId = props.stripeCustomerId;
  }

  static create(
    email: Email,
    passwordHash: string,
    fullName: string,
    phone?: string,
  ): Customer {
    return new Customer({
      email,
      passwordHash,
      fullName,
      phone,
      status: UserStatus.ACTIVE,
    });
  }

  static reconstitute(props: CustomerProps & { id: UserId }): Customer {
    return new Customer(props);
  }

  getStripeCustomerId(): string | undefined {
    return this.stripeCustomerId;
  }

  setStripeCustomerId(stripeCustomerId: string): void {
    this.stripeCustomerId = stripeCustomerId;
    this.touch();
  }

  canCreateBooking(): boolean {
    return this.isActive();
  }
}
