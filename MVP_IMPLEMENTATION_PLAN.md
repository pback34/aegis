# MVP Implementation Plan - Aegis (Security Uber Platform)

## Overview
This document outlines the phased approach to building the Minimum Viable Product (MVP) for Aegis, an on-demand security services platform. The implementation is divided into three main phases, each building upon the previous one.

## Phase 1: Foundation & Infrastructure (Weeks 1-3)

### Objectives
- Set up development environment and infrastructure
- Establish database schema and core models
- Configure CI/CD pipelines
- Set up monitoring and logging infrastructure

### Deliverables
1. **Infrastructure Setup**
   - [ ] AWS account setup with proper IAM roles
   - [ ] VPC configuration with public/private subnets
   - [ ] RDS PostgreSQL instance (with PostGIS extension)
   - [ ] ElastiCache Redis cluster
   - [ ] S3 buckets for file storage
   - [ ] CloudFront CDN configuration

2. **Development Environment**
   - [ ] GitHub repository structure
   - [ ] Docker compose for local development
   - [ ] Environment configuration (.env templates)
   - [ ] Code formatting and linting setup (ESLint, Prettier)

3. **Database Schema**
   - [ ] Users table (customers and guards)
   - [ ] Profiles table (guard profiles with certifications)
   - [ ] Bookings table
   - [ ] Locations table (with PostGIS geometry)
   - [ ] Payments table
   - [ ] Ratings and reviews tables
   - [ ] Prisma schema definition and migrations

4. **CI/CD Pipeline**
   - [ ] GitHub Actions workflows for testing
   - [ ] Docker image building and pushing
   - [ ] Deployment to staging environment
   - [ ] Automated database migrations

5. **Monitoring Setup**
   - [ ] Datadog integration for APM
   - [ ] Winston logger configuration
   - [ ] Error tracking with Sentry
   - [ ] Health check endpoints

### Technology Decisions
- **Backend**: Node.js with NestJS framework
- **Database**: PostgreSQL 15 with PostGIS
- **Cache**: Redis 7.x
- **ORM**: Prisma
- **Container**: Docker + Kubernetes (EKS)

---

## Phase 2: Core APIs & Authentication (Weeks 4-6)

### Objectives
- Implement user authentication and authorization
- Build core API endpoints for users and bookings
- Create basic admin dashboard
- Implement payment processing foundation

### Deliverables
1. **Authentication Service**
   - [ ] User registration (customers and guards)
   - [ ] Email/phone verification
   - [ ] JWT-based authentication with refresh tokens
   - [ ] Password reset functionality
   - [ ] OAuth 2.0 integration (Google, Apple)
   - [ ] Auth0 or AWS Cognito integration

2. **User Management APIs**
   - [ ] GET /api/v1/users/me (get current user profile)
   - [ ] PUT /api/v1/users/me (update profile)
   - [ ] POST /api/v1/users/guards/register (guard registration)
   - [ ] GET /api/v1/guards/:id (get guard profile)
   - [ ] PUT /api/v1/guards/:id (update guard profile)

3. **Guard Onboarding**
   - [ ] Document upload (license, certifications)
   - [ ] Background check integration (Checkr API)
   - [ ] Approval workflow
   - [ ] Guard status management (pending, approved, suspended)

4. **Basic Booking APIs**
   - [ ] POST /api/v1/bookings (create booking request)
   - [ ] GET /api/v1/bookings (list bookings)
   - [ ] GET /api/v1/bookings/:id (get booking details)
   - [ ] PUT /api/v1/bookings/:id/cancel (cancel booking)
   - [ ] Booking status enum (requested, matched, confirmed, in_progress, completed, cancelled)

5. **Payment Foundation**
   - [ ] Stripe Connect integration
   - [ ] Customer payment method storage
   - [ ] Guard connected account creation
   - [ ] Payment intent creation (hold funds)
   - [ ] Basic pricing calculator

