---
node_type: Report
status: Complete
priority: High
created: 2025-11-09
updated: 2025-11-09
spawned_by:
  - Q-6
informs: []
tags:
  - research
  - api-design
  - mvp
  - backend
  - rest-api
---

# R-6: API Design & Data Models for MVP/Demo Research Report

**Research Question:** What REST API endpoints and core data models do we need for a working MVP/proof-of-concept that demonstrates the core booking flow from customer request to guard assignment to service completion?

**Research Date:** November 9, 2025
**Research Method:** API design best practices, marketplace patterns analysis, MVP scoping
**Confidence Level:** High (85-90%)

---

## Executive Summary

For the Aegis MVP/demo, we recommend a **lightweight RESTful API with 18 essential endpoints** grouped across 6 core resources: Authentication, Users, Jobs, Locations, Payments, and Admin. This minimal API surface focuses exclusively on the happy-path flow needed to prove the core value proposition: customers can request security guards, guards can accept jobs, real-time tracking works, and payments complete successfully.

**Key Design Principles:**
- **MVP-first mentality:** Defer all non-essential features (ratings, messaging, incident reports) to post-demo
- **RESTful conventions:** Standard HTTP methods, predictable URL patterns, consistent response formats
- **Role-based access:** JWT authentication with three roles (customer, guard, admin)
- **Optimistic for demo:** Skip complex error handling, edge cases, and validations that slow development
- **Real integrations where it matters:** Live Stripe payments and Mapbox tracking prove technical viability; mock background checks for speed

**Core Data Models:** Five primary entities (User, Job, Location, Payment, BackgroundCheck) with 8-15 essential fields each, optimized for demo clarity over production completeness. Relationships are simple (1-to-many or 1-to-1) with no complex many-to-many joins needed for MVP.

**Integration Strategy:** Use Stripe test mode for live payment flow demonstration, Mapbox for real GPS tracking, but stub background checks with manual admin approval to avoid 3-day Checkr delays during demo. SMS notifications via Twilio are optional (can use console logs for demo).

This API design enables a **4-6 week sprint** to build a functional demo that proves technical feasibility and validates the user experience, setting the foundation for production development in subsequent phases.

---

## Essential API Endpoints

### 1. Authentication & Authorization (3 endpoints)

**POST /api/auth/register**
- Create new user account (customer or guard)
- Request body: `{ email, password, role, firstName, lastName, phone }`
- Response: `{ user, accessToken, refreshToken }`
- Notes: Basic email/password auth for MVP; defer OAuth to later

**POST /api/auth/login**
- Authenticate existing user
- Request body: `{ email, password }`
- Response: `{ user, accessToken, refreshToken }`
- Notes: Returns JWT access token (15min TTL) + refresh token (7 days)

**POST /api/auth/refresh**
- Refresh expired access token
- Request body: `{ refreshToken }`
- Response: `{ accessToken, refreshToken }`
- Notes: Rotate refresh token on each use for security

---

### 2. User Management (3 endpoints)

**GET /api/users/me**
- Get current authenticated user profile
- Response: `{ id, email, role, firstName, lastName, phone, profile, createdAt }`
- Notes: Profile includes role-specific data (guard certifications, customer preferences)

**PATCH /api/users/me**
- Update current user profile
- Request body: `{ firstName?, lastName?, phone?, profile? }`
- Response: `{ user }`
- Notes: Partial updates only; validates profile fields based on role

**GET /api/users/:id**
- Get public profile of another user (guard or customer)
- Response: `{ id, firstName, lastName, role, profile, rating, createdAt }`
- Notes: Returns limited public info; full details only for matched jobs

---

### 3. Job Management (6 endpoints)

**POST /api/jobs**
- Create new job request (customer only)
- Request body: `{ type, startTime, duration, location, specialRequirements?, rate? }`
- Response: `{ job }`
- Notes: Automatically triggers matching algorithm; location uses lat/lng + address

**GET /api/jobs**
- List jobs (different views for customer vs guard)
- Query params: `?status=pending&role=guard&radius=25`
- Response: `{ jobs[], pagination }`
- Notes: Guards see available jobs nearby; customers see their own jobs

**GET /api/jobs/:id**
- Get detailed job information
- Response: `{ job, customer, guard?, location, payment? }`
- Notes: Includes related entities; guards only see jobs they're matched with

**PATCH /api/jobs/:id/accept**
- Guard accepts job offer
- Response: `{ job }`
- Notes: Changes status to 'accepted'; notifies customer; only available to matched guard

**PATCH /api/jobs/:id/start**
- Guard checks in and starts job
- Request body: `{ location }`
- Response: `{ job }`
- Notes: Records start time and location; triggers GPS tracking

