# Aegis MVP Implementation Plan
## Clean Architecture Approach - Web Application Focus

This plan outlines the implementation strategy for the Aegis platform MVP, following Clean Architecture (SOLID) principles. The focus is on building a web application with a logical, testable implementation order.

---

## Architecture Overview

We'll implement the system in layers, from the inside out:

```
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer (Web)                   │
│                 (Controllers, UI)                       │
├─────────────────────────────────────────────────────────┤
│              Application Layer                          │
│         (Use Cases, DTOs, Interfaces)                   │
├─────────────────────────────────────────────────────────┤
│            Infrastructure Layer                         │
│      (Repositories, External Services, DB)              │
├─────────────────────────────────────────────────────────┤
│              Domain Layer (CORE)                        │
│    (Entities, Value Objects, Domain Services)           │
└─────────────────────────────────────────────────────────┘
```

**Dependency Rule**: Dependencies point inward. The Domain Layer has NO dependencies. Each outer layer depends only on layers inside it.

---

## Phase 1: Domain Layer (Core Business Logic) - DETAILED

The Domain Layer is the heart of the application. It contains pure business logic with NO framework dependencies, making it highly testable and maintainable.

### 1.1 Core Entities

#### 1.1.1 User Aggregate
**Location**: `src/domain/entities/user/`

**User (Base Entity)**
```typescript
// Properties:
- id: UserId (Value Object)
- email: Email (Value Object)
- phoneNumber: PhoneNumber (Value Object)
- profile: UserProfile (Value Object)
- role: UserRole (Enum: CUSTOMER | GUARD | ADMIN)
- status: UserStatus (Enum: ACTIVE | SUSPENDED | INACTIVE)
- createdAt: DateTime
- updatedAt: DateTime

// Domain Methods:
- suspend(reason: string): void
- activate(): void
- updateProfile(profile: UserProfile): void
- verifyEmail(): void
- verifyPhone(): void
- hasRole(role: UserRole): boolean
```

**Customer (extends User)**
```typescript
// Additional Properties:
- verificationStatus: VerificationStatus
- defaultPaymentMethod: PaymentMethodId (optional)
- bookingHistory: BookingId[]

// Domain Methods:
- canRequestBooking(): boolean
- addBookingToHistory(bookingId: BookingId): void
- hasCompletedVerification(): boolean
```

**Guard (extends User)**
```typescript
// Additional Properties:
- certifications: Certification[] (Value Objects)
- skills: Skill[] (Value Objects)
- licenseNumber: LicenseNumber (Value Object)
- licenseExpiry: DateTime
- backgroundCheckStatus: BackgroundCheckStatus
- rating: Rating (Value Object)
- availability: Availability (Value Object)
- location: GeoLocation (Value Object)
- serviceArea: ServiceArea (Value Object)
- hourlyRate: Money (Value Object)

// Domain Methods:
- isAvailable(): boolean
- setAvailability(availability: Availability): void
- updateLocation(location: GeoLocation): void
- hasRequiredCertifications(requiredCerts: Skill[]): boolean
- canAcceptBooking(): boolean
- meetsMinimumRating(minRating: number): boolean
- isWithinServiceArea(location: GeoLocation): boolean
- updateRating(newRating: Rating): void
```

#### 1.1.2 Booking Aggregate
**Location**: `src/domain/entities/booking/`

**Booking (Aggregate Root)**
```typescript
// Properties:
- id: BookingId (Value Object)
- customerId: UserId
- guardId: UserId (optional until matched)
- serviceType: ServiceType (Value Object)
- status: BookingStatus (Enum)
- location: GeoLocation (Value Object)
- scheduledStartTime: DateTime
- scheduledEndTime: DateTime
- actualStartTime: DateTime (optional)
- actualEndTime: DateTime (optional)
- pricing: BookingPricing (Value Object)
- requirements: BookingRequirements (Value Object)
- timeline: BookingTimeline (Entity)
- cancellationInfo: CancellationInfo (optional)

// Domain Methods:
- requestBooking(): void
- assignGuard(guardId: UserId, estimatedArrival: DateTime): void
- acceptByGuard(): void
- rejectByGuard(reason: string): void
- start(): void
- complete(): void
- cancel(cancelledBy: UserId, reason: string): void
- canCancel(): boolean
- canStart(): boolean
- canComplete(): boolean
- calculateDuration(): Duration
- calculateFinalCost(): Money
- isOverdue(): boolean
```

**BookingStatus (Enum)**
```typescript
enum BookingStatus {
  REQUESTED,      // Customer created booking
  SEARCHING,      // System searching for guard
  MATCHED,        // Guard matched, awaiting acceptance
  ACCEPTED,       // Guard accepted
  IN_PROGRESS,    // Service ongoing
  COMPLETED,      // Service finished
  CANCELLED,      // Cancelled by either party
  NO_SHOW         // Guard or customer no-show
}
```

