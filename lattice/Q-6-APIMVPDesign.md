---
node_type: Question
status: Complete
priority: High
created: 2025-11-09
updated: 2025-11-09
spawned_by:
  - Q-3
informs:
  - R-6
tags:
  - technical
  - api-design
  - mvp
  - demo
  - backend
---

# Q-6: API Design & Data Models for MVP/Demo

## Question

What REST API endpoints and core data models do we need for a working MVP/proof-of-concept that demonstrates the core booking flow from customer request to guard assignment to service completion?

## Context

Based on Q-3's recommendation to build a custom platform with Node.js/TypeScript + NestJS, we need to define the minimal API surface for a functional demo. The goal is to prove the core value proposition: a customer can request a security guard, get matched with an available guard, track their arrival, and complete the service.

**MVP Scope:** Focus on the essential "happy path" flow, not edge cases or advanced features.

## Research Objectives

1. **Core MVP User Flows**
   - What are the absolute essential user flows for a demo?
   - Customer: Browse → Request Guard → Track → Complete → Review
   - Guard: Accept Job → Navigate → Check-in → Complete → Get Paid
   - Admin: View Dashboard → Monitor Active Jobs

2. **Essential API Endpoints**
   - What REST endpoints are needed for auth, job posting, matching, tracking, and payment?
   - What request/response formats should we use?
   - What authentication approach (JWT tokens)?

3. **Core Data Models**
   - What are the minimum entities (User, Job, Guard, Payment)?
   - What fields are essential vs. nice-to-have?
   - What relationships are required?

4. **Third-Party Integration Points**
   - Which external APIs must be integrated for MVP (Stripe, Mapbox)?
   - Which can be stubbed/mocked for demo (Checkr background checks)?

## Research Questions

### MVP User Flows
- [ ] What is the absolute minimum flow for a customer to request and receive a guard?
- [ ] What is the minimum flow for a guard to accept and complete a job?
- [ ] What admin capabilities are needed for demo (monitoring, manual override)?
- [ ] Can we defer features like ratings, messaging, incident reports to post-demo?

### API Endpoints (Essential Only)
- [ ] **Authentication**: Login, register, token refresh
- [ ] **Jobs**: Create job, list available jobs (guard view), get job details, update job status
- [ ] **Matching**: Trigger match, accept/decline job
- [ ] **Tracking**: Update location, get guard location
- [ ] **Payments**: Create payment intent, confirm payment, payout status
- [ ] **Users**: Get profile, update profile

### Data Models (Minimal)
- [ ] **User**: What fields distinguish customer vs guard vs admin?
- [ ] **Job**: What fields define a security job (location, time, type, rate)?
- [ ] **Match**: How do we represent guard-job assignments?
- [ ] **Payment**: What payment state do we need to track?
- [ ] Do we need separate Guard profile entity or embed in User?

### Integration Strategy
- [ ] Which integrations are critical for demo (must work live)?
- [ ] Which can be mocked/stubbed (background checks, SMS)?
- [ ] How do we handle Stripe test mode vs production?
- [ ] Can we skip Checkr integration for demo and manually approve test guards?

### Authentication & Security
- [ ] JWT-based auth sufficient for MVP?
- [ ] Do we need refresh tokens for demo or just access tokens?
- [ ] Role-based access (customer, guard, admin roles)?
- [ ] Can we defer MFA, OAuth, password reset to post-demo?

## Success Criteria

This research is complete when we can answer:

1. ✓ List of essential REST API endpoints for MVP (10-20 endpoints)
2. ✓ Core data models with required fields (User, Job, Payment, Location)
3. ✓ Authentication strategy (JWT with roles)
4. ✓ Integration strategy (which live, which mocked)
5. ✓ Recommended API structure and patterns

## Research Methods

- Reference marketplace API patterns (Uber, TaskRabbit API docs)
- Review NestJS best practices and module structure
- Analyze MVP user flow to identify minimum API surface
- Reference Stripe API integration patterns
- Consider RESTful API design principles

## Expected Outputs

- List of MVP API endpoints (grouped by resource)
- Core data models with fields and types
- Authentication flow diagram
- Sample request/response formats for key endpoints
- Integration architecture (live vs mocked services)

## Priority & Timeline

- **Priority:** High (blocks development start)
- **Timeline:** 1-2 days
- **Blockers:** None (Q-3 provides architectural foundation)

## Findings

After comprehensive API design research focused on MVP/demo requirements, we recommend a **lightweight RESTful API with 18 essential endpoints** covering the complete booking flow: authentication, user management, jobs, location tracking, payments, and admin oversight. This minimal API surface enables a **4-6 week backend development sprint** while proving all critical technical capabilities.