**PATCH /api/jobs/:id/complete**
- Guard marks job as complete
- Request body: `{ location, notes? }`
- Response: `{ job }`
- Notes: Records completion time; triggers payment processing

---

### 4. Location & Tracking (2 endpoints)

**POST /api/jobs/:id/location**
- Update guard's current location during active job
- Request body: `{ lat, lng, accuracy, timestamp }`
- Response: `{ success: true }`
- Notes: Called every 30-60 seconds during active job; stores last 50 locations

**GET /api/jobs/:id/location**
- Get guard's current location (customer or admin only)
- Response: `{ lat, lng, accuracy, timestamp, status }`
- Notes: Returns last known location; indicates if stale (>5 min old)

---

### 5. Payments (3 endpoints)

**POST /api/payments/intent**
- Create Stripe payment intent for job
- Request body: `{ jobId }`
- Response: `{ clientSecret, amount, paymentIntentId }`
- Notes: Customer authorizes payment upfront; held in escrow until job completion

**POST /api/payments/confirm**
- Confirm payment after job completion
- Request body: `{ jobId, paymentIntentId }`
- Response: `{ payment }`
- Notes: Automatically called after job completion; triggers guard payout

**GET /api/payments/:id**
- Get payment details
- Response: `{ id, amount, status, jobId, customerId, guardId, createdAt }`
- Notes: Shows payment history and payout status

---

### 6. Admin (1 endpoint)

**GET /api/admin/dashboard**
- Get admin dashboard overview
- Response: `{ activeJobs[], pendingGuards[], recentPayments[], stats }`
- Notes: Requires admin role; shows real-time platform status for demo

---

## Core Data Models

### 1. User Model