**BookingTimeline (Entity)**
```typescript
// Properties:
- events: BookingEvent[] (sorted chronologically)

// Domain Methods:
- addEvent(event: BookingEvent): void
- getLatestEvent(): BookingEvent
- wasEverInStatus(status: BookingStatus): boolean
```

#### 1.1.3 Payment Aggregate
**Location**: `src/domain/entities/payment/`

**Payment (Aggregate Root)**
```typescript
// Properties:
- id: PaymentId
- bookingId: BookingId
- customerId: UserId
- guardId: UserId
- amount: Money (Value Object)
- platformFee: Money (Value Object)
- guardPayout: Money (Value Object)
- status: PaymentStatus (Enum)
- paymentMethod: PaymentMethod (Value Object)
- transactions: Transaction[] (Entities)
- createdAt: DateTime

// Domain Methods:
- authorize(): void
- capture(): void
- refund(amount: Money, reason: string): void
- split(): PaymentSplit (Value Object)
- canRefund(): boolean
- calculatePlatformFee(): Money
```

**PaymentStatus (Enum)**
```typescript
enum PaymentStatus {
  PENDING,
  AUTHORIZED,
  CAPTURED,
  REFUNDED,
  FAILED
}
```

#### 1.1.4 Rating Aggregate
**Location**: `src/domain/entities/rating/`

**Rating (Aggregate Root)**
```typescript
// Properties:
- id: RatingId
- bookingId: BookingId
- reviewerId: UserId
- revieweeId: UserId
- score: Score (Value Object: 1-5)
- review: Review (Value Object)
- categories: RatingCategory[] (e.g., professionalism, punctuality)
- createdAt: DateTime
- isVerified: boolean

// Domain Methods:
- canBeEdited(): boolean
- edit(newScore: Score, newReview: Review): void
- verify(): void
```

### 1.2 Value Objects

Value Objects are immutable and defined by their attributes, not identity.

**Location**: `src/domain/value-objects/`

#### Essential Value Objects:

**UserId**
```typescript
class UserId {
  constructor(private readonly value: string) {
    this.validate(value);
  }

  private validate(value: string): void {
    // UUID format validation
  }

  equals(other: UserId): boolean
  toString(): string
}
```

**Email**
```typescript
class Email {
  constructor(private readonly value: string) {
    this.validate(value);
  }

  private validate(value: string): void {
    // Email format validation
  }

  equals(other: Email): boolean
  toString(): string
  getDomain(): string
}
```

**Money**
```typescript
class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: Currency
  ) {
    this.validate(amount);
  }

  add(other: Money): Money
  subtract(other: Money): Money
  multiply(factor: number): Money
  divide(divisor: number): Money
  equals(other: Money): boolean
  isZero(): boolean
  isPositive(): boolean
  format(): string
}
```

**GeoLocation**
```typescript
class GeoLocation {
  constructor(
    private readonly latitude: number,
    private readonly longitude: number
  ) {
    this.validate(latitude, longitude);
  }

  distanceTo(other: GeoLocation): Distance
  isWithinRadius(other: GeoLocation, radius: Distance): boolean
  equals(other: GeoLocation): boolean
}
```

**ServiceType**
```typescript
class ServiceType {
  constructor(
    private readonly type: ServiceTypeEnum,
    private readonly requiredSkills: Skill[],
    private readonly minimumCertification: Certification
  ) {}

  requiresSkill(skill: Skill): boolean
  meetsRequirements(guard: Guard): boolean
}

enum ServiceTypeEnum {
  BASIC_GUARD,
  EVENT_SECURITY,
  EXECUTIVE_PROTECTION,
  ARMED_SECURITY,
  K9_UNIT
}
```

**Availability**
```typescript
class Availability {
  constructor(
    private readonly schedule: TimeSlot[],
    private readonly maxBookingsPerDay: number
  ) {}

  isAvailableBetween(start: DateTime, end: DateTime): boolean
  addTimeSlot(slot: TimeSlot): Availability
  removeTimeSlot(slot: TimeSlot): Availability
}
```

**BookingPricing**
```typescript
class BookingPricing {
  constructor(
    private readonly baseRate: Money,
    private readonly estimatedHours: number,
    private readonly surgeMultiplier: number,
    private readonly platformFeePercentage: number
  ) {}

  calculateEstimatedTotal(): Money
  calculatePlatformFee(): Money
  calculateGuardPayout(): Money
  applySurge(multiplier: number): BookingPricing
}
```

**Rating (Value Object - different from Rating Entity)**
```typescript
class Rating {
  constructor(
    private readonly averageScore: number,
    private readonly totalRatings: number
  ) {
    this.validate(averageScore);
  }

  private validate(score: number): void {
    if (score < 0 || score > 5) throw new Error('Invalid rating');
  }

  addRating(newScore: number): Rating
  isAboveThreshold(threshold: number): boolean
  format(): string // "4.5 (123 ratings)"
}
```