6. **Admin Dashboard (Next.js)**
   - [ ] Admin authentication
   - [ ] User management interface
   - [ ] Guard approval interface
   - [ ] Booking overview dashboard
   - [ ] Basic analytics (total users, bookings, revenue)

### API Documentation
- [ ] OpenAPI/Swagger documentation
- [ ] API versioning strategy
- [ ] Rate limiting implementation
- [ ] CORS configuration

---

## Phase 3: Core Services & Matching Logic (Weeks 7-10) ⭐ CURRENT PHASE

### Objectives
- Implement intelligent guard matching algorithm
- Build real-time location tracking
- Create notification and messaging services
- Develop mobile app foundations
- Implement booking lifecycle management

### Deliverables

#### 1. Matching Service (Core Algorithm)
**File Structure:**
```
src/
├── services/
│   ├── matching/
│   │   ├── matching.service.ts
│   │   ├── matching.controller.ts
│   │   ├── matching.module.ts
│   │   ├── algorithms/
│   │   │   ├── distance-calculator.ts
│   │   │   ├── skill-matcher.ts
│   │   │   ├── availability-checker.ts
│   │   │   └── scoring-algorithm.ts
│   │   └── dto/
│   │       ├── match-request.dto.ts
│   │       └── match-response.dto.ts
```

**Implementation Tasks:**
- [x] Create matching service module with NestJS
- [x] Implement geospatial indexing with H3 hexagonal grid
- [x] Distance calculation using Haversine formula
- [x] Guard availability real-time checking (Redis)
- [x] Skill and certification matching
- [x] Rating threshold filtering (minimum 4.0 stars)
- [x] Multi-criteria scoring algorithm:
  - Distance weight: 40%
  - Rating weight: 30%
  - Experience weight: 20%
  - Price weight: 10%
- [x] Matching timeout and fallback logic
- [x] Match result caching (5-minute TTL)

**API Endpoints:**
```typescript
POST   /api/v1/matching/find-guards
  Body: {
    location: { lat: number, lng: number },
    serviceType: string,
    requiredSkills: string[],
    startTime: ISO8601,
    duration: number (hours),
    maxDistance: number (km)
  }
  Response: {
    matches: Array<{
      guardId: string,
      distance: number,
      rating: number,
      estimatedArrival: number (minutes),
      hourlyRate: number,
      matchScore: number
    }>
  }

POST   /api/v1/matching/request-guard
  Body: {
    bookingId: string,
    guardId: string
  }
  Response: {
    status: 'pending' | 'accepted' | 'declined',
    expiresAt: ISO8601
  }
```

#### 2. Location Service
**File Structure:**
```
src/
├── services/
│   ├── location/
│   │   ├── location.service.ts
│   │   ├── location.gateway.ts  (WebSocket)
│   │   ├── location.module.ts
│   │   └── dto/
│   │       └── location-update.dto.ts
```

**Implementation Tasks:**
- [x] Real-time location tracking with Socket.io
- [x] Redis Geo commands for spatial queries
- [x] Location history storage (TimescaleDB)
- [x] Geofencing for arrival/departure detection
- [x] ETA calculation and updates
- [x] Privacy controls (location sharing permissions)

**WebSocket Events:**
```typescript
// Client -> Server
'location:update': {
  guardId: string,
  latitude: number,
  longitude: number,
  accuracy: number,
  heading: number,
  speed: number,
  timestamp: ISO8601
}

// Server -> Client
'location:guard-position': {
  guardId: string,
  latitude: number,
  longitude: number,
  eta: number (minutes)
}

'location:guard-arrived': {
  guardId: string,
  bookingId: string
}
```

**Redis Implementation:**
```typescript
// Store guard location
GEOADD guards:available {longitude} {latitude} {guardId}

// Find nearby guards (5km radius)
GEORADIUS guards:available {longitude} {latitude} 5 km WITHDIST ASC

// Remove guard from available pool
ZREM guards:available {guardId}
```

