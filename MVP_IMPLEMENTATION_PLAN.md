# Aegis MVP Implementation Plan (Web Demo)
## 6-8 Week Timeline - Core Business Validation

**Purpose**: Validate the "Uber for security guards" business model with a functional web application that demonstrates the complete booking flow, guard matching, real-time location tracking, and payment processing.

**Scope**: Web application only (defer mobile apps). Focus on proving the core business logic works before investing in production infrastructure.

---

## What's In Scope for MVP

### Core User Journey
1. ✅ Customer creates account and logs in
2. ✅ Customer creates booking with address and time
3. ✅ System matches available guard to booking
4. ✅ Guard accepts booking
5. ✅ Guard updates location during job
6. ✅ Customer tracks guard location in real-time on map
7. ✅ Guard completes job
8. ✅ Payment processed via Stripe
9. ✅ Basic job history view

### Essential Features Only
- **Authentication**: Email/password login (no OAuth yet)
- **Booking Management**: Create, view, accept, start, complete
- **Real-Time Tracking**: Guard location updates via Ably, displayed on Mapbox
- **Payment**: Stripe payment authorization and capture
- **Map Integration**: Mapbox for location display (no geocoding API, direct frontend integration)
- **Basic Admin**: Manual user/guard approval via database updates

### What's Deferred to Post-MVP
- ❌ Mobile applications (React Native)
- ❌ Geocoding endpoints (use Mapbox directly from frontend)
- ❌ Location history/route visualization
- ❌ Offline mode and batch sync
- ❌ Service area validation API
- ❌ Rating and review system
- ❌ In-app messaging
- ❌ Advanced admin dashboard
- ❌ Chaos engineering
- ❌ Load testing
- ❌ Production AWS infrastructure (use Heroku/Railway/Vercel for MVP)

---

## Technology Stack (Simplified)

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL 15+ with PostGIS extension
- **ORM**: TypeORM or Prisma
- **Cache**: Redis (optional for MVP, can use in-memory)
- **Auth**: JWT tokens (simple implementation, no Auth0)

### Frontend
- **Framework**: Next.js 14+ with App Router
- **UI**: Tailwind CSS + shadcn/ui components
- **Maps**: Mapbox GL JS
- **Real-time**: Ably client library
- **State**: React Query + Zustand

### External Services (Essential Only)
- **Payments**: Stripe (test mode)
- **Maps**: Mapbox (free tier: 50K loads/month)
- **Real-time**: Ably (free tier: 3M messages/month)
- **Email**: SendGrid (test mode) - optional

### Deployment (MVP)
- **Backend**: Railway or Render (simple, fast deployment)
- **Frontend**: Vercel (automatic deployments)
- **Database**: Railway Postgres or Supabase
- **Redis**: Railway Redis or Upstash

---

## Simplified API (15 Essential Endpoints)

### 1. Authentication (3 endpoints)
- `POST /api/auth/register` - User registration (customer/guard)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token

### 2. Users (2 endpoints)
- `GET /api/users/profile` - Get current user profile
- `PATCH /api/users/profile` - Update profile

### 3. Jobs/Bookings (5 endpoints)
- `POST /api/jobs` - Customer creates booking
- `GET /api/jobs/:id` - Get booking details
- `GET /api/jobs` - List jobs (filtered by user role)
- `POST /api/jobs/:id/accept` - Guard accepts job
- `POST /api/jobs/:id/complete` - Guard marks job complete

### 4. Location (3 endpoints)
- `GET /api/map/config` - Get Mapbox token and config
- `POST /api/jobs/:id/location` - Guard updates current location
- `GET /api/jobs/:id/location` - Get current guard location for job

### 5. Payments (2 endpoints)
- `POST /api/payments/authorize` - Authorize payment for booking
- `POST /api/payments/capture` - Capture payment after job completion

**Total: 15 endpoints** (vs 26 in full implementation plan)

---

## Simplified Database Schema

### Core Tables Only (5 tables)