### 1.3 Domain Events

Events that represent something that happened in the domain.

**Location**: `src/domain/events/`

```typescript
// Base Domain Event
abstract class DomainEvent {
  constructor(
    public readonly occurredAt: DateTime,
    public readonly aggregateId: string
  ) {}
}

// Booking Events
class BookingRequestedEvent extends DomainEvent {
  constructor(
    public readonly bookingId: BookingId,
    public readonly customerId: UserId,
    public readonly serviceType: ServiceType,
    public readonly location: GeoLocation,
    occurredAt: DateTime
  ) {
    super(occurredAt, bookingId.toString());
  }
}

class GuardMatchedEvent extends DomainEvent {
  constructor(
    public readonly bookingId: BookingId,
    public readonly guardId: UserId,
    occurredAt: DateTime
  ) {
    super(occurredAt, bookingId.toString());
  }
}

class BookingAcceptedEvent extends DomainEvent {
  constructor(
    public readonly bookingId: BookingId,
    public readonly guardId: UserId,
    occurredAt: DateTime
  ) {
    super(occurredAt, bookingId.toString());
  }
}

class BookingStartedEvent extends DomainEvent
class BookingCompletedEvent extends DomainEvent
class BookingCancelledEvent extends DomainEvent

// User Events
class UserRegisteredEvent extends DomainEvent
class GuardVerifiedEvent extends DomainEvent
class GuardAvailabilityChangedEvent extends DomainEvent

// Payment Events
class PaymentAuthorizedEvent extends DomainEvent
class PaymentCapturedEvent extends DomainEvent
class PaymentRefundedEvent extends DomainEvent
```

### 1.4 Domain Services

Business logic that doesn't naturally fit in entities or value objects.

**Location**: `src/domain/services/`

#### MatchingService (Core Business Logic)
```typescript
interface MatchingService {
  /**
   * Find the best available guard for a booking request
   * @returns GuardId of the best match, or null if no match found
   */
  findBestMatch(
    booking: Booking,
    availableGuards: Guard[],
    matchingCriteria: MatchingCriteria
  ): GuardId | null;

  /**
   * Score a guard for a specific booking
   * @returns Match score (0-100)
   */
  scoreGuard(
    guard: Guard,
    booking: Booking,
    criteria: MatchingCriteria
  ): number;
}

class MatchingCriteria {
  constructor(
    public readonly maxDistance: Distance,
    public readonly minRating: number,
    public readonly requiredSkills: Skill[],
    public readonly preferredGuards: UserId[],
    public readonly priceRange: PriceRange
  ) {}
}

// Implementation
class DefaultMatchingService implements MatchingService {
  findBestMatch(
    booking: Booking,
    availableGuards: Guard[],
    criteria: MatchingCriteria
  ): GuardId | null {
    // Filter guards by criteria
    const eligibleGuards = availableGuards.filter(guard =>
      this.meetsMinimumCriteria(guard, booking, criteria)
    );

    if (eligibleGuards.length === 0) return null;

    // Score each guard
    const scoredGuards = eligibleGuards.map(guard => ({
      guard,
      score: this.scoreGuard(guard, booking, criteria)
    }));

    // Sort by score (descending)
    scoredGuards.sort((a, b) => b.score - a.score);

    // Return best match
    return scoredGuards[0].guard.id;
  }

  scoreGuard(guard: Guard, booking: Booking, criteria: MatchingCriteria): number {
    let score = 0;

    // Distance score (40 points max)
    const distance = guard.location.distanceTo(booking.location);
    const distanceScore = this.calculateDistanceScore(distance, criteria.maxDistance);
    score += distanceScore * 0.4;

    // Rating score (30 points max)
    const ratingScore = (guard.rating.averageScore / 5) * 100;
    score += ratingScore * 0.3;

    // Skill match score (20 points max)
    const skillScore = this.calculateSkillMatchScore(guard, booking.requirements);
    score += skillScore * 0.2;

    // Preferred guard bonus (10 points max)
    if (criteria.preferredGuards.includes(guard.id)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private meetsMinimumCriteria(
    guard: Guard,
    booking: Booking,
    criteria: MatchingCriteria
  ): boolean {
    return (
      guard.isAvailable() &&
      guard.meetsMinimumRating(criteria.minRating) &&
      guard.isWithinServiceArea(booking.location) &&
      guard.hasRequiredCertifications(criteria.requiredSkills) &&
      guard.location.distanceTo(booking.location).isLessThan(criteria.maxDistance)
    );
  }

  private calculateDistanceScore(distance: Distance, maxDistance: Distance): number {
    // Closer = higher score
    const ratio = distance.toKilometers() / maxDistance.toKilometers();
    return Math.max(0, (1 - ratio) * 100);
  }

  private calculateSkillMatchScore(guard: Guard, requirements: BookingRequirements): number {
    // Calculate percentage of required skills that guard has
    const requiredSkills = requirements.skills;
    const matchedSkills = requiredSkills.filter(skill =>
      guard.skills.some(guardSkill => guardSkill.equals(skill))
    );

    return (matchedSkills.length / requiredSkills.length) * 100;
  }
}
```

