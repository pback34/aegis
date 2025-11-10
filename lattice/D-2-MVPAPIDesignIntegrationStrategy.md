---
node_type: Decision
decision_type: Design
status: Proposed
created: 2025-11-09
updated: 2025-11-09
priority: High
spawned_by:
  - Q-6
  - Q-3
informs: []
depends_on:
  - D-1
tags:
  - technical
  - api-design
  - rest
  - integrations
  - mvp

# AI Metadata
created_by: AI:DecisionAgent
ai_confidence: 0.85
human_review_required: true
review_status: Pending
---

# D-2: MVP API Design & Integration Strategy

## Decision

Implement a RESTful API with 26 essential endpoints organized into 7 resource groups (authentication, users, jobs, location & mapping, payments, admin), using JWT authentication with role-based access control (customer/guard/admin), with a strategic integration approach that prioritizes live implementations for high-value demonstrations (Stripe payments, Mapbox geocoding/maps, Ably real-time) while mocking services that would delay the MVP (Checkr background checks, Twilio SMS, Persona KYC).

## Rationale

Based on comprehensive API design research from Q-6 and technical architecture decisions from Q-3, this API design enables a **4-6 week backend development sprint** while proving all critical technical capabilities for the Aegis platform.

### 1. RESTful API Over GraphQL

**REST provides optimal simplicity for MVP:**

- **Predictable conventions**: Standard HTTP methods (GET, POST, PATCH, DELETE) with intuitive URL patterns (`/api/{resource}`)
- **Lower learning curve**: Frontend team can integrate quickly without GraphQL schema learning
- **Better caching**: HTTP caching works out-of-box with CloudFront CDN
- **Proven tooling**: OpenAPI/Swagger auto-generation from NestJS decorators provides interactive docs
- **Right-sized for MVP**: 18 endpoints is manageable complexity; GraphQL would be over-engineering

**Deferred to post-MVP**: GraphQL layer can be added later if needed for complex mobile app queries, but research shows REST is sufficient for MVP flows.

### 2. JWT Authentication with RBAC

**Security and scalability balanced:**

- **Short-lived access tokens (15 minutes)**: Limits exposure window if token compromised
- **Rotating refresh tokens (7 days)**: Balances user convenience with security (invalidate old token on each refresh)
- **httpOnly cookies for web**: Prevents XSS attacks from stealing tokens
- **Secure mobile storage**: iOS Keychain / Android Keystore for token persistence
- **Role-based access control**: Three roles (customer/guard/admin) with granular permissions per endpoint
- **Stateless authentication**: No server-side session storage, scales horizontally

**Implementation with Passport.js + JWT strategy** provides battle-tested security with excellent NestJS integration.

### 3. 26 Essential Endpoints - Minimal API Surface

**Organized by resource for clarity:**

**Authentication (3 endpoints)**:
- `POST /api/auth/register` - New user registration
- `POST /api/auth/login` - Login with credentials, return tokens
- `POST /api/auth/refresh` - Refresh access token using refresh token

**Users (3 endpoints)**:
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update current user profile
- `GET /api/users/:id` - Get user profile (guards viewable by customers)

**Jobs (6 endpoints)**:
- `POST /api/jobs` - Customer creates security job request
- `GET /api/jobs` - List jobs (filtered by role: customers see their jobs, guards see available jobs)
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id/accept` - Guard accepts job offer
- `PATCH /api/jobs/:id/start` - Guard starts job (check-in)
- `PATCH /api/jobs/:id/complete` - Guard completes job (check-out)

**Location & Mapping (8 endpoints)** *(See D-6, A-6-1)*:
- `POST /api/geocoding/forward` - Address → coordinates (for job creation)
- `POST /api/geocoding/reverse` - Coordinates → address (for map pins)
- `GET /api/map/config` - Map configuration (Mapbox token, style)
- `POST /api/jobs/:id/location` - Guard updates current location
- `GET /api/jobs/:id/location` - Customer views guard current location
- `GET /api/jobs/:id/location/history` - Retrieve location history/route
- `POST /api/jobs/:id/location/batch` - Batch upload (offline sync)
- `POST /api/locations/validate-service-area` - Check coverage

**Payments (3 endpoints)**:
- `POST /api/payments/intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment after service
- `GET /api/payments/:id` - Get payment status

**Admin (1 endpoint)**:
- `GET /api/admin/dashboard` - Admin overview (active jobs, guard status, payments)

**Total: 26 endpoints** covering complete customer→guard→payment flow with full map interaction support.

**Deferred to post-MVP**: Ratings/reviews, messaging, incident reports, analytics, guard availability management.