#### 3. Notification Service
**File Structure:**
```
src/
├── services/
│   ├── notification/
│   │   ├── notification.service.ts
│   │   ├── notification.module.ts
│   │   ├── providers/
│   │   │   ├── fcm.provider.ts (Firebase Cloud Messaging)
│   │   │   ├── apns.provider.ts (Apple Push)
│   │   │   ├── sms.provider.ts (Twilio)
│   │   │   └── email.provider.ts (SendGrid)
│   │   └── templates/
│   │       ├── booking-confirmed.ts
│   │       ├── guard-matched.ts
│   │       ├── guard-arriving.ts
│   │       └── booking-completed.ts
```

**Implementation Tasks:**
- [x] Firebase Cloud Messaging integration
- [x] Push notification service
- [x] SMS notifications via Twilio
- [x] Email notifications via SendGrid
- [x] Notification preferences management
- [x] Template system for notifications
- [x] Notification history and read receipts

**Notification Types:**
```typescript
enum NotificationType {
  BOOKING_REQUESTED = 'booking_requested',
  GUARD_MATCHED = 'guard_matched',
  GUARD_ACCEPTED = 'guard_accepted',
  GUARD_DECLINED = 'guard_declined',
  GUARD_ARRIVING = 'guard_arriving',
  GUARD_ARRIVED = 'guard_arrived',
  BOOKING_STARTED = 'booking_started',
  BOOKING_COMPLETED = 'booking_completed',
  PAYMENT_PROCESSED = 'payment_processed',
  RATING_REQUEST = 'rating_request'
}
```

#### 4. Messaging Service
**File Structure:**
```
src/
├── services/
│   ├── messaging/
│   │   ├── messaging.service.ts
│   │   ├── messaging.gateway.ts
│   │   ├── messaging.module.ts
│   │   └── dto/
│   │       ├── send-message.dto.ts
│   │       └── message.dto.ts
```

**Implementation Tasks:**
- [x] Real-time chat using Socket.io
- [x] Message persistence in PostgreSQL
- [x] File/image sharing (S3 upload)
- [x] Message read receipts
- [x] Typing indicators
- [x] Conversation history
- [x] Emergency message flag

**WebSocket Events:**
```typescript
// Send message
'message:send': {
  conversationId: string,
  senderId: string,
  content: string,
  type: 'text' | 'image' | 'location' | 'emergency'
}

// Receive message
'message:received': {
  messageId: string,
  conversationId: string,
  sender: { id: string, name: string, avatar: string },
  content: string,
  timestamp: ISO8601
}

// Typing indicator
'message:typing': {
  conversationId: string,
  userId: string,
  isTyping: boolean
}
```

#### 5. Booking Lifecycle Management
**File Structure:**
```
src/
├── services/
│   ├── booking/
│   │   ├── booking.service.ts
│   │   ├── booking.controller.ts
│   │   ├── booking.module.ts
│   │   ├── state-machine/
│   │   │   ├── booking-state.machine.ts
│   │   │   └── transitions.ts
│   │   └── dto/
│   │       ├── create-booking.dto.ts
│   │       ├── update-booking.dto.ts
│   │       └── booking-response.dto.ts
```

**State Machine Implementation:**
```typescript
enum BookingStatus {
  REQUESTED = 'requested',           // Customer creates request
  SEARCHING = 'searching',           // System finding guards
  MATCHED = 'matched',               // Guard found, awaiting acceptance
  CONFIRMED = 'confirmed',           // Guard accepted
  GUARD_EN_ROUTE = 'guard_en_route', // Guard traveling to location
  GUARD_ARRIVED = 'guard_arrived',   // Guard checked in at location
  IN_PROGRESS = 'in_progress',       // Service active
  COMPLETED = 'completed',           // Service finished
  CANCELLED = 'cancelled',           // Cancelled by customer/guard
  EXPIRED = 'expired'                // No guard found/accepted
}

// Valid transitions
const transitions = {
  REQUESTED -> SEARCHING
  SEARCHING -> MATCHED | EXPIRED
  MATCHED -> CONFIRMED | CANCELLED | EXPIRED
  CONFIRMED -> GUARD_EN_ROUTE | CANCELLED
  GUARD_EN_ROUTE -> GUARD_ARRIVED | CANCELLED
  GUARD_ARRIVED -> IN_PROGRESS
  IN_PROGRESS -> COMPLETED | CANCELLED
}
```

