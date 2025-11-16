# Actual MVP Architecture - As Implemented

**Document Type**: Implementation Documentation (As-Built)
**Last Updated**: 2025-11-15
**Status**: Phase 5 Complete - Fully Functional MVP
**Purpose**: Documents the actual implementation, not the proposed design

---

## Executive Summary

This document describes the **actual implementation** of the Aegis MVP as it exists in the codebase. This differs from the proposed architecture documents (D-series, A-series) which describe the intended full-scale implementation.

### Key Differences from Proposed Architecture

- **Simplified Location Services**: 3 endpoints vs 8 proposed
- **Frontend Geocoding**: Uses OpenStreetMap Nominatim directly (no backend proxy)
- **No Advanced Features**: No service area validation, location history, or batch sync
- **No Caching Layer**: No Redis implementation
- **Basic Real-Time**: Ably for location streaming only
- **Test Payment Processing**: Stripe in test mode with manual authorization flow

### What's Actually Built

✅ **Core Booking System** - Full CRUD for jobs/bookings
✅ **Real-Time Location Tracking** - Ably + Mapbox with live updates
✅ **Payment Integration** - Stripe authorization + capture flow
✅ **Authentication** - JWT-based auth with refresh tokens
✅ **Interactive Maps** - Mapbox GL with real-time markers
✅ **Customer & Guard Dashboards** - Full Next.js web application

---

## System Architecture Overview

### Technology Stack (Actual)

#### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15+ with PostGIS extension
- **ORM**: TypeORM 0.3.19
- **Real-Time**: Ably 2.14.0
- **Payments**: Stripe (test mode)
- **Authentication**: JWT (manual implementation, no Passport)

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS (no shadcn/ui)
- **Maps**: Mapbox GL JS 3.16.0, react-map-gl 8.1.0
- **State Management**: Zustand 5.0.8
- **Data Fetching**: @tanstack/react-query 5.90.7
- **HTTP Client**: Axios

#### Infrastructure
- **Development**: Local PostgreSQL
- **Deployment**: Not yet deployed
- **Environment Management**: .env files

---

## Domain Layer (Implemented)

### Value Objects

**Implemented:**
1. **Email** (`email.value-object.ts`)
   - Email validation and normalization
   - Uses regex for format validation

2. **UserId** (`user-id.value-object.ts`)
   - UUID-based user identification
   - Immutable identifier

3. **Money** (`money.value-object.ts`)
   - Currency-aware (USD only in practice)
   - Arithmetic operations (add, subtract, multiply)
   - Validation (non-negative amounts)

4. **GeoLocation** (`geo-location.value-object.ts`)
   - Latitude/Longitude validation
   - **Haversine distance calculation** (actual implementation)
   - 8 decimal place precision (~1.1mm accuracy)

**Not Implemented from Proposed:**
- PhoneNumber value object
- Address value object
- ServiceArea value object

### Entities

**Implemented:**
1. **User (Abstract)** (`user.entity.ts`)
   - Base class for Customer and Guard
   - Properties: id, email, passwordHash, role, fullName, phone, status
   - Roles: CUSTOMER, GUARD, ADMIN

2. **Customer** (`customer.entity.ts`)
   - Extends User
   - No Stripe customer ID tracking in domain (only in DB entity)

3. **Guard** (`guard.entity.ts`)
   - Extends User
   - Properties: hourlyRate, currentLocation, isAvailable, rating
   - Methods: updateLocation(), setAvailable(), updateRating()

4. **Booking** (`booking.entity.ts`)
   - State machine: REQUESTED → MATCHED → ACCEPTED → IN_PROGRESS → COMPLETED → CANCELLED
   - Properties: customer, guard, serviceLocation, scheduledAt, duration, status
   - Methods: acceptByGuard(), startJob(), completeJob(), cancel()
   - Payment amount calculation

5. **Payment** (`payment.entity.ts`)
   - Status: PENDING → AUTHORIZED → CAPTURED → FAILED
   - Properties: booking, customerId, guardId, amount, platformFee, guardPayout, stripePaymentIntentId
   - Methods: markAuthorized(), markCaptured(), markFailed()

