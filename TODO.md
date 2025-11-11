# TODO for Next Session - Phase 3 Implementation

**Last Updated**: 2025-11-11 (Updated after partial Phase 3 implementation)
**Current Branch**: `claude/review-todo-list-011CV1h95oXbUf85JYE5sQSJ`
**Status**: Phase 2 Complete ✅, Phase 3 In Progress 🚧 (Stripe ✅ | Ably ⏳ | Auth ⏳)

---

## 🎉 Phase 3 Progress Update

### ✅ Completed (Session 2025-11-11)

**Location**: `mvp/packages/backend/src/infrastructure/payment/`

1. **Dependencies Installed** ✅
   ```bash
   npm install stripe ably @nestjs/passport @nestjs/jwt passport passport-jwt
   npm install -D @types/passport-jwt
   ```

2. **Payment Integration - Stripe Adapter** ✅ (Task 1 - Partial)

   **Files Created**:
   - ✅ `stripe-payment-gateway.adapter.ts` - Full implementation (220 lines)
   - ✅ `stripe-payment-gateway.adapter.spec.ts` - Comprehensive tests (449 lines, 20 tests)

   **Features Implemented**:
   - ✅ `authorizePayment()` - Creates payment intent with manual capture
   - ✅ `capturePayment()` - Captures authorized payment (full or partial)
   - ✅ `cancelPayment()` - Cancels uncaptured payment intent
   - ✅ `refundPayment()` - Processes refunds (full or partial)
   - ✅ `getPaymentStatus()` - Retrieves payment status from Stripe
   - ✅ Currency conversion (dollars ↔ cents) with proper rounding
   - ✅ Comprehensive error handling (StripeError → domain errors)
   - ✅ NestJS Logger integration for all operations
   - ✅ Stripe API version: `2025-10-29.clover`

   **Test Coverage**: 20 tests covering:
   - Constructor validation
   - All operations (happy paths)
   - Error scenarios (Stripe errors, network errors)
   - Currency conversion edge cases
   - Partial amount operations

3. **Test Results** ✅
   - **Total: 143 tests passing** (up from 134)
   - **New: 20 Stripe adapter tests**
   - All existing tests still pass
   - Test execution time: ~12-13 seconds

4. **Code Quality**:
   - ✅ Follows existing project patterns
   - ✅ Uses direct instantiation for unit tests (no NestJS test module)
   - ✅ Proper TypeScript types throughout
   - ✅ Clean separation of concerns

---

## 🚀 NEXT AGENT: What You Need to Do

### Phase 3 Completion Status: ~33% Complete

**Your mission**: Complete the remaining 67% of Phase 3 implementation.

### 📋 Task Priority Order

#### **TASK 1: Ably Real-Time Location Service** (Highest Priority)

**Estimated Time**: 2-3 hours

**Goal**: Implement real-time location streaming for guard tracking

**Files to Create**:
```
mvp/packages/backend/src/infrastructure/realtime/
├── ably-location-service.adapter.ts
├── ably-location-service.adapter.spec.ts
└── ably-location-service.integration.spec.ts (optional)
```

**Step-by-Step Implementation**:

1. **Create the Ably Adapter** (`ably-location-service.adapter.ts`):
   ```typescript
   import { Injectable, Logger } from '@nestjs/common';
   import * as Ably from 'ably';
   import { ILocationService, LocationUpdatePayload } from '../../application/ports/location-service.interface';

   @Injectable()
   export class AblyLocationServiceAdapter implements ILocationService {
     private readonly logger = new Logger(AblyLocationServiceAdapter.name);
     private readonly client: Ably.Realtime;

     constructor(apiKey: string) {
       if (!apiKey) {
         throw new Error('Ably API key is required');
       }

       this.client = new Ably.Realtime({ key: apiKey });
       this.logger.log('Ably Location Service initialized');
     }

     async publishLocationUpdate(payload: LocationUpdatePayload): Promise<void> {
       const channelName = `jobs:${payload.bookingId}:location`;
       const channel = this.client.channels.get(channelName);

       await channel.publish('location-update', {
         guardId: payload.guardId,
         latitude: payload.location.getLatitude(),
         longitude: payload.location.getLongitude(),
         timestamp: payload.timestamp.toISOString(),
       });

       this.logger.log(`Published location update for booking ${payload.bookingId}`);
     }

     async subscribeToLocationUpdates(
       bookingId: string,
       callback: (payload: LocationUpdatePayload) => void,
     ): Promise<() => void> {
       const channelName = `jobs:${bookingId}:location`;
       const channel = this.client.channels.get(channelName);

       await channel.subscribe('location-update', (message) => {
         // Transform Ably message back to LocationUpdatePayload
         // Call the callback
       });

       return () => {
         channel.unsubscribe();
         this.logger.log(`Unsubscribed from ${channelName}`);
       };
     }
   }
   ```