**Essential Fields:**
```typescript
{
  id: string (UUID)
  email: string (unique, indexed)
  passwordHash: string
  role: enum ['customer', 'guard', 'admin']
  firstName: string
  lastName: string
  phone: string
  profile: object {
    // Customer-specific
    company?: string
    billingAddress?: object

    // Guard-specific
    licenseNumber?: string
    licenseState?: string
    certifications?: string[]
    hourlyRate?: number
    availability?: object
    backgroundCheckStatus?: enum ['pending', 'approved', 'rejected']
    backgroundCheckId?: string
  }
  status: enum ['active', 'inactive', 'suspended']
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `email` (unique)
- `role, status`
- `profile.licenseState` (for guard matching)

**Relationships:**
- 1-to-many with Jobs (as customer or guard)
- 1-to-many with Payments
- 1-to-1 with BackgroundCheck (guards only)

---

### 2. Job Model

**Essential Fields:**
```typescript
{
  id: string (UUID)
  customerId: string (FK to User)
  guardId?: string (FK to User, null until matched)
  type: enum ['security-guard', 'event-security', 'executive-protection']
  status: enum ['pending', 'matched', 'accepted', 'in-progress', 'completed', 'cancelled']

  // Timing
  startTime: timestamp
  duration: number (hours)
  actualStartTime?: timestamp
  actualEndTime?: timestamp

  // Location
  locationId: string (FK to Location)

  // Pricing
  rate: number ($/hour)
  totalAmount: number

  // Details
  specialRequirements?: string
  notes?: string

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `customerId`
- `guardId`
- `status, startTime` (for active job queries)
- `status, createdAt` (for listings)

**Relationships:**
- Many-to-1 with User (customer)
- Many-to-1 with User (guard)
- 1-to-1 with Location
- 1-to-1 with Payment

---

### 3. Location Model

**Essential Fields:**
```typescript
{
  id: string (UUID)
  jobId: string (FK to Job)

  // Address
  address: string
  city: string
  state: string
  zipCode: string

  // Coordinates
  latitude: number
  longitude: number

  // Tracking (for guard location updates)
  trackingPoints?: array [{
    lat: number
    lng: number
    accuracy: number
    timestamp: timestamp
  }]

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `jobId` (unique)
- `latitude, longitude` (geospatial index with PostGIS)

**Relationships:**
- 1-to-1 with Job

---

### 4. Payment Model

**Essential Fields:**
```typescript
{
  id: string (UUID)
  jobId: string (FK to Job)
  customerId: string (FK to User)
  guardId: string (FK to User)

  // Stripe references
  stripePaymentIntentId: string
  stripeTransferId?: string

  // Amounts
  amount: number (total customer pays)
  platformFee: number (Aegis commission)
  guardPayout: number (amount to guard)

  // Status
  status: enum ['pending', 'authorized', 'captured', 'paid_out', 'failed', 'refunded']

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `jobId` (unique)
- `customerId, status`
- `guardId, status`
- `stripePaymentIntentId` (unique)

**Relationships:**
- 1-to-1 with Job
- Many-to-1 with User (customer)
- Many-to-1 with User (guard)

---

### 5. BackgroundCheck Model

**Essential Fields:**
```typescript
{
  id: string (UUID)
  guardId: string (FK to User)

  // For MVP: Manual approval (stub Checkr integration)
  status: enum ['pending', 'approved', 'rejected']
  approvedBy?: string (FK to User, admin)

  // Placeholder for future Checkr integration
  checkrCandidateId?: string
  checkrReportId?: string

  // Results (simplified for demo)
  criminalCheck: boolean
  licenseCheck: boolean
  notes?: string

  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes:**
- `guardId` (unique)
- `status`

**Relationships:**
- 1-to-1 with User (guard)

---

## Authentication Strategy

### JWT-Based Authentication

**Access Token:**
- **Lifetime:** 15 minutes (short-lived)
- **Storage:** httpOnly cookie (web) or secure keychain (mobile)
- **Payload:** `{ userId, email, role, iat, exp }`
- **Algorithm:** HS256 (symmetric) or RS256 (asymmetric, preferred for production)

**Refresh Token:**
- **Lifetime:** 7 days
- **Storage:** httpOnly cookie (web, separate domain) or secure encrypted storage (mobile)
- **Rotation:** New refresh token issued on each refresh (prevents replay attacks)
- **Revocation:** Store in Redis with TTL for instant invalidation

**Role-Based Access Control (RBAC):**
- **Customer role:** Can create jobs, view own jobs, track assigned guards, make payments
- **Guard role:** Can view available jobs, accept jobs, update location, complete jobs
- **Admin role:** Can view all jobs, approve guards, override matches, access dashboard

**Middleware Example:**
```typescript
// Protect endpoint
@UseGuards(JwtAuthGuard)
@Get('jobs')
async getJobs(@User() currentUser) { ... }

// Restrict by role
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/dashboard')
async getDashboard() { ... }
```

### Deferred for MVP

- **OAuth integration** (Google Sign-In, Apple Sign-In): Add post-demo
- **2FA/MFA:** Required for production admins, optional for users
- **Password reset flow:** Can use admin override for demo testing
- **Email verification:** Trust emails for MVP, add verification for production

---

## Integration Points

### Live Integrations (Must Work for Demo)

**1. Stripe Connect (Payments)**
- **Why live:** Demonstrates real payment flow; critical for investor/customer confidence
- **Mode:** Test mode (use test credit cards)
- **Integration:**
  - Payment Intent API for customer authorization
  - Stripe Connect for guard payouts (use Express accounts)
  - Webhooks for payment events (`payment_intent.succeeded`, `transfer.created`)
- **Effort:** 1-2 weeks
- **Demo script:** Use Stripe test card `4242 4242 4242 4242` to show successful payment

**2. Mapbox (GPS Tracking)**
- **Why live:** Real-time guard tracking is core demo feature
- **Mode:** Production (free tier: 50K map loads/month)
- **Integration:**
  - Mapbox GL JS for web maps
  - Mapbox SDK for mobile apps
  - Geocoding API for address → lat/lng
  - Directions API for navigation (optional for MVP)
- **Effort:** 1 week
- **Demo script:** Show live map with guard marker updating every 30 seconds

**3. Real-time Updates (Ably)**
- **Why live:** Shows instant job status changes and location updates
- **Mode:** Free tier (3M messages/month, 200 concurrent connections)
- **Integration:**
  - Ably REST API for publishing events
  - Ably client SDKs for subscribing (web + mobile)
  - Channels: `jobs:{jobId}`, `guards:{guardId}`, `customers:{customerId}`
- **Effort:** 1 week
- **Demo script:** Customer sees guard's location update in real-time on map

---

### Mocked Integrations (Stub for Demo Speed)

**1. Checkr (Background Checks)**
- **Why mocked:** 1-3 day turnaround delays demo; not critical to show live
- **MVP approach:** Manual admin approval in dashboard
- **Implementation:**
  - Guard submits profile info
  - Admin reviews and clicks "Approve" in dashboard
  - Status changes from 'pending' to 'approved'
  - Future: Replace with real Checkr API integration
- **Effort saved:** 1 week integration + 3 days per check delay

**2. Twilio (SMS Notifications)**
- **Why optional:** Not core to demo flow; push notifications + email sufficient
- **MVP approach:** Log SMS to console instead of sending
- **Implementation:**
  ```typescript
  async sendSMS(phone: string, message: string) {
    if (process.env.NODE_ENV === 'demo') {
      console.log(`[SMS] To: ${phone}, Message: ${message}`);
      return { success: true };
    }
    // Real Twilio integration here
  }
  ```
- **Future:** Enable for production with environment variable
- **Effort saved:** 3-5 days

**3. Persona (Identity Verification)**
- **Why mocked:** Not essential for demo; trust guard-provided info
- **MVP approach:** Guards manually enter license number; admin verifies visually
- **Implementation:** Admin dashboard shows uploaded license photo for manual review
- **Future:** Integrate Persona API for automated ID verification
- **Effort saved:** 1 week

**4. OneSignal (Push Notifications)**
- **Why optional:** In-app polling + web notifications sufficient for demo
- **MVP approach:** Skip mobile push for first demo; add if needed
- **Implementation:** Use Ably real-time for in-app notifications instead
- **Future:** Add push for production launch
- **Effort saved:** 3-5 days

---

## Recommended API Patterns

### 1. RESTful URL Conventions

**Resource naming:**
- Use plural nouns: `/api/jobs`, `/api/users`, `/api/payments`
- Nest related resources: `/api/jobs/:id/location`
- Use hyphens for multi-word: `/api/background-checks`

**HTTP methods:**
- `GET` - Retrieve resource(s)
- `POST` - Create new resource
- `PATCH` - Partial update (preferred over PUT for flexibility)
- `DELETE` - Remove resource (soft delete in database)

**Examples:**
```
GET    /api/jobs           → List all jobs (filtered by role)
POST   /api/jobs           → Create new job
GET    /api/jobs/:id       → Get specific job
PATCH  /api/jobs/:id       → Update job details
DELETE /api/jobs/:id       → Cancel job

PATCH  /api/jobs/:id/accept   → Guard accepts job (state transition)
PATCH  /api/jobs/:id/start    → Guard starts job (state transition)
PATCH  /api/jobs/:id/complete → Guard completes job (state transition)
```

---

### 2. Response Format Standards

**Success Response (200, 201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "security-guard",
    "status": "pending",
    "customer": { /* embedded object */ },
    "createdAt": "2025-11-09T10:30:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-11-09T10:30:00Z"
  }
}
```

**List Response (200):**
```json
{
  "success": true,
  "data": [ /* array of objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-11-09T10:30:00Z"
  }
}
```

**Error Response (4xx, 5xx):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": { /* optional field-level errors */ }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-11-09T10:30:00Z"
  }
}
```

---

### 3. HTTP Status Codes

**Success:**
- `200 OK` - Successful GET, PATCH, DELETE
- `201 Created` - Successful POST (created new resource)
- `204 No Content` - Successful DELETE with no response body

**Client Errors:**
- `400 Bad Request` - Invalid request body or parameters
- `401 Unauthorized` - Missing or invalid auth token
- `403 Forbidden` - Valid token but insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource conflict (e.g., job already accepted)
- `422 Unprocessable Entity` - Validation errors

**Server Errors:**
- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - Temporary downtime (maintenance, overload)

---

### 4. API Versioning

**For MVP:** No versioning (implicit v1)
- URL: `/api/jobs` (not `/api/v1/jobs`)
- Rationale: Pre-launch, can break API without affecting users

**For Production:** URL-based versioning
- URL: `/api/v1/jobs`, `/api/v2/jobs`
- Rationale: Simple, explicit, works well with REST
- Alternative considered: Header-based (`Accept: application/vnd.aegis.v1+json`) - more complex, no clear benefit

**Deprecation strategy:**
- Support v1 for 6 months after v2 launch
- Add deprecation header: `Deprecation: Sun, 01 Jun 2026 23:59:59 GMT`
- Log v1 usage to identify clients needing migration

---

### 5. Rate Limiting

**For MVP:** Simple token-bucket rate limiting
- Unauthenticated: 10 requests/minute per IP
- Authenticated users: 100 requests/minute per user
- Admin: 1000 requests/minute (for dashboard polling)

**Implementation:**
- Use Redis with sliding window
- Return headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Return `429 Too Many Requests` when exceeded

**Example:**
```typescript
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ ttl: 60, limit: 100 })
@Get('jobs')
async getJobs() { ... }
```

---

### 6. Pagination

**Query parameters:**
- `page` - Page number (1-indexed)
- `limit` - Results per page (default: 20, max: 100)

**Example request:**
```
GET /api/jobs?page=2&limit=50
```

**Response:**
```json
{
  "data": [ /* 50 jobs */ ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 237,
    "pages": 5,
    "hasMore": true
  }
}
```

**For real-time feeds:** Use cursor-based pagination (better for frequently changing data)
```
GET /api/jobs?cursor=eyJpZCI6IjEyMyJ9&limit=20
```

---

### 7. Filtering & Sorting

**Filters (query params):**
```
GET /api/jobs?status=pending&type=security-guard&radius=25&lat=37.7749&lng=-122.4194
```

**Sorting:**
```
GET /api/jobs?sort=-createdAt,status
```
- Prefix `-` for descending: `-createdAt` = newest first
- Comma-separated for multiple: `status,-createdAt`

**Field selection (optional for MVP):**
```
GET /api/jobs?fields=id,status,customer.name
```
- Reduces payload size for mobile apps
- Can defer to Phase 2 if not needed

---

## Sample Request/Response Examples

### Example 1: Customer Creates Job

**Request:**
```http
POST /api/jobs HTTP/1.1
Host: api.aegis.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "type": "security-guard",
  "startTime": "2025-11-10T18:00:00Z",
  "duration": 4,
  "location": {
    "address": "123 Market St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94103",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "specialRequirements": "Must have CPR certification",
  "rate": 45
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "c8f5a2b1-3d4e-4f5a-9b6c-7d8e9f0a1b2c",
    "guardId": null,
    "type": "security-guard",
    "status": "pending",
    "startTime": "2025-11-10T18:00:00Z",
    "duration": 4,
    "actualStartTime": null,
    "actualEndTime": null,
    "location": {
      "id": "loc_abc123",
      "address": "123 Market St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94103",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "rate": 45,
    "totalAmount": 180,
    "specialRequirements": "Must have CPR certification",
    "createdAt": "2025-11-09T10:30:00Z",
    "updatedAt": "2025-11-09T10:30:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-11-09T10:30:00Z"
  }
}
```

**What happens next:**
1. API creates Job record with status 'pending'
2. API creates Location record with geospatial coordinates
3. Matching algorithm finds nearby guards (within 25 miles)
4. System notifies qualified guards via real-time channel
5. Guards see job in their "Available Jobs" list

---

### Example 2: Guard Accepts Job

**Request:**
```http
PATCH /api/jobs/550e8400-e29b-41d4-a716-446655440000/accept HTTP/1.1
Host: api.aegis.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "estimatedArrival": "2025-11-10T17:45:00Z"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "c8f5a2b1-3d4e-4f5a-9b6c-7d8e9f0a1b2c",
    "guardId": "d9a6b3c2-4e5f-5a6b-0c7d-8e9f0a1b2c3d",
    "type": "security-guard",
    "status": "accepted",
    "startTime": "2025-11-10T18:00:00Z",
    "duration": 4,
    "rate": 45,
    "totalAmount": 180,
    "customer": {
      "id": "c8f5a2b1-3d4e-4f5a-9b6c-7d8e9f0a1b2c",
      "firstName": "John",
      "lastName": "Smith",
      "phone": "+1-415-555-0123"
    },
    "guard": {
      "id": "d9a6b3c2-4e5f-5a6b-0c7d-8e9f0a1b2c3d",
      "firstName": "Maria",
      "lastName": "Garcia",
      "phone": "+1-415-555-0456",
      "profile": {
        "licenseNumber": "SG-12345",
        "licenseState": "CA",
        "certifications": ["CPR", "First Aid"]
      }
    },
    "location": {
      "address": "123 Market St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94103",
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "estimatedArrival": "2025-11-10T17:45:00Z",
    "updatedAt": "2025-11-09T10:35:00Z"
  },
  "meta": {
    "requestId": "req_def456",
    "timestamp": "2025-11-09T10:35:00Z"
  }
}
```

**What happens next:**
1. Job status changes from 'pending' to 'accepted'
2. Customer receives real-time notification via Ably
3. Customer can now see guard's profile and estimated arrival
4. Guard can navigate to location (Mapbox directions)
5. Payment authorization begins (Stripe Payment Intent created)

---

### Example 3: Guard Updates Location During Job

**Request:**
```http
POST /api/jobs/550e8400-e29b-41d4-a716-446655440000/location HTTP/1.1
Host: api.aegis.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "latitude": 37.7850,
  "longitude": -122.4100,
  "accuracy": 15,
  "timestamp": "2025-11-10T17:30:00Z"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "recorded": true,
    "latitude": 37.7850,
    "longitude": -122.4100,
    "distanceToDestination": 1.2,
    "eta": "2025-11-10T17:45:00Z"
  },
  "meta": {
    "requestId": "req_ghi789",
    "timestamp": "2025-11-10T17:30:00Z"
  }
}
```

**What happens next:**
1. Location added to `trackingPoints` array in Location model
2. Real-time event published to Ably channel `jobs:550e8400`
3. Customer's map updates with new guard marker position
4. ETA recalculated based on current location and traffic

---

### Example 4: Create Payment Intent

**Request:**
```http
POST /api/payments/intent HTTP/1.1
Host: api.aegis.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "clientSecret": "pi_3P1234567890_secret_1234567890",
    "paymentIntentId": "pi_3P1234567890",
    "amount": 180,
    "currency": "usd",
    "jobId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "meta": {
    "requestId": "req_jkl012",
    "timestamp": "2025-11-09T10:35:00Z"
  }
}
```

**What happens next:**
1. Stripe Payment Intent created for $180.00
2. Client uses `clientSecret` with Stripe.js to collect card details
3. Customer authorizes payment (funds held, not captured yet)
4. Payment status 'authorized' until job completion
5. After job completes, payment captured and guard payout initiated

---

## Data Model Relationships Diagram

```
┌─────────────────┐
│      User       │
│  (Customer,     │
│   Guard, Admin) │
└────────┬────────┘
         │
         │ 1:many
         │
    ┌────▼─────────────────┬─────────────────┐
    │                      │                 │
