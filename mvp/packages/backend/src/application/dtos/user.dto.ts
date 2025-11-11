import { IsString, IsOptional, IsPhoneNumber, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class GetUserProfileResponseDto {
  id: string;
  email: string;
  role: string;
  fullName: string;
  phone?: string;
  status: string;
  createdAt: Date;

  // Guard-specific fields
  licenseNumber?: string;
  hourlyRate?: number;
  rating?: number;
  isAvailable?: boolean;
  currentLatitude?: number;
  currentLongitude?: number;

  // Customer-specific fields
  stripeCustomerId?: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  // Guard-specific updates
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
}

export class UpdateUserProfileResponseDto {
  id: string;
  email: string;
  role: string;
  fullName: string;
  phone?: string;
  updatedAt: Date;
}

export class UpdateGuardLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracyMeters?: number;
}

export class UpdateGuardLocationResponseDto {
  guardId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}