### Domain Services

**Implemented:**
1. **SimpleMatchingService** (`simple-matching.service.ts`)
   - Finds nearest available guard using Haversine formula
   - Filters by availability and distance
   - Returns single best match (not list)
   - No advanced matching criteria (rating, experience, etc.)

2. **PricingService** (`pricing.service.ts`)
   - Calculates booking cost: hourlyRate × duration
   - Platform fee: 20% (hardcoded)
   - Guard payout: 80%
   - No dynamic pricing, surge pricing, or discounts

**Not Implemented:**
- ServiceAreaValidator
- RouteOptimizer
- Background check integration

---

## Application Layer (Use Cases)

### Authentication Use Cases

1. **RegisterUserUseCase** ✅
   - Registers customer or guard
   - Hashes password with bcrypt
   - Creates guard profile if role is GUARD
   - No email verification

2. **LoginUserUseCase** ✅
   - Validates credentials
   - Returns JWT access token (1h) and refresh token (7d)
   - No rate limiting

3. **RefreshTokenUseCase** ✅
   - Validates refresh token
   - Issues new access token
   - No token rotation

### Booking Use Cases

1. **CreateBookingUseCase** ✅
   - Creates booking with service location
   - Auto-assigns nearest guard using SimpleMatchingService
   - No payment authorization during creation (done separately)

2. **AcceptBookingUseCase** ✅
   - Guard accepts MATCHED booking
   - Transitions to ACCEPTED status
   - No conflict detection (guard can accept multiple jobs)

3. **CompleteBookingUseCase** ✅
   - Guard completes job
   - Automatically captures payment
   - Calculates actual duration
   - No automatic rating prompt

4. **GetBookingUseCase** ✅
   - Retrieves single booking details
   - No authorization check (any authenticated user can view any booking)

5. **ListBookingsUseCase** ✅
   - Filters by user role (customer sees their bookings, guard sees available/assigned)
   - No pagination
   - No advanced filters (date range, status, location)

### Location Use Cases

1. **UpdateLocationUseCase** ✅
   - Guard updates location during job
   - Validates guard is assigned to booking
   - Stores in database
   - Publishes to Ably channel: `jobs:{bookingId}:location`

2. **GetCurrentLocationUseCase** ✅
   - Retrieves latest location for booking
   - No authorization check
   - Returns single point (no history)

**Not Implemented:**
- GetLocationHistoryUseCase
- BatchUpdateLocationUseCase
- ValidateServiceAreaUseCase

### Payment Use Cases

1. **AuthorizePaymentUseCase** ✅
   - Creates Stripe PaymentIntent
   - Stores payment intent ID
   - Does NOT capture (authorization only)
   - Requires guard to be assigned

