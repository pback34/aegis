import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  // Guard-specific fields (optional, only for guards)
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  hourlyRate?: number;
}

export class RegisterUserResponseDto {
  id: string;
  email: string;
  role: string;
  fullName: string;
  phone?: string;
  createdAt: Date;
}

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class LoginUserResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
}
