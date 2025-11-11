# TODO for Next Session - Phase 4 Implementation

**Last Updated**: 2025-11-11 (Phase 3 Complete)
**Current Branch**: `claude/mvp-phase-3-implementation-011CV1ip4vQXQTNgTNsq63ev`
**Status**: Phase 3 Complete ✅ | Phase 4 Next 🚀

---

## 🎉 Phase 3 Complete!

**Test Count**: 169 passing (up from 143)

**What Was Completed This Session:**
1. ✅ **Ably Location Service** - Real-time location streaming (19 tests)
2. ✅ **UpdateGuardLocationUseCase** - Location tracking with DB + Ably (9 tests)
3. ✅ **Auth Infrastructure** - JWT Strategy, Guards, Decorators, AuthService, AuthModule
4. ✅ **Auth Refactoring** - Removed JWT from use cases (now returns User only)

**Key Files Added:**
```
src/infrastructure/realtime/ably-location-service.adapter.ts + .spec.ts
src/infrastructure/auth/
  ├── strategies/jwt.strategy.ts
  ├── guards/jwt-auth.guard.ts, roles.guard.ts
  ├── decorators/public.decorator.ts, roles.decorator.ts, current-user.decorator.ts
  ├── auth.service.ts
  └── auth.module.ts
src/application/use-cases/location/update-location.use-case.spec.ts
```

---

## 🚀 Phase 4: REST API Controllers (Week 4)

**Goal**: Create NestJS controllers for all 15 MVP endpoints

### Task Breakdown

#### **Task 1: Auth Controller** (Priority: High)
Create `src/presentation/controllers/auth.controller.ts`:
- `POST /auth/register` - Uses RegisterUserUseCase + AuthService.generateTokens()
- `POST /auth/login` - Uses LoginUserUseCase + AuthService.generateTokens()
- `POST /auth/refresh` - Uses RefreshTokenUseCase

**Key Point**: LoginUserUseCase now returns `User` entity. Controller calls `AuthService.generateTokens(user)` to get tokens.

#### **Task 2: Jobs/Bookings Controller**
Create `src/presentation/controllers/jobs.controller.ts`:
- `POST /jobs` - CreateBookingUseCase (Customer only)
- `GET /jobs/:id` - GetBookingUseCase
- `GET /jobs` - ListBookingsUseCase (filtered by role)
- `POST /jobs/:id/accept` - AcceptBookingUseCase (Guard only)
- `POST /jobs/:id/complete` - CompleteBookingUseCase (Guard only)

Use `@Roles('customer')` or `@Roles('guard')` decorators.

#### **Task 3: Location Controller**
Create `src/presentation/controllers/locations.controller.ts`:
- `GET /map/config` - Return Mapbox token/config (no use case needed)
- `POST /jobs/:id/location` - UpdateLocationUseCase (Guard only)
- `GET /jobs/:id/location` - GetCurrentLocationUseCase

#### **Task 4: Payments Controller**
Create `src/presentation/controllers/payments.controller.ts`:
- `POST /payments/authorize` - AuthorizePaymentUseCase
- `POST /payments/capture` - CapturePaymentUseCase

#### **Task 5: Users Controller**
Create `src/presentation/controllers/users.controller.ts`:
- `GET /users/profile` - Return current user from @CurrentUser()
- `PATCH /users/profile` - UpdateUserProfileUseCase (create if doesn't exist)

---

## ⚠️ Important Notes for Phase 4

### Auth Pattern to Follow
```typescript
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUserUseCase,
    private readonly authService: AuthService,
  ) {}

  @Public()  // Skip JWT auth
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    const user = await this.loginUseCase.execute(dto);
    const tokens = await this.authService.generateTokens(user);
    return {
      user: {
        id: user.getId().getValue(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        fullName: user.getFullName(),
      },
      ...tokens,
    };
  }
}
```

### Protected Route Pattern
```typescript
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)  // Apply to all routes
export class JobsController {
  @Roles('customer')
  @Post()
  async createJob(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.createBookingUseCase.execute(user.getId(), dto);
  }
}
```

### Missing Use Cases to Create
You'll need to implement these (they don't exist yet):
- ❌ `AcceptBookingUseCase`
- ❌ `CompleteBookingUseCase`
- ❌ `GetBookingUseCase`
- ❌ `ListBookingsUseCase`
- ❌ `UpdateUserProfileUseCase`

These already exist:
- ✅ CreateBookingUseCase
- ✅ UpdateLocationUseCase (called UpdateGuardLocationUseCase in plan)
- ✅ GetCurrentLocationUseCase
- ✅ AuthorizePaymentUseCase
- ✅ CapturePaymentUseCase

---

## 🎯 Testing Strategy for Phase 4

**Controller Tests**: Use `Test.createTestingModule()` since we need NestJS DI:
```typescript
describe('AuthController', () => {
  let controller: AuthController;
  let mockLoginUseCase: jest.Mocked<LoginUserUseCase>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUserUseCase, useValue: mockLoginUseCase },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });
});
```

**Target**: Add ~30-40 controller tests

---

## 📋 Quick Start Commands

```bash
cd mvp/packages/backend

# Run tests (should see 169 passing)
npm test

# Start dev server (if needed)
npm run dev

# Check current branch
git status
```

---

## 💡 Key Gotchas

1. **LoginUserUseCase returns User now**, not tokens. Controllers handle token generation.
2. **Use `@Public()` on auth routes** (register, login, refresh) to skip JWT validation
3. **Use `@CurrentUser()` decorator** to inject authenticated user into controllers
4. **Guards order matters**: `@UseGuards(JwtAuthGuard, RolesGuard)`
5. **Direct instantiation for use case tests**, `Test.createTestingModule()` for controllers

---

## 📊 Current Architecture State

**Layers Completed:**
- ✅ Domain Layer (100%)
- ✅ Application Layer (80% - missing some use cases)
- ✅ Infrastructure Layer (90% - have Stripe, Ably, Auth, DB)
- ❌ Presentation Layer (0% - controllers needed)

**Dependencies Installed:**
- ✅ stripe, ably
- ✅ @nestjs/passport, @nestjs/jwt, passport-jwt

**Environment Variables Needed:**
```bash
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
ABLY_API_KEY=your-ably-key
DATABASE_URL=postgresql://...
```

---

**Good luck with Phase 4! Focus on controllers first, then fill in missing use cases as needed. Keep tests green! 🟢**
