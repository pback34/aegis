import { UserId } from '../value-objects/user-id.value-object';
import { Money } from '../value-objects/money.value-object';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export interface PaymentProps {
  id?: string;
  bookingId: string;
  customerId: UserId;
  guardId: UserId;
  amount: Money;
  platformFee: Money;
  guardPayout: Money;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Payment {
  private readonly id: string;
  private readonly bookingId: string;
  private readonly customerId: UserId;
  private readonly guardId: UserId;
  private readonly amount: Money;
  private readonly platformFee: Money;
  private readonly guardPayout: Money;
  private status: PaymentStatus;
  private stripePaymentIntentId?: string;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: PaymentProps) {
    this.id = props.id || uuidv4();
    this.bookingId = props.bookingId;
    this.customerId = props.customerId;
    this.guardId = props.guardId;
    this.amount = props.amount;
    this.platformFee = props.platformFee;
    this.guardPayout = props.guardPayout;
    this.status = props.status;
    this.stripePaymentIntentId = props.stripePaymentIntentId;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  private validate(): void {
    // Verify that platformFee + guardPayout = amount
    const total = this.platformFee.add(this.guardPayout);
    if (!total.equals(this.amount)) {
      throw new Error('Platform fee + guard payout must equal total amount');
    }
  }

  static create(
    bookingId: string,
    customerId: UserId,
    guardId: UserId,
    amount: Money,
    platformFeePercentage: number = 20,
  ): Payment {
    if (platformFeePercentage < 0 || platformFeePercentage > 100) {
      throw new Error('Platform fee percentage must be between 0 and 100');
    }

    const platformFee = amount.percentage(platformFeePercentage);
    const guardPayout = amount.subtract(platformFee);

    return new Payment({
      bookingId,
      customerId,
      guardId,
      amount,
      platformFee,
      guardPayout,
      status: PaymentStatus.PENDING,
    });
  }

  static reconstitute(props: PaymentProps & { id: string }): Payment {
    return new Payment(props);
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getBookingId(): string {
    return this.bookingId;
  }

  getCustomerId(): UserId {
    return this.customerId;
  }

  getGuardId(): UserId {
    return this.guardId;
  }

  getAmount(): Money {
    return this.amount;
  }

  getPlatformFee(): Money {
    return this.platformFee;
  }

  getGuardPayout(): Money {
    return this.guardPayout;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getStripePaymentIntentId(): string | undefined {
    return this.stripePaymentIntentId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // State transitions
  authorize(stripePaymentIntentId: string): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new Error(`Cannot authorize payment in status: ${this.status}`);
    }
    this.stripePaymentIntentId = stripePaymentIntentId;
    this.status = PaymentStatus.AUTHORIZED;
    this.touch();
  }

  capture(): void {
    if (this.status !== PaymentStatus.AUTHORIZED) {
      throw new Error(`Cannot capture payment in status: ${this.status}`);
    }
    if (!this.stripePaymentIntentId) {
      throw new Error('Cannot capture payment without Stripe payment intent ID');
    }
    this.status = PaymentStatus.CAPTURED;
    this.touch();
  }

  refund(): void {
    if (this.status !== PaymentStatus.CAPTURED) {
      throw new Error(`Cannot refund payment in status: ${this.status}`);
    }
    this.status = PaymentStatus.REFUNDED;
    this.touch();
  }

  fail(): void {
    if (this.status === PaymentStatus.CAPTURED || this.status === PaymentStatus.REFUNDED) {
      throw new Error(`Cannot mark payment as failed in status: ${this.status}`);
    }
    this.status = PaymentStatus.FAILED;
    this.touch();
  }

  // Business queries
  isAuthorized(): boolean {
    return this.status === PaymentStatus.AUTHORIZED;
  }

  isCaptured(): boolean {
    return this.status === PaymentStatus.CAPTURED;
  }

  isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  canCapture(): boolean {
    return this.status === PaymentStatus.AUTHORIZED && !!this.stripePaymentIntentId;
  }

  canRefund(): boolean {
    return this.status === PaymentStatus.CAPTURED;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
