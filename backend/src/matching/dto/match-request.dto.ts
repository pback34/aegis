import { IsNumber, IsString, IsArray, IsOptional, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { ServiceType } from '@prisma/client';

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class FindGuardsDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @IsDateString()
  startTime: string;

  @IsNumber()
  @Min(1)
  @Max(24)
  duration: number; // hours

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxDistance?: number; // km, default 10
}

export class RequestGuardDto {
  @IsString()
  bookingId: string;

  @IsString()
  guardId: string;
}