#### PricingService
```typescript
interface PricingService {
  /**
   * Calculate booking price based on various factors
   */
  calculateBookingPrice(
    serviceType: ServiceType,
    duration: Duration,
    location: GeoLocation,
    scheduledTime: DateTime,
    guardRate: Money
  ): BookingPricing;

  /**
   * Determine surge multiplier based on demand
   */
  calculateSurgeMultiplier(
    location: GeoLocation,
    timeSlot: TimeSlot
  ): number;
}

class DefaultPricingService implements PricingService {
  constructor(
    private readonly platformFeePercentage: number = 0.25 // 25% platform fee
  ) {}

  calculateBookingPrice(
    serviceType: ServiceType,
    duration: Duration,
    location: GeoLocation,
    scheduledTime: DateTime,
    guardRate: Money
  ): BookingPricing {
    const hours = duration.toHours();
    const surgeMultiplier = this.calculateSurgeMultiplier(
      location,
      new TimeSlot(scheduledTime, scheduledTime.add(duration))
    );

    return new BookingPricing(
      guardRate,
      hours,
      surgeMultiplier,
      this.platformFeePercentage
    );
  }

  calculateSurgeMultiplier(location: GeoLocation, timeSlot: TimeSlot): number {
    // Business logic for surge pricing
    // - High demand times (weekends, evenings)
    // - Special events in the area
    // - Low guard availability

    let multiplier = 1.0;

    // Weekend surge
    if (timeSlot.isWeekend()) {
      multiplier += 0.3;
    }

    // Evening/night surge
    if (timeSlot.isEvening() || timeSlot.isNight()) {
      multiplier += 0.2;
    }

    // Holiday surge
    if (timeSlot.isHoliday()) {
      multiplier += 0.5;
    }

    return multiplier;
  }
}
```

#### AvailabilityService
```typescript
interface AvailabilityService {
  /**
   * Check if guard can accept a booking at specified time
   */
  canAcceptBooking(
    guard: Guard,
    booking: Booking
  ): AvailabilityCheckResult;

  /**
   * Find available time slots for a guard
   */
  findAvailableSlots(
    guard: Guard,
    dateRange: DateRange
  ): TimeSlot[];
}

class AvailabilityCheckResult {
  constructor(
    public readonly isAvailable: boolean,
    public readonly reason?: string
  ) {}
}
```

### 1.5 Domain Exceptions

**Location**: `src/domain/exceptions/`

```typescript
// Base domain exception
class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific exceptions
class InvalidBookingStateException extends DomainException {
  constructor(currentState: BookingStatus, attemptedAction: string) {
    super(`Cannot ${attemptedAction} booking in ${currentState} state`);
  }
}

class GuardNotAvailableException extends DomainException {
  constructor(guardId: UserId) {
    super(`Guard ${guardId} is not available`);
  }
}

class InsufficientRatingException extends DomainException {
  constructor(currentRating: number, requiredRating: number) {
    super(`Rating ${currentRating} is below required ${requiredRating}`);
  }
}

class InvalidValueException extends DomainException {}
class UnauthorizedActionException extends DomainException {}
class PaymentFailedException extends DomainException {}
```

### 1.6 Domain Specifications (Business Rules)

**Location**: `src/domain/specifications/`

Specifications encapsulate business rules that can be composed and reused.

```typescript
// Base specification interface
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

// Example: Guard eligibility specifications
class GuardIsActiveSpecification implements Specification<Guard> {
  isSatisfiedBy(guard: Guard): boolean {
    return guard.status === UserStatus.ACTIVE;
  }
}

class GuardHasValidLicenseSpecification implements Specification<Guard> {
  isSatisfiedBy(guard: Guard): boolean {
    return guard.licenseExpiry.isAfter(DateTime.now());
  }
}

class GuardHasRequiredSkillsSpecification implements Specification<Guard> {
  constructor(private readonly requiredSkills: Skill[]) {}

  isSatisfiedBy(guard: Guard): boolean {
    return this.requiredSkills.every(skill =>
      guard.skills.some(guardSkill => guardSkill.equals(skill))
    );
  }
}

class GuardCanAcceptBookingSpecification implements Specification<Guard> {
  constructor(private readonly booking: Booking) {}

  isSatisfiedBy(guard: Guard): boolean {
    const specs = [
      new GuardIsActiveSpecification(),
      new GuardHasValidLicenseSpecification(),
      new GuardIsAvailableSpecification(this.booking.scheduledStartTime),
      new GuardIsWithinServiceAreaSpecification(this.booking.location)
    ];

    return specs.every(spec => spec.isSatisfiedBy(guard));
  }
}
```

