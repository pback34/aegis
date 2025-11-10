# Aegis Platform - System Architecture Document

**Document Version**: 1.0
**Created**: 2025-11-10
**Author**: AI:ArtifactCreator
**Decision References**: D-1, D-2, D-3, D-4, D-5
**Research References**: Q-3, Q-6, Q-7, Q-8, Q-10, Q-11

---

## 1. Executive Summary

This document describes the system architecture for **Aegis**, an on-demand security guard marketplace platform connecting customers with certified security professionals. The platform implements a modern, scalable architecture using Node.js, React Native, PostgreSQL with PostGIS, and best-in-class third-party integrations.

**Architecture Principles**:
- **Mobile-First**: React Native apps for iOS and Android with offline support
- **Real-Time**: Live location tracking and job updates via Ably
- **Secure by Design**: JWT authentication, RBAC, comprehensive audit logging
- **Scalable**: Microservices-ready modular monolith with horizontal scaling capability
- **API-Driven**: RESTful API with OpenAPI documentation

---

## 2. C4 Model Architecture Diagrams

### 2.1 System Context Diagram (C4 Level 1)

Shows Aegis in the context of users and external systems.

```mermaid
C4Context
    title System Context Diagram - Aegis Platform

    Person(customer, "Customer", "Individual or business needing security services")
    Person(guard, "Security Guard", "Licensed security professional providing services")
    Person(admin, "Administrator", "Platform operator managing users and operations")

    System(aegis, "Aegis Platform", "On-demand security guard marketplace connecting customers with licensed guards")

    System_Ext(stripe, "Stripe Connect", "Payment processing, escrow, split payments")
    System_Ext(checkr, "Checkr", "Background check service for guard verification")
    System_Ext(mapbox, "Mapbox", "Mapping, geocoding, routing services")
    System_Ext(ably, "Ably", "Real-time messaging and presence")
    System_Ext(twilio, "Twilio", "SMS notifications")
    System_Ext(aws, "AWS", "Cloud infrastructure (RDS, ECS, S3, CloudFront)")

    Rel(customer, aegis, "Creates job requests, tracks guards, makes payments", "HTTPS")
    Rel(guard, aegis, "Accepts jobs, shares location, completes services", "HTTPS/WebSocket")
    Rel(admin, aegis, "Manages users, monitors jobs, handles support", "HTTPS")

    Rel(aegis, stripe, "Processes payments", "HTTPS API")
    Rel(aegis, checkr, "Verifies guard backgrounds", "HTTPS API")
    Rel(aegis, mapbox, "Geocodes addresses, displays maps", "HTTPS API")
    Rel(aegis, ably, "Broadcasts real-time updates", "HTTPS/WebSocket")
    Rel(aegis, twilio, "Sends SMS notifications", "HTTPS API")
    Rel(aegis, aws, "Hosts infrastructure", "AWS SDK")
```

### 2.2 Container Diagram (C4 Level 2)

Shows the high-level architecture with containers (applications and data stores).

```mermaid
C4Container
    title Container Diagram - Aegis Platform

    Person(customer, "Customer", "Mobile/Web User")
    Person(guard, "Guard", "Mobile User")
    Person(admin, "Admin", "Web User")

    Container(webapp, "Web Application", "Next.js 14, React 18", "Customer and admin web interface")
    Container(mobileCustomer, "Customer Mobile App", "React Native, Expo", "iOS/Android app for customers")
    Container(mobileGuard, "Guard Mobile App", "React Native, Expo", "iOS/Android app for guards")

    Container(api, "Backend API", "NestJS, TypeScript", "REST API handling all business logic")
    ContainerDb(db, "Database", "PostgreSQL 15 + PostGIS", "Stores users, jobs, payments, locations")
    ContainerDb(cache, "Cache & Session Store", "Redis 7", "Caches queries, stores sessions, token blacklist")

    System_Ext(stripe, "Stripe Connect", "Payment processing")
    System_Ext(ably, "Ably", "Real-time messaging")
    System_Ext(mapbox, "Mapbox", "Maps & geocoding")
    System_Ext(checkr, "Checkr", "Background checks")

    Rel(customer, webapp, "Uses", "HTTPS")
    Rel(customer, mobileCustomer, "Uses", "HTTPS")
    Rel(guard, mobileGuard, "Uses", "HTTPS/WebSocket")
    Rel(admin, webapp, "Uses", "HTTPS")

    Rel(webapp, api, "Makes API calls", "HTTPS/JSON")
    Rel(mobileCustomer, api, "Makes API calls", "HTTPS/JSON")
    Rel(mobileGuard, api, "Makes API calls", "HTTPS/JSON")

    Rel(api, db, "Reads/Writes", "TCP/SQL")
    Rel(api, cache, "Reads/Writes", "TCP/Redis Protocol")

    Rel(api, stripe, "Processes payments", "HTTPS")
    Rel(api, ably, "Publishes events", "HTTPS")
    Rel(api, mapbox, "Geocodes, routes", "HTTPS")
    Rel(api, checkr, "Verifies guards", "HTTPS")

    Rel(mobileGuard, ably, "Subscribes to channels", "WebSocket")
    Rel(mobileCustomer, ably, "Subscribes to channels", "WebSocket")
```

### 2.3 Component Diagram - Backend API (C4 Level 3)

Shows the internal structure of the Backend API container.