```sql
-- Users table (customers and guards)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'guard', 'admin')),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guard-specific info
CREATE TABLE guard_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  license_number VARCHAR(50),
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(3, 2) DEFAULT 5.0,
  is_available BOOLEAN DEFAULT false,
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  last_location_update TIMESTAMP
);

-- Bookings/Jobs
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  guard_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('requested', 'matched', 'accepted', 'in_progress', 'completed', 'cancelled')),
  service_location_address TEXT NOT NULL,
  service_location_lat DECIMAL(10, 8) NOT NULL,
  service_location_lng DECIMAL(11, 8) NOT NULL,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  hourly_rate DECIMAL(10, 2),
  estimated_hours DECIMAL(4, 2),
  estimated_total DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Location updates (current location only, no history for MVP)
CREATE TABLE location_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  guard_id UUID NOT NULL REFERENCES users(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(8, 2),
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_location_booking ON location_updates(booking_id, timestamp DESC);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  guard_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  guard_payout DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'refunded', 'failed')),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Note**: No separate location_history table, no ratings table, no complex service types. Keep it minimal.

---

## Implementation Phases (6-8 Weeks)

### Week 1: Foundation & Domain Layer

**Goal**: Core business logic with no external dependencies

#### Tasks
1. **Project Setup** (Day 1):
   - Initialize monorepo with backend (NestJS) and frontend (Next.js)
   - Configure TypeScript, ESLint, Prettier
   - Setup Jest for testing
   - Basic folder structure following clean architecture

2. **Domain Layer Implementation** (Days 2-5):
   - **Entities**:
     - User (base), Customer (extends User), Guard (extends User)
     - Booking entity with status state machine
     - Payment entity
   - **Value Objects**:
     - Email, UserId, Money, GeoLocation (simplified)
   - **Domain Services**:
     - SimpleMatchingService (find nearest available guard)
     - PricingService (calculate booking cost)
   - **Domain Events**:
     - BookingRequested, GuardMatched, BookingAccepted, BookingCompleted

3. **Unit Tests** (Throughout):
   - Test all entity business logic
   - Test state transitions (booking status)
   - Test domain services
   - Target: >90% coverage for domain layer

**Deliverable**: Pure domain logic, fully tested, zero framework dependencies

---

### Week 2: Application Layer & Database

**Goal**: Use cases and data persistence

#### Tasks
1. **Application Layer** (Days 1-3):
   - **Use Cases**:
     - `RegisterUser`, `LoginUser`
     - `CreateBooking`, `AcceptBooking`, `CompleteBooking`
     - `UpdateGuardLocation`, `GetCurrentLocation`
     - `AuthorizePayment`, `CapturePayment`
   - **DTOs**:
     - Request/response DTOs for all use cases
     - Validation rules using class-validator
   - **Ports/Interfaces**:
     - IUserRepository, IBookingRepository, IPaymentRepository
     - IPaymentGateway, ILocationService

2. **Infrastructure - Database** (Days 4-5):
   - Setup PostgreSQL with PostGIS extension
   - Create Prisma/TypeORM schema (5 tables)
   - Implement repositories (User, Booking, Payment, Location)
   - Database migrations
   - Seed data (2 test guards, 1 test customer)

3. **Testing**:
   - Unit tests for use cases (with mocked repositories)
   - Integration tests for repositories (with test database)

**Deliverable**: Complete application logic with database persistence

---

### Week 3: External Services & Auth

**Goal**: Integrate Stripe, Ably, Mapbox, and implement authentication

#### Tasks
1. **Payment Integration** (Days 1-2):
   - Stripe test mode setup
   - StripePaymentGateway implementation (IPaymentGateway)
   - Payment authorization flow
   - Payment capture after job completion
   - Webhook handling (optional for MVP)

2. **Real-Time Location Streaming** (Day 3):
   - Ably account setup (free tier)
   - AblyLocationService implementation
   - Publish location updates to `jobs:{jobId}:location` channel
   - Subscribe to location updates in frontend

3. **Authentication & Authorization** (Days 4-5):
   - JWT token generation and validation
   - Password hashing (bcrypt)
   - Auth middleware for protected routes
   - Role-based access control (RBAC)
     - Customers can only create bookings
     - Guards can only accept/complete bookings
     - Guards can only update their own location

4. **Testing**:
   - Integration tests with Stripe test mode
   - Integration tests with Ably sandbox
   - Auth middleware tests

**Deliverable**: Working auth, payments, and real-time infrastructure

---

### Week 4: REST API Implementation

**Goal**: Complete backend API with 15 endpoints

#### Tasks
1. **NestJS Setup** (Day 1):
   - Configure NestJS modules
   - Setup dependency injection
   - Configure CORS for frontend
   - Global exception filter
   - Request validation pipe

2. **Controllers Implementation** (Days 2-4):
   - **AuthController** (3 endpoints): register, login, refresh
   - **UsersController** (2 endpoints): get profile, update profile
   - **JobsController** (5 endpoints): create, get, list, accept, complete
   - **LocationsController** (3 endpoints): config, update location, get location
   - **PaymentsController** (2 endpoints): authorize, capture

3. **Middleware & Guards** (Day 4):
   - JwtAuthGuard (protect all routes except auth)
   - RoleGuard (RBAC enforcement)
   - Rate limiting (basic, 100 req/min per IP)

4. **API Documentation** (Day 5):
   - Swagger/OpenAPI documentation
   - Postman collection for testing

5. **Testing**:
   - API integration tests using Supertest
   - Test all 15 endpoints
   - Test authentication and authorization flows

**Deliverable**: Complete backend API, documented and tested

---

### Week 5-6: Web Frontend (Customer & Guard Flows)

**Goal**: Functional web application with map integration

#### Week 5 Tasks

1. **Next.js Setup & Auth** (Days 1-2):
   - Configure Next.js 14 with App Router
   - Setup Tailwind CSS + shadcn/ui components
   - API client with axios/fetch
   - React Query setup for data fetching
   - Auth context and protected routes
   - Login/Register pages

2. **Customer Dashboard** (Days 3-5):
   - Create booking form:
     - Address input (text field, no autocomplete for MVP)
     - Manual lat/lng option OR click on map to drop pin
     - Date/time picker for scheduling
     - Service duration selector
   - My Bookings list (table view)
   - Booking detail page with status

#### Week 6 Tasks

3. **Map Integration** (Days 1-2):
   - Mapbox GL JS setup
   - Get Mapbox token from backend `/api/map/config`
   - Display map with service location marker
   - Real-time guard location marker
   - Connect to Ably channel for location updates
   - Auto-center map on guard location

4. **Guard Dashboard** (Days 3-4):
   - Available jobs list (cards)
   - Job detail with "Accept" button
   - Active job view:
     - "Start Job" button
     - Location update controls (automatic via browser geolocation)
     - "Complete Job" button
   - My Jobs history

5. **Payment Flow** (Day 5):
   - Stripe Elements integration
   - Payment form for customer
   - Payment authorization on booking creation
   - Payment capture trigger on job completion
   - Payment success/failure feedback

6. **Testing**:
   - Component tests for critical components
   - Basic E2E test: Create booking → Accept → Track → Complete

**Deliverable**: Complete web application with full booking flow

---

### Week 7: Integration Testing & Bug Fixes

**Goal**: End-to-end validation and polish

#### Tasks
1. **Full Flow Testing** (Days 1-2):
   - Customer registers → Creates booking
   - Guard registers → Accepts booking → Updates location
   - Customer sees real-time location updates
   - Guard completes job → Payment captured
   - Test with multiple concurrent bookings

2. **Bug Fixes & Edge Cases** (Days 3-4):
   - Handle no available guards scenario
   - Handle payment failures
   - Handle location update failures
   - Handle Ably disconnection (polling fallback)
   - Form validation improvements
   - Error message improvements

3. **Performance Optimization** (Day 5):
   - Database query optimization (add indexes)
   - API response time review (target: <200ms p95)
   - Frontend bundle size optimization
   - Map tile loading optimization

4. **Security Review**:
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitize inputs)
   - CSRF protection (enabled by default in NestJS)
   - Rate limiting verification

**Deliverable**: Stable, tested application ready for demo

---

### Week 8: Deployment & Demo Prep (Optional)

**Goal**: Deploy to staging and prepare demo

#### Tasks
1. **Backend Deployment** (Day 1):
   - Deploy to Railway/Render
   - Setup PostgreSQL database
   - Configure environment variables
   - Run migrations

2. **Frontend Deployment** (Day 2):
   - Deploy to Vercel
   - Configure environment variables (API URL, Mapbox token)
   - Test production build

3. **Data Seeding** (Day 3):
   - Create test customer accounts
   - Create test guard accounts (with different locations)
   - Create sample bookings in different states

4. **Demo Preparation** (Days 4-5):
   - Prepare demo script/flow
   - Create demo video (optional)
   - Documentation:
     - README with setup instructions
     - API documentation (Swagger)
     - Architecture overview (diagram)
     - Known limitations

**Deliverable**: Deployed MVP with demo-ready data

---

## Testing Strategy (Simplified)

### Unit Tests (Throughout Development)
- **Domain Layer**: >90% coverage (TDD approach)
- **Application Layer**: >80% coverage
- **Tools**: Jest
- **Run**: On every commit via Git hooks
- **Time Budget**: < 2 minutes

### Integration Tests (Weeks 2-4)
- **Database Repositories**: Test with real test database
- **External Services**: Test with sandbox/test modes (Stripe, Ably)
- **API Endpoints**: Test with Supertest
- **Tools**: Jest + Supertest + Testcontainers (optional)
- **Run**: On every commit
- **Time Budget**: < 5 minutes

### E2E Tests (Week 6-7)
- **Critical Flow**: Register → Create booking → Accept → Track → Complete → Pay
- **Tools**: Playwright (simple setup)
- **Coverage**: 1-2 critical paths only
- **Run**: Pre-deployment only
- **Time Budget**: < 5 minutes

### What's Deferred
- ❌ Load testing (k6)
- ❌ Chaos engineering
- ❌ Security penetration testing
- ❌ Performance profiling
- ❌ Mobile testing (Detox/Appium)

---

## Simplified Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Frontend (Next.js)                  │
│  Customer: Create Booking, Track Guard                     │
│  Guard: Accept Job, Update Location, Complete Job          │
└────────────┬──────────────────────────┬─────────────────────┘
             │ REST API (15 endpoints)  │ WebSocket (Ably)
             │                          │ Real-time Location
┌────────────▼──────────────────────────▼─────────────────────┐
│                  Backend API (NestJS)                       │
│  - Authentication (JWT)                                     │
│  - Business Logic (Use Cases)                               │
│  - Location Streaming (Ably Publisher)                      │
│  - Payment Processing (Stripe)                              │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│              PostgreSQL + PostGIS                           │
│  Tables: users, guard_profiles, bookings,                  │
│          location_updates, payments                         │
└─────────────────────────────────────────────────────────────┘

External Services:
- Stripe (Payments)
- Ably (Real-time)
- Mapbox (Maps - direct from frontend)
```