2. **Create Unit Tests** (`ably-location-service.adapter.spec.ts`):
   - Follow the pattern from `stripe-payment-gateway.adapter.spec.ts`
   - Mock the Ably client
   - Test publish, subscribe, error handling
   - Aim for 15-20 tests

3. **Pattern to Follow**: Look at `stripe-payment-gateway.adapter.spec.ts` for:
   - Mock setup using `jest.fn()`
   - Error handling patterns
   - Test organization

#### **TASK 2: UpdateGuardLocationUseCase** (High Priority)

**Files to Create**:
```
mvp/packages/backend/src/application/use-cases/location/
├── update-guard-location.use-case.ts
├── update-guard-location.use-case.spec.ts
```

**Implementation**:
```typescript
export class UpdateGuardLocationUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly bookingRepository: IBookingRepository,
    private readonly locationService: ILocationService,
  ) {}

  async execute(dto: UpdateGuardLocationDto): Promise<void> {
    // 1. Find guard by ID
    // 2. Update guard's current location in database
    // 3. Find active booking for guard
    // 4. If booking exists, publish to Ably
    // 5. Save location update to location_updates table (optional)
  }
}
```

**Pattern**: Follow `create-booking.use-case.ts` and `authorize-payment.use-case.ts`

#### **TASK 3: Authentication Infrastructure** (Medium Priority - Most Complex)

**This is the LARGEST remaining task. Estimated time: 4-5 hours**

**3A. Create JWT Strategy** (`src/infrastructure/auth/strategies/jwt.strategy.ts`):
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IUserRepository } from '../../../application/ports/user.repository.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: IUserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

**3B. Create Guards**:

`src/infrastructure/auth/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`src/infrastructure/auth/guards/roles.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.getRole() === role);
  }
}
```

**3C. Create Decorators**:

`src/infrastructure/auth/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