```mermaid
C4Component
    title Component Diagram - Backend API (NestJS)

    Container(webapp, "Web App", "Next.js")
    Container(mobile, "Mobile Apps", "React Native")

    Component(authModule, "Auth Module", "NestJS Module", "JWT authentication, MFA, token management")
    Component(usersModule, "Users Module", "NestJS Module", "User management, profiles")
    Component(jobsModule, "Jobs Module", "NestJS Module", "Job creation, lifecycle, status management")
    Component(matchingModule, "Matching Module", "NestJS Module", "Guard-to-job matching algorithm")
    Component(locationsModule, "Locations Module", "NestJS Module", "GPS tracking, location history")
    Component(paymentsModule, "Payments Module", "NestJS Module", "Stripe integration, payment processing")
    Component(guardsModule, "Guards Module", "NestJS Module", "Guard profiles, availability, skills")
    Component(adminModule, "Admin Module", "NestJS Module", "Dashboard, monitoring, overrides")
    Component(notificationsModule, "Notifications Module", "NestJS Module", "Push, SMS, real-time notifications")

    Component(securityMiddleware, "Security Middleware", "Middleware Stack", "Rate limiting, CORS, helmet, validation")
    Component(auditInterceptor, "Audit Interceptor", "Interceptor", "Logs sensitive operations")

    ContainerDb(db, "PostgreSQL + PostGIS", "Database")
    ContainerDb(redis, "Redis", "Cache")

    Rel(webapp, authModule, "Login, register", "HTTPS")
    Rel(mobile, authModule, "Login, register", "HTTPS")

    Rel(mobile, jobsModule, "Create/view jobs", "HTTPS")
    Rel(mobile, guardsModule, "Manage profile", "HTTPS")
    Rel(mobile, locationsModule, "Update location", "HTTPS")
    Rel(mobile, paymentsModule, "View payments", "HTTPS")

    Rel(authModule, usersModule, "User lookup")
    Rel(jobsModule, matchingModule, "Find guards")
    Rel(jobsModule, notificationsModule, "Notify guards")
    Rel(matchingModule, guardsModule, "Query available guards")
    Rel(paymentsModule, jobsModule, "Link payment to job")

    Rel(authModule, db, "User auth queries")
    Rel(jobsModule, db, "Job CRUD")
    Rel(guardsModule, db, "Guard profiles")
    Rel(locationsModule, db, "Location tracking")
    Rel(paymentsModule, db, "Payment records")

    Rel(authModule, redis, "Token blacklist")
    Rel(jobsModule, redis, "Cache active jobs")
    Rel(guardsModule, redis, "Cache availability")

    Rel(securityMiddleware, authModule, "Validates tokens")
    Rel(auditInterceptor, db, "Logs events")
```

---

## 3. Technology Stack

### 3.1 Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Web App** | Next.js | 14+ | Customer and admin web interface with SSR |
| | React | 18+ | UI framework |
| | Tailwind CSS | 3.x | Utility-first CSS |
| | shadcn/ui | Latest | Component library |
| | TypeScript | 5.x | Type safety |
| **Mobile Apps** | React Native | 0.73+ | iOS and Android apps |
| | Expo | Latest | Managed workflow, OTA updates |
| | expo-location | Latest | GPS tracking |
| | WatermelonDB | Latest | Offline-first local database |
| | Ably SDK | Latest | Real-time updates |
| | Redux Toolkit | Latest | State management |

### 3.2 Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **API Framework** | NestJS | 10+ | Backend API framework |
| | Node.js | 20 LTS | Runtime |
| | TypeScript | 5.x | Type safety |
| **Database** | PostgreSQL | 15+ | Primary database |
| | PostGIS | 3.x | Geospatial queries |
| | TypeORM | 0.3+ | ORM and migrations |
| **Cache** | Redis | 7+ | Session store, caching, queue |
| **Authentication** | Passport.js | Latest | Auth strategies |
| | JWT | Latest | Token-based auth |
| | bcrypt | 5.x | Password hashing |
| | speakeasy | 2.x | MFA (TOTP) |

### 3.3 Third-Party Services

| Service | Purpose | Tier/Cost |
|---------|---------|-----------|
| **Stripe Connect** | Payment processing, escrow, payouts | 2.9% + $0.30/transaction |
| **Checkr** | Background checks (MVP: mocked) | $50-80/check |
| **Mapbox** | Maps, geocoding, routing | Free: 50K loads/month |
| **Ably** | Real-time messaging, presence | Free: 3M messages/month |
| **Twilio** | SMS notifications (MVP: mocked) | $0.0079/SMS |
| **AWS** | Infrastructure (RDS, ECS, S3, CloudFront) | ~$500-1,500/month |

### 3.4 DevOps & Monitoring

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | AWS ECS Fargate | Container orchestration |
| **Database** | AWS RDS PostgreSQL | Managed database |
| **Storage** | AWS S3 | File storage, backups |
| **CDN** | AWS CloudFront | Asset delivery |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Monitoring** | Datadog | Infrastructure, APM, logs |
| **Error Tracking** | Sentry | Application error tracking |

---

## 4. Data Flow Diagrams

### 4.1 Job Creation & Matching Flow

```mermaid
sequenceDiagram
    actor Customer
    participant WebApp as Web/Mobile App
    participant API as Backend API
    participant Matching as Matching Service
    participant DB as PostgreSQL
    participant Ably as Ably (Real-time)
    actor Guard

    Customer->>WebApp: Create job request
    WebApp->>API: POST /api/jobs
    API->>DB: Insert job (status=requested)
    API->>Matching: Trigger matching algorithm

    Matching->>DB: Query available guards<br/>(PostGIS: within 15 miles)
    DB-->>Matching: Return matching guards

    Matching->>Matching: Score guards<br/>(proximity, skills, rating)
    Matching->>DB: Update job (status=matched, guard_id)
    Matching->>Ably: Publish to guard channel

    Ably-->>Guard: Push notification<br/>"New job offer"
    API-->>WebApp: Return job details
    WebApp-->>Customer: Show "Finding guard..."

    Guard->>API: PATCH /api/jobs/:id/accept
    API->>DB: Update job (status=accepted)
    API->>Ably: Publish to customer channel
    Ably-->>WebApp: "Guard accepted!"
    WebApp-->>Customer: Show guard details
```