**Implementation Tasks:**
- [x] State machine for booking lifecycle
- [x] Automatic state transitions based on events
- [x] Timeout handling (match expiry: 2 minutes)
- [x] Guard acceptance window (30 seconds)
- [x] Check-in/check-out system
- [x] Service duration tracking
- [x] Overtime calculation
- [x] Cancellation policies and fees

**API Endpoints:**
```typescript
PUT /api/v1/bookings/:id/accept        // Guard accepts booking
PUT /api/v1/bookings/:id/decline       // Guard declines booking
PUT /api/v1/bookings/:id/start         // Guard starts service
PUT /api/v1/bookings/:id/complete      // Guard completes service
PUT /api/v1/bookings/:id/cancel        // Cancel booking
GET /api/v1/bookings/:id/timeline      // Get booking event timeline
```

#### 6. Rating & Review Service
**File Structure:**
```
src/
├── services/
│   ├── rating/
│   │   ├── rating.service.ts
│   │   ├── rating.controller.ts
│   │   ├── rating.module.ts
│   │   └── dto/
│   │       ├── create-rating.dto.ts
│   │       └── rating-response.dto.ts
```

**Implementation Tasks:**
- [x] Two-way rating system (customer rates guard, guard rates customer)
- [x] 5-star rating with written review
- [x] Rating aggregation and average calculation
- [x] Guard performance metrics
- [x] Review moderation flags
- [x] Rating impact on matching score

**API Endpoints:**
```typescript
POST /api/v1/bookings/:id/rate
  Body: {
    rating: number (1-5),
    review: string,
    tags: string[] (optional: ['professional', 'on-time', 'courteous'])
  }

GET /api/v1/guards/:id/ratings
  Query: { page: number, limit: number }
  Response: {
    averageRating: number,
    totalRatings: number,
    ratings: Array<{
      rating: number,
      review: string,
      customerName: string,
      createdAt: ISO8601
    }>
  }
```

#### 7. Event-Driven Architecture with Kafka
**File Structure:**
```
src/
├── events/
│   ├── kafka/
│   │   ├── kafka.module.ts
│   │   ├── producers/
│   │   │   └── booking.producer.ts
│   │   ├── consumers/
│   │   │   ├── booking.consumer.ts
│   │   │   ├── notification.consumer.ts
│   │   │   └── analytics.consumer.ts
│   │   └── schemas/
│   │       ├── booking-events.schema.ts
│   │       └── location-events.schema.ts
```

**Event Types:**
```typescript
// Booking Events
topic: 'booking-events'
events: [
  'BOOKING_CREATED',
  'BOOKING_MATCHED',
  'BOOKING_CONFIRMED',
  'BOOKING_STARTED',
  'BOOKING_COMPLETED',
  'BOOKING_CANCELLED'
]

// Location Events
topic: 'location-events'
events: [
  'LOCATION_UPDATED',
  'GUARD_ARRIVED',
  'GEOFENCE_ENTERED',
  'GEOFENCE_EXITED'
]

// Notification Events
topic: 'notification-events'
events: [
  'SEND_PUSH',
  'SEND_SMS',
  'SEND_EMAIL'
]
```

**Implementation Tasks:**
- [x] Kafka cluster setup (3 brokers)
- [x] Event producers for each service
- [x] Event consumers with retry logic
- [x] Dead letter queue for failed events
- [x] Event schema validation
- [x] Event replay capability