---

## Success Criteria for MVP

### Technical
- ✅ All 15 API endpoints working and documented
- ✅ Complete customer booking flow (web)
- ✅ Complete guard acceptance flow (web)
- ✅ Real-time location updates (< 2 second latency)
- ✅ Payment authorization and capture working
- ✅ >80% test coverage overall
- ✅ API response time < 200ms (p95)
- ✅ Deployed to staging environment

### Business Validation
- ✅ Demo flow: Customer creates booking → Guard accepts → Tracks location → Completes → Payment
- ✅ Can test with 2-3 concurrent bookings
- ✅ Proof that core matching algorithm works
- ✅ Proof that real-time tracking works reliably
- ✅ Proof that payment flow works end-to-end

### Questions Answered
- ✅ Does the matching algorithm work in practice?
- ✅ Is real-time tracking a good user experience?
- ✅ Are the pricing calculations correct?
- ✅ Is the booking flow intuitive for customers?
- ✅ Is the job acceptance flow good for guards?
- ✅ What are the critical bottlenecks?

---

## What Happens After MVP Validation

Once the MVP proves the core business model works, migrate to the full **IMPLEMENTATION_PLAN.md** for production:

### Post-MVP Phase 1 (Weeks 9-12)
1. **Mobile Apps**: React Native for iOS/Android
2. **Offline Mode**: WatermelonDB + batch sync
3. **Location History**: Route visualization, distance tracking
4. **Geocoding API**: Backend proxy for address autocomplete
5. **Rating System**: Guard and customer reviews
6. **Admin Dashboard**: Web-based management console