### 4.2 Real-time Location Tracking Flow

```mermaid
sequenceDiagram
    actor Guard
    participant GuardApp as Guard Mobile App
    participant API as Backend API
    participant DB as PostgreSQL
    participant Ably as Ably (Real-time)
    participant CustomerApp as Customer App
    actor Customer

    Guard->>GuardApp: Start job (check-in)
    GuardApp->>API: PATCH /api/jobs/:id/start
    API->>DB: Update job (status=in_progress)

    loop Every 30 seconds
        GuardApp->>GuardApp: Get GPS location
        GuardApp->>API: POST /api/jobs/:id/location
        API->>DB: Insert location_history
        API->>DB: Update jobs.tracking_points (last 50)
        API->>Ably: Publish location update
        Ably-->>CustomerApp: Real-time location
        CustomerApp->>CustomerApp: Update guard marker on map
    end

    Guard->>GuardApp: Complete job (check-out)
    GuardApp->>API: PATCH /api/jobs/:id/complete
    API->>DB: Update job (status=completed)
    API->>Ably: Publish "Job completed"
    Ably-->>CustomerApp: "Guard checked out"
    CustomerApp-->>Customer: Show completion screen
```

### 4.3 Payment Processing Flow

```mermaid
sequenceDiagram
    actor Customer
    participant WebApp as Web/Mobile App
    participant API as Backend API
    participant Stripe as Stripe Connect
    participant DB as PostgreSQL
    actor Guard

    Customer->>WebApp: Create job
    WebApp->>API: POST /api/jobs
    API->>Stripe: Create payment intent
    Stripe-->>API: Return payment_intent_id
    API->>DB: Store payment (status=pending)
    API-->>WebApp: Return job + payment_intent

    WebApp->>Stripe: Authorize payment<br/>(confirm payment intent)
    Stripe-->>WebApp: Payment authorized
    WebApp->>API: Job accepted by guard
    API->>DB: Update payment (status=authorized)

    Note over Guard: Guard completes job

    Guard->>API: PATCH /api/jobs/:id/complete
    API->>Stripe: Capture payment intent
    Stripe-->>API: Payment captured
    API->>DB: Update payment (status=captured)

    Note over API: 24-hour hold period

    API->>Stripe: Create transfer to guard
    Stripe-->>API: Transfer successful
    API->>DB: Update payment (guard_payout completed)
    API-->>Guard: Notification: "Payment received"
```

---

## 5. Deployment Architecture

### 5.1 AWS Infrastructure Diagram

```mermaid
graph TB
    subgraph Internet
        Users[Users<br/>Web/Mobile]
    end

    subgraph AWS
        subgraph CloudFront CDN
            CF[CloudFront<br/>Asset Delivery]
        end

        subgraph Application Load Balancer
            ALB[ALB<br/>HTTPS Termination]
        end

        subgraph ECS Fargate Cluster
            API1[API Container 1<br/>NestJS]
            API2[API Container 2<br/>NestJS]
            API3[API Container 3<br/>NestJS]
        end

        subgraph Data Layer
            RDS[(RDS PostgreSQL<br/>Primary)]
            RDSRead[(RDS Read Replica)]
            Redis[(ElastiCache Redis<br/>Session/Cache)]
        end

        subgraph Storage
            S3[S3 Bucket<br/>Files/Backups]
        end
    end

    subgraph External Services
        Stripe[Stripe Connect]
        Ably[Ably Real-time]
        Mapbox[Mapbox]
    end

    Users -->|HTTPS| CF
    CF --> ALB
    ALB --> API1
    ALB --> API2
    ALB --> API3

    API1 --> RDS
    API2 --> RDS
    API3 --> RDS

    API1 --> RDSRead
    API2 --> RDSRead
    API3 --> RDSRead

    API1 --> Redis
    API2 --> Redis
    API3 --> Redis

    API1 --> S3
    API2 --> S3
    API3 --> S3

    API1 --> Stripe
    API1 --> Ably
    API1 --> Mapbox

    Users -->|WebSocket| Ably
```

### 5.2 Environment Configuration

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Development** | Local development | Local PostgreSQL, Redis, Node.js |
| **Staging** | Pre-production testing | AWS ECS (1 container), RDS (db.t3.medium), Redis (cache.t3.micro) |
| **Production** | Live platform | AWS ECS (3+ containers), RDS (db.t3.large + read replica), Redis (cache.t3.small) HA |

---

## 6. Security Architecture

### 6.1 Security Layers

```mermaid
graph TB
    subgraph External Layer
        WAF[AWS WAF<br/>DDoS Protection]
        CF[CloudFront<br/>SSL/TLS Termination]
    end

    subgraph Network Layer
        ALB[Application Load Balancer<br/>HTTPS Only]
        SG[Security Groups<br/>Port 443, 5432, 6379]
    end

    subgraph Application Layer
        RL[Rate Limiting<br/>Throttler]
        CORS[CORS<br/>Allowed Origins]
        Helmet[Helmet<br/>Security Headers]
        Auth[JWT Auth<br/>15-min tokens]
        RBAC[RBAC Guards<br/>Role validation]
        Validation[Input Validation<br/>DTOs]
    end

    subgraph Data Layer
        Encrypt[Field Encryption<br/>AES-256 for MFA secrets]
        Audit[Audit Logging<br/>All auth events]
        Backup[Encrypted Backups<br/>7-day retention]
    end

    WAF --> CF
    CF --> ALB
    ALB --> SG
    SG --> RL
    RL --> CORS
    CORS --> Helmet
    Helmet --> Auth
    Auth --> RBAC
    RBAC --> Validation
    Validation --> Encrypt
    Encrypt --> Audit
    Audit --> Backup
```

