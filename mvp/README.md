# Aegis MVP - Uber for Security Guards

## Overview

This is the MVP implementation of Aegis, a platform connecting customers with security guards for on-demand and scheduled security services. The MVP follows clean architecture principles and focuses on validating the core business model.

## Project Structure

```
mvp/
├── packages/
│   ├── backend/          # NestJS backend API
│   │   └── src/
│   │       ├── domain/              # Domain layer (business logic)
│   │       │   ├── entities/        # Domain entities (User, Guard, Customer, Booking, Payment)
│   │       │   ├── value-objects/   # Value objects (Email, Money, GeoLocation, UserId)
│   │       │   ├── services/        # Domain services (Matching, Pricing)
│   │       │   ├── events/          # Domain events
│   │       │   └── interfaces/      # Domain interfaces
│   │       ├── application/         # Application layer (use cases) - TBD
│   │       ├── infrastructure/      # Infrastructure layer (DB, external services) - TBD
│   │       └── presentation/        # Presentation layer (controllers) - TBD
│   └── frontend/         # Next.js frontend (TBD)
├── package.json          # Root package.json with workspaces
├── .eslintrc.json        # ESLint configuration
└── .prettierrc           # Prettier configuration
```

## Phase 1: Foundation & Domain Layer ✅

### Completed

- **Project Setup**: Monorepo with workspaces, TypeScript, ESLint, Prettier, Jest
- **Domain Layer Implementation**:
  - **Value Objects**:
    - `Email`: Email address validation and normalization
    - `UserId`: UUID-based user identification
    - `Money`: Currency-aware money calculations
    - `GeoLocation`: Geospatial coordinates with distance calculations
  - **Entities**:
    - `User` (abstract base): Common user properties and behaviors
    - `Customer`: Customer-specific entity extending User
    - `Guard`: Guard-specific entity with location and availability
    - `Booking`: Booking/job entity with state machine (REQUESTED → MATCHED → ACCEPTED → IN_PROGRESS → COMPLETED)
    - `Payment`: Payment entity with status tracking
  - **Domain Services**:
    - `SimpleMatchingService`: Finds nearest available guards using Haversine formula
    - `PricingService`: Calculates booking costs with platform fees
  - **Domain Events**:
    - `BookingRequestedEvent`
    - `GuardMatchedEvent`
    - `BookingAcceptedEvent`
    - `BookingCompletedEvent`
- **Unit Tests**: Comprehensive test coverage for domain layer (>90% target)

### Key Design Decisions

1. **Clean Architecture**: Domain layer is isolated from infrastructure concerns
2. **State Machine**: Booking status transitions are enforced through methods
3. **Value Objects**: Immutable value objects for key domain concepts
4. **Domain Events**: Event-driven design for decoupled communication
5. **TDD**: Test-first approach with comprehensive unit tests

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: NestJS
- **Language**: TypeScript 5.3+
- **Testing**: Jest
- **ORM**: TypeORM / Prisma (to be configured)
- **Database**: PostgreSQL with PostGIS (to be configured)

### Frontend (Planned)
- **Framework**: Next.js 14+
- **UI**: Tailwind CSS + shadcn/ui
- **Maps**: Mapbox GL JS
- **Real-time**: Ably
- **State**: React Query + Zustand

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Run backend tests specifically
npm run backend:test

# Run tests with coverage
npm run backend:test -- --coverage
```

### Development

```bash
# Start backend in development mode (once implemented)
npm run backend:dev

# Start frontend in development mode (once implemented)
npm run frontend:dev

# Lint code
npm run lint

# Format code
npm run format
```

## Testing

The project follows TDD principles with comprehensive unit tests for the domain layer:

- **Value Objects Tests**: Email, Money, GeoLocation validation and behavior
- **Entity Tests**: State transitions, business rules, validations
- **Domain Service Tests**: Matching algorithms, pricing calculations

Run tests with:
```bash
cd packages/backend
npm test
```

## MVP Timeline (6-8 Weeks)

### ✅ Week 1: Foundation & Domain Layer (COMPLETED)
- Project setup with monorepo structure
- Domain entities, value objects, and services
- Domain events
- Unit tests with >90% coverage

### Week 2: Application Layer & Database (NEXT)
- Use cases implementation
- Repository interfaces
- PostgreSQL setup with TypeORM/Prisma
- Database migrations
- Integration tests

### Week 3: External Services & Auth
- Stripe integration (test mode)
- Ably real-time messaging
- JWT authentication
- Password hashing

### Week 4: REST API Implementation
- NestJS controllers (15 endpoints)
- API documentation (Swagger)
- Middleware and guards
- API integration tests

### Week 5-6: Web Frontend
- Next.js setup
- Customer and Guard dashboards
- Mapbox integration
- Real-time location tracking
- Payment flow (Stripe Elements)

### Week 7: Integration Testing & Bug Fixes
- End-to-end testing
- Bug fixes and edge cases
- Performance optimization
- Security review

### Week 8: Deployment & Demo (Optional)
- Deploy to Railway/Vercel
- Data seeding
- Demo preparation

## API Endpoints (Planned - 15 Total)

### Authentication (3)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Users (2)
- `GET /api/users/profile`
- `PATCH /api/users/profile`

### Jobs/Bookings (5)
- `POST /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/jobs`
- `POST /api/jobs/:id/accept`
- `POST /api/jobs/:id/complete`

### Location (3)
- `GET /api/map/config`
- `POST /api/jobs/:id/location`
- `GET /api/jobs/:id/location`

### Payments (2)
- `POST /api/payments/authorize`
- `POST /api/payments/capture`

## Domain Model

### Key Entities

**User (Abstract)**
- Base entity for all users
- Properties: id, email, passwordHash, role, fullName, phone, status
- Roles: CUSTOMER, GUARD, ADMIN

**Customer extends User**
- Can create bookings
- Has Stripe customer ID

**Guard extends User**
- Has hourly rate, rating, availability
- Tracks current location
- Can accept and complete bookings
- Has Stripe Connect account

**Booking**
- Status: REQUESTED → MATCHED → ACCEPTED → IN_PROGRESS → COMPLETED
- Links customer to guard
- Tracks estimated and actual time
- Calculates payment amounts

**Payment**
- Status: PENDING → AUTHORIZED → CAPTURED
- Tracks platform fee and guard payout
- Links to Stripe payment intent

### Domain Services

**SimpleMatchingService**
- Finds nearest available guard using Haversine distance formula
- Considers guard availability and rating
- Supports max distance filtering

**PricingService**
- Calculates booking costs with platform fees
- Default 20% platform fee
- Handles guard payout calculations
- Validates booking amounts

## Contributing

This is an MVP implementation. Follow these guidelines:

1. **Domain Layer First**: All business logic belongs in the domain layer
2. **Test-Driven Development**: Write tests before implementation
3. **Clean Architecture**: Maintain layer separation
4. **Type Safety**: Use TypeScript strictly
5. **Code Quality**: Run linter and formatter before committing

## License

Proprietary - Aegis Platform

## Next Steps

See [MVP_IMPLEMENTATION_PLAN.md](../MVP_IMPLEMENTATION_PLAN.md) for the complete implementation timeline.

---

**Last Updated**: 2025-11-10
**Status**: Phase 1 Complete - Domain Layer Implemented
**Next Phase**: Week 2 - Application Layer & Database