┌───▼────────┐      ┌──────▼──────┐   ┌─────▼──────────┐
│    Job     │◄─1:1─┤   Location  │   │BackgroundCheck │
│            │      │             │   │  (guards only) │
└─────┬──────┘      └─────────────┘   └────────────────┘
      │
      │ 1:1
      │
┌─────▼──────┐
│  Payment   │
│            │
└────────────┘
```

**Relationship Summary:**
- **User → Jobs:** 1-to-many (as customer) + 1-to-many (as guard)
- **Job → Location:** 1-to-1 (each job has one location)
- **Job → Payment:** 1-to-1 (each job has one payment)
- **User (guard) → BackgroundCheck:** 1-to-1 (guards have one background check)
- **Payment → User:** Many-to-1 (references customer and guard)

---

## API Security Best Practices

### 1. Input Validation

**Validate all inputs:**
- Use DTO (Data Transfer Object) classes with decorators
- Whitelist allowed fields (reject unknown properties)
- Validate types, formats, ranges, lengths
- Sanitize strings (prevent XSS, SQL injection)

**Example (NestJS):**
```typescript
class CreateJobDto {
  @IsEnum(JobType)
  type: JobType;

  @IsISO8601()
  startTime: string;

  @IsNumber()
  @Min(1)
  @Max(24)
  duration: number;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequirements?: string;
}
```

---

### 2. Authorization Checks

**Never trust client-provided IDs:**
```typescript
// ❌ BAD: Trust userId from request body
async updateUser(userId: string, data: any) {
  return this.userRepo.update(userId, data);
}