### 4. Strategic Integration Mix - Speed vs. Realism

**Live Integrations (High Demo Value)**:

**Stripe Connect (Payment Processing)**
- **Why live**: Proves escrow model, split payments, and fraud protection
- **Test mode**: Use 4242 4242 4242 4242 test cards, no real money
- **Implementation**: Payment Intent API with webhooks for `payment_intent.succeeded`
- **Timeline**: 3-5 days integration + 2 weeks Stripe platform approval
- **Value**: Demonstrates core business model and revenue flow

**Mapbox (GPS & Mapping)**
- **Why live**: Proves real-time location tracking and guard navigation
- **Free tier**: 50K map loads/month sufficient for MVP testing
- **Implementation**: Geocoding API for addresses, GL JS for web maps, SDK for mobile
- **Timeline**: 2-3 days integration
- **Value**: Critical differentiator showing "Uber-like" guard tracking

**Ably (Real-time Updates)**
- **Why live**: Proves live job status changes and location updates
- **Free tier**: 3M messages/month sufficient for MVP
- **Implementation**: Channels per job (`jobs:{jobId}`) and per user (`guards:{guardId}`)
- **Timeline**: 2-3 days integration
- **Value**: Shows platform responsiveness and modern UX

**Mocked Integrations (Delay Reduction)**:

**Checkr (Background Checks)**
- **Why mocked**: 3-day turnaround per guard unacceptable for demo timeline
- **Mock approach**: Simple BackgroundCheck table with boolean flags + manual admin approval UI
- **Timeline savings**: 1 week integration + 3 days per guard approval = **10+ days saved**
- **Post-MVP**: Replace with real Checkr API integration
- **Trade-off**: Can't demonstrate automated background checks, but manual approval proves workflow

**Twilio (SMS Notifications)**
- **Why mocked**: Non-critical for core flow demonstration
- **Mock approach**: Console.log SMS content, enable with env variable for production
- **Timeline savings**: 3-5 days integration
- **Post-MVP**: Enable Twilio for launch
- **Trade-off**: No SMS in demo, but email or console logs prove notification concept

**Persona (KYC/Identity Verification)**
- **Why mocked**: Manual license photo review faster for MVP
- **Mock approach**: Admin dashboard for reviewing uploaded license photos
- **Timeline savings**: 3-5 days integration
- **Post-MVP**: Automate with Persona API
- **Trade-off**: Manual verification required, but proves compliance workflow

**Total timeline savings: 2-3 weeks** by strategic mocking vs. full integration approach.

### 5. API Standards & Performance

**Consistent Response Format**:
```json
{
  "success": true,
  "data": { /* resource data */ },
  "pagination": { /* if list */ },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

**Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [/* validation errors */]
  },
  "meta": { "requestId": "uuid", "timestamp": "ISO-8601" }
}
```

**HTTP Status Codes**:
- 200/201: Success
- 400: Validation errors
- 401: Unauthenticated
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 409: Conflict (e.g., guard already assigned)
- 500: Server error

**Performance Targets**:
- p95 API response time: < 200ms
- p99 API response time: < 500ms
- Database queries: < 50ms
- Redis cache hit rate: > 80% for hot data

**Caching Strategy**:
- Active jobs: 5 min TTL in Redis
- User sessions: 7 day TTL in Redis
- Guard availability: 5 min TTL in Redis
- Location updates: No cache (real-time)

### 6. Documentation & Developer Experience

**Auto-Generated OpenAPI Specification**:
- Swagger UI at `/api/docs` for interactive testing
- TypeScript SDK auto-generated with openapi-generator-cli
- Example requests/responses for every endpoint
- No manual documentation maintenance burden

**NestJS Advantages**:
- DTO decorators provide input validation + OpenAPI schema generation
- Dependency injection simplifies testing and mocking
- Guards and interceptors enforce auth and logging consistently
- TypeORM integration provides type-safe database access

## Alternatives Considered

### Alternative 1: GraphQL API

**Pros:**
- Flexible queries reduce over-fetching
- Single endpoint simplifies versioning
- Strong typing with schema