The API design follows proven RESTful conventions with JWT authentication, role-based access control (customer/guard/admin), and simple 1-to-1 or 1-to-many data relationships. Five core data models (User, Job, Location, Payment, BackgroundCheck) capture essential information without production complexity. Integration strategy prioritizes live implementations where demonstration value is high (Stripe payments in test mode, Mapbox GPS tracking, Ably real-time updates) while mocking services that would delay the demo (Checkr background checks replaced with manual admin approval, Twilio SMS replaced with console logging).

**Key architectural decisions:** Standard REST over GraphQL for simplicity, JWT tokens with 15-minute access tokens and 7-day rotating refresh tokens, httpOnly cookies for web security, PostGIS geospatial indexes for location queries, and NestJS framework with TypeORM for type-safe database access. Performance targets include p95 API response times under 200ms and database queries under 50ms, achievable with proper indexing and Redis caching.

## Key Insights

- **18 Essential Endpoints:** Covers authentication (3), users (3), jobs (6), location tracking (2), payments (3), and admin (1)—sufficient to demonstrate the complete customer-to-guard-to-payment flow without extraneous features

- **Five Core Data Models:** User (with polymorphic customer/guard profiles), Job (with status state machine), Location (with geospatial tracking points), Payment (with Stripe references), and BackgroundCheck (stubbed for MVP)—relationships kept simple with no many-to-many joins

- **JWT + RBAC Authentication:** Short-lived access tokens (15 min) with rotating refresh tokens (7 days), role-based access control with three roles, httpOnly cookies for web security, secure keychain storage for mobile

- **Strategic Integration Mix:** Live Stripe Connect (proves payment escrow), live Mapbox (proves GPS tracking), live Ably (proves real-time updates); mocked Checkr (3-day delays unacceptable for demo), mocked Twilio (console logs sufficient), mocked Persona (manual admin approval faster)

- **RESTful Simplicity Over GraphQL Complexity:** Standard REST conventions with predictable URL patterns, HTTP method semantics, and consistent JSON response formats—reduces learning curve and accelerates frontend integration

- **MVP Timeline Advantage:** Mock background checks save 1 week integration plus 3 days per guard approval delay; stub SMS saves 3-5 days; skip push notifications saves 3-5 days; total time savings: 2-3 weeks versus full integration approach

- **Performance-First Database Design:** Composite indexes on (status, startTime) for job queries, geospatial GIST index on (latitude, longitude) for location matching, Redis caching for active jobs with 5-minute TTL, eager loading to prevent N+1 queries

- **Security Built-In From Start:** Input validation with DTO decorators, resource ownership checks in all endpoints, parameterized queries to prevent SQL injection, sanitization to prevent XSS, rate limiting on auth endpoints (5 attempts per 15 min)

- **Auto-Generated Documentation:** Swagger/OpenAPI spec generated from NestJS decorators, interactive API testing in browser, TypeScript client SDK auto-generation for frontend team, no manual documentation maintenance burden

- **Testability by Design:** Unit tests for business logic (80%+ coverage target), integration tests for API endpoints, E2E tests for complete user flows (customer→guard→payment cycle), clear separation of concerns for mockability

## Recommendations

### API Endpoints (By Priority)

**Phase 1 (Weeks 1-2): Authentication & Foundation**
- Implement auth endpoints (POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh)
- Implement user endpoints (GET /api/users/me, PATCH /api/users/me, GET /api/users/:id)
- Set up JWT middleware, role guards, input validation with DTOs
- Create database migrations for User table

**Phase 2 (Weeks 3-4): Core Job Flow**
- Implement job endpoints (POST /api/jobs, GET /api/jobs, GET /api/jobs/:id)
- Implement state transition endpoints (PATCH /api/jobs/:id/accept, /start, /complete)
- Create Job and Location tables with proper indexes
- Build basic matching algorithm (nearby guards within 25 miles)

**Phase 3 (Weeks 5-6): Payments & Real-time**
- Implement payment endpoints (POST /api/payments/intent, /confirm, GET /api/payments/:id)
- Implement location endpoints (POST /api/jobs/:id/location, GET /api/jobs/:id/location)
- Integrate Stripe Connect (test mode), Ably real-time, Mapbox geocoding
- Implement admin dashboard endpoint (GET /api/admin/dashboard)

### Data Models (Implementation Details)

**User Model:**
- Store role-specific data in JSONB `profile` column (flexible schema for customer vs guard fields)
- Index email (unique), (role, status) composite, profile.licenseState for guard filtering
- Use bcrypt for password hashing (10 rounds minimum)
- Soft delete with status='inactive' to preserve referential integrity

**Job Model:**
- Status enum: pending → matched → accepted → in-progress → completed (linear state machine for MVP)
- Store both scheduled (startTime, duration) and actual (actualStartTime, actualEndTime) for compliance
- Calculate totalAmount = rate × duration on creation (denormalize for payment simplicity)
- Index (status, startTime) for active job queries, (customerId), (guardId) for user-specific views