### Post-MVP Phase 2 (Weeks 13-16)
1. **Production Infrastructure**: AWS ECS, RDS, ElastiCache
2. **CI/CD**: GitHub Actions with automated deployments
3. **Monitoring**: Datadog, Sentry, PagerDuty
4. **Load Testing**: k6 tests, performance tuning
5. **Security Audit**: OWASP ZAP, penetration testing
6. **Advanced Features**: In-app messaging, multi-language

### Post-MVP Phase 3 (Weeks 17+)
1. **Scale Preparation**: Microservices extraction (if needed)
2. **Chaos Engineering**: Failure resilience testing
3. **Multi-Region**: Geographic expansion
4. **SOC2 Compliance**: Security certification
5. **AI/ML**: Intelligent guard matching

---

## Cost Estimate for MVP (6-8 Weeks)

### Development Services (Free Tiers Sufficient)
- **Mapbox**: 50K map loads/month = **$0**
- **Ably**: 3M messages/month = **$0**
- **Stripe**: Test mode = **$0**
- **SendGrid**: 100 emails/day = **$0**

### Hosting (Minimal Cost)
- **Railway/Render**: ~$5-10/month for backend + PostgreSQL
- **Vercel**: Free for frontend (hobby tier)
- **Redis**: Upstash free tier (if needed)