#### 8. Mobile App Foundation (React Native)
**File Structure:**
```
mobile/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── customer/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── BookingRequestScreen.tsx
│   │   │   ├── BookingTrackingScreen.tsx
│   │   │   └── BookingHistoryScreen.tsx
│   │   └── guard/
│   │       ├── GuardHomeScreen.tsx
│   │       ├── IncomingRequestScreen.tsx
│   │       ├── ActiveBookingScreen.tsx
│   │       └── EarningsScreen.tsx
│   ├── components/
│   │   ├── MapView.tsx
│   │   ├── GuardCard.tsx
│   │   ├── BookingCard.tsx
│   │   └── ChatInterface.tsx
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── websocket.service.ts
│   │   ├── location.service.ts
│   │   └── notification.service.ts
│   ├── store/
│   │   ├── slices/
│   │   │   ├── auth.slice.ts
│   │   │   ├── booking.slice.ts
│   │   │   └── location.slice.ts
│   │   └── store.ts
│   └── navigation/
│       ├── AppNavigator.tsx
│       ├── CustomerStack.tsx
│       └── GuardStack.tsx
```

**Implementation Tasks:**
- [x] Project setup with React Native CLI
- [x] Navigation structure (React Navigation)
- [x] Redux Toolkit for state management
- [x] MapBox integration for maps
- [x] Real-time location tracking (background)
- [x] WebSocket connection management
- [x] Push notification handling
- [x] Offline support with React Query
- [x] Customer booking flow screens
- [x] Guard job acceptance flow screens

#### 9. Testing & Quality Assurance
**Test Coverage Goals:**
- Unit tests: >80% coverage
- Integration tests: All API endpoints
- E2E tests: Critical user flows

**Implementation Tasks:**
- [x] Jest unit tests for all services
- [x] Supertest for API integration tests
- [x] Matching algorithm test scenarios
- [x] Location tracking simulation tests
- [x] WebSocket connection tests
- [x] State machine transition tests
- [x] Load testing with k6 (1000 concurrent users)
- [x] Mock external services (Stripe, Twilio, FCM)

### Performance Targets
- **API Response Time**: p95 < 200ms
- **Match Finding**: < 3 seconds
- **WebSocket Latency**: < 100ms
- **Location Update Frequency**: Every 10 seconds
- **Database Query Time**: < 50ms

### Dependencies & Integration
- **Stripe Connect**: Payment processing
- **Twilio**: SMS and voice
- **SendGrid**: Email delivery
- **Firebase**: Push notifications
- **MapBox**: Maps and geocoding
- **H3**: Geospatial indexing
- **Checkr**: Background checks (from Phase 2)

---

## Phase 4: Advanced Features & Launch Preparation (Weeks 11-14)

### Objectives
- Implement advanced features (surge pricing, scheduled bookings)
- Complete admin dashboard
- Security hardening and penetration testing
- Performance optimization
- Beta testing program

### Deliverables
1. **Advanced Booking Features**
   - [ ] Scheduled bookings (book in advance)
   - [ ] Recurring bookings (weekly security)
   - [ ] Multi-guard bookings
   - [ ] Service packages (4hr, 8hr, 12hr)
   - [ ] Surge pricing algorithm
   - [ ] Corporate accounts with invoicing

2. **Analytics & Reporting**
   - [ ] Customer analytics dashboard
   - [ ] Guard performance metrics
   - [ ] Revenue reporting
   - [ ] Utilization rates
   - [ ] Heat maps for demand
   - [ ] Predictive analytics for supply/demand

3. **Compliance & Safety**
   - [ ] Incident reporting system
   - [ ] Emergency SOS button
   - [ ] Automated compliance checks
   - [ ] Insurance certificate management
   - [ ] Audit trail for all actions

4. **Admin Dashboard Completion**
   - [ ] Real-time booking monitoring
   - [ ] Guard fleet management
   - [ ] Customer support tickets
   - [ ] Financial reconciliation
   - [ ] Marketing campaign management
   - [ ] Geographic expansion tools

5. **Security & Compliance**
   - [ ] Penetration testing
   - [ ] OWASP Top 10 vulnerability scan
   - [ ] Data encryption audit
   - [ ] GDPR compliance review
   - [ ] SOC 2 preparation
   - [ ] Bug bounty program setup

