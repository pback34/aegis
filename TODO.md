# TODO for Next Session - Phase 5 Frontend Implementation

**Last Updated**: 2025-11-12 (Phase 5 Task 2 Complete - Customer Dashboard)
**Current Branch**: `claude/mvp-implementation-continue-011CV38pQtVd9zm68U6ra89F`
**Status**: Backend ✅ | Phase 5 Task 1 ✅ | Phase 5 Task 2 ✅ | Ready for Task 3 (Guard Dashboard) 🚀

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

**⚠️ What's Coming Next (Task 3):**
- Guard dashboard implementation
- Available jobs list
- Job acceptance flow
- Active job tracking with location updates

---

## 🎯 Next Steps - Phase 5 Task 3: Guard Dashboard

**Goal**: Build guard dashboard for browsing, accepting, and managing jobs

**What to Build:**
1. Available jobs list with:
   - Cards showing job details (location, time, pay)
   - Distance calculation from guard's location
   - "Accept Job" button
   - Filter options
2. Active job view with:
   - Job details and customer information
   - Location tracking (send location every 10s)
   - Map placeholder (full implementation in Task 4)
   - "Complete Job" button
3. Job history page with:
   - List of completed jobs
   - Earnings summary
   - Job statistics

**Files to Create:**
```
app/(authenticated)/guard/available-jobs/page.tsx
app/(authenticated)/guard/active-job/page.tsx
app/(authenticated)/guard/history/page.tsx
components/guard/available-jobs-list.tsx
components/guard/active-job-view.tsx
components/guard/location-tracker.tsx  # Auto-send location every 10s
```

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
