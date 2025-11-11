# TODO for Next Session - Phase 5 Frontend Implementation

**Last Updated**: 2025-11-11 (Phase 4 Complete)
**Current Branch**: `claude/phase-4-mvp-implementation-011CV1nS3VvZcLHaVxfrTmiA`
**Status**: Phase 4 Complete ✅ | Backend MVP Complete 🎉 | Phase 5 Next 🚀

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