// ✅ GOOD: Use authenticated user from JWT
async updateUser(@User() currentUser, data: any) {
  return this.userRepo.update(currentUser.id, data);
}
```

**Check resource ownership:**
```typescript
async getJob(jobId: string, @User() currentUser) {
  const job = await this.jobRepo.findOne(jobId);

  // Ensure user has access to this job
  if (job.customerId !== currentUser.id &&
      job.guardId !== currentUser.id &&
      currentUser.role !== 'admin') {
    throw new ForbiddenException();
  }

  return job;
}
```

---

### 3. Prevent Common Vulnerabilities

**SQL Injection:** Use parameterized queries (ORMs like TypeORM do this automatically)
```typescript
// ✅ GOOD: TypeORM parameterizes automatically
await this.userRepo.findOne({ where: { email: userEmail } });

// ❌ BAD: Raw SQL with string concatenation
await this.db.query(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

**XSS (Cross-Site Scripting):** Sanitize user-generated content
```typescript
import { sanitize } from 'class-sanitizer';

@Sanitize()
@IsString()
specialRequirements: string;
```

**CSRF (Cross-Site Request Forgery):** Use SameSite cookies + CORS
```typescript
// Set secure cookies
response.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

**Mass Assignment:** Use DTOs with explicit fields
```typescript
// ✅ GOOD: Only allows specified fields
@Patch('users/me')
async updateProfile(@Body() dto: UpdateProfileDto) { ... }

// ❌ BAD: Accepts any field from request body
@Patch('users/me')
async updateProfile(@Body() data: any) { ... }
```

---

### 4. Rate Limiting & Throttling

**Prevent abuse:**
- Limit login attempts (5 per 15 minutes per IP)
- Limit password reset requests (3 per hour per email)
- Limit job creation (10 per hour for new customers)
- Limit location updates (120 per hour = 1 per 30 seconds)

**Example:**
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(5, 900) // 5 requests per 15 minutes
@Post('auth/login')
async login(@Body() dto: LoginDto) { ... }
```

---

### 5. Logging & Monitoring

**What to log:**
- All authentication attempts (success + failure)
- Authorization failures (403 errors)
- API errors (500 errors)
- Payment transactions
- Admin actions

**What NOT to log:**
- Passwords (even hashed)
- Full credit card numbers (log last 4 digits only)
- SSNs or sensitive PII
- JWT tokens (log user ID instead)

**Example:**
```typescript
this.logger.log({
  event: 'job.created',
  userId: currentUser.id,
  jobId: job.id,
  amount: job.totalAmount,
  timestamp: new Date().toISOString()
});
```

---

## API Documentation

### OpenAPI/Swagger Specification

**For MVP:** Auto-generate API docs with NestJS + Swagger
```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Aegis API')
  .setDescription('On-demand security guard marketplace API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Access docs:** `https://api.aegis.com/api/docs`

**Benefits:**
- Interactive API testing (try endpoints directly from browser)
- Auto-updates when code changes
- Client SDK generation (TypeScript, Python, etc.)
- Clear contract for frontend developers

---

### API Client SDKs

**For MVP:** Auto-generate TypeScript client from OpenAPI spec
```bash
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api/docs-json \
  -g typescript-axios \
  -o ./clients/typescript
```

**Usage in frontend:**
```typescript
import { JobsApi, Configuration } from '@aegis/api-client';

const api = new JobsApi(new Configuration({
  basePath: 'https://api.aegis.com',
  accessToken: userToken
}));

const jobs = await api.getJobs({ status: 'pending' });
```

**Defer for MVP:** Client SDKs for mobile (can use fetch/axios directly)

---

## Testing Strategy

### 1. Unit Tests (80%+ coverage for business logic)

**Example:**
```typescript
describe('JobService', () => {
  describe('createJob', () => {
    it('should create job with correct total amount', async () => {
      const dto = { rate: 45, duration: 4, /* ... */ };
      const job = await service.createJob(customerId, dto);

      expect(job.totalAmount).toBe(180); // 45 * 4
      expect(job.status).toBe('pending');
    });

    it('should throw error if start time is in past', async () => {
      const dto = { startTime: '2020-01-01T00:00:00Z', /* ... */ };

      await expect(service.createJob(customerId, dto))
        .rejects.toThrow('Start time must be in future');
    });
  });
});
```

---

### 2. Integration Tests (API endpoints)

**Example:**
```typescript
describe('POST /api/jobs', () => {
  it('should create job and return 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        type: 'security-guard',
        startTime: '2025-11-10T18:00:00Z',
        duration: 4,
        location: { /* ... */ },
        rate: 45
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.totalAmount).toBe(180);
  });

  it('should return 401 if not authenticated', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ /* ... */ });

    expect(response.status).toBe(401);
  });
});
```

---

### 3. E2E Tests (Critical user flows)

**Example:**
```typescript
describe('Complete job flow', () => {
  it('should complete full customer → guard → payment cycle', async () => {
    // 1. Customer creates job
    const createResponse = await customerClient.createJob(jobDto);
    const jobId = createResponse.data.id;

    // 2. Guard accepts job
    const acceptResponse = await guardClient.acceptJob(jobId);
    expect(acceptResponse.data.status).toBe('accepted');

    // 3. Guard starts job
    const startResponse = await guardClient.startJob(jobId, { location });
    expect(startResponse.data.status).toBe('in-progress');

    // 4. Guard completes job
    const completeResponse = await guardClient.completeJob(jobId, { location });
    expect(completeResponse.data.status).toBe('completed');

    // 5. Payment captured
    const payment = await customerClient.getPayment(jobId);
    expect(payment.status).toBe('captured');
  });
});
```

---

## Performance Considerations

### 1. Database Query Optimization

**Use proper indexes:**
```sql
CREATE INDEX idx_jobs_status_starttime ON jobs(status, start_time);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_guard ON jobs(guard_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_locations_geospatial ON locations USING GIST(
  ST_MakePoint(longitude, latitude)
);
```

**Use select specific fields:**
```typescript
// ✅ GOOD: Only fetch needed fields
await this.jobRepo.find({
  select: ['id', 'status', 'startTime', 'customer'],
  where: { status: 'pending' }
});

// ❌ BAD: Fetch all fields (includes large JSON columns)
await this.jobRepo.find({ where: { status: 'pending' } });
```

**Use pagination:**
```typescript
await this.jobRepo.find({
  skip: (page - 1) * limit,
  take: limit,
  order: { createdAt: 'DESC' }
});
```

---

### 2. Caching Strategy

**Cache frequently accessed data:**
```typescript
@Cacheable({ ttl: 300 }) // 5 minutes
async getActiveJobs(guardId: string) {
  return this.jobRepo.find({
    where: { guardId, status: In(['accepted', 'in-progress']) }
  });
}
```

**Cache invalidation on writes:**
```typescript
async acceptJob(jobId: string, guardId: string) {
  const job = await this.jobRepo.update(jobId, {
    guardId,
    status: 'accepted'
  });

  // Invalidate cache for this guard's active jobs
  await this.cacheManager.del(`active_jobs:${guardId}`);

  return job;
}
```

---

### 3. N+1 Query Prevention

**Use eager loading:**
```typescript
// ✅ GOOD: Single query with join
await this.jobRepo.find({
  where: { status: 'pending' },
  relations: ['customer', 'location']
});

// ❌ BAD: N+1 queries (1 for jobs + N for customers)
const jobs = await this.jobRepo.find({ where: { status: 'pending' } });
for (const job of jobs) {
  job.customer = await this.userRepo.findOne(job.customerId);
}
```

---

## MVP Timeline Estimate

**Week 1-2: Foundation**
- Project setup (NestJS, PostgreSQL, TypeORM)
- Authentication endpoints (register, login, refresh)
- User CRUD endpoints
- Database migrations
- **Deliverable:** Can register and login

**Week 3-4: Core Job Flow**
- Job CRUD endpoints
- Location endpoints
- Basic matching logic (nearby guards)
- Job state transitions (accept, start, complete)
- **Deliverable:** Can create and accept jobs

**Week 5-6: Payments & Real-time**
- Stripe integration (Payment Intent, webhooks)
- Ably integration (real-time job updates)
- Mapbox integration (location tracking)
- Admin dashboard endpoint
- **Deliverable:** Full job flow with payments working

**Total: 4-6 weeks for backend API**

---

## Success Metrics

**Technical Performance:**
- API response time: p95 < 200ms
- Database query time: p95 < 50ms
- API uptime: > 99.9%
- Error rate: < 1%

**API Quality:**
- OpenAPI spec 100% accurate
- Unit test coverage > 80%
- All critical flows have E2E tests
- API documentation complete and clear

**Developer Experience:**
- Frontend team can integrate without backend help
- Swagger docs sufficient for understanding API
- Predictable, consistent API patterns
- Clear error messages for debugging

---

## Data Sources

1. **RESTful API Design Best Practices**
   - https://restfulapi.net/
   - https://swagger.io/resources/articles/best-practices-in-api-design/

2. **Stripe API Documentation**
   - https://stripe.com/docs/api
   - https://stripe.com/docs/connect

3. **NestJS Documentation**
   - https://docs.nestjs.com/
   - https://docs.nestjs.com/security/authentication

4. **Marketplace Reference Architectures**
   - Uber API design patterns (engineering blog)
   - TaskRabbit API structure (documentation)
   - Thumbtack API patterns (documentation)

5. **OWASP API Security Top 10**
   - https://owasp.org/www-project-api-security/

6. **JWT Best Practices**
   - https://auth0.com/blog/jwt-security-best-practices/

7. **PostgreSQL Performance Tuning**
   - https://wiki.postgresql.org/wiki/Performance_Optimization

---

## Confidence Level: High (85-90%)

**High Confidence:**
- Endpoint structure (proven REST patterns)
- Data model design (covers all MVP use cases)
- Authentication approach (industry standard JWT)
- Integration strategy (validated with similar marketplaces)

**Medium Confidence:**
- Timeline estimates (±1-2 weeks variance based on team)
- Performance targets (may need adjustment after load testing)

**Lower Confidence:**
- Exact API contract details (will evolve with frontend feedback)
- Cache TTL values (need real usage data to optimize)

**Mitigation:**
- Start with minimal API, iterate based on frontend needs
- Plan for API evolution (versioning strategy)
- Monitor performance metrics from day 1
- Be prepared to adjust cache strategies based on data

---

## Recommendations

### Immediate Next Steps

1. **Define OpenAPI Spec First:** Write OpenAPI 3.0 spec before coding (design-first approach)
2. **Set Up Swagger UI:** Auto-generate docs from spec for frontend team
3. **Create Sample Data:** Seed database with test customers, guards, jobs for development
4. **Mock External APIs:** Use Stripe test mode, Mapbox free tier, stub Checkr initially
5. **Implement Core Flow:** Focus on happy path first (customer → job → guard → payment)

### Phase 2 Enhancements (Post-Demo)

- Messaging endpoints (customer ↔ guard chat)
- Rating/review endpoints (post-job feedback)
- Incident reporting endpoints (safety issues, disputes)
- Advanced matching (skills, certifications, ratings)
- Notification preferences (SMS, email, push settings)
- Bulk operations (admin tools for managing many guards)
- Analytics endpoints (dashboard metrics, reporting)
- Webhook subscriptions (allow clients to receive events)

### Avoid These Pitfalls

1. **Over-engineering:** Don't build features you don't need yet
2. **Premature optimization:** Get it working first, then make it fast
3. **Complex abstractions:** Keep code simple and readable for MVP
4. **Skipping tests:** Write tests as you go, not at the end
5. **Ignoring security:** Build auth/validation from start, not later
6. **Tight coupling:** Abstract third-party services behind interfaces
7. **Poor error handling:** Return clear, actionable error messages
8. **Inconsistent patterns:** Follow same conventions across all endpoints

---

**Report Status:** Complete
**Next Step:** Update Q-6 with findings and mark as Complete
