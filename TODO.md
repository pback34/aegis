# TODO for Next Session - Phase 3 Implementation

**Last Updated**: 2025-11-11
**Current Branch**: `MVP`
**Status**: Phase 2 Complete ✅, Ready for Phase 3

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