### 6.2 Authentication & Authorization Flow

```mermaid
sequenceDiagram
    actor User
    participant Client as Web/Mobile App
    participant API as Backend API
    participant JWT as JWT Service
    participant Redis as Redis (Blacklist)
    participant DB as PostgreSQL

    User->>Client: Login (email, password)
    Client->>API: POST /api/auth/login
    API->>DB: Find user by email
    DB-->>API: User record
    API->>API: Verify password (bcrypt)
    API->>JWT: Generate access token (15min)
    API->>JWT: Generate refresh token (7d)
    API->>Redis: Store refresh token
    API-->>Client: Return tokens + user
    Client->>Client: Store in httpOnly cookie (web)<br/>or Keychain (mobile)

    Note over Client,API: Subsequent authenticated requests

    Client->>API: GET /api/jobs (Authorization: Bearer token)
    API->>JWT: Verify access token
    JWT-->>API: Valid token + payload
    API->>API: Check role permissions (RBAC)
    API->>DB: Query jobs
    DB-->>API: Job records
    API-->>Client: Return filtered jobs

    Note over Client,API: Token refresh

    Client->>API: POST /api/auth/refresh
    API->>JWT: Verify refresh token
    API->>Redis: Check if blacklisted
    Redis-->>API: Not blacklisted
    API->>Redis: Blacklist old refresh token
    API->>JWT: Generate new tokens
    API-->>Client: Return new tokens
```

---

## 7. Data Architecture