6. **Performance Optimization**
   - [ ] Database query optimization
   - [ ] CDN configuration for static assets
   - [ ] Redis caching strategy review
   - [ ] API response compression
   - [ ] Image optimization
   - [ ] Lazy loading implementation

7. **Beta Testing**
   - [ ] Recruit 50 beta customers
   - [ ] Onboard 20 beta guards
   - [ ] Structured feedback collection
   - [ ] Bug tracking and prioritization
   - [ ] User acceptance testing (UAT)
   - [ ] Performance monitoring in production

---

## Success Metrics for MVP

### Technical Metrics
- **Uptime**: 99.9% availability
- **API Performance**: p95 response time < 200ms
- **Match Success Rate**: >90% of requests matched within 5 minutes
- **Location Accuracy**: <50m average error
- **Push Delivery**: >95% delivery rate
- **Zero critical security vulnerabilities**

### Business Metrics
- **User Acquisition**: 100 active customers, 50 active guards
- **Booking Completion**: >85% of confirmed bookings completed
- **Guard Utilization**: >20 hours/week average
- **Customer Retention**: >60% book again within 30 days
- **Average Rating**: >4.5 stars for guards
- **Revenue**: $50K GMV in first month

### User Experience
- **App Store Rating**: Target 4.5+ stars
- **Booking Time**: <2 minutes from request to match
- **Customer Support**: <5 minute response time
- **Guard Response Rate**: >80% accept rate for matched requests

---

## Technology Stack Summary

### Backend
- **Runtime**: Node.js 20.x with TypeScript 5.x
- **Framework**: NestJS 10.x
- **API**: REST + GraphQL (Apollo)
- **Database**: PostgreSQL 15 + PostGIS
- **Cache**: Redis 7.x
- **Message Queue**: Apache Kafka / AWS Kinesis
- **ORM**: Prisma 5.x
- **Real-time**: Socket.io

### Frontend
- **Mobile**: React Native 0.72.x
- **Web Dashboard**: Next.js 14.x
- **State Management**: Redux Toolkit + React Query
- **UI Components**: React Native Paper / shadcn/ui

### Infrastructure
- **Cloud**: AWS (ECS/EKS, RDS, ElastiCache, S3)
- **Container**: Docker + Kubernetes
- **CI/CD**: GitHub Actions + ArgoCD
- **Monitoring**: Datadog, Sentry
- **CDN**: CloudFront

### Third-Party Services
- **Auth**: Auth0
- **Payments**: Stripe Connect
- **Maps**: MapBox
- **SMS**: Twilio
- **Email**: SendGrid
- **Push**: Firebase Cloud Messaging
- **Background Checks**: Checkr

---

## Risk Mitigation

### Technical Risks
- **Scaling Issues**: Horizontal scaling from day 1, load testing
- **Location Accuracy**: Fallback to IP geolocation, calibration
- **WebSocket Stability**: Reconnection logic, fallback to polling
- **Payment Failures**: Retry logic, manual reconciliation

### Business Risks
- **Guard Supply**: Referral bonuses, competitive rates
- **Customer Acquisition**: Targeted marketing, partnerships
- **Regulatory Compliance**: Legal review, state-by-state rollout
- **Trust & Safety**: Thorough vetting, insurance, incident response

---

## Next Steps After MVP

### Phase 5: Scale & Expansion
- Multi-market geographic expansion
- Advanced ML for demand prediction
- Guard training platform
- Equipment marketplace
- White-label solutions for enterprises

### Phase 6: Ecosystem
- Partner integrations (event venues, property managers)
- Public API for third-party developers
- Guard certification programs
- Insurance products
- Industry analytics platform

---

## Conclusion

This MVP implementation plan provides a clear roadmap to building a production-ready security services marketplace. Phase 3 focuses on the core matching logic, real-time capabilities, and foundational mobile experience that will differentiate Aegis in the market.

**Phase 3 is currently in progress. Refer to TODO.md for specific implementation tasks.**
