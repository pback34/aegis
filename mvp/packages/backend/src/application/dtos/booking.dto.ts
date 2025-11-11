import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MinLength,
  IsOptional,
} from 'class-validator';
import { BookingStatus } from '../../domain/entities/booking.entity';

export class CreateBookingDto {
  @IsString()
  @MinLength(5)
  serviceLocationAddress: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  serviceLocationLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  serviceLocationLng: number;

  @IsDateString()
  scheduledStart: string;

  @IsDateString()
  scheduledEnd: string;

  @IsNumber()
  @Min(1)
  @Max(24)
  estimatedHours: number;
}

export class CreateBookingResponseDto {
  id: string;
  customerId: string;
  guardId?: string;
  status: string;
  serviceLocationAddress: string;
  serviceLocationLat: number;
  serviceLocationLng: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  estimatedHours: number;
  estimatedTotal?: number;
  hourlyRate?: number;
  createdAt: Date;
}

export class GetBookingResponseDto {
  id: string;
  customerId: string;
  guardId?: string;
  status: string;
  serviceLocationAddress: string;
  serviceLocationLat: number;
  serviceLocationLng: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  estimatedHours: number;
  estimatedTotal?: number;
  hourlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ListBookingsQueryDto {
  @IsOptional()
  @IsString()
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  guardId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}

export class ListBookingsResponseDto {
  bookings: GetBookingResponseDto[];
  total: number;
}

export class AcceptBookingResponseDto {
  id: string;
  guardId: string;
  status: string;
  acceptedAt: Date;
}

export class CompleteBookingResponseDto {
  id: string;
  status: string;
  completedAt: Date;
  actualHours?: number;
  finalAmount?: number;
}
