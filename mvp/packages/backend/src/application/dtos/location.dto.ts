import { IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

export class UpdateLocationDto {
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

export class UpdateLocationResponseDto {
  bookingId: string;
  guardId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export class GetCurrentLocationResponseDto {
  bookingId: string;
  guardId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracyMeters?: number;
}

export class GetMapConfigResponseDto {
  mapboxToken: string;
  mapboxStyle: string;
  defaultCenter: {
    lat: number;
    lng: number;
  };
  defaultZoom: number;
}