### 7.1 Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o| GUARD_PROFILES : "has one"
    USERS ||--o{ JOBS : "creates as customer"
    USERS ||--o{ JOBS : "accepts as guard"
    JOBS ||--|| PAYMENTS : "has one"
    JOBS ||--o{ LOCATION_HISTORY : "has many"
    USERS ||--o| BACKGROUND_CHECKS : "has one"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        enum role
        enum status
        varchar first_name
        varchar last_name
        varchar phone_number
        jsonb profile
        varchar stripe_customer_id
        varchar mfa_secret
        boolean mfa_enabled
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    GUARD_PROFILES {
        uuid id PK
        uuid user_id FK,UK
        varchar license_number
        varchar license_state
        date license_expiry
        jsonb skills
        jsonb certifications
        integer hourly_rate_cents
        enum availability_status
        geography current_location
        text bio
        integer years_experience
        timestamp created_at
        timestamp updated_at
    }

    JOBS {
        uuid id PK
        uuid customer_id FK
        uuid guard_id FK
        enum status
        enum job_type
        text location_address
        geography location_coordinates
        timestamp start_time
        timestamp end_time
        integer duration_hours
        integer hourly_rate_cents
        integer total_amount_cents
        jsonb required_skills
        jsonb tracking_points
        timestamp requested_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    PAYMENTS {
        uuid id PK
        uuid job_id FK,UK
        varchar stripe_payment_intent_id UK
        integer amount_cents
        integer platform_fee_cents
        integer guard_payout_cents
        enum status
        timestamp authorized_at
        timestamp captured_at
        timestamp created_at
    }

    LOCATION_HISTORY {
        uuid id PK
        uuid guard_id FK
        uuid job_id FK
        geography location
        real accuracy_meters
        timestamp recorded_at
        timestamp created_at
    }

    BACKGROUND_CHECKS {
        uuid id PK
        uuid guard_id FK,UK
        boolean criminal_check_passed
        boolean license_check_passed
        uuid approved_by_admin_id FK
        timestamp approved_at
        timestamp created_at
    }
```

### 7.2 Database Indexes Strategy

| Table | Index Type | Columns | Purpose |
|-------|-----------|---------|---------|
| **users** | B-tree | email (UNIQUE) | Fast login lookup |
| | B-tree | (role, status) | Filter active users by role |
| **guard_profiles** | GIST | current_location | Geospatial matching queries |
| | GIN | skills | Skill filtering (JSONB containment) |
| | B-tree (partial) | availability_status WHERE available | Fast available guard queries |
| **jobs** | B-tree | (status, start_time) | Active jobs sorted by time |
| | GIST | location_coordinates | Nearby jobs queries |
| | B-tree | customer_id | User's job history |
| | B-tree | guard_id | Guard's job history |
| **payments** | B-tree | stripe_payment_intent_id (UNIQUE) | Webhook deduplication |
| | B-tree | job_id (UNIQUE) | One payment per job |
| **location_history** | B-tree | (job_id, recorded_at) | Time-series location queries |
| | GIST | location | Geospatial route queries |

---

## 8. Integration Architecture

### 8.1 Third-Party Integration Patterns

```mermaid
graph LR
    subgraph Aegis Backend
        API[NestJS API]
        PaymentSvc[Payment Service]
        MatchingSvc[Matching Service]
        LocationSvc[Location Service]
        NotificationSvc[Notification Service]
    end

    subgraph External Services
        Stripe[Stripe Connect<br/>Payment Intent API<br/>Webhooks]
        Checkr[Checkr<br/>Background Check API<br/>Stubbed for MVP]
        Mapbox[Mapbox<br/>Geocoding API<br/>Directions API]
        Ably[Ably Real-time<br/>REST + WebSocket<br/>Channels]
        Twilio[Twilio SMS<br/>Stubbed for MVP<br/>Console logs]
    end

    PaymentSvc -->|HTTPS| Stripe
    Stripe -.->|Webhook| PaymentSvc

    MatchingSvc -->|HTTPS| Mapbox
    LocationSvc -->|HTTPS| Mapbox

    LocationSvc -->|HTTPS/WS| Ably
    NotificationSvc -->|HTTPS/WS| Ably

    API -->|Future| Checkr
    API -->|Future| Twilio
```

### 8.2 Integration Summary

| Service | Integration Type | Status | Critical Path |
|---------|-----------------|--------|---------------|
| **Stripe Connect** | REST API + Webhooks | Live (test mode) | ✅ Yes - Blocks payment flow |
| **Ably** | REST + WebSocket | Live (free tier) | ✅ Yes - Blocks real-time tracking |
| **Mapbox** | REST API | Live (free tier) | ✅ Yes - Blocks geocoding |
| **Checkr** | REST API | Mocked (manual approval) | ⚠️ No - Can defer to post-MVP |
| **Twilio** | REST API | Mocked (console logs) | ⚠️ No - Email alternative exists |
| **Persona** | REST API | Not implemented | ⚠️ No - Manual license review |

---

## 9. Scalability & Performance

### 9.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | p95 < 200ms, p99 < 500ms | Datadog APM |
| **Database Queries** | < 50ms | PostgreSQL pg_stat_statements |
| **Matching Algorithm** | < 5 seconds | Custom instrumentation |
| **Location Update Latency** | < 2 seconds (mobile → customer) | Ably message timing |
| **Page Load Time** | < 2 seconds | Lighthouse, Web Vitals |
| **Mobile App Launch** | < 3 seconds | Firebase Performance |

### 9.2 Scaling Strategy

```mermaid
graph TB
    subgraph MVP Phase: 50-100 Guards
        API1[API: 2 containers<br/>1 vCPU, 2GB RAM each]
        DB1[(RDS: db.t3.medium<br/>2 vCPU, 4GB RAM)]
        Redis1[(Redis: cache.t3.micro<br/>2GB)]
    end

    subgraph Growth Phase: 500-1000 Guards
        API2[API: 5 containers<br/>Auto-scaling 2-10]
        DB2[(RDS: db.t3.large<br/>2 vCPU, 8GB RAM<br/>+ Read Replica)]
        Redis2[(Redis: cache.t3.small HA<br/>1.5GB, 2 nodes)]
    end

    subgraph Scale Phase: 5000+ Guards
        API3[API: 10-50 containers<br/>Geographic partitioning]
        DB3[(RDS: db.r5.xlarge<br/>4 vCPU, 32GB RAM<br/>+ 2 Read Replicas)]
        Redis3[(Redis: cache.m5.large HA<br/>6.4GB, 3 nodes<br/>Cluster mode)]
    end

    MVP --> Growth
    Growth --> Scale
```

### 9.3 Caching Strategy

| Data Type | Cache Location | TTL | Invalidation |
|-----------|---------------|-----|--------------|
| **Active Jobs** | Redis | 5 minutes | On job status change |
| **Guard Availability** | Redis | 5 minutes | On availability status change |
| **User Sessions** | Redis | 7 days | On logout or token refresh |
| **Guard Profiles** | Redis | 1 hour | On profile update |
| **Query Results** | TypeORM Query Cache (Redis) | 60 seconds | Time-based |

---

## 10. Disaster Recovery & Business Continuity

### 10.1 Backup Strategy

| Component | Backup Frequency | Retention | Recovery Time Objective (RTO) |
|-----------|-----------------|-----------|-------------------------------|
| **Database** | Automated daily (AWS RDS) | 7 days | < 1 hour (point-in-time restore) |
| **Pre-Migration Snapshots** | Before each migration | 30 days | < 15 minutes |
| **Redis** | Not backed up | N/A | N/A (session data, cache rebuild on startup) |
| **Application Config** | Git version control | Infinite | < 5 minutes |
| **File Uploads (S3)** | Versioning enabled | 90 days | Immediate (versioned objects) |

### 10.2 Failure Scenarios

| Scenario | Impact | Mitigation | Recovery Time |
|----------|--------|-----------|---------------|
| **API Container Failure** | Some requests fail | Auto-restart, load balancer routes to healthy containers | < 1 minute |
| **Database Failure** | Platform down | AWS RDS automatic failover to standby | < 2 minutes |
| **Redis Failure** | Auth slower, no cached data | Graceful degradation, rebuild cache | < 5 minutes |
| **Stripe Outage** | No new payments | Queue payment actions, retry when restored | User-facing message |
| **Ably Outage** | No real-time updates | Fall back to polling every 30 seconds | Degraded UX |

---

## 11. Compliance & Privacy

### 11.1 Data Retention Policies

| Data Type | Retention Period | Deletion Method | Compliance Reason |
|-----------|-----------------|-----------------|-------------------|
| **User Account Data** | Until account deletion + 90 days | Soft delete, then hard delete | CCPA, GDPR |
| **Location History** | 30 days | Automated daily cron job | CCPA data minimization |
| **Payment Records** | 7 years | Never deleted | IRS, tax compliance |
| **Audit Logs** | 90 days | Rolling deletion | Security investigations |
| **Job Records** | Indefinite (linked to payments) | Never deleted | Financial audit trail |

### 11.2 Privacy by Design

- **Location Tracking**: Only during active jobs (check-in to check-out)
- **Data Export**: Users can request full data export (CCPA right to access)
- **Data Deletion**: Users can request account deletion (CCPA right to deletion)
- **Transparency**: Privacy policy explains what data is collected and why
- **Consent**: Guards explicitly consent to location tracking before accepting jobs

---

## 12. Monitoring & Observability

### 12.1 Monitoring Stack

```mermaid
graph TB
    subgraph Application
        API[NestJS API]
        Mobile[Mobile Apps]
        Web[Web App]
    end

    subgraph Metrics Collection
        Datadog[Datadog Agent]
        Sentry[Sentry SDK]
        Ably[Ably Metrics]
    end

    subgraph Monitoring Dashboards
        DatadogUI[Datadog Dashboard<br/>Infrastructure, APM, Logs]
        SentryUI[Sentry Dashboard<br/>Errors, Performance]
        AblyUI[Ably Dashboard<br/>Message volume, latency]
        Grafana[Grafana<br/>Custom metrics]
    end

    API --> Datadog
    API --> Sentry
    Mobile --> Sentry
    Web --> Sentry

    API --> Ably
    Mobile --> Ably

    Datadog --> DatadogUI
    Sentry --> SentryUI
    Ably --> AblyUI
    Datadog --> Grafana
```

### 12.2 Key Metrics & Alerts

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| **API Error Rate** | > 1% | Page on-call engineer |
| **API Response Time** | p95 > 500ms | Investigate slow queries |
| **Failed Login Rate** | > 10/min | Possible brute force attack |
| **Database CPU** | > 80% | Scale up RDS instance |
| **Redis Memory** | > 90% | Increase cache size or clear old keys |
| **Job Match Failures** | > 10% | Check matching algorithm or guard supply |
| **Payment Failures** | > 5% | Check Stripe integration |

---

## 13. Operations & Automation

### 13.1 CI/CD Pipeline

**Automated Build & Deployment Pipeline** using GitHub Actions:

```mermaid
graph LR
    subgraph Development
        Dev[Developer Push]
        PR[Pull Request]
    end

    subgraph CI Pipeline
        Lint[Lint & Format<br/>ESLint, Prettier]
        Test[Unit Tests<br/>Jest]
        Build[Build<br/>TypeScript]
        Scan[Security Scan<br/>Dependabot, Snyk]
    end

    subgraph CD Pipeline - Staging
        StageDeploy[Deploy to Staging<br/>ECS]
        E2E[E2E Tests<br/>Playwright]
        IntegTest[Integration Tests]
    end

    subgraph CD Pipeline - Production
        Approve[Manual Approval]
        ProdDeploy[Deploy to Production<br/>ECS Blue/Green]
        Smoke[Smoke Tests]
        Rollback[Auto Rollback<br/>on Failure]
    end

    Dev --> Lint
    PR --> Lint
    Lint --> Test
    Test --> Build
    Build --> Scan
    Scan --> StageDeploy
    StageDeploy --> E2E
    E2E --> IntegTest
    IntegTest --> Approve
    Approve --> ProdDeploy
    ProdDeploy --> Smoke
    Smoke -.-> Rollback
```

**Pipeline Configuration**:
```yaml
# .github/workflows/ci-cd.yml (excerpt)
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: npm run test:ci
      - name: Coverage Report
        run: npm run test:coverage

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
      - name: Check Dependencies
        run: npm audit --audit-level=moderate

  deploy-staging:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS Staging
        run: ./scripts/deploy-staging.sh

  deploy-production:
    needs: [deploy-staging]
    environment: production
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS Production
        run: ./scripts/deploy-production.sh
```

### 13.2 Infrastructure as Code

**Terraform Configuration** for reproducible infrastructure:

```
infrastructure/
├── terraform/
│   ├── modules/
│   │   ├── vpc/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── redis/
│   │   └── alb/
│   ├── environments/
│   │   ├── staging/
│   │   │   └── main.tf
│   │   └── production/
│   │       └── main.tf
│   └── variables.tf
└── scripts/
    ├── deploy-staging.sh
    ├── deploy-production.sh
    └── rollback.sh
```

**Key Infrastructure Components**:
- **VPC**: Isolated network with public/private subnets
- **ECS Fargate**: Container orchestration with auto-scaling
- **RDS PostgreSQL**: Multi-AZ deployment with automated backups
- **ElastiCache Redis**: High-availability configuration
- **Application Load Balancer**: HTTPS termination, health checks
- **CloudWatch**: Log aggregation and monitoring

### 13.3 Testing Strategy

**Comprehensive Testing Pyramid**:

| Test Type | Coverage Goal | Tool | Execution |
|-----------|--------------|------|-----------|
| **Unit Tests** | >90% | Jest | Every commit |
| **Integration Tests** | >80% | Jest + Supertest | Every commit |
| **E2E Tests** | Critical paths | Playwright | Pre-deployment |
| **API Contract Tests** | 100% endpoints | Pact | Every commit |
| **Load Tests** | Key endpoints | k6 | Weekly, pre-release |
| **Security Tests** | OWASP Top 10 | OWASP ZAP | Weekly |
| **Chaos Tests** | Failure scenarios | Custom scripts | Bi-weekly (staging) |

**Automated Test Execution**:
```typescript
// Example test structure
describe('CreateBookingUseCase', () => {
  describe('Unit Tests', () => {
    it('should create booking with valid input', async () => {
      // Isolated unit test with mocks
    });
  });

  describe('Integration Tests', () => {
    it('should persist booking to database', async () => {
      // Test with real database (test container)
    });
  });
});

describe('Booking API E2E', () => {
  it('should complete full booking flow', async () => {
    // Full end-to-end test via HTTP
  });
});
```

**Test Coverage Requirements**:
- Domain Layer: 100% coverage (pure logic)
- Application Layer: 90% coverage (use cases)
- Infrastructure Layer: 80% coverage (adapters)
- Presentation Layer: 70% coverage (controllers)

### 13.4 Chaos Engineering

**Failure Testing Strategy** to validate resilience:

| Test Scenario | Frequency | Expected Outcome |
|---------------|-----------|------------------|
| **ECS Container Kill** | Bi-weekly | Auto-restart within 30s, no request failures |
| **Database Connection Loss** | Bi-weekly | Graceful degradation, connection pool retry |
| **Redis Failure** | Monthly | System continues (no cache), rebuild on recovery |
| **Network Latency Injection** | Monthly | Request timeout handling, circuit breaker activation |
| **Third-party API Failure** | Monthly | Fallback logic, queuing for retry |
| **High CPU Load** | Monthly | Auto-scaling triggers, performance degradation alert |
| **Disk Space Exhaustion** | Quarterly | Alert triggers, log rotation, cleanup scripts |

**Chaos Testing Tools**:
- **AWS FIS**: AWS Fault Injection Simulator for infrastructure tests
- **Custom Scripts**: Kill containers, inject latency
- **Load Testing**: k6 for traffic spikes

**Example Chaos Test**:
```bash
#!/bin/bash
# chaos-test-container-failure.sh

echo "Starting chaos test: ECS container failure"

# Get running container ID
TASK_ARN=$(aws ecs list-tasks --cluster aegis-staging --service-name api | jq -r '.taskArns[0]')

# Kill container
aws ecs stop-task --cluster aegis-staging --task $TASK_ARN --reason "Chaos test"

# Monitor recovery
echo "Monitoring service recovery..."
for i in {1..60}; do
  RUNNING=$(aws ecs describe-services --cluster aegis-staging --services api | jq '.services[0].runningCount')
  if [ "$RUNNING" -ge 2 ]; then
    echo "Recovery successful in ${i} seconds"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Recovery failed"
exit 1
```

### 13.5 Cost Monitoring & Optimization

**AWS Cost Management Strategy**:

| Component | Estimated Monthly Cost | Optimization Strategy |
|-----------|----------------------|----------------------|
| **ECS Fargate** | $200-400 | Right-size containers, auto-scaling policies |
| **RDS PostgreSQL** | $150-300 | Reserved instances, read replica optimization |
| **ElastiCache Redis** | $50-100 | Right-size nodes, eviction policies |
| **Data Transfer** | $50-150 | CloudFront caching, compression |
| **S3 Storage** | $20-50 | Lifecycle policies, intelligent tiering |
| **CloudWatch Logs** | $30-80 | Log retention policies, sampling |
| **Third-party APIs** | $200-500 | Rate limiting, caching, batching |
| **Total** | **$700-1,580/month** | Target: <$1,000 for MVP |

**Cost Monitoring Setup**:
1. **AWS Cost Explorer**: Daily cost tracking by service
2. **Budget Alerts**:
   - Alert at 80% of monthly budget ($800)
   - Critical alert at 100% ($1,000)
3. **Cost Anomaly Detection**: AWS native anomaly detection
4. **Tag-based Tracking**: Track costs by environment (staging/prod)

**Cost Optimization Actions**:
```yaml
# cost-optimization-checklist.yml
daily:
  - Review Cost Explorer dashboard
  - Check for unused resources (orphaned EBS, idle instances)

weekly:
  - Analyze CloudWatch metrics for over-provisioning
  - Review third-party API usage (Stripe, Ably, Mapbox)

monthly:
  - Right-size EC2/ECS resources based on utilization
  - Review RDS storage growth, optimize queries
  - Evaluate reserved instance opportunities

quarterly:
  - Comprehensive cost review with stakeholders
  - Evaluate alternative services (cost vs. features)
```

### 13.6 Security Automation

**Automated Security Measures**:

| Tool | Purpose | Frequency | Action on Finding |
|------|---------|-----------|-------------------|
| **Dependabot** | Dependency vulnerability scanning | Real-time | Auto-create PR for patch versions |
| **Snyk** | Code & container scanning | Every commit | Block PR if critical vulnerabilities |
| **OWASP ZAP** | Web application security testing | Weekly | Create Jira ticket for findings |
| **AWS GuardDuty** | Threat detection | Continuous | Alert security team |
| **AWS Inspector** | Infrastructure assessment | Weekly | Create remediation tasks |
| **Trivy** | Container image scanning | Build time | Block deployment if critical |

**Vulnerability Response SLA**:
- **Critical**: Fix within 24 hours
- **High**: Fix within 7 days
- **Medium**: Fix within 30 days
- **Low**: Fix in next sprint

### 13.7 Monitoring Enhancements

**Advanced Monitoring Capabilities**:

**Anomaly Detection** (Datadog):
- Automatic detection of unusual patterns in:
  - API response times
  - Error rates
  - Database query performance
  - Payment failure rates
  - Failed login attempts

**Custom Dashboards**:
```yaml
# Key Dashboards
- Business Metrics:
    - Bookings created (per hour)
    - Booking completion rate
    - Average match time
    - Guard acceptance rate
    - Payment success rate

- Technical Metrics:
    - API p95/p99 latency
    - Database connection pool utilization
    - Redis hit rate
    - ECS CPU/Memory utilization
    - Error rate by endpoint

- Security Metrics:
    - Failed login attempts
    - Rate limit hits
    - Suspicious IP activity
    - API token misuse
```

**On-call Alerting Strategy**:
```yaml
# PagerDuty Integration
severity_levels:
  P1_critical:
    - Platform down (>50% error rate)
    - Database unreachable
    - Payment processing failed (>10% failure rate)
    - Security breach detected
    response_time: Immediate

  P2_high:
    - API latency >1s (p95)
    - Error rate 5-10%
    - Database CPU >90%
    - Redis memory >95%
    response_time: 15 minutes

  P3_medium:
    - Error rate 1-5%
    - API latency 500ms-1s
    - Disk space >80%
    response_time: 1 hour

  P4_low:
    - Non-critical warnings
    - Capacity planning alerts
    response_time: Next business day
```

### 13.8 Operational Runbooks

**Standard Operating Procedures**:

```
operations/runbooks/
├── deployment/
│   ├── production-deployment.md
│   ├── rollback-procedure.md
│   └── database-migration.md
├── incident-response/
│   ├── api-down.md
│   ├── database-performance.md
│   ├── payment-failures.md
│   └── security-incident.md
├── maintenance/
│   ├── scaling-resources.md
│   ├── log-rotation.md
│   └── backup-restoration.md
└── monitoring/
    ├── alert-response.md
    └── dashboard-guide.md
```

**Example Runbook Excerpt**:
```markdown
# Runbook: High API Error Rate

## Symptoms
- Datadog alert: "API Error Rate >5%"
- Multiple 500 errors in logs
- Customer complaints about service unavailable

## Initial Assessment (5 min)
1. Check Datadog dashboard for error patterns
2. Review CloudWatch logs for error messages
3. Verify third-party service status (Stripe, Ably)
4. Check ECS container health

## Common Causes & Solutions
1. **Database connection exhaustion**
   - Check RDS connection count
   - Action: Scale up RDS or increase connection pool

2. **Memory leak in container**
   - Check ECS memory metrics
   - Action: Restart containers, investigate leak

3. **Third-party API failure**
   - Check Stripe/Ably status pages
   - Action: Enable fallback/retry logic

## Escalation
- If unresolved in 30 min → Escalate to senior engineer
- If revenue impact → Notify product/business stakeholders
```

---

## 14. Future Architecture Evolution

### 14.1 Microservices Migration Path

Current architecture is a **modular monolith** ready for future microservices extraction:

```mermaid
graph TB
    subgraph Current: Modular Monolith
        Monolith[NestJS API<br/>All modules in one codebase]
    end

    subgraph Future: Microservices
        API[API Gateway<br/>Kong or AWS API Gateway]
        AuthSvc[Auth Service<br/>NestJS]
        JobsSvc[Jobs Service<br/>NestJS]
        MatchingSvc[Matching Service<br/>NestJS or Go]
        PaymentsSvc[Payments Service<br/>NestJS]
        LocationsSvc[Locations Service<br/>NestJS or Go]
    end

    Monolith -->|Extract when needed| API
    API --> AuthSvc
    API --> JobsSvc
    API --> MatchingSvc
    API --> PaymentsSvc
    API --> LocationsSvc
```

**When to Extract**:
- **Auth Service**: When other services need authentication (external API partners)
- **Matching Service**: When matching algorithm needs independent scaling (high CPU)
- **Locations Service**: When location tracking needs independent scaling (high write volume)

### 14.2 Multi-Region Deployment

For national scale (5000+ guards, 50+ cities):

```mermaid
graph TB
    subgraph Global Layer
        Route53[AWS Route 53<br/>Geographic routing]
    end

    subgraph US-West Region
        West[ECS Cluster<br/>West Coast]
        WestDB[(RDS Primary<br/>US-West-2)]
    end

    subgraph US-East Region
        East[ECS Cluster<br/>East Coast]
        EastDB[(RDS Primary<br/>US-East-1)]
    end

    subgraph Central Services
        Stripe[Stripe]
        Ably[Ably<br/>Global Edge]
    end

    Route53 -->|CA, WA, OR| West
    Route53 -->|NY, MA, FL| East

    West --> WestDB
    East --> EastDB

    WestDB -.->|Replication| EastDB

    West --> Stripe
    East --> Stripe
    West --> Ably
    East --> Ably
```

---

## 15. Appendices

### 15.1 Glossary

| Term | Definition |
|------|------------|
| **C4 Model** | Context, Container, Component, Code - hierarchical architecture diagramming method |
| **GIST Index** | Generalized Search Tree index for geospatial queries in PostGIS |
| **JWT** | JSON Web Token - stateless authentication token |
| **RBAC** | Role-Based Access Control - authorization based on user roles |
| **PostGIS** | PostgreSQL extension for geospatial data types and queries |
| **TOTP** | Time-based One-Time Password - MFA standard (6-digit codes) |
| **Escrow** | Holding payment in custody until service completion |

### 15.2 References

- **Decision Documents**: D-1, D-2, D-3, D-4, D-5 in `lattice/` directory
- **Research Reports**: Q-3, Q-6, Q-7, Q-8, Q-10, Q-11 in `lattice/` directory
- **Artifact Specifications**: A-4-1, A-4-2, A-4-3, A-5-1, A-5-2, A-5-3 in `specs/` directory
- **C4 Model**: https://c4model.com/
- **PostGIS Documentation**: https://postgis.net/documentation/
- **NestJS Documentation**: https://docs.nestjs.com/
- **React Native Documentation**: https://reactnative.dev/

---

**End of Document**

**Document Status**: ✅ Complete
**Last Updated**: 2025-11-10
**Next Review**: After D-6, D-7, D-8, D-9 decisions are made
