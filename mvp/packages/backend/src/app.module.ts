import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { UserEntity } from './infrastructure/database/entities/user.entity';
import { GuardProfileEntity } from './infrastructure/database/entities/guard-profile.entity';
import { BookingEntity } from './infrastructure/database/entities/booking.entity';
import { LocationUpdateEntity } from './infrastructure/database/entities/location-update.entity';
import { PaymentEntity } from './infrastructure/database/entities/payment.entity';

// Controllers
import { AuthController } from './presentation/controllers/auth.controller';
import { UsersController } from './presentation/controllers/users.controller';
import { JobsController } from './presentation/controllers/jobs.controller';
import { LocationsController } from './presentation/controllers/locations.controller';
import { PaymentsController } from './presentation/controllers/payments.controller';

// Repositories
import { UserRepository } from './infrastructure/repositories/user.repository';
import { BookingRepository } from './infrastructure/repositories/booking.repository';
import { LocationRepository } from './infrastructure/repositories/location.repository';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';

// Use Cases - Auth
import { RegisterUserUseCase } from './application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/auth/login-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/auth/refresh-token.use-case';

// Use Cases - User
import { UpdateUserProfileUseCase } from './application/use-cases/user/update-user-profile.use-case';

// Use Cases - Booking
import { CreateBookingUseCase } from './application/use-cases/booking/create-booking.use-case';
import { GetBookingUseCase } from './application/use-cases/booking/get-booking.use-case';
import { ListBookingsUseCase } from './application/use-cases/booking/list-bookings.use-case';
import { AcceptBookingUseCase } from './application/use-cases/booking/accept-booking.use-case';
import { CompleteBookingUseCase } from './application/use-cases/booking/complete-booking.use-case';

// Use Cases - Location
import { UpdateLocationUseCase } from './application/use-cases/location/update-location.use-case';
import { GetCurrentLocationUseCase } from './application/use-cases/location/get-current-location.use-case';

// Use Cases - Payment
import { AuthorizePaymentUseCase } from './application/use-cases/payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from './application/use-cases/payment/capture-payment.use-case';

// Services
import { AuthService } from './infrastructure/auth/auth.service';
import { JwtAuthGuard } from './infrastructure/auth/guards/jwt-auth.guard';
import { typeOrmConfig } from './infrastructure/config/typeorm.config';
import { SimpleMatchingService } from './domain/services/simple-matching.service';
import { PricingService } from './domain/services/pricing.service';
import { AblyLocationServiceAdapter } from './infrastructure/realtime/ably-location-service.adapter';
import { StripePaymentGatewayAdapter } from './infrastructure/payment/stripe-payment-gateway.adapter';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),

    // Database configuration
    TypeOrmModule.forRoot(typeOrmConfig),

    // Entity repositories
    TypeOrmModule.forFeature([
      UserEntity,
      GuardProfileEntity,
      BookingEntity,
      LocationUpdateEntity,
      PaymentEntity,
    ]),

    // JWT Module
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],

  controllers: [
    AuthController,
    UsersController,
    JobsController,
    LocationsController,
    PaymentsController,
  ],

  providers: [
    // Global JWT Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Services
    AuthService,
    SimpleMatchingService,
    {
      provide: PricingService,
      useFactory: () => new PricingService(20), // 20% platform fee
    },
    {
      provide: 'ILocationService',
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('ABLY_API_KEY') || '';
        // For local development, use a dummy key if not configured
        const validKey = apiKey && !apiKey.includes('your_ably') ? apiKey : null;
        if (!validKey) {
          console.warn('[WARN] Ably API key not configured. Real-time location features will be disabled.');
          // Return a null adapter that won't crash the app
          return {
            publishLocationUpdate: async () => {
              console.warn('[WARN] Ably not configured - location update skipped');
            }
          } as any;
        }
        return new AblyLocationServiceAdapter(validKey);
      },
      inject: [ConfigService],
    },
    {
      provide: 'IPaymentGateway',
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('STRIPE_SECRET_KEY') || '';
        return new StripePaymentGatewayAdapter(apiKey);
      },
      inject: [ConfigService],
    },

    // Repository Providers
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IBookingRepository',
      useClass: BookingRepository,
    },
    {
      provide: 'ILocationRepository',
      useClass: LocationRepository,
    },
    {
      provide: 'IPaymentRepository',
      useClass: PaymentRepository,
    },

    // Auth Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,

    // User Use Cases
    UpdateUserProfileUseCase,

    // Booking Use Cases
    CreateBookingUseCase,
    GetBookingUseCase,
    ListBookingsUseCase,
    AcceptBookingUseCase,
    CompleteBookingUseCase,

    // Location Use Cases
    UpdateLocationUseCase,
    GetCurrentLocationUseCase,

    // Payment Use Cases
    AuthorizePaymentUseCase,
    CapturePaymentUseCase,
  ],
})
export class AppModule {}