2. **CapturePaymentUseCase** ✅
   - Captures previously authorized payment
   - Called automatically on job completion
   - Graceful failure (logs error but doesn't block completion)

**Not Implemented:**
- RefundPaymentUseCase
- SplitPaymentUseCase (direct payout to guard)

### User Use Cases

1. **UpdateUserProfileUseCase** ✅
   - Updates user profile (name, phone)
   - Guard can update hourlyRate
   - No profile picture upload

---

## Infrastructure Layer

### Database Schema (Actual)

**Tables Implemented:**

1. **users** (UserEntity)
   ```
   - id: uuid PRIMARY KEY
   - email: varchar UNIQUE
   - password_hash: varchar
   - role: varchar (CUSTOMER, GUARD, ADMIN)
   - full_name: varchar
   - phone: varchar
   - status: varchar (ACTIVE, INACTIVE)
   - stripe_customer_id: varchar (nullable)
   - created_at: timestamp
   - updated_at: timestamp
   ```

2. **guard_profiles** (GuardProfileEntity)
   ```
   - id: uuid PRIMARY KEY
   - user_id: uuid FOREIGN KEY → users(id)
   - hourly_rate: decimal(10,2)
   - rating: decimal(3,2) (0.00-5.00)
   - total_jobs: integer
   - is_available: boolean
   - current_latitude: decimal(10,8)
   - current_longitude: decimal(11,8)
   - created_at: timestamp
   - updated_at: timestamp
   ```

3. **bookings** (BookingEntity)
   ```
   - id: uuid PRIMARY KEY
   - customer_id: uuid FOREIGN KEY → users(id)
   - guard_id: uuid FOREIGN KEY → users(id) (nullable)
   - service_location_lat: decimal(10,8)
   - service_location_lng: decimal(11,8)
   - service_location_address: varchar
   - scheduled_at: timestamp
   - duration_minutes: integer
   - estimated_cost_amount: decimal(10,2)
   - status: varchar (REQUESTED, MATCHED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED)
   - started_at: timestamp (nullable)
   - completed_at: timestamp (nullable)
   - created_at: timestamp
   - updated_at: timestamp
   ```

4. **location_updates** (LocationUpdateEntity)
   ```
   - id: uuid PRIMARY KEY
   - booking_id: uuid FOREIGN KEY → bookings(id)
   - guard_id: uuid FOREIGN KEY → users(id)
   - latitude: decimal(10,8)
   - longitude: decimal(11,8)
   - accuracy_meters: decimal(10,2)
   - timestamp: timestamp

   INDEX: (booking_id, timestamp)
   ```

5. **payments** (PaymentEntity)
   ```
   - id: uuid PRIMARY KEY
   - booking_id: uuid FOREIGN KEY → bookings(id)
   - customer_id: uuid FOREIGN KEY → users(id)
   - guard_id: uuid FOREIGN KEY → users(id)
   - amount_value: decimal(10,2)
   - platform_fee_value: decimal(10,2)
   - guard_payout_value: decimal(10,2)
   - stripe_payment_intent_id: varchar (nullable)
   - status: varchar (PENDING, AUTHORIZED, CAPTURED, FAILED)
   - created_at: timestamp
   - updated_at: timestamp
   ```

**Not Implemented:**
- `service_areas` table (no geofencing)
- `location_history` table (uses location_updates instead)
- `background_checks` table
- PostGIS spatial indexes (PostGIS extension enabled but not actively used)

### External Service Adapters

**Implemented:**

1. **StripePaymentGateway** (`stripe-payment-gateway.adapter.ts`)
   - Uses Stripe SDK
   - Implements: createPaymentIntent(), capturePaymentIntent()
   - Test mode only
   - No webhook handling
   - No Connect integration (no direct guard payouts)

2. **AblyLocationService** (`ably-location-service.adapter.ts`)
   - Publishes location updates to Ably channels
   - Channel format: `jobs:{bookingId}:location`
   - Event type: `location-update`
   - Connection logging
   - Graceful degradation if no API key

3. **JwtAuthService** (`jwt-auth.service.ts`)
   - Issues JWT access tokens (1 hour expiry)
   - Issues refresh tokens (7 days expiry)
   - Uses jsonwebtoken library
   - No token blacklisting
   - No refresh token rotation

**Not Implemented:**
- Mapbox Geocoding Service (frontend uses Nominatim directly)
- SendGrid/Twilio for notifications
- Checkr for background checks
- Redis caching layer

### Repositories

**All repositories implemented with TypeORM:**
- UserRepository
- BookingRepository
- PaymentRepository
- LocationRepository

**Features:**
- Basic CRUD operations
- Simple filtering (no advanced queries)
- No pagination
- No soft deletes
- No audit logging

---

## Presentation Layer (REST API)

### Implemented Endpoints (15 Total)

#### Authentication (Public)
1. `POST /auth/register`
   - Body: { email, password, role, fullName, phone, hourlyRate? }
   - Returns: { accessToken, refreshToken, user }

2. `POST /auth/login`
   - Body: { email, password }
   - Returns: { accessToken, refreshToken, user }

3. `POST /auth/refresh`
   - Body: { refreshToken }
   - Returns: { accessToken }

#### Users (Authenticated)
4. `GET /users/profile`
   - Returns current user profile

5. `PATCH /users/profile`
   - Body: { fullName?, phone?, hourlyRate? }
   - Returns updated user

#### Jobs/Bookings (Authenticated)
6. `POST /jobs`
   - Body: { serviceLocationLat, serviceLocationLng, serviceLocationAddress, scheduledAt, durationMinutes }
   - Auto-assigns guard
   - Returns created booking

7. `GET /jobs/:id`
   - Returns booking details

8. `GET /jobs`
   - Query: ?status=PENDING,ACCEPTED
   - Role-filtered (customers see their bookings, guards see available/assigned)

9. `POST /jobs/:id/accept`
   - Guard accepts booking
   - Returns updated booking

10. `POST /jobs/:id/complete`
    - Guard completes booking
    - Auto-captures payment
    - Returns updated booking

#### Location (Mixed Auth)
11. `GET /map/config` (Public)
    - Returns: { mapboxToken, ablyApiKey, mapStyle, defaultCenter, defaultZoom }

12. `POST /jobs/:id/location` (Guard only)
    - Body: { latitude, longitude, accuracyMeters }
    - Publishes to Ably
    - Returns success

13. `GET /jobs/:id/location` (Authenticated)
    - Returns current location

#### Payments (Authenticated)
14. `POST /payments/authorize`
    - Body: { bookingId }
    - Creates PaymentIntent
    - Returns: { clientSecret, paymentIntentId }

15. `POST /payments/capture`
    - Body: { paymentId }
    - Captures authorized payment
    - Returns updated payment

**Not Implemented:**
- `POST /geocoding/forward` (no backend geocoding)
- `POST /geocoding/reverse`
- `GET /jobs/:id/location/history`
- `POST /locations/validate-service-area`
- `POST /jobs/:id/location/batch`

### API Characteristics

**Missing from Proposed:**
- No Swagger/OpenAPI documentation
- No request rate limiting
- No API versioning (/v1/)
- No compression middleware
- No CORS configuration (defaults)
- No request logging middleware
- No input sanitization beyond class-validator

---

## Frontend Implementation

### Pages Structure

**Customer Pages:**
1. `/customer` - Dashboard with statistics (bookings, active, completed)
2. `/customer/create-booking` - Create booking form
3. `/customer/bookings` - List all bookings with status filter
4. `/customer/bookings/[id]` - Booking detail with real-time map

**Guard Pages:**
1. `/guard` - Dashboard with statistics (available jobs, active, earnings)
2. `/guard/available-jobs` - Browse and accept jobs
3. `/guard/active-job` - Current job with location tracker
4. `/guard/history` - Past jobs and earnings

**Public Pages:**
1. `/login` - Login form
2. `/register` - Registration form with role selection
3. `/` - Landing page (redirects based on auth)

### Key Components

**Map Components:**
- **JobMap** (`components/map/job-map.tsx`)
  - Mapbox GL map with zoom, pan, navigation controls
  - Service location marker (blue)
  - Guard location marker (green with pulse animation)
  - Auto-center on guard updates
  - Manual re-center controls
  - Connection status indicator

**Location Tracking:**
- **LocationTracker** (`components/guard/location-tracker.tsx`)
  - Browser geolocation API
  - High accuracy mode
  - 10-second update interval
  - Error handling (permission denied, timeout, unavailable)
  - Visual status indicator

**Payment Components:**
- **PaymentForm** (`components/payment/payment-form.tsx`)
  - Stripe Elements integration
  - Card input field
  - Payment authorization flow
  - Error handling

- **PaymentStatus** (`components/payment/payment-status.tsx`)
  - Status badges (pending, authorized, captured, failed)
  - Amount display
  - Breakdown (platform fee, guard payout)

- **PaymentAuthorization** (`components/payment/payment-authorization.tsx`)
  - Wraps payment form
  - Creates PaymentIntent
  - Handles clientSecret

**Booking Components:**
- **CreateBookingForm** (`components/customer/create-booking-form.tsx`)
  - Address input
  - **OpenStreetMap Nominatim geocoding** (frontend only)
  - Manual lat/lng entry
  - Date/time picker
  - Duration selector
  - Real-time cost estimate

- **BookingsLis** (`components/customer/bookings-list.tsx`)
  - Table view
  - Status filters
  - 10-second auto-refresh

- **BookingDetail** (`components/customer/booking-detail.tsx`)
  - Service details
  - Guard info (when assigned)
  - Real-time map (when in_progress)
  - Payment authorization section
  - Status tracking

**Guard Components:**
- **AvailableJobsList** (`components/guard/available-jobs-list.tsx`)
  - Job cards with distance calculation (Haversine)
  - Sorts by distance if guard location available
  - Accept button

- **ActiveJobView** (`components/guard/active-job-view.tsx`)
  - Job details
  - Real-time elapsed time
  - Current earnings
  - Location tracker
  - Map with service location
  - Complete button

### State Management

**Auth Store** (Zustand):
- Current user
- Access/refresh tokens
- Login/logout methods
- Token persistence in localStorage

**API Client** (Axios):
- Base URL from environment
- Auth interceptor (adds Bearer token)
- Auto token refresh on 401
- No request/response logging

**React Query**:
- Data fetching and caching
- Auto-refetch intervals (5-30s depending on page)
- Mutations for bookings, payments
- No optimistic updates
- No offline support

### Real-Time Integration

**Ably Client** (`lib/ably-client.ts`):
- Singleton instance
- Channel subscriptions: `jobs:{bookingId}:location`
- Event type: `location-update`
- Auto-reconnection
- Cleanup on unmount

**Location Streaming Flow:**
1. Guard's LocationTracker sends location every 10s → Backend API
2. Backend publishes to Ably channel
3. Customer's JobMap subscribes to channel
4. Guard marker updates in real-time

---

## Geocoding Implementation (Actual)

### Frontend Direct Geocoding

**Service Used**: OpenStreetMap Nominatim
**Implementation**: `components/customer/create-booking-form.tsx` (lines 65-96)

```typescript
const geocode = async () => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    formData.serviceLocationAddress
  )}&format=json&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (data[0]) {
    setFormData({
      ...formData,
      serviceLocationLat: parseFloat(data[0].lat),
      serviceLocationLng: parseFloat(data[0].lon),
    });
  }
};
```

**Characteristics:**
- Direct API call from browser (no backend proxy)
- No API key required
- No rate limiting
- No caching
- No error handling for API failures
- Nominatim free tier: limited to 1 request/second
- Takes first result only (no disambiguation)

**Contrast with Proposed Architecture:**
- **Proposed**: Backend proxy with Redis caching, rate limiting, Mapbox API
- **Actual**: Direct frontend calls to free Nominatim API

### No Reverse Geocoding

**Missing**: Coordinates → Address conversion
**Impact**: No automatic address display when user drops pin on map

### No Service Area Validation

**Missing**: PostGIS spatial queries to check if location is in coverage area
**Impact**: No "Sorry, we don't serve this area" feedback

---

## Real-Time Location Architecture (Actual)

### Ably Integration

**Channel Naming**: `jobs:{bookingId}:location`
**Event Type**: `location-update`

**Backend Publishing** (`ably-location-service.adapter.ts`):
```typescript
async publishLocationUpdate(bookingId: string, location: GeoLocation): Promise<void> {
  const channel = this.ably.channels.get(`jobs:${bookingId}:location`);
  await channel.publish('location-update', {
    latitude: location.getLatitude(),
    longitude: location.getLongitude(),
    timestamp: new Date().toISOString(),
  });
}
```

**Frontend Subscription** (`components/map/job-map.tsx`):
```typescript
const channel = ablyClient.channels.get(`jobs:${bookingId}:location`);
channel.subscribe('location-update', (message) => {
  setGuardLocation({
    lat: message.data.latitude,
    lng: message.data.longitude,
  });
});
```

**Update Frequency**:
- Guard sends location every 10 seconds
- Customer receives updates in real-time (< 1s latency typical)

**Missing from Proposed:**
- No offline queue/sync
- No batch updates
- No location history visualization
- No polyline route rendering

---

## Payment Flow (Actual)

### Authorization + Manual Capture

**Step 1: Customer Authorizes Payment**
1. Customer clicks "Authorize Payment" button
2. Frontend calls `POST /payments/authorize` → backend creates PaymentIntent
3. Backend returns `clientSecret`
4. Frontend displays Stripe Elements card form
5. Customer enters card details (test: 4242 4242 4242 4242)
6. Stripe confirms payment → payment status = AUTHORIZED
7. Funds held but not charged

**Step 2: Guard Completes Job**
1. Guard clicks "Complete Job"
2. Backend calls `POST /jobs/:id/complete`
3. CompleteBookingUseCase automatically calls CapturePaymentUseCase
4. Backend calls Stripe `capturePaymentIntent()`
5. Payment status = CAPTURED
6. Customer charged, funds transferred

**Differences from Proposed:**
- **Proposed**: Direct payouts to guard via Stripe Connect
- **Actual**: Platform receives full amount (no split payment)
- **Proposed**: Automatic authorization on booking creation
- **Actual**: Manual "Authorize Payment" button
- **Proposed**: Webhook handling for payment events
- **Actual**: No webhooks (polling for status updates)

### Test Mode

**Stripe Test Keys Used**:
- Publishable key in frontend
- Secret key in backend
- Test card: 4242 4242 4242 4242
- No production payment processing

---

## Security Implementation (Actual)

### Authentication

**JWT Tokens**:
- Access token: 1 hour expiry
- Refresh token: 7 days expiry
- Stored in localStorage (not httpOnly cookies)
- No token rotation
- No blacklisting

**Password Security**:
- Bcrypt hashing (10 rounds)
- No password strength requirements
- No reset/forgot password flow

### Authorization

**Role-Based Access**:
- Roles: CUSTOMER, GUARD, ADMIN (admin not used)
- Guards can only update location for their assigned jobs
- Customers can only authorize payment for their bookings

**Missing:**
- No row-level security
- No API rate limiting
- No IP blocking
- No CSRF protection
- No audit logging

### Data Privacy

**Missing:**
- No data retention policy implementation
- No GDPR compliance features
- No data export/deletion endpoints
- Location updates stored indefinitely (no 30-day TTL)

---

## Testing Status

### Backend Tests

**Total**: 191 tests passing
- Domain layer: ~40 tests (value objects, entities, services)
- Use cases: ~120 tests
- Infrastructure: ~20 tests
- Controllers: ~20 tests

**Coverage**: Not measured (no coverage target enforced)

**Missing:**
- No E2E tests
- No load testing
- No security testing
- No integration tests with real Stripe/Ably (all mocked)

### Frontend Tests

**Total**: 0 tests
**Missing**: All frontend testing

---

## Deployment & Infrastructure

### Current State

**Development Only**:
- Backend: Local PostgreSQL, local Node.js server (port 3000)
- Frontend: Local Next.js dev server (port 3001)
- No production deployment
- No CI/CD pipeline
- No containerization (Docker)

**Environment Configuration**:
- `.env` files for secrets
- No secrets management service
- No environment separation (dev/staging/prod)

**Missing:**
- No deployment scripts
- No database backup/recovery
- No monitoring/observability
- No error tracking (Sentry)
- No logging aggregation
- No performance monitoring

---

## Known Limitations

### Functional Gaps

1. **No Backend Geocoding**: Frontend uses free Nominatim API directly (rate limits, no caching)
2. **No Service Area Validation**: Users can book anywhere (no coverage checking)
3. **No Location History**: Only current location stored, no route visualization
4. **No Offline Support**: No queue for offline location updates
5. **No Guard Payouts**: Platform receives full payment (no Stripe Connect)
6. **No Notifications**: No email/SMS for booking updates
7. **No Background Checks**: No Checkr integration
8. **No Ratings**: No rating/review system after job completion
9. **No Profile Pictures**: Text-only profiles
10. **No Search/Filters**: Can't filter jobs by date, location, price

### Technical Debt

1. **No Caching**: No Redis, all database queries uncached
2. **No Pagination**: All list endpoints return full results
3. **Security**: Tokens in localStorage (not httpOnly cookies)
4. **Authorization**: Weak (any user can view any booking)
5. **Error Handling**: Inconsistent error responses
6. **Logging**: No structured logging
7. **TypeScript**: Some `any` types remain
8. **Testing**: No E2E or integration tests
9. **Documentation**: No API docs (Swagger)
10. **Build Issue**: Turbopack fails on production build (map module resolution)

### Performance Issues

1. **No Query Optimization**: No indexes beyond primary keys
2. **N+1 Queries**: Possible in list endpoints (not measured)
3. **Large Payload**: No response compression
4. **Polling**: Some components poll instead of using Ably
5. **No CDN**: No asset optimization

---

## Summary: Proposed vs Actual

| Feature | Proposed (D-6, A-1-1) | Actual (Implemented) |
|---------|----------------------|---------------------|
| **Location Endpoints** | 8 endpoints | 3 endpoints |
| **Geocoding** | Backend proxy, Mapbox, Redis cache | Frontend Nominatim, no cache |
| **Reverse Geocoding** | Yes | No |
| **Service Area Validation** | PostGIS spatial queries | No |
| **Location History** | Endpoint + polyline rendering | No |
| **Batch Location Updates** | Yes (offline sync) | No |
| **Real-Time** | Ably WebSocket | Ably WebSocket ✅ |
| **Maps** | Mapbox | Mapbox ✅ |
| **Caching** | Redis (24h TTL, 80% hit rate) | None |
| **Payment Splits** | Stripe Connect direct payouts | Platform receives all |
| **Background Checks** | Checkr integration | None |
| **Notifications** | Twilio, SendGrid | None |
| **Testing** | >85% coverage, E2E tests | 191 backend unit tests only |
| **Deployment** | AWS ECS, RDS, CloudFront | Local development only |
| **API Documentation** | Swagger/OpenAPI | None |
| **Rate Limiting** | 10 req/sec per user | None |

---

## What Works Well

✅ **Core Booking Flow**: Complete end-to-end booking creation, acceptance, completion
✅ **Real-Time Tracking**: Ably integration works smoothly with <1s latency
✅ **Payment Processing**: Stripe authorization + capture flow functional
✅ **Clean Architecture**: Good separation of concerns (domain/application/infrastructure)
✅ **Type Safety**: Strong TypeScript usage throughout
✅ **Interactive Maps**: Mapbox integration with markers and controls
✅ **User Experience**: Responsive UI, loading states, error handling

---

## Enhancement Priorities

### High Priority (Core Functionality)

1. **Backend Geocoding Service** - Implement Mapbox API proxy with caching
2. **Service Area Validation** - PostGIS queries to check coverage
3. **Location History** - Store and visualize guard's route
4. **Stripe Connect** - Direct guard payouts (not platform escrow)
5. **Authorization Fixes** - Enforce row-level security on bookings

### Medium Priority (User Experience)

6. **Reverse Geocoding** - Show address when dropping pin
7. **Notifications** - Email/SMS for booking updates
8. **Ratings System** - Post-job reviews
9. **Advanced Filters** - Search jobs by criteria
10. **Pagination** - Handle large datasets

### Low Priority (Polish)

11. **API Documentation** - Swagger/OpenAPI
12. **Production Build** - Fix Turbopack map module issue
13. **Frontend Tests** - Unit/integration tests
14. **Performance Monitoring** - Add logging, metrics
15. **Deployment** - Cloud infrastructure setup

---

**Document Status**: Complete
**Next Steps**: See `ARCHITECTURE_COMPARISON.md` for detailed gap analysis and `ENHANCEMENT_ROADMAP.md` for implementation plan