**Cons:**
- **Steeper learning curve** for frontend team
- More complex caching (can't use HTTP caching)
- Harder to rate-limit (single endpoint)
- Over-engineering for 18 simple endpoints
- **REJECTED**: REST is simpler and sufficient for MVP

### Alternative 2: Full Third-Party Integration (No Mocking)

**Pros:**
- Production-ready integrations from day one
- Demonstrates full automated workflow
- No migration work post-MVP

**Cons:**
- **2-3 week timeline delay** for Checkr, Twilio, Persona setup
- 3+ day wait for each guard background check during testing
- More complex testing (sandbox accounts, webhooks)
- **REJECTED**: Timeline impact unacceptable for MVP/demo

### Alternative 3: gRPC for Internal Services

**Pros:**
- Better performance for internal service-to-service calls
- Strong typing with Protocol Buffers
- Bi-directional streaming

**Cons:**
- Not suitable for web/mobile clients (needs REST gateway)
- More complex deployment and debugging
- Premature optimization for MVP
- **REJECTED**: Overkill for monolithic MVP; consider for microservices migration

### Alternative 4: Session-Based Authentication (Cookies)

**Pros:**
- Simpler than JWT for web-only applications
- Server-side revocation is easier

**Cons:**
- Doesn't scale horizontally (needs sticky sessions or shared session store)
- Mobile apps require token-based auth anyway
- CSRF protection complexity
- **REJECTED**: JWT is more scalable and works for both web and mobile

## Implications

### Development Impact

1. **Backend team can start immediately** after D-1 approval (tech stack confirmed)
2. **Frontend/mobile teams can mock API** using OpenAPI spec before backend is ready
3. **3 parallel development streams**:
   - Backend: NestJS API + database + integrations (Weeks 1-16)
   - Web: Next.js frontend consuming API (Weeks 5-16)
   - Mobile: React Native apps consuming API (Weeks 7-18)

### Testing Requirements

4. **Unit tests**: 80%+ coverage for business logic (job creation, state transitions, payment calculations)
5. **Integration tests**: All 18 endpoints with real database (use test DB, reset between tests)
6. **E2E tests**: Complete flows (customer creates job → guard accepts → guard starts → guard completes → payment captured)
7. **Load testing**: 100 concurrent users, 1000 requests/minute to validate performance targets

### Security Considerations

8. **Input validation**: DTO decorators on all endpoints prevent injection attacks
9. **Rate limiting**:
   - Unauthenticated: 10 req/min per IP
   - Authenticated: 100 req/min per user
   - Admin: 1000 req/min
10. **Resource ownership checks**: Users can only access their own jobs/payments
11. **Audit logging**: Log all state changes (job status, payment status) with user ID and timestamp

### Post-MVP Migration Path

12. **Checkr integration** (Week 17-18): Replace BackgroundCheck table with real Checkr API calls
13. **Twilio integration** (Week 18): Enable SMS notifications for job updates
14. **Persona integration** (Week 19-20): Automate identity verification
15. **Push notifications** (Week 20-21): Add OneSignal for mobile app alerts
16. **Messaging** (Week 22-24): Add in-app chat between customers and guards

## Risks & Mitigation

### Risk 1: JWT Token Theft via XSS

**Risk**: Malicious JavaScript steals access tokens from localStorage

**Mitigation**:
- Use httpOnly cookies for web applications (tokens not accessible to JavaScript)
- Implement Content Security Policy (CSP) headers
- Sanitize all user-generated content to prevent XSS injection
- Use SameSite=strict cookie attribute
- **Severity**: High | **Likelihood**: Low | **Priority**: Implement CSP

### Risk 2: Stripe Webhook Replay Attacks

**Risk**: Attacker replays webhook events to trigger duplicate payments or payouts

**Mitigation**:
- Verify Stripe webhook signatures using signing secret
- Store processed event IDs in database (idempotency)
- Reject events older than 5 minutes
- Use Stripe test mode for MVP (no real money at risk)
- **Severity**: Critical | **Likelihood**: Low | **Priority**: Must implement

### Risk 3: Rate Limiting Bypass

**Risk**: Attacker uses multiple IPs or accounts to bypass rate limits

**Mitigation**:
- Rate limit by user ID (authenticated) AND IP address
- Implement CAPTCHA after 3 failed login attempts
- Monitor for suspicious patterns (Datadog alerts)
- Block IPs with > 1000 req/hour (DDoS protection)
- **Severity**: Medium | **Likelihood**: Medium | **Priority**: Monitoring required

### Risk 4: Mocked Integrations Cause Post-MVP Delays

**Risk**: Replacing mocked services with real integrations takes longer than expected

**Mitigation**:
- Design abstraction layer for integrations (service interfaces)
- Test with real APIs in sandbox mode periodically
- Budget 2-3 weeks for post-MVP integration work
- Document integration requirements clearly
- **Severity**: Medium | **Likelihood**: Medium | **Priority**: Plan buffer time

### Risk 5: API Design Changes Require Frontend Rewrites

**Risk**: API changes after frontend development starts cause rework

**Mitigation**:
- Lock API spec before frontend development begins (use OpenAPI contract)
- Version API (`/api/v1/...`) to allow breaking changes
- Use feature flags to test changes without breaking existing clients
- Maintain API changelog and deprecation notices
- **Severity**: Medium | **Likelihood**: Low | **Priority**: API contract discipline

## Success Metrics

To validate this decision post-implementation:

1. **Development velocity**: Backend API complete in 4-6 weeks (target: 5 weeks)
2. **Performance**: p95 response time < 200ms, p99 < 500ms
3. **Test coverage**: > 80% for unit tests, 100% endpoint coverage for integration tests
4. **API documentation**: 100% endpoint documentation auto-generated with examples
5. **Developer satisfaction**: Frontend team can integrate without backend team support (OpenAPI mocks)
6. **Integration reliability**: 99.9% uptime for live integrations (Stripe, Mapbox, Ably)

## Dependencies

### Blocks These Decisions/Artifacts

- A-*: Backend API implementation artifacts
- A-*: Frontend/mobile integration artifacts
- D-*: Specific integration implementation decisions

### Depends On

- **D-1**: MVP Technical Architecture (MUST be approved first - establishes NestJS, TypeORM, PostgreSQL)
- Q-6: API Design Research (COMPLETED)
- Q-3: Technical Architecture Research (COMPLETED)

## Next Steps After Approval

1. **API Specification** (Week 1):
   - Finalize OpenAPI 3.0 spec with all 18 endpoints
   - Define request/response schemas in detail
   - Share spec with frontend and mobile teams for review
   - Generate TypeScript SDK for frontend consumption

2. **NestJS Project Setup** (Week 1):
   - Initialize NestJS project with TypeORM and PostgreSQL
   - Configure authentication module with Passport + JWT
   - Set up Swagger module for API documentation
   - Create development and testing environments

3. **Core Endpoints** (Weeks 2-3):
   - Implement authentication endpoints (register, login, refresh)
   - Implement user endpoints (profile management)
   - Set up JWT guards and role-based access control
   - Write unit and integration tests

4. **Job Management** (Weeks 3-5):
   - Implement job CRUD endpoints
   - Implement state transition endpoints (accept, start, complete)
   - Build basic matching algorithm (nearby guards within 25 miles)
   - Integrate with database schema from D-3

5. **Integrations** (Weeks 4-6):
   - Integrate Stripe Connect (payment intents, webhooks)
   - Integrate Mapbox (geocoding, mapping)
   - Integrate Ably (real-time channels)
   - Mock Checkr, Twilio, Persona with service interfaces

6. **Testing & Documentation** (Ongoing):
   - Write unit tests for all services (80%+ coverage)
   - Write integration tests for all endpoints (100% coverage)
   - Test E2E user flows with Postman/Insomnia
   - Generate and review OpenAPI documentation

## Related Nodes

- **Spawned by**: Q-6 (API Design & Data Models for MVP/Demo), Q-3 (Technical Architecture)
- **Informs**: All backend implementation artifacts, frontend/mobile integration
- **Depends on**: D-1 (MVP Technical Architecture)

## Review Notes

**For Human Reviewer:**

This is a **High priority, high-confidence (0.85) design decision** that defines the contract between frontend and backend teams. Key points for your consideration:

1. **18 Endpoints**: Is this the right scope for MVP? Are we missing critical endpoints or including unnecessary ones?

2. **REST vs. GraphQL**: Do you agree REST is simpler for MVP, or do you prefer GraphQL from the start?

3. **Mocked Integrations**: Are you comfortable with mocked Checkr/Twilio/Persona for demo, knowing we need to replace them post-MVP? This saves 2-3 weeks.

4. **JWT Security**: Are you comfortable with JWT + httpOnly cookies approach, or do you prefer session-based auth?

5. **Live Stripe Integration**: Using Stripe test mode for demo. Do you want to see real payment flow in action?

6. **Performance Targets**: p95 < 200ms is aggressive. Are these the right targets for MVP?

Please approve, request revisions, or reject with feedback.

---

**AI Confidence Rationale**: 0.85 confidence based on:
- ✅ Clear API design following industry standards (RESTful conventions)
- ✅ Well-defined integration strategy with timeline justification
- ✅ Proven patterns (JWT, NestJS, OpenAPI) reduce risk
- ⚠️ Some uncertainty around exact number of endpoints needed (may need 1-2 more)
- ⚠️ Mocking strategy is pragmatic but adds post-MVP migration risk

**Human review required**: YES (High priority + impacts all frontend/backend development)