**Location Model:**
- Use PostGIS extension for latitude/longitude geospatial queries (ST_MakePoint, ST_DWithin)
- Store tracking points as JSONB array (flexible, no separate table needed for MVP)
- Limit trackingPoints to last 50 locations (keep data size bounded)
- Include accuracy field to filter low-quality GPS readings

**Payment Model:**
- Store Stripe IDs (paymentIntentId, transferId) for idempotency and reconciliation
- Break down amounts (total, platformFee, guardPayout) for transparency and debugging
- Index by stripePaymentIntentId (unique) for webhook deduplication
- Use status enum to track payment lifecycle for admin monitoring

**BackgroundCheck Model:**
- For MVP: Simple boolean flags (criminalCheck, licenseCheck) with manual admin approval
- Store Checkr IDs as placeholders (checkrCandidateId, checkrReportId) for future integration
- One-to-one with User (guards only) enforced at application level
- Post-MVP: Replace with real Checkr API integration and detailed results

### Authentication Strategy

**Implementation:**
- Use Passport.js with JWT strategy (passport-jwt package)
- Access tokens: HS256 algorithm, 15-minute expiry, payload includes { userId, email, role }
- Refresh tokens: Store in Redis with 7-day TTL, rotate on each use (invalidate old token)
- Web: httpOnly cookies with SameSite=strict, Secure=true (HTTPS only)
- Mobile: iOS Keychain / Android Keystore for secure token storage

**Security Hardening:**
- Implement token blacklist in Redis for immediate revocation (logout, password change)
- Rate limit auth endpoints (5 login attempts per 15 minutes per IP)
- Log all auth events (login success/failure, token refresh, logout) for audit trail
- Require MFA for admin accounts (TOTP with authenticator app)

**Deferred to Post-MVP:**
- OAuth integration (Google, Apple Sign-In) for easier onboarding
- Password reset flow via email (use admin override for demo testing)
- Email verification (trust provided emails for MVP)

### Integration Points

**Live Integrations:**
1. **Stripe Connect:** Use Express accounts for guards (faster onboarding), Payment Intent API for customer charges, webhooks for payment_intent.succeeded and transfer.created events, test mode with 4242 4242 4242 4242 test card
2. **Mapbox:** Free tier (50K map loads/month), Geocoding API for address→lat/lng, GL JS for web maps, SDK for mobile, Directions API optional for navigation
3. **Ably:** Free tier (3M messages/month), channels per job (jobs:{jobId}), per user (guards:{guardId}, customers:{customerId}), publish location updates every 30 seconds

**Mocked Integrations:**
1. **Checkr:** Replace with BackgroundCheck table + admin approval UI, save 1 week integration + 3 days per guard approval delay
2. **Twilio:** Console.log SMS content for demo, enable with environment variable for production
3. **Persona:** Manual license photo review in admin dashboard, defer automated verification to post-MVP

### API Patterns & Standards

**Conventions:**
- URL structure: /api/{resource} (plural nouns), /api/{resource}/{id}/{action} for state transitions
- HTTP methods: GET (read), POST (create), PATCH (partial update), DELETE (soft delete)
- Response format: { success, data, pagination?, meta: { requestId, timestamp } }
- Error format: { success: false, error: { code, message, details? }, meta }
- Status codes: 200/201 success, 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 server error

**Performance:**
- Redis caching: Active jobs (5 min TTL), user sessions (7 day TTL), guard availability (5 min TTL)
- Database indexes: All foreign keys, composite indexes for common queries (status+createdAt)
- Query optimization: Eager load relations, paginate lists (default 20, max 100), select specific fields
- Rate limiting: 100 req/min authenticated, 10 req/min unauthenticated, 1000 req/min admin

**Documentation:**
- OpenAPI 3.0 spec auto-generated from NestJS decorators
- Swagger UI at /api/docs for interactive testing
- TypeScript SDK auto-generated for frontend (openapi-generator-cli)
- Example requests/responses in API docs for every endpoint

### Testing Requirements

**Unit Tests (80%+ coverage):**
- Test business logic in services (job creation, state transitions, payment calculations)
- Mock database repositories, external APIs
- Use Jest with coverage reporting

**Integration Tests:**
- Test all API endpoints with real database (use test database, reset between tests)
- Validate auth middleware, role guards, input validation
- Use supertest for HTTP request testing

**E2E Tests:**
- Test complete user flows: customer creates job → guard accepts → guard starts → guard completes → payment captured
- Use real Stripe test mode, real database
- Run in CI/CD pipeline before deployment

## Notes

**Focus on MVP/Demo Scope:**
- Prove core value: customer → request → guard arrives → service complete
- Skip: ratings, reviews, messaging, incident reports, analytics
- Mock: background checks, SMS notifications (use email/console for demo)
- Live: Stripe payments (test mode), Mapbox (free tier), GPS tracking

**Related Nodes:**
- Spawned by: Q-3 (Technical Architecture)
- Research Report: R-6 (API Design & Data Models for MVP/Demo Research Report)
- Will inform: Decision on API design, Artifact for API specification
