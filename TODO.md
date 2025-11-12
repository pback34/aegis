# TODO for Next Session - Phase 5 Frontend Implementation

**Last Updated**: 2025-11-12 (Phase 5 Task 5 Complete - Payment Integration)
**Current Branch**: `claude/mvp-implementation-tasks-011CV3Q6WMLki5u4bC9uvNtz`
**Status**: Backend ✅ | Phase 5 Complete ✅ | MVP Ready for Testing 🎉

---

## 🎉 Phase 5 Task 5 Complete - Payment Integration with Stripe Ready!

**What Was Completed This Session:**
1. ✅ **Stripe Packages** - Installed @stripe/stripe-js (v8.4.0) and @stripe/react-stripe-js (v5.3.0)
2. ✅ **Stripe Client Wrapper** - Created stripe-client.ts for Stripe initialization and helpers
3. ✅ **Payment Form Component** - Built PaymentForm with Stripe Elements for card input
4. ✅ **Payment Status Component** - Created PaymentStatus for displaying payment state
5. ✅ **Payment Authorization** - Built PaymentAuthorization wrapper to handle payment intent creation
6. ✅ **Customer Payment UI** - Updated booking-detail.tsx with "Authorize Payment" button and form
7. ✅ **Guard Payment Display** - Updated active-job-view.tsx with enhanced payment status
8. ✅ **Backend Auto-Capture** - Modified CompleteBookingUseCase to capture payment on job completion
9. ✅ **Environment Config** - Added Stripe publishable key to frontend .env.local
10. ✅ **Git Commit** - Committed and pushed all payment integration changes

**Key Files Created:**
```
mvp/packages/frontend/src/
├── lib/
│   ├── payments-api.ts                          # Payment API client (authorize, capture)
│   └── stripe-client.ts                         # Stripe initialization wrapper
└── components/payment/
    ├── payment-form.tsx                         # Stripe Elements payment form
    ├── payment-status.tsx                       # Payment status display component
    └── payment-authorization.tsx                # Payment authorization workflow
```

**Key Files Updated:**
```
mvp/packages/frontend/src/components/
├── customer/booking-detail.tsx                  # Added payment authorization UI
└── guard/active-job-view.tsx                    # Enhanced payment status display

mvp/packages/backend/src/application/use-cases/booking/
└── complete-booking.use-case.ts                 # Added automatic payment capture
```