### 1.7 Testing Strategy for Domain Layer

**Location**: `tests/domain/`

```typescript
// Example test structure
describe('Booking Entity', () => {
  describe('requestBooking', () => {
    it('should create booking in REQUESTED status', () => {
      // Arrange
      const booking = BookingFactory.create();

      // Act
      booking.requestBooking();

      // Assert
      expect(booking.status).toBe(BookingStatus.REQUESTED);
    });
  });

  describe('assignGuard', () => {
    it('should assign guard when booking is in SEARCHING status', () => {
      // Test implementation
    });

    it('should throw error when booking is not in valid state', () => {
      // Test implementation
    });
  });

  describe('complete', () => {
    it('should calculate final cost based on actual duration', () => {
      // Test implementation
    });
  });
});

describe('MatchingService', () => {
  describe('findBestMatch', () => {
    it('should return null when no guards are available', () => {
      // Test implementation
    });

    it('should return closest available guard meeting criteria', () => {
      // Test implementation
    });

    it('should prioritize rating over distance when configured', () => {
      // Test implementation
    });
  });
});

describe('Money Value Object', () => {
  it('should be immutable', () => {
    // Test implementation
  });

  it('should handle currency conversion correctly', () => {
    // Test implementation
  });

  it('should throw error for negative amounts', () => {
    // Test implementation
  });
});
```

---

## Phase 2: Application Layer - HIGH LEVEL

The Application Layer orchestrates the domain logic and defines use cases. It depends on the Domain Layer but is independent of infrastructure concerns.

**Location**: `src/application/`

### 2.1 Use Cases (Application Services)

Each use case represents a single application operation:

```
src/application/use-cases/
  ├── booking/
  │   ├── create-booking.usecase.ts
  │   ├── accept-booking.usecase.ts
  │   ├── start-booking.usecase.ts
  │   ├── complete-booking.usecase.ts
  │   ├── cancel-booking.usecase.ts
  │   └── get-booking-details.usecase.ts
  ├── guard/
  │   ├── register-guard.usecase.ts
  │   ├── update-availability.usecase.ts
  │   ├── update-location.usecase.ts
  │   └── get-nearby-bookings.usecase.ts
  ├── customer/
  │   ├── register-customer.usecase.ts
  │   ├── request-booking.usecase.ts
  │   └── rate-guard.usecase.ts
  └── matching/
      ├── find-guard-for-booking.usecase.ts
      └── notify-guards-of-booking.usecase.ts
```

**Example Use Case Structure**:
```typescript
class CreateBookingUseCase {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly userRepository: IUserRepository,
    private readonly pricingService: PricingService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(request: CreateBookingRequest): Promise<CreateBookingResponse> {
    // 1. Validate customer exists
    // 2. Create booking entity with domain logic
    // 3. Calculate pricing
    // 4. Persist booking
    // 5. Publish domain event
    // 6. Return response
  }
}
```

### 2.2 DTOs (Data Transfer Objects)

```
src/application/dtos/
  ├── booking/
  │   ├── create-booking.dto.ts
  │   ├── booking-response.dto.ts
  │   └── booking-filter.dto.ts
  ├── guard/
  │   └── guard-profile.dto.ts
  └── customer/
      └── customer-profile.dto.ts
```

### 2.3 Ports (Interfaces)

Define contracts for infrastructure implementations:

```typescript
// Repository interfaces
interface IBookingRepository {
  save(booking: Booking): Promise<void>;
  findById(id: BookingId): Promise<Booking | null>;
  findByCustomerId(customerId: UserId): Promise<Booking[]>;
  findByStatus(status: BookingStatus): Promise<Booking[]>;
}

interface IGuardRepository {
  save(guard: Guard): Promise<void>;
  findById(id: UserId): Promise<Guard | null>;
  findAvailableGuards(location: GeoLocation, radius: Distance): Promise<Guard[]>;
}

// External service interfaces
interface IPaymentGateway {
  authorizePayment(amount: Money, paymentMethod: PaymentMethod): Promise<string>;
  capturePayment(authorizationId: string): Promise<void>;
  refundPayment(paymentId: string, amount: Money): Promise<void>;
}

interface INotificationService {
  sendPushNotification(userId: UserId, notification: Notification): Promise<void>;
  sendEmail(email: Email, subject: string, body: string): Promise<void>;
  sendSMS(phone: PhoneNumber, message: string): Promise<void>;
}

interface IBackgroundCheckService {
  initiateCheck(guard: Guard): Promise<string>;
  getCheckStatus(checkId: string): Promise<BackgroundCheckStatus>;
}
```

---

## Phase 3: Infrastructure Layer - HIGH LEVEL