`src/infrastructure/auth/decorators/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

`src/infrastructure/auth/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**3D. Create AuthService** (`src/infrastructure/auth/auth.service.ts`):
```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.getId().getValue(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

**3E. Create AuthModule** (`src/infrastructure/auth/auth.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [JwtStrategy, AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
```

**3F. Refactor Auth Use Cases**:
- Remove JWT logic from `login-user.use-case.ts`
- The use case should return just the User entity
- Token generation moves to AuthController

#### **TASK 4: Create Controllers** (Lower Priority - Can be done last)

This is Phase 4 work according to the plan, but if you have time:

`src/presentation/controllers/auth.controller.ts`:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '../../infrastructure/auth/decorators/public.decorator';
import { RegisterUserUseCase } from '../../application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/auth/login-user.use-case';
import { AuthService } from '../../infrastructure/auth/auth.service';
import { RegisterUserDto, LoginUserDto } from '../../application/dtos/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    const user = await this.registerUseCase.execute(dto);
    const tokens = await this.authService.generateTokens(user);
    return { user, ...tokens };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    const user = await this.loginUseCase.execute(dto);
    const tokens = await this.authService.generateTokens(user);
    return { user, ...tokens };
  }
}
```

---

## 🎯 Success Criteria for Next Session

By the end of your session, you should have:

- [ ] **AblyLocationServiceAdapter** fully implemented with tests (15-20 tests)
- [ ] **UpdateGuardLocationUseCase** implemented with tests
- [ ] **JWT Strategy** implemented
- [ ] **Auth Guards** (JwtAuthGuard, RolesGuard) implemented
- [ ] **Auth Decorators** (@Public, @Roles, @CurrentUser) implemented
- [ ] **AuthService** for token generation
- [ ] **AuthModule** configured and wired up
- [ ] **Test count**: 180-200+ tests passing
- [ ] **Auth use cases** refactored (JWT logic removed)
- [ ] All tests passing with no regressions

---

## 📚 Reference Files to Study

Before starting, review these files for patterns:

1. **Adapter Pattern**: `src/infrastructure/payment/stripe-payment-gateway.adapter.ts`
2. **Unit Test Pattern**: `src/infrastructure/payment/stripe-payment-gateway.adapter.spec.ts`
3. **Use Case Pattern**: `src/application/use-cases/booking/create-booking.use-case.ts`
4. **Use Case Tests**: `src/application/use-cases/booking/create-booking.use-case.spec.ts`
5. **Interface Definitions**: `src/application/ports/payment-gateway.interface.ts`
6. **Existing Auth**: `src/application/use-cases/auth/login-user.use-case.ts` (lines 16-50 have JWT logic to extract)

---

## ⚠️ CRITICAL REMINDERS

1. **Testing Pattern**: Use direct instantiation for unit tests, NOT `Test.createTestingModule()`
2. **Mock Functions**: Use `jest.fn()` for all mocks (see Stripe test for pattern)
3. **Error Handling**: Wrap external service calls in try/catch with proper logging
4. **TypeORM Decimals**: Remember `Number()` conversion for decimal fields
5. **Environment Variables**: Document all new env vars needed (ABLY_API_KEY, etc.)
6. **Run Tests Frequently**: `npm test` should always pass before committing

---

## 🏃 Quick Start Commands

```bash
# Navigate to backend
cd mvp/packages/backend

# Run unit tests
npm test

# Run integration tests (requires PostgreSQL)
npm run test:integration

# Run specific test file
npm test -- --testPathPattern=ably-location-service

# Run all tests
npm run test:all

# Check git status
git status

# Commit your work
git add -A
git commit -m "feat(phase3): Implement [what you did]"
git push -u origin claude/review-todo-list-011CV1h95oXbUf85JYE5sQSJ
```

---

## 📊 Current State Summary

**What's Done**:
- ✅ Stripe payment adapter (20 tests)
- ✅ Payment use cases exist (no tests yet)
- ✅ All dependencies installed
- ✅ 143 tests passing

**What's Missing**:
- ❌ Ably adapter (~15-20 tests needed)
- ❌ UpdateGuardLocationUseCase (~8-10 tests needed)
- ❌ Auth infrastructure (~10-15 files, ~20-30 tests)
- ❌ Controllers (Phase 4, optional)

**Estimated Remaining Work**: 6-8 hours for a complete Phase 3 implementation

---

## 💡 Tips for Success

1. **Start with Ably**: It's similar to Stripe adapter you can reference
2. **Test as you go**: Don't write all code then test, write test → implement → verify
3. **Follow existing patterns**: The codebase is consistent, maintain that consistency
4. **Read TESTING.md**: It has important patterns and rationale
5. **Check TODO comments**: Some files may have TODO comments with hints
6. **Document as you code**: Update this TODO.md when you complete major sections

**Good luck! The foundation is solid. You're building on 143 passing tests. Keep that green! 🟢**

---

## 📋 Quick Status Overview

### ✅ Completed (Phases 1 & 2)

**Week 1: Foundation & Domain Layer**
- ✅ Domain entities (User, Customer, Guard, Booking, Payment)
- ✅ Value objects (Email, UserId, Money, GeoLocation)
- ✅ Domain services (SimpleMatchingService, PricingService)
- ✅ Domain events (BookingRequested, GuardMatched, etc.)
- ✅ All domain layer fully tested (>90% coverage)

**Week 2: Application Layer & Database**
- ✅ Use cases implemented:
  - Auth: `RegisterUserUseCase`, `LoginUserUseCase`, `RefreshTokenUseCase`
  - Booking: `CreateBookingUseCase`
- ✅ DTOs with validation
- ✅ Repository interfaces (ports)
- ✅ PostgreSQL schema (5 tables) with TypeORM
- ✅ Repository implementations (UserRepository with integration tests)
- ✅ Mappers (UserMapper with bidirectional tests)
- ✅ **134 tests passing** (123 unit + 11 integration)

### 🎯 Next Up: Phase 3 (Week 3)

**Goal**: External Services & NestJS Infrastructure

According to `MVP_IMPLEMENTATION_PLAN.md` Week 3, you need to implement:

1. **Payment Integration** (Days 1-2)
2. **Real-Time Location Streaming** (Day 3)
3. **Authentication & Authorization Infrastructure** (Days 4-5)

---

## 🔑 Critical Things to Know

### 1. Testing Pattern - VERY IMPORTANT!

We use **direct instantiation** for use case unit tests, NOT `Test.createTestingModule()`:

```typescript
// ✅ DO THIS (what we're doing)
beforeEach(() => {
  mockRepository = { save: jest.fn(), findById: jest.fn() };
  useCase = new MyUseCase(mockRepository);
});

// ❌ DON'T DO THIS (slow, unnecessary for unit tests)
const module = await Test.createTestingModule({
  providers: [MyUseCase, { provide: 'IRepo', useValue: mock }]
}).compile();
```

**Why?** ~10x faster, simpler, more focused tests. See `TESTING.md` for full rationale.

**When to use Test.createTestingModule()?**
- Integration tests with real infrastructure
- Testing NestJS-specific features (guards, interceptors, controllers)

### 2. TypeORM Quirks Fixed

**Decimal Types Return Strings**: We fixed this in `user.mapper.ts`

```typescript
// Always convert decimal columns to numbers
rating: Number(guardProfile.rating),
hourlyRate: new Money(Number(guardProfile.hourly_rate)),
```

**Null Safety in Repositories**: We fixed this in `user.repository.ts`

```typescript
// Always check for null after findById
const reloaded = await this.findById(user.getId());
if (!reloaded) {
  throw new Error('Failed to reload saved user');
}
return reloaded;
```

### 3. Auth Implementation Status

**Current State**: Auth use cases implement JWT/bcrypt internally (see `login-user.use-case.ts:16-50`)

**What's Needed for Phase 3**:
- Extract JWT logic into proper NestJS auth infrastructure
- Create `JwtAuthGuard` using Passport JWT strategy
- Create `RolesGuard` for RBAC
- Add auth decorators (`@Public()`, `@Roles()`, `@CurrentUser()`)
- Keep use cases pure - move token generation to controllers or a dedicated auth service

### 4. Repository Implementations Needed

Current state:
- ✅ `UserRepository` - fully implemented with 11 integration tests
- ❌ `BookingRepository` - interface exists, implementation needed
- ❌ `PaymentRepository` - interface exists, implementation needed
- ❌ `LocationUpdateRepository` - not yet defined

You'll need these for Phase 3 and 4.

---

## 📁 Project Structure Reference

```
mvp/packages/backend/
├── src/
│   ├── domain/                    # ✅ Complete
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   └── events/
│   ├── application/               # ✅ Partially complete
│   │   ├── use-cases/
│   │   │   ├── auth/             # ✅ 3 use cases done
│   │   │   └── booking/          # ✅ 1 use case done
│   │   ├── dtos/                 # ✅ Auth & Booking DTOs
│   │   └── ports/                # ✅ Repository interfaces
│   ├── infrastructure/            # 🟡 Partially complete
│   │   ├── database/             # ✅ Entities defined
│   │   ├── repositories/         # 🟡 UserRepository only
│   │   ├── auth/                 # ❌ TODO: Guards, strategies
│   │   ├── payment/              # ❌ TODO: Stripe adapter
│   │   └── realtime/             # ❌ TODO: Ably adapter
│   └── presentation/              # ❌ TODO: Controllers
│       ├── controllers/
│       ├── middleware/
│       └── dto-validators/
└── test/
    ├── integration/               # ✅ UserRepository tests
    └── setup-integration.ts       # ✅ Working test DB setup
```

---

## 🚀 Phase 3 Implementation Guide

### Task 1: Payment Integration (Stripe)

**Files to Create:**
```
src/infrastructure/payment/
  ├── stripe-payment-gateway.adapter.ts
  ├── stripe-payment-gateway.adapter.spec.ts (unit tests)
  └── stripe-payment-gateway.integration.spec.ts
```

**What to Implement:**

1. Create `IPaymentGateway` interface in `src/application/ports/`:
```typescript
export interface IPaymentGateway {
  authorizePayment(params: AuthorizePaymentParams): Promise<PaymentAuthorization>;
  capturePayment(paymentIntentId: string): Promise<PaymentCapture>;
  refundPayment(paymentIntentId: string): Promise<PaymentRefund>;
}
```

2. Implement `StripePaymentGatewayAdapter`:
   - Use `stripe` npm package
   - Use test mode API keys from environment
   - Handle Stripe errors gracefully
   - Map Stripe responses to domain types

3. Add use cases:
   - `AuthorizePaymentUseCase` (call when booking created)
   - `CapturePaymentUseCase` (call when booking completed)

4. Tests:
   - Unit tests with mocked Stripe client
   - Integration tests with Stripe test mode

**Environment Variables Needed:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Task 2: Real-Time Location Streaming (Ably)

**Files to Create:**
```
src/infrastructure/realtime/
  ├── ably-location-service.adapter.ts
  ├── ably-location-service.adapter.spec.ts
  └── ably-location-service.integration.spec.ts
```

**What to Implement:**

1. Create `ILocationService` interface in `src/application/ports/`:
```typescript
export interface ILocationService {
  publishLocation(bookingId: string, location: GeoLocation): Promise<void>;
  subscribeToLocation(bookingId: string, callback: LocationCallback): Subscription;
}
```

2. Implement `AblyLocationServiceAdapter`:
   - Use `ably` npm package
   - Publish to channel: `jobs:{jobId}:location`
   - Handle connection failures gracefully
   - Implement reconnection logic

3. Add use case:
   - `UpdateGuardLocationUseCase` (updates DB + publishes to Ably)

4. Tests:
   - Unit tests with mocked Ably client
   - Integration tests with Ably sandbox

**Environment Variables Needed:**
```bash
ABLY_API_KEY=your_ably_api_key
```

### Task 3: Authentication & Authorization Infrastructure

**Files to Create:**
```
src/infrastructure/auth/
  ├── guards/
  │   ├── jwt-auth.guard.ts
  │   └── roles.guard.ts
  ├── strategies/
  │   └── jwt.strategy.ts
  ├── decorators/
  │   ├── current-user.decorator.ts
  │   ├── public.decorator.ts
  │   └── roles.decorator.ts
  └── auth.module.ts

src/presentation/controllers/
  └── auth.controller.ts (registers AuthModule endpoints)
```

**What to Implement:**

1. **JWT Strategy** using Passport:
   - Validate JWT tokens
   - Extract user from token payload
   - Attach user to request object

2. **Guards**:
   - `JwtAuthGuard`: Protect all routes by default
   - `RolesGuard`: Check user has required role(s)

3. **Decorators**:
   - `@Public()`: Skip JWT auth for login/register
   - `@Roles('customer', 'guard')`: Require specific role
   - `@CurrentUser()`: Inject authenticated user into controller

4. **Refactor Auth Use Cases**:
   - Extract JWT generation into `AuthService`
   - Keep use cases focused on business logic
   - Move token generation to controller or service layer

5. **Auth Module**:
   - Register JwtModule with secret and expiration
   - Register Passport JWT strategy
   - Export guards and decorators

**Example Controller:**
```typescript
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    const user = await this.registerUseCase.execute(dto);
    const tokens = await this.authService.generateTokens(user);
    return { user, ...tokens };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto);
  }
}
```

**Dependencies to Install:**
```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install -D @types/passport-jwt
```

---

## 📝 Additional Use Cases Needed

Based on `MVP_IMPLEMENTATION_PLAN.md`, you'll also need:

### Booking Use Cases (for Phase 4)
- ✅ `CreateBookingUseCase` (done)
- ❌ `AcceptBookingUseCase` - Guard accepts a booking
- ❌ `CompleteBookingUseCase` - Guard marks job complete
- ❌ `GetBookingDetailsUseCase` - Get single booking
- ❌ `ListBookingsUseCase` - List bookings (filtered by role)

### Location Use Cases
- ❌ `UpdateGuardLocationUseCase` - Update guard location (DB + Ably)
- ❌ `GetCurrentLocationUseCase` - Get current guard location for booking

### User Use Cases
- ❌ `GetUserProfileUseCase`
- ❌ `UpdateUserProfileUseCase`

### Payment Use Cases
- ❌ `AuthorizePaymentUseCase`
- ❌ `CapturePaymentUseCase`

---

## 🧪 Testing Reminders

### Unit Tests
- Use direct instantiation for use cases
- Mock all repositories and adapters
- Test happy path + error cases + edge cases
- Aim for >80% coverage

### Integration Tests
- Use `test/setup-integration.ts` for database setup
- Create dedicated integration test for each repository
- Test with real PostgreSQL database
- Clean database with `cleanDatabase()` before each test

### Running Tests
```bash
# Unit tests (123 tests)
npm test

# Integration tests (11 tests) - requires PostgreSQL
npm run test:integration

# All tests with coverage
npm run test:all

# Watch mode for TDD
npm run test:watch
```

### PostgreSQL Setup
If the next agent needs to set up PostgreSQL:
```bash
# Set postgres password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Create test database
sudo -u postgres psql -c "CREATE DATABASE aegis_mvp_test;"

# Verify
sudo -u postgres psql -c "\l" | grep aegis_mvp_test
```

See `test/TEST_QUICKSTART.md` for detailed setup instructions.

---

## 🎯 Success Criteria for Phase 3

By end of Week 3, you should have:

- ✅ Stripe payment integration working in test mode
- ✅ Ably real-time location streaming working
- ✅ JWT authentication with NestJS guards
- ✅ Role-based access control (RBAC)
- ✅ Auth middleware protecting all routes (except public ones)
- ✅ All new code tested (unit + integration)
- ✅ Updated test count: ~180+ tests total

---

## 📚 Documentation to Reference

- **Implementation Plan**: `/MVP_IMPLEMENTATION_PLAN.md` (this is the source of truth)
- **Testing Guide**: `mvp/packages/backend/TESTING.md` (comprehensive testing strategy)
- **Quick Start**: `mvp/packages/backend/test/TEST_QUICKSTART.md` (quick commands)
- **Architecture**: Check `lattice/` folder for design decisions

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't use Test.createTestingModule() for use case unit tests**
   - Only use it for integration tests with real NestJS infrastructure
   - See TESTING.md for the rationale

2. **Don't forget Number() conversions for TypeORM decimals**
   - `rating`, `hourly_rate`, `latitude`, `longitude` all need conversion

3. **Don't forget null safety in repository methods**
   - Always check if `findById()` returns null before returning

4. **Don't mix business logic into controllers**
   - Controllers should be thin - just call use cases
   - Keep domain logic in entities and services
   - Keep application logic in use cases

5. **Don't hardcode secrets**
   - Use environment variables
   - Add `.env.example` with dummy values
   - Document all required env vars

6. **Don't skip tests**
   - Write tests first when possible (TDD)
   - Integration tests are critical for repositories and adapters
   - Keep test execution time under 5 minutes

---

## 🔄 Development Workflow

1. **Start with failing test** (TDD approach)
2. **Implement minimum code to pass**
3. **Refactor if needed**
4. **Run full test suite** (`npm test`)
5. **Commit frequently** with descriptive messages
6. **Update this TODO.md** as you complete tasks

---

## 💡 Tips for Success

- **Read the implementation plan**: `MVP_IMPLEMENTATION_PLAN.md` has all the details
- **Follow existing patterns**: Look at how UserRepository and auth use cases are structured
- **Test as you go**: Don't leave testing for the end
- **Keep it simple**: MVP means minimum viable - don't over-engineer
- **Document decisions**: If you deviate from plan, document why
- **Use the pattern**: Direct instantiation for unit tests, real DB for integration

---

## 🎬 Getting Started Commands

```bash
# Navigate to backend
cd mvp/packages/backend

# Install dependencies (if needed)
npm install

# Run unit tests
npm test

# Run integration tests (requires PostgreSQL)
npm run test:integration

# Start development server
npm run dev

# Check current git status
git status

# See recent commits
git log --oneline -10
```

---

## 📊 Current Test Breakdown

- **Domain Layer**: 100% coverage (Phase 1)
- **Application Layer Use Cases**: 100% coverage (Phase 2)
- **Mappers**: 100% coverage (Phase 2)
- **Repository Integration**: UserRepository only (Phase 2)
- **Total**: 134 tests (123 unit + 11 integration)

**Target for Phase 3**: 180-200 tests

---

## 🚦 Next Agent Action Items

1. **Review this TODO.md** thoroughly
2. **Read `MVP_IMPLEMENTATION_PLAN.md` Week 3** section
3. **Check `TESTING.md`** for testing patterns
4. **Install Stripe and Ably SDKs**
5. **Start with Stripe adapter** (easiest to test in isolation)
6. **Move to Ably adapter**
7. **Finish with Auth infrastructure** (most complex)
8. **Update this TODO.md** as you progress

---

**Good luck! The foundation is solid. Phase 3 will bring it all together with external services and proper NestJS infrastructure.**

🤖 Last updated by Claude Code session on 2025-11-11
