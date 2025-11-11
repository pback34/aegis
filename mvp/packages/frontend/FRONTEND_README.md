# Aegis Frontend

Next.js frontend application for the Aegis on-demand security guard platform.

## Features

- **Authentication**: Login and registration for customers and guards
- **Role-based routing**: Automatic redirect to appropriate dashboard based on user role
- **Customer Dashboard**: Create bookings, view bookings, manage profile
- **Guard Dashboard**: Browse jobs, accept jobs, track active jobs
- **Real-time updates**: Map integration with Ably for live location tracking (coming in Task 4)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand (auth state)
- **Data Fetching**: Axios + React Query
- **Real-time**: Ably (for location updates)
- **Maps**: Mapbox GL (coming in Task 4)
- **Payments**: Stripe Elements (coming in Task 5)

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on http://localhost:3000

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

The app will run on http://localhost:3001

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                          # Next.js app router pages
│   ├── (authenticated)/          # Protected routes
│   │   ├── customer/            # Customer dashboard
│   │   ├── guard/               # Guard dashboard
│   │   └── layout.tsx           # Auth protection wrapper
│   ├── login/                   # Login page
│   ├── register/                # Registration page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page (role-based redirect)
├── components/                  # React components
│   └── auth/                    # Authentication components
│       ├── login-form.tsx
│       └── register-form.tsx
└── lib/                         # Utilities and configs
    ├── api-client.ts            # Axios instance with auth interceptor
    ├── auth-store.ts            # Zustand auth state
    └── react-query-provider.tsx # React Query setup
```

## Authentication Flow

1. **Registration**: User registers as CUSTOMER or GUARD
2. **Login**: User logs in with email/password
3. **Token Management**: Access token and refresh token stored in localStorage
4. **Auto-refresh**: API client automatically refreshes expired tokens
5. **Role-based routing**: Landing page redirects based on user role
6. **Protected routes**: Authenticated layout guards protected pages

## API Integration

The frontend connects to the backend REST API:

### Auth Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

### User Endpoints
- `GET /users/profile` - Get current user profile
- `PATCH /users/profile` - Update user profile

### Jobs/Bookings Endpoints
- `POST /jobs` - Create booking
- `GET /jobs/:id` - Get booking details
- `GET /jobs` - List bookings
- `POST /jobs/:id/accept` - Accept booking (Guard)
- `POST /jobs/:id/complete` - Complete booking (Guard)

### Location Endpoints
- `GET /map/config` - Get Mapbox config
- `POST /jobs/:id/location` - Update guard location
- `GET /jobs/:id/location` - Get current location

### Payment Endpoints
- `POST /payments/authorize` - Authorize payment
- `POST /payments/capture` - Capture payment

## Phase 5 Progress

### Task 1: Next.js Setup & Authentication UI ✅ COMPLETE
- ✅ Next.js app with TypeScript and Tailwind
- ✅ API client with auth interceptor
- ✅ Auth state management with Zustand
- ✅ Login and registration pages
- ✅ Protected route wrapper
- ✅ Role-based routing
- ✅ Customer and Guard dashboard placeholders

### Task 2: Customer Dashboard (Next)
- Create booking form
- Bookings list
- Booking detail with real-time map

### Task 3: Guard Dashboard (Next)
- Available jobs list
- Active job view with location tracking
- Job history and earnings

### Task 4: Map Integration with Ably Real-Time (Next)
- Mapbox map component
- Real-time location updates
- Guard location tracker

### Task 5: Payment Integration (Next)
- Stripe payment form
- Payment authorization
- Payment status display

## Notes

- Frontend runs on port 3001 to avoid conflicts with backend (port 3000)
- Uses system fonts instead of Google Fonts for offline compatibility
- All routes except /login and /register require authentication
- Landing page (/) automatically redirects based on authentication status and user role