Implements the interfaces defined in the Application Layer.

**Location**: `src/infrastructure/`

### 3.1 Database (PostgreSQL + Prisma)

```
src/infrastructure/persistence/
  ├── prisma/
  │   ├── schema.prisma
  │   └── migrations/
  ├── repositories/
  │   ├── booking.repository.ts (implements IBookingRepository)
  │   ├── user.repository.ts
  │   ├── payment.repository.ts
  │   └── rating.repository.ts
  └── mappers/
      ├── booking.mapper.ts (Domain ↔ Persistence)
      └── user.mapper.ts
```

### 3.2 External Services

```
src/infrastructure/external-services/
  ├── payment/
  │   └── stripe-payment-gateway.ts (implements IPaymentGateway)
  ├── notifications/
  │   ├── firebase-notification.service.ts
  │   └── sendgrid-email.service.ts
  ├── background-check/
  │   └── checkr-background-check.service.ts
  └── geolocation/
      └── mapbox-geolocation.service.ts
```

### 3.3 Caching (Redis)

```
src/infrastructure/cache/
  ├── redis-cache.service.ts
  └── cache-keys.ts
```

### 3.4 Event Bus

```
src/infrastructure/events/
  ├── event-bus.ts
  └── event-handlers/
      ├── booking-created.handler.ts
      └── guard-matched.handler.ts
```

---

## Phase 4: Presentation Layer (Web API + Frontend) - HIGH LEVEL

### 4.1 API Layer (NestJS)

**Location**: `src/presentation/`

```
src/presentation/
  ├── controllers/
  │   ├── booking.controller.ts
  │   ├── auth.controller.ts
  │   ├── guard.controller.ts
  │   └── customer.controller.ts
  ├── middleware/
  │   ├── auth.middleware.ts
  │   └── rate-limit.middleware.ts
  ├── filters/
  │   └── exception.filter.ts
  └── validators/
      └── request.validator.ts
```

### 4.2 Web Frontend (Next.js)

**Location**: `web/`

```
web/
  ├── app/
  │   ├── (auth)/
  │   │   ├── login/
  │   │   └── register/
  │   ├── (customer)/
  │   │   ├── dashboard/
  │   │   ├── bookings/
  │   │   └── profile/
  │   ├── (guard)/
  │   │   ├── dashboard/
  │   │   ├── jobs/
  │   │   └── availability/
  │   └── (admin)/
  │       └── dashboard/
  ├── components/
  │   ├── booking/
  │   ├── map/
  │   └── ui/
  └── lib/
      ├── api-client.ts
      └── hooks/
```

---

## Implementation Order & Integration Testing Strategy

### Phase 1: Core Domain (Week 1-2)
1. **Setup project structure** with TypeScript, testing framework
2. **Implement Value Objects** (Money, Email, GeoLocation, etc.)
3. **Implement Entities** (User, Guard, Customer, Booking)
4. **Implement Domain Services** (MatchingService, PricingService)
5. **Write comprehensive unit tests** for all domain logic

**Testing**: 100% unit test coverage for domain layer. No external dependencies.

### Phase 2: Application Layer (Week 3)
1. **Define all Ports (interfaces)**
2. **Implement Use Cases** (CreateBooking, AcceptBooking, etc.)
3. **Create DTOs for API contracts**
4. **Mock implementations of ports for testing**

**Testing**: Integration tests using mocked repositories and services.

### Phase 3: Infrastructure - Database (Week 4)
1. **Design Prisma schema**
2. **Implement repositories**
3. **Create database migrations**
4. **Implement mappers** (Domain ↔ Persistence)

**Testing**: Integration tests with test database. Test repository implementations.

### Phase 4: Infrastructure - External Services (Week 5)
1. **Implement payment gateway adapter (Stripe)**
2. **Implement notification services**
3. **Setup caching layer (Redis)**
4. **Implement event bus**

**Testing**: Integration tests with test/sandbox accounts for external services.

### Phase 5: API Layer (Week 6)
1. **Setup NestJS application**
2. **Implement REST controllers** (26 endpoints across 7 resource groups):
   - Authentication (3 endpoints)
   - Users (3 endpoints)
   - Jobs (6 endpoints)
   - **Location & Mapping (8 endpoints)** *(A-6-1, D-6)*:
     - Geocoding (forward/reverse)
     - Map configuration
     - Guard location tracking
     - Location history/routes
     - Service area validation
   - Payments (3 endpoints)
   - Admin (1 endpoint)
3. **Add authentication & authorization** (JWT, RBAC)
4. **Add validation & error handling** (DTOs, exception filters)
5. **Integrate external services**:
   - Mapbox (geocoding proxy)
   - Ably (real-time location streaming)
   - PostGIS (spatial queries)
6. **API documentation (Swagger/OpenAPI)**

**Testing**: API integration tests using Supertest. E2E tests for critical flows (location tracking, geocoding).

