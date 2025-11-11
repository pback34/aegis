import { IsString, IsNumber, IsOptional, Min, IsPositive } from 'class-validator';

export class AuthorizePaymentDto {
  @IsString()
  bookingId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string; // defaults to 'USD'
}

export class AuthorizePaymentResponseDto {
  paymentId: string;
  bookingId: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export class CapturePaymentDto {
  @IsString()
  paymentId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number; // optional, defaults to full authorized amount
}

export class CapturePaymentResponseDto {
  paymentId: string;
  bookingId: string;
  stripePaymentIntentId: string;
  amount: number;
  platformFee: number;
  guardPayout: number;
  status: string;
  capturedAt: Date;
}

export class GetPaymentResponseDto {
  id: string;
  bookingId: string;
  customerId: string;
  guardId: string;
  amount: number;
  platformFee: number;
  guardPayout: number;
  status: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