**Technical Highlights:**
- Full Stripe integration with Payment Elements (modern, PCI-compliant)
- Authorization + Manual Capture flow (authorize on booking, capture on completion)
- Payment intent creation on backend with clientSecret returned to frontend
- Test mode ready with test card: 4242 4242 4242 4242
- Graceful error handling (payment capture failure doesn't block job completion)
- Real-time payment status tracking throughout booking lifecycle
- Automatic payment capture when guard completes job
- Payment statuses: pending → authorized → captured

**Customer Payment Flow:**
1. Customer creates booking → guard may be auto-assigned
2. Customer views booking detail → sees "Authorize Payment Now" button
3. Customer clicks button → backend creates PaymentIntent, returns clientSecret
4. Payment form appears with Stripe Elements
5. Customer enters card details (test: 4242 4242 4242 4242)
6. Customer confirms → payment authorized (funds held, not charged)
7. Guard completes job → backend automatically captures payment
8. Customer charged, guard receives payout

**Guard Payment Flow:**
1. Guard accepts job → sees payment status
2. Payment status shows "authorized" with message about auto-capture
3. Guard works and completes job
4. Payment automatically captured in background
5. Payment status updates to "captured"

**Payment Statuses:**
- **Pending**: Awaiting payment authorization
- **Authorized**: Payment authorized but not charged (funds held)
- **Captured**: Payment successfully charged
- **Failed**: Payment processing failed

**Environment Configuration:**
```env
# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Commit Info:**
- **Hash**: `c431efe`
- **Message**: "feat(phase5): Complete Task 5 - Payment Integration with Stripe"
- **Branch**: `claude/mvp-implementation-tasks-011CV3Q6WMLki5u4bC9uvNtz`
- **Status**: Pushed to remote ✅

**⚠️ Important Notes:**
- Frontend payment integration is complete and functional
- Backend automatic payment capture is implemented
- Test mode active (use Stripe test keys)
- Stripe publishable key must be configured in frontend .env.local
- Payment requires guard to be assigned to booking
- Payment capture is graceful (logs errors but doesn't fail job completion)
- All payment operations are logged for debugging

**Known Limitations:**
- Production build has Turbopack module resolution issue with react-map-gl (pre-existing from Task 4)
- Development server (npm run dev) works correctly
- Payment functionality not affected by map build issue

---

## 🔧 Backend Setup Complete - Local Development Environment Ready!

**What Was Completed This Session:**
1. ✅ **PostgreSQL Database** - Created `aegis_mvp` database successfully
2. ✅ **Database Migrations** - Ran TypeORM migrations, created all tables (users, guard_profiles, bookings, location_updates, payments)
3. ✅ **Dependency Injection Fixes** - Fixed all NestJS DI issues across 13 use case files
4. ✅ **Service Configuration** - Configured factory providers for Ably and Stripe adapters
5. ✅ **Backend Server** - Successfully started on http://localhost:3000
6. ✅ **All 15 API Endpoints** - Verified active and ready for frontend integration
7. ✅ **Git Commit** - Committed and pushed all fixes to remote repository

**Technical Fixes Made:**
- Added `@Inject()` decorators to all use case constructors for repository interfaces:
  - `@Inject('IUserRepository')` in auth and user use cases
  - `@Inject('IBookingRepository')` in booking use cases
  - `@Inject('ILocationRepository')` in location use cases
  - `@Inject('IPaymentRepository')` in payment use cases
  - `@Inject('IPaymentGateway')` in payment use cases
  - `@Inject('ILocationService')` in location use cases
- Added `@Injectable()` decorator to `SimpleMatchingService`
- Configured factory providers in [app.module.ts](mvp/packages/backend/src/app.module.ts):
  - `ILocationService` with ConfigService injection (Ably adapter)
  - `IPaymentGateway` with ConfigService injection (Stripe adapter)
- Implemented graceful degradation for missing Ably API key (logs warning, doesn't crash)

**Files Modified (14 total):**
```
src/app.module.ts
src/domain/services/simple-matching.service.ts
src/application/use-cases/auth/register-user.use-case.ts
src/application/use-cases/auth/login-user.use-case.ts
src/application/use-cases/user/update-user-profile.use-case.ts
src/application/use-cases/booking/create-booking.use-case.ts
src/application/use-cases/booking/get-booking.use-case.ts
src/application/use-cases/booking/list-bookings.use-case.ts
src/application/use-cases/booking/accept-booking.use-case.ts
src/application/use-cases/booking/complete-booking.use-case.ts
src/application/use-cases/location/update-location.use-case.ts
src/application/use-cases/location/get-current-location.use-case.ts
src/application/use-cases/payment/authorize-payment.use-case.ts
src/application/use-cases/payment/capture-payment.use-case.ts
```

**Commit Info:**
- **Hash**: `e83de9d`
- **Message**: "fix(backend): Fix dependency injection for all use cases and configure service providers"
- **Branch**: `claude/incomplete-description-011CV2YcS1v17vb8uhixH9qs`
- **Status**: Pushed to remote ✅

**Backend Environment:**
- Database: PostgreSQL on localhost:5432
- Database Name: `aegis_mvp`
- Backend Port: 3000
- Frontend Port: 3001 (configured)
- All environment variables configured in `.env` file

**⚠️ Important Notes for Next Session:**
- Backend server is running in background (npm run dev)
- All 15 REST API endpoints are active and tested (191 tests passing)
- Frontend can now make API calls to http://localhost:3000
- Ably real-time features will log warnings (API key is placeholder)
- Stripe payment integration uses test keys
- Ready to proceed with Phase 5 Task 2: Customer Dashboard implementation

---

## 🎉 Phase 5 Task 1 Complete - Authentication UI Ready!

**What Was Completed This Session:**
1. ✅ **Next.js Setup** - Created Next.js 16 app with TypeScript, Tailwind, App Router
2. ✅ **Dependencies** - Installed axios, @tanstack/react-query, zustand
3. ✅ **API Client** - Built axios client with auth interceptor and auto token refresh
4. ✅ **Auth State** - Implemented Zustand store for authentication management
5. ✅ **React Query** - Set up React Query provider for data fetching
6. ✅ **Login Page** - Created login form with email/password authentication
7. ✅ **Register Page** - Created registration form with role selection (Customer/Guard)
8. ✅ **Protected Routes** - Built authenticated layout wrapper for protected pages
9. ✅ **Role-based Routing** - Landing page redirects to /customer or /guard based on role
10. ✅ **Dashboard Placeholders** - Created customer and guard dashboard skeletons

**Key Files Created:**
```
mvp/packages/frontend/
├── src/
│   ├── app/
│   │   ├── (authenticated)/
│   │   │   ├── customer/page.tsx          # Customer dashboard
│   │   │   ├── guard/page.tsx             # Guard dashboard
│   │   │   └── layout.tsx                 # Auth protection wrapper
│   │   ├── login/page.tsx                 # Login page
│   │   ├── register/page.tsx              # Registration page
│   │   ├── layout.tsx                     # Root layout with providers
│   │   └── page.tsx                       # Landing page (role-based redirect)
│   ├── components/
│   │   └── auth/
│   │       ├── login-form.tsx             # Login form component
│   │       └── register-form.tsx          # Registration form component
│   └── lib/
│       ├── api-client.ts                  # Axios client + auth interceptor
│       ├── auth-store.ts                  # Zustand auth state
│       └── react-query-provider.tsx       # React Query setup
├── .env.local                             # Environment variables
├── .env.example                           # Env template
└── FRONTEND_README.md                     # Frontend documentation
```

**Technical Highlights:**
- Frontend runs on port **3001** (backend on 3000)
- JWT token auto-refresh on 401 errors
- Protected routes with loading states
- Role-based UI rendering (Customer vs Guard)
- TypeScript compilation successful
- Build successful (no errors)

---

## 🎉 Phase 5 Task 2 Complete - Customer Dashboard Ready!

**What Was Completed This Session:**
1. ✅ **Jobs API Client** - Created API wrapper for all booking/job endpoints
2. ✅ **Create Booking Form** - Address input, geocoding, date/time picker, duration selector, real-time cost calculation
3. ✅ **Create Booking Page** - Customer can create new bookings with full validation
4. ✅ **Bookings List Component** - Table view with status filters (all, pending, accepted, in_progress, completed, cancelled)
5. ✅ **Bookings List Page** - View all customer bookings with real-time updates (10s polling)
6. ✅ **Booking Detail Component** - Shows guard info, schedule, payment status, and service location
7. ✅ **Booking Detail Page** - Full booking details with placeholder for real-time map (Task 4)
8. ✅ **Dashboard Enhancement** - Added statistics cards (total, pending, active, completed) with working navigation
9. ✅ **TypeScript Compilation** - All files compile successfully with no errors
10. ✅ **Backend Tests** - All 191 tests passing

**Key Files Created:**
```
mvp/packages/frontend/src/
├── lib/
│   └── jobs-api.ts                                    # Jobs/bookings API client
├── components/customer/
│   ├── create-booking-form.tsx                        # Booking creation form with geocoding
│   ├── bookings-list.tsx                              # Bookings table with filters
│   └── booking-detail.tsx                             # Booking details with guard info
└── app/(authenticated)/customer/
    ├── page.tsx                                       # Enhanced dashboard with stats
    ├── create-booking/page.tsx                        # Create booking page
    ├── bookings/page.tsx                              # Bookings list page
    └── bookings/[id]/page.tsx                         # Booking detail page
```

**Technical Highlights:**
- Real-time cost calculation: $30/hour = $0.50/minute
- Address geocoding using OpenStreetMap Nominatim API
- Booking status tracking with color-coded badges
- Payment status display (pending, authorized, captured, failed)
- Auto-refresh every 5-10 seconds for real-time updates
- Responsive design with Tailwind CSS
- React Query for efficient data fetching and caching
- TypeScript type safety throughout

**Customer User Flow:**
1. Customer logs in → redirected to `/customer`
2. Dashboard shows booking statistics and action cards
3. Click "New Booking" → `/customer/create-booking`
4. Enter address, geocode to get coordinates, select date/time and duration
5. See real-time cost estimate
6. Submit booking → redirected to `/customer/bookings/[id]`
7. View booking details: status, guard info (when assigned), payment status
8. Return to "My Bookings" → `/customer/bookings`
9. Filter bookings by status
10. Click any booking to view details

---

## 🎉 Phase 5 Task 3 Complete - Guard Dashboard Ready!

**What Was Completed This Session:**
1. ✅ **Enhanced Guard Dashboard** - Statistics cards (available jobs, active jobs, completed, total earnings) with working navigation
2. ✅ **Available Jobs List Component** - Job cards with distance calculation, accept functionality
3. ✅ **Available Jobs Page** - Browse and accept jobs with geolocation integration
4. ✅ **Location Tracker Component** - Automatic location updates every 10 seconds with error handling
5. ✅ **Active Job View Component** - Job details, payment status, location tracker, complete button
6. ✅ **Active Job Page** - Manage current active job with real-time updates
7. ✅ **Job History Page** - Earnings summary and completed jobs table
8. ✅ **TypeScript Compilation** - All files compile successfully with no errors
9. ✅ **Git Commit** - Committed and pushed all guard dashboard features

**Key Files Created:**
```
mvp/packages/frontend/src/
├── app/(authenticated)/guard/
│   ├── page.tsx                          # Enhanced dashboard with stats & navigation
│   ├── available-jobs/page.tsx           # Browse available jobs
│   ├── active-job/page.tsx               # Manage active job
│   └── history/page.tsx                  # Job history & earnings
└── components/guard/
    ├── available-jobs-list.tsx           # Jobs list with accept functionality
    ├── active-job-view.tsx               # Active job details & controls
    └── location-tracker.tsx              # Auto location tracking every 10s
```

**Technical Highlights:**
- Real-time location tracking with browser geolocation API
- Distance calculation using Haversine formula
- Auto-refresh intervals (5-30s depending on page)
- Loading and error states throughout
- Responsive design with Tailwind CSS
- React Query mutations for job acceptance/completion
- Real-time elapsed time and earnings calculation
- Map placeholder ready for Task 4 integration

**Guard User Flow:**
1. Guard logs in → dashboard shows statistics (available: X, active: Y, completed: Z, earnings: $N)
2. Click "View Jobs" → `/guard/available-jobs`
3. Browse jobs sorted by distance, see location, time, pay
4. Accept a job → redirected to `/guard/active-job`
5. Location tracking starts automatically (every 10s)
6. View job details, real-time elapsed time, current earnings
7. Complete job → redirected to dashboard
8. View "History" → `/guard/history` - see all completed jobs and total earnings

**Commit Info:**
- **Hash**: `c804e73`
- **Message**: "feat(phase5): Complete Task 3 - Guard Dashboard with Job Management"
- **Branch**: `claude/mvp-implementation-continue-011CV3AYnNrTNWmXkL8XQGmo`
- **Status**: Pushed to remote ✅

---

## 🎉 Phase 5 Task 4 Complete - Map Integration with Real-Time Tracking!

**What Was Completed This Session:**
1. ✅ **Map Dependencies** - Installed mapbox-gl (v3.16.0), react-map-gl (v8.1.0), ably (v2.14.0), @types/mapbox-gl
2. ✅ **Ably Client Library** - Created real-time pub/sub wrapper for location updates
3. ✅ **Map Config Helper** - Fetches Mapbox token and Ably key from /map/config endpoint
4. ✅ **JobMap Component** - Interactive map with service location and guard location markers
5. ✅ **Customer Map Integration** - Real-time guard tracking in booking detail page
6. ✅ **Guard Map Integration** - Service location navigation in active job view
7. ✅ **Real-Time Updates** - Ably subscription to jobs:{jobId}:location channel
8. ✅ **Connection Monitoring** - Status indicator (connecting, connected, error)
9. ✅ **TypeScript Compilation** - Dev server works correctly with module resolution
10. ✅ **Git Commit** - Committed and pushed all map integration features

**Key Files Created:**
```
mvp/packages/frontend/src/
├── lib/
│   ├── ably-client.ts                          # Ably real-time client wrapper
│   └── map-config.ts                           # Map configuration fetcher
└── components/map/
    └── job-map.tsx                             # Main map component with markers
```

**Key Files Updated:**
```
mvp/packages/frontend/src/components/
├── customer/booking-detail.tsx                 # Added map for in_progress jobs
└── guard/active-job-view.tsx                   # Added map for navigation
```

**Technical Highlights:**
- Interactive Mapbox maps with pan, zoom, and navigation controls
- Service location marker (blue) - customer's booking address
- Guard location marker (green) - real-time position with pulse animation
- Auto-center on guard updates (optional, enabled for customers)
- Manual re-center controls for both service and guard locations
- Real-time Ably subscriptions with automatic cleanup
- Connection status monitoring (connecting → connected → error states)
- Graceful error handling for config loading failures
- Development server works correctly (production build has Turbopack module resolution issue)

**Customer Experience:**
1. Customer views booking detail for accepted/in_progress job
2. Map appears showing service location (blue marker)
3. When job is in_progress, green marker shows guard's real-time location
4. Map auto-centers on guard's position as it updates
5. Customer can manually re-center on service or guard location
6. Connection status shows "Live Tracking" when real-time updates are active

**Guard Experience:**
1. Guard accepts a job and views active job page
2. Map shows service location (blue marker) where guard needs to go
3. Guard's own position appears as green marker (updated automatically)
4. Guard can see distance/direction to service location
5. Map helps navigate to customer's location
6. Location tracker sends position updates every 10 seconds

**Commit Info:**
- **Hash**: `b7a3616`
- **Message**: "feat(phase5): Complete Task 4 - Map Integration with Ably Real-Time"
- **Branch**: `claude/mvp-implementation-continue-011CV3ByxGEE7bYAVSrKb5ZB`
- **Status**: Pushed to remote ✅

---

## 🎯 Next Steps - Phase 5 Task 5: Payment Integration with Stripe

**Goal**: Integrate Stripe payment processing for booking payments with authorization and capture flow

**What to Build:**
1. Stripe Elements integration:
   - Install @stripe/stripe-js and @stripe/react-stripe-js
   - Create payment form component with card input
   - Handle payment intent creation
   - Implement payment authorization flow
2. Payment authorization (on booking creation):
   - Authorize payment when customer creates booking
   - Store payment intent ID in booking
   - Show payment status in UI
3. Payment capture (on job completion):
   - Automatically capture payment when guard completes job
   - Update payment status display
   - Show final payment breakdown
4. Payment status tracking:
   - Display payment status throughout booking lifecycle
   - Show authorization pending, authorized, captured, failed states
   - Handle payment errors gracefully

**Dependencies to Install:**
```bash
cd mvp/packages/frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Files to Create:**
```
components/payment/payment-form.tsx       # Stripe Elements payment form
components/payment/payment-status.tsx     # Payment status display
lib/stripe-client.ts                      # Stripe client wrapper
```

**Files to Update:**
```
components/customer/create-booking-form.tsx  # Add payment form
components/customer/booking-detail.tsx       # Enhanced payment status
components/guard/active-job-view.tsx         # Payment capture on completion
```

**Payment Flow:**
1. Customer creates booking → payment form appears
2. Customer enters card details → payment authorized
3. Guard accepts and completes job → payment captured automatically
4. Customer and guard see payment status updates in real-time

**API Endpoints Already Available:**
- `POST /payments/authorize` - Authorize payment (Customer)
- `POST /payments/capture` - Capture payment (Guard, on job completion)

---

## 🎉 Phase 4 Complete - Backend MVP Finished!

**Test Count**: 191 passing (up from 169)
**New Tests**: 22 controller tests added

**What Was Completed This Session:**
1. ✅ **UpdateUserProfileUseCase** - User profile updates for customers and guards
2. ✅ **Auth Controller** - register, login, refresh (3 endpoints) + tests
3. ✅ **Jobs/Bookings Controller** - create, get, list, accept, complete (5 endpoints) + tests
4. ✅ **Location Controller** - map config, update, get location (3 endpoints) + tests
5. ✅ **Payments Controller** - authorize, capture (2 endpoints) + tests
6. ✅ **Users Controller** - get profile, update profile (2 endpoints) + tests
7. ✅ **All 15 MVP REST API Endpoints** - Fully implemented and tested!

**Key Files Added:**
```
src/presentation/controllers/
  ├── auth.controller.ts + .spec.ts (3 endpoints, 3 tests)
  ├── jobs.controller.ts + .spec.ts (5 endpoints, 5 tests)
  ├── locations.controller.ts + .spec.ts (3 endpoints, 3 tests)
  ├── payments.controller.ts + .spec.ts (2 endpoints, 3 tests)
  ├── users.controller.ts + .spec.ts (2 endpoints, 5 tests)
  └── index.ts
src/application/use-cases/user/
  └── update-user-profile.use-case.ts
```

**Bug Fixes Made:**
- Fixed UserId usage in ListBookingsUseCase, AcceptBookingUseCase, CompleteBookingUseCase
- Fixed booking methods: `accept()` → `acceptByGuard()`, `complete()` → `completeJob()`
- Fixed payment service calls: replaced non-existent `calculatePaymentBreakdown()` with `calculatePlatformFee()` and `calculateGuardPayout()`
- Fixed undefined handling for optional payment intent IDs
- Fixed all controller tests to use valid UUIDs

---

## 📊 Backend MVP Status: 100% COMPLETE ✅

**All Layers Implemented:**
- ✅ Domain Layer (100%) - Entities, Value Objects, Services
- ✅ Application Layer (100%) - All use cases
- ✅ Infrastructure Layer (100%) - Stripe, Ably, Auth, DB, Repositories
- ✅ Presentation Layer (100%) - All 15 REST API endpoints

**Test Coverage:** 191 tests passing
- Domain tests: ~40
- Use case tests: ~120
- Infrastructure tests: ~20
- Controller tests: ~20

---

## 🚀 Phase 5: Frontend Web Application (Week 5-6)

**Goal**: Build Next.js frontend for customer and guard user flows with real-time map integration

### Complete API Reference (All Implemented)

#### Auth Endpoints (Public ✨)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

#### User Endpoints (Authenticated 🔒)
- `GET /users/profile` - Get current user profile
- `PATCH /users/profile` - Update user profile

#### Jobs/Bookings Endpoints (Authenticated 🔒)
- `POST /jobs` - Create booking (Customer 👤)
- `GET /jobs/:id` - Get booking details
- `GET /jobs` - List bookings (role-filtered)
- `POST /jobs/:id/accept` - Accept booking (Guard 🛡️)
- `POST /jobs/:id/complete` - Complete booking (Guard 🛡️)

#### Location Endpoints
- `GET /map/config` - Get Mapbox config (Public ✨)
- `POST /jobs/:id/location` - Update guard location (Guard 🛡️🔒)
- `GET /jobs/:id/location` - Get current location (Authenticated 🔒)

#### Payment Endpoints (Authenticated 🔒)
- `POST /payments/authorize` - Authorize payment
- `POST /payments/capture` - Capture payment

---

## 📋 Phase 5 Task Breakdown

### Task 1: Next.js Setup & Authentication UI (Days 1-2)

**Setup:**
```bash
cd mvp/packages
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install axios react-query @tanstack/react-query zustand
npm install shadcn-ui # or manually setup shadcn/ui
```

**Create:**
1. API client with axios (base URL, auth interceptor)
2. Auth context/provider (login, register, logout, token management)
3. Protected route wrapper component
4. Login page (`/login`)
5. Register page (`/register`)
6. Landing page (`/`) - redirects based on auth

**Key Files:**
```
lib/api-client.ts
lib/auth-context.tsx
lib/react-query-provider.tsx
app/login/page.tsx
app/register/page.tsx
app/(authenticated)/layout.tsx
components/auth/login-form.tsx
components/auth/register-form.tsx
```

---

### Task 2: Customer Dashboard (Days 3-4)

**Pages:**
1. `/customer/create-booking` - Create new booking form
2. `/customer/bookings` - List all customer bookings
3. `/customer/bookings/[id]` - Booking detail with real-time map

**Features:**
- Create booking: address, lat/lng, date/time picker, duration, cost estimate
- Bookings list: table with status filters
- Booking detail: shows guard info, real-time location on map, payment status

**Key Files:**
```
app/(authenticated)/customer/create-booking/page.tsx
app/(authenticated)/customer/bookings/page.tsx
app/(authenticated)/customer/bookings/[id]/page.tsx
components/customer/create-booking-form.tsx
components/customer/bookings-list.tsx
components/customer/booking-detail.tsx
```

---

### Task 3: Guard Dashboard (Days 5-6)

**Pages:**
1. `/guard/available-jobs` - Browse and accept available jobs
2. `/guard/active-job` - Current active job with location tracking
3. `/guard/history` - Past jobs and earnings

**Features:**
- Available jobs: cards with distance, pay, customer info, "Accept" button
- Active job: auto-send location every 10s, show customer location, "Complete Job" button
- History: list of completed jobs with earnings

**Key Files:**
```
app/(authenticated)/guard/available-jobs/page.tsx
app/(authenticated)/guard/active-job/page.tsx
app/(authenticated)/guard/history/page.tsx
components/guard/available-jobs-list.tsx
components/guard/active-job-view.tsx
components/guard/location-tracker.tsx
```

---

### Task 4: Map Integration with Ably Real-Time (Days 7-8)

**Install:**
```bash
npm install mapbox-gl ably react-map-gl
npm install -D @types/mapbox-gl
```

**Features:**
1. Mapbox map component (fetches token from `/map/config`)
2. Service location marker (static - customer's location)
3. Guard location marker (real-time updates via Ably)
4. Auto-center on guard location
5. Guard location tracker (sends location every 10s)

**Ably Integration:**
- Subscribe to `jobs:{jobId}:location` channel
- Listen for `location-update` events
- Update guard marker position in real-time

**Key Files:**
```
components/map/mapbox-map.tsx
components/map/location-marker.tsx
components/guard/location-tracker.tsx
lib/ably-client.ts
```

---

### Task 5: Payment Integration (Day 9)

**Install:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Features:**
1. Payment form with Stripe Elements (card input)
2. Payment authorization flow (calls `/payments/authorize`)
3. Payment status display
4. Payment capture (triggered on job completion)

**Key Files:**
```
components/payment/payment-form.tsx
components/payment/payment-status.tsx
```

---

## ⚠️ Important Implementation Notes

### Auth Pattern
```typescript
// lib/api-client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Protected Routes
```typescript
// app/(authenticated)/layout.tsx
export default function AuthenticatedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) redirect('/login');

  return <>{children}</>;
}
```

### Real-Time Location with Ably
```typescript
// components/map/mapbox-map.tsx
useEffect(() => {
  const ably = new Ably.Realtime({
    key: ablyKey, // from /map/config
  });

  const channel = ably.channels.get(`jobs:${jobId}:location`);

  channel.subscribe('location-update', (message) => {
    const { latitude, longitude, timestamp } = message.data;
    setGuardLocation({ lat: latitude, lng: longitude });
  });

  return () => {
    channel.unsubscribe();
    ably.close();
  };
}, [jobId]);
```

### Guard Location Tracking
```typescript
// components/guard/location-tracker.tsx
useEffect(() => {
  const sendLocation = async () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      await apiClient.post(`/jobs/${jobId}/location`, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      });
    });
  };

  // Send location every 10 seconds
  const interval = setInterval(sendLocation, 10000);
  sendLocation(); // Send immediately

  return () => clearInterval(interval);
}, [jobId]);
```

---

## 💡 Key Gotchas

1. **Ably Channel Names**: Must match backend format `jobs:{jobId}:location`
2. **Mapbox Token**: Fetch from `/map/config`, don't hardcode
3. **Location Permissions**: Handle browser geolocation permission denial gracefully
4. **Token Refresh**: Implement auto-refresh interceptor for 401 errors
5. **Role-Based UI**: Show different dashboard based on `user.role`
6. **Real-Time Latency**: Target <2 seconds for location updates

---

## 📋 Quick Start Commands

```bash
# Backend (already running)
cd mvp/packages/backend
npm run dev  # http://localhost:3000

# Frontend (Phase 5)
cd mvp/packages/frontend
npm run dev  # http://localhost:3001
```

---

## 🎯 Success Criteria for Phase 5

### Technical
- ✅ User registration and login works
- ✅ Customer can create booking
- ✅ Guard can see and accept jobs
- ✅ Real-time location updates (<2s latency)
- ✅ Customer sees guard on map
- ✅ Guard can complete job
- ✅ Payment authorization and capture works

### User Experience
- ✅ Responsive design (mobile & desktop)
- ✅ Loading states for all API calls
- ✅ Error handling with user-friendly messages
- ✅ Smooth real-time updates
- ✅ Interactive map

---

**Phase 4 Complete! All backend infrastructure is ready. Phase 5 will bring it to life with the frontend! 🚀**