### Phase 6: Web Frontend (Week 7-8)
1. **Setup Next.js application**
2. **Implement customer flows** (register, book, track):
   - Address input with geocoding autocomplete
   - Map-based job creation (drop pin)
   - Real-time guard tracking on map (Ably + Mapbox)
   - Location history/route visualization
3. **Implement guard flows** (register, accept jobs, update location)
4. **Implement admin dashboard**
5. **Integrate with API** (26 endpoints)
6. **Map integration** (Mapbox GL JS):
   - Interactive map tiles
   - Geocoding for address input
   - Real-time marker updates
   - Route polylines for history

**Testing**: Component tests, E2E tests using Playwright (including map interactions).

### Phase 7: Integration & Testing (Week 9)
1. **Full system integration testing**
2. **Performance testing**
3. **Security testing**
4. **Bug fixes and refinements**

### Phase 8: Deployment & MVP Launch (Week 10)
1. **Setup AWS infrastructure**
2. **Configure CI/CD pipeline**
3. **Deploy to staging**
4. **Final testing and validation**
5. **Deploy to production**

---

## Phase 9: Post-Launch Operations & Monitoring (Ongoing)

### 9.1 Operational Excellence (Based on EVALUATION.md)

**Immediate (Week 10-12)**:
1. **CI/CD Enhancement**:
   - GitHub Actions pipeline with automated testing
   - Blue/green deployment for zero-downtime
   - Automated rollback on failure
   - Security scanning in pipeline (Snyk, Dependabot)

2. **Monitoring & Alerting**:
   - Datadog dashboards (business + technical metrics)
   - PagerDuty integration for on-call
   - Anomaly detection configuration
   - Synthetic monitoring (every 5 minutes)

3. **Cost Management**:
   - AWS Cost Explorer dashboards
   - Budget alerts (80% and 100% thresholds)
   - Tag-based cost tracking
   - Monthly cost optimization reviews

4. **Security Automation**:
   - Dependabot for dependency updates
   - OWASP ZAP weekly scans
   - AWS GuardDuty threat detection
   - Vulnerability response SLA enforcement

### 9.2 Testing Maturity (Based on TESTING_STRATEGY.md)

**Testing Goals**:
- Domain layer: >95% coverage (TDD approach)
- Application layer: >90% coverage
- Infrastructure layer: >80% coverage
- Overall: >85% coverage

**Testing Types**:
- Unit tests: Run on every commit (< 2 min)
- Integration tests: Run on every commit (< 3 min)
- E2E tests: Run pre-deployment (< 10 min)
- Load tests: Weekly + pre-release
- Security tests: Weekly
- Chaos tests: Bi-weekly (staging)

### 9.3 Chaos Engineering (Month 2+)

**Bi-weekly Chaos Tests** (Staging):
- ECS container kill tests
- Database connection failures
- Redis cache failures
- Network latency injection
- Third-party API failures

**Monthly Chaos Tests** (Production - Maintenance Windows):
- Controlled container failures
- Load spike tests
- Geographic failover tests

---

## Enhanced Implementation Timeline with Operations

### Revised Timeline: 12 Weeks (Including Operational Setup)

**Weeks 1-2: Foundation + DevOps**
- Domain layer (Phase 1)
- **CI/CD pipeline setup**
- **Monitoring infrastructure (Datadog, Sentry)**
- **Testing framework configuration**
- Unit test coverage: 50% domain layer

**Weeks 3-4: Application Layer + Testing**
- Application layer (Phase 2)
- **Integration test framework**
- **Contract testing setup (Pact)**
- Unit test coverage: 80% domain layer

**Weeks 5-6: Infrastructure + Security**
- Database repositories (Phase 3)
- External service adapters (Phase 4)
- **Security scanning (Snyk, Dependabot)**
- **Cost monitoring dashboards**
- Integration test coverage: 60%

**Weeks 7-8: API + E2E Testing**
- REST API (Phase 5)
- **E2E testing framework (Playwright)**
- **Load testing setup (k6)**
- E2E coverage: Critical paths

**Weeks 9-10: Frontend + Mobile**
- Web application (Phase 6)
- **Mobile offline mode implementation**
- **React Native testing (Detox)**
- Overall test coverage: >85%

**Weeks 11-12: Launch Prep + Operations**
- Staging deployment
- **Security audit (OWASP ZAP)**
- **Chaos engineering tests**
- **Runbook creation**
- Production deployment
- **Post-launch monitoring validation**

---

## Technology Stack Summary

### Core
- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Framework**: NestJS (backend), Next.js (frontend)

### Data Layer
- **Primary DB**: PostgreSQL 15+ with PostGIS
- **ORM**: Prisma
- **Cache**: Redis 7+
- **Search**: Elasticsearch (future)