**Total MVP Cost: ~$5-10/month**

(Compare to production AWS: ~$200-500/month)

---

## Team Requirements

### Minimum Team
- **1 Backend Engineer**: NestJS, PostgreSQL, domain modeling
- **1 Frontend Engineer**: Next.js, React, Mapbox integration
- **0.5 DevOps**: Railway/Vercel deployment (part-time)

### Skills Needed
- TypeScript (both backend/frontend)
- Clean Architecture principles
- REST API design
- JWT authentication
- Real-time systems (Ably/WebSockets)
- Map integration (Mapbox)
- Payment integration (Stripe)

### Nice to Have
- Experience with NestJS/Next.js
- Domain-Driven Design knowledge
- TDD experience
- PostgreSQL/PostGIS knowledge

---

## Risk Mitigation (MVP)

### Risk 1: Real-Time Location Streaming Unreliable
**Mitigation**: Implement polling fallback. If Ably fails, frontend polls `/api/jobs/:id/location` every 10 seconds.

### Risk 2: Mapbox Free Tier Exhausted
**Mitigation**: 50K loads/month is sufficient for 5-10 users testing. Monitor usage in Mapbox dashboard.

### Risk 3: Stripe Test Mode Limitations
**Mitigation**: Use Stripe test cards for all testing. Document real card flow for post-MVP.

### Risk 4: No Available Guards for Demo
**Mitigation**: Seed database with 3-5 test guards at different locations, all marked as available.

### Risk 5: Browser Geolocation Permissions Denied
**Mitigation**: Provide manual lat/lng input as fallback for guard location updates.

---

## Key Differences from Full Implementation Plan

| Aspect | Full Plan (IMPLEMENTATION_PLAN.md) | MVP Plan (This Doc) |
|--------|-------------------------------------|---------------------|
| **Timeline** | 12 weeks | 6-8 weeks |
| **Platform** | Web + iOS + Android | Web only |
| **Endpoints** | 26 endpoints, 7 resource groups | 15 endpoints, 5 groups |
| **Database** | Complex schema with history, ratings | 5 simple tables |
| **Deployment** | AWS ECS, RDS, ElastiCache | Railway + Vercel |
| **Testing** | Unit + Integration + E2E + Load + Chaos | Unit + Integration + Basic E2E |
| **Monitoring** | Datadog + Sentry + PagerDuty | Basic logging |
| **Features** | Offline mode, geocoding, location history, ratings, messaging | Core booking + tracking + payment |
| **Cost** | $200-500/month production | $5-10/month MVP |
| **Team** | 2-3 engineers full-time | 1-2 engineers |
| **Goal** | Production-ready platform | Business model validation |

---

## Next Steps

1. ✅ **Approve this MVP plan** with stakeholders
2. ✅ **Setup Git repository** and project structure
3. ✅ **Week 1**: Start domain layer implementation (TDD approach)
4. ✅ **Weekly check-ins**: Review progress, adjust timeline
5. ✅ **Week 7**: Internal demo to stakeholders
6. ✅ **Week 8**: External demo to potential customers/guards
7. ✅ **Decide**: If validated, proceed to full IMPLEMENTATION_PLAN.md

---

## Documentation Links

- **Full Production Plan**: See `IMPLEMENTATION_PLAN.md`
- **Architecture Details**: See `specs/A-1-1-SystemArchitectureDocument.md`
- **API Specification**: See `specs/A-6-1-LocationMappingAPISpec.md` (note: MVP uses subset)
- **Testing Strategy**: See `TESTING_STRATEGY.md` (note: MVP uses simplified approach)
- **Technical Decisions**: See `lattice/D-*.md` files

---

**Last Updated**: 2025-11-10
**Status**: Proposed
**Target Start**: TBD
**Target Completion**: 6-8 weeks from start