### External Services
- **Payments**: Stripe Connect
- **Auth**: Auth0 or AWS Cognito
- **Maps**: Mapbox
- **Notifications**: Firebase Cloud Messaging
- **Email**: SendGrid
- **SMS**: Twilio
- **Background Checks**: Checkr

### Infrastructure
- **Cloud**: AWS (ECS, RDS, ElastiCache, S3)
- **CI/CD**: GitHub Actions
- **Monitoring**: Datadog or New Relic
- **Error Tracking**: Sentry

---

## MVP Feature Scope

### Customer Features
- ✅ Register/Login
- ✅ Create booking request
- ✅ View booking status
- ✅ Track guard location (real-time)
- ✅ In-app messaging
- ✅ Payment
- ✅ Rate and review guard
- ✅ View booking history

### Guard Features
- ✅ Register/Login
- ✅ View available jobs
- ✅ Accept/reject jobs
- ✅ Update availability
- ✅ Update location (real-time)
- ✅ Start/complete job
- ✅ In-app messaging
- ✅ View earnings

### Admin Features
- ✅ Dashboard with metrics
- ✅ Manage users (approve/suspend)
- ✅ View all bookings
- ✅ Handle disputes
- ✅ Configuration management

### Out of Scope for MVP
- ❌ Mobile apps (iOS/Android)
- ❌ Advanced analytics
- ❌ Multi-language support
- ❌ Video calls
- ❌ Advanced scheduling (recurring bookings)
- ❌ Corporate accounts
- ❌ Marketplace features (guard can set own rates)

---

## Success Metrics

### Technical
- Domain layer: 100% unit test coverage
- API layer: >80% test coverage
- API response time: <200ms (p95)
- System uptime: >99.5%

### Business (MVP)
- Customer registration flow completion: >70%
- Booking request to match time: <3 minutes
- Successful booking completion rate: >85%
- Guard acceptance rate: >60%

---

## Next Steps

1. **Review and approve this plan** with stakeholders
2. **Setup development environment** and project structure
3. **Begin Phase 1**: Implement domain layer with TDD approach
4. **Weekly reviews** to track progress and adjust as needed

---

## Notes

- This plan focuses on **clean architecture and testability**
- Each layer can be developed and tested **independently**
- The **domain layer has zero external dependencies**, making it highly maintainable
- The **implementation order allows for continuous integration testing** as we build outward
- **Mobile support** is designed into the architecture but will be implemented post-MVP
- All **business logic is in the domain layer**, making it easy to add new interfaces (mobile, webhooks, etc.) without changing core logic

---

## Key Recommendations Integrated from EVALUATION.md

This implementation plan now incorporates the following recommendations from the architectural evaluation:

### Short-Term (MVP Launch) ✅
1. **Offline Mode**: Implemented in mobile apps using WatermelonDB + AsyncStorage (Weeks 9-10)
2. **CI/CD Automation**: GitHub Actions pipeline with automated testing (Weeks 1-2)
3. **Vulnerability Scanning**: Dependabot + Snyk in CI pipeline (Weeks 5-6)
4. **Cost Monitoring**: AWS Cost Explorer with budget alerts (Weeks 5-6)
5. **Testing Framework**: Comprehensive testing strategy with >85% coverage (Throughout)

### Medium-Term (Post-Launch Growth) 📋
1. **Microservices Extraction**: When metrics trigger (error rate >5%, scaling needs)
   - Extract Matching Service (high CPU)
   - Extract Locations Service (high write volume)
2. **Multi-Region Deployment**: Route53 + RDS replication for national scale
3. **Advanced Security**: Anomaly detection via Datadog, device fingerprinting
4. **Chaos Engineering**: Bi-weekly staging tests, monthly production tests

### Long-Term (Scale to 50+ Cities) 🚀
1. **Full Microservices**: Complete migration to microservices architecture
2. **AI Enhancements**: ML-based guard matching optimization
3. **SOC2 Compliance**: Security audit and certification
4. **International Expansion**: Multi-country support, i18n

### Operational Improvements Implemented
- **Monitoring**: Datadog + Sentry + Grafana with anomaly detection
- **Alerting**: PagerDuty integration with severity-based SLAs
- **Testing**: Comprehensive pyramid (unit > integration > E2E)
- **Security**: Automated scanning, vulnerability SLAs, chaos tests
- **Performance**: Load testing (k6), performance budgets
- **Cost**: Tracking, alerting, optimization reviews

**References**:
- EVALUATION.md: Comprehensive architecture assessment (8.5/10 score)
- TESTING_STRATEGY.md: Complete testing approach and tools
- A-1-1 Section 13: Operations & Automation details
- D-1: Technical architecture decisions with offline mode
- D-2: MVP API Design (26 endpoints across 7 resource groups)
- D-6: Location & Mapping Architecture decision
- A-4-1: Authentication with advanced security features
- A-6-1: Location & Mapping API Specification (geocoding, maps, tracking)
