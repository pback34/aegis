# Platform Architecture - Security Uber

## Architecture Overview

### Design Principles
- **Microservices Architecture**: Scalable, maintainable, and deployable independently
- **Event-Driven Design**: Real-time updates and loose coupling between services
- **API-First Approach**: Clear contracts between frontend and backend
- **Cloud-Native**: Built for horizontal scaling and high availability
- **Security by Design**: Zero-trust architecture with encryption at rest and in transit

### High-Level Architecture Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ Customer iOS │ Customer     │ Guard iOS    │ Guard        │
│ App          │ Android App  │ App          │ Android App  │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                    Web Dashboard (Admin)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    API Gateway Layer                        │
│                  (Kong / AWS API Gateway)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Microservices Layer                       │
├────────────┬────────────┬────────────┬────────────────────┤
│ Auth       │ Matching   │ Booking    │ Payment            │
│ Service    │ Service    │ Service    │ Service            │
├────────────┼────────────┼────────────┼────────────────────┤
│ User       │ Location   │ Messaging  │ Notification       │
│ Service    │ Service    │ Service    │ Service            │
├────────────┼────────────┼────────────┼────────────────────┤
│ Analytics  │ Rating     │ Compliance │ Dispatch           │
│ Service    │ Service    │ Service    │ Service            │
└────────────┴────────────┴────────────┴────────────────────┘
```

## Technology Stack Recommendations

### Backend Stack

#### Core Framework & Language
**Primary Choice: Node.js with TypeScript**
- **Framework**: NestJS (enterprise-grade Node.js framework)
- **Why**: Proven at scale (used by Adidas, Capgemini), excellent TypeScript support, built-in microservices support
- **Alternative**: Go with Gin/Echo framework for performance-critical services

**Secondary Services: Python**
- **Framework**: FastAPI
- **Use Cases**: ML services, data processing, analytics
- **Why**: Best-in-class for AI/ML integration, async support

#### API Layer
**GraphQL Federation with REST Fallback**
- **GraphQL**: Apollo Federation for unified graph
- **REST**: Express.js/Fastify for legacy and third-party integrations
- **API Gateway**: Kong or AWS API Gateway
- **Documentation**: OpenAPI/Swagger for REST, GraphQL Playground

### Frontend Stack

#### Mobile Applications
**React Native (Cross-Platform)**
```javascript
// Key Dependencies
{
  "react-native": "^0.72.x",
  "react-navigation": "^6.x",      // Navigation
  "react-native-maps": "^1.7.x",   // Map integration
  "react-native-reanimated": "^3.x", // Animations
  "react-redux": "@reduxjs/toolkit", // State management
  "react-query": "^3.x",           // Server state management
  "react-native-push-notification": "^8.x", // Push notifications
  "react-native-geolocation-service": "^5.x", // Location tracking
  "react-native-firebase": "^18.x", // Analytics, crashlytics
  "react-native-stripe": "^0.35.x", // Payment processing
}```

**Alternative: Native Development**
- **iOS**: Swift with SwiftUI
- **Android**: Kotlin with Jetpack Compose
- **Why Consider**: Better performance, platform-specific features

#### Web Dashboard
**Next.js with TypeScript**
```javascript
// Core Dependencies
{
  "next": "^14.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",           // Styling
  "shadcn/ui": "latest",           // Component library
  "tanstack/react-query": "^5.x",  // Server state
  "zustand": "^4.x",               // Client state
  "react-hook-form": "^7.x",       // Form handling
  "zod": "^3.x",                   // Schema validation
  "recharts": "^2.x",              // Data visualization
  "mapbox-gl": "^3.x",             // Map visualization
}
```

### Database Architecture

#### Primary Database: PostgreSQL
**Why PostgreSQL:**
- Battle-tested at scale (used by Uber, Instagram)
- PostGIS extension for geospatial queries
- JSONB support for flexible schemas
- Strong ACID compliance

**Setup:**
```sql
-- Key Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_cron";CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search
```

**ORM/Query Builder:**
- **Prisma**: Type-safe, modern ORM with excellent TypeScript support
- **Alternative**: TypeORM or Drizzle ORM

#### Cache Layer: Redis
**Use Cases:**
- Session management
- Real-time location caching
- Rate limiting
- Job queues (using Bull/BullMQ)
- Pub/Sub for real-time events

```javascript
// Redis Setup with ioredis
import Redis from 'ioredis';
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});
```

#### Time-Series Data: TimescaleDB
**Use Cases:**
- Location tracking history
- Analytics and metrics
- Audit logs
- Performance monitoring

#### Search Engine: Elasticsearch
**Use Cases:**
- Full-text search for guards/services
- Log aggregation
- Advanced filtering and faceted search

### Microservices Architecture Detail

#### 1. Authentication Service
**Technologies:**- **Auth0** or **AWS Cognito** (managed solution)
- **Alternative**: Self-hosted with Passport.js
- **JWT tokens** with refresh token rotation
- **OAuth 2.0** for third-party integrations

```typescript
// Example Auth Setup with Auth0
import { auth } from 'express-oauth2-jwt-bearer';

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256'
});
```

#### 2. Matching Service (Core Algorithm)
**Technologies:**
- **Primary**: Node.js with Redis for real-time matching
- **Algorithm**: Geospatial indexing with H3 (Uber's hexagonal grid)
- **Queue**: BullMQ for job processing

```typescript
// H3 Integration for Geospatial Indexing
import { geoToH3, h3ToGeo, kRing } from 'h3-js';

// Convert lat/lng to H3 index
const h3Index = geoToH3(latitude, longitude, 9);
// Find nearby hexagons
const nearbyIndexes = kRing(h3Index, 2);
```

**Matching Algorithm Components:**
- Distance calculation (Haversine formula)
- Guard availability status
- Skill matching
- Rating thresholds
- Price optimization
#### 3. Location Service
**Technologies:**
- **MapBox** or **Google Maps Platform** for mapping
- **Socket.io** for real-time location updates
- **Redis Geo** for location queries

```typescript
// Redis Geo Commands for Location
await redis.geoadd('guards:available', 
  longitude, latitude, guardId
);

// Find guards within radius
const nearbyGuards = await redis.georadius(
  'guards:available',
  longitude, latitude,
  '5', 'km',
  'WITHDIST', 'ASC'
);
```

#### 4. Payment Service
**Primary: Stripe Connect**
- Handles marketplace payments
- Split payments between platform and guards
- PCI compliance handled

```typescript
// Stripe Connect Setup
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create connected account for guard
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: guard.email,
  capabilities: {
    transfers: { requested: true },
  },
});```

**Alternative Payment Providers:**
- **Adyen for Platforms**
- **PayPal/Braintree Marketplace**
- **Mangopay**

#### 5. Messaging Service
**Real-time Communication:**
- **Twilio Conversations API** for in-app messaging
- **Socket.io** for real-time updates
- **SendGrid** for transactional emails
- **Twilio SMS** for text notifications

```typescript
// Twilio Conversations Setup
import { Twilio } from 'twilio';
const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Create conversation between customer and guard
const conversation = await client.conversations
  .conversations
  .create({ friendlyName: `Booking-${bookingId}` });
```

#### 6. Notification Service
**Push Notifications:**
- **Firebase Cloud Messaging (FCM)** for Android/iOS
- **Apple Push Notification Service (APNS)** for iOS
- **OneSignal** as an alternative unified solution

```typescript
// Firebase Admin SDK
import admin from 'firebase-admin';

const message = {  notification: {
    title: 'New Security Request',
    body: 'You have a new security request nearby',
  },
  token: guardDeviceToken,
  data: { bookingId: booking.id },
};

await admin.messaging().send(message);
```

### Third-Party Integrations

#### Background Checks & Verification
1. **Checkr** - Most popular for gig economy
   - API for automated background checks
   - Continuous monitoring available
   - Used by Uber, Instacart

2. **Sterling** - Enterprise solution
   - More comprehensive checks
   - Global coverage

3. **Persona** - Identity verification
   - Document verification
   - Selfie verification
   - KYC/AML compliance

```typescript
// Checkr Integration Example
import axios from 'axios';

const checkrClient = axios.create({
  baseURL: 'https://api.checkr.com/v1',
  auth: {
    username: process.env.CHECKR_API_KEY,
    password: '',
  },
});

// Create candidate
const candidate = await checkrClient.post('/candidates', {  first_name: guard.firstName,
  last_name: guard.lastName,
  email: guard.email,
  dob: guard.dateOfBirth,
  ssn: guard.ssn,
});
```

#### Insurance APIs
1. **Applied Systems** - Commercial insurance
2. **Bold Penguin** - Commercial insurance marketplace
3. **Cover Genius** - On-demand insurance

#### Analytics & Monitoring

##### Application Performance Monitoring
**Datadog** (Recommended)
- APM for all services
- Log aggregation
- Real-time metrics
- Custom dashboards

```typescript
// Datadog APM Setup
import tracer from 'dd-trace';
tracer.init({
  service: 'security-uber-api',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
});
```

**Alternatives:**
- **New Relic**
- **AppDynamics**
- **Sentry** (error tracking focus)

##### Analytics Platform
**Segment** (Customer Data Platform)
- Unified tracking across all platforms
- Integration with 300+ tools
- Real-time data pipelines
```typescript
// Segment Analytics
import Analytics from 'analytics-node';
const analytics = new Analytics(process.env.SEGMENT_WRITE_KEY);

analytics.track({
  userId: user.id,
  event: 'Booking Created',
  properties: {
    bookingId: booking.id,
    serviceType: booking.serviceType,
    value: booking.totalAmount,
  },
});
```

**Data Warehouse:** 
- **Snowflake** or **BigQuery** for analytics
- **dbt** for data transformation
- **Looker/Tableau** for business intelligence

### Infrastructure & DevOps

#### Cloud Provider: AWS
**Core Services:**
- **ECS/EKS**: Container orchestration
- **RDS**: Managed PostgreSQL
- **ElastiCache**: Managed Redis
- **S3**: Object storage
- **CloudFront**: CDN
- **Lambda**: Serverless functions
- **SQS/SNS**: Message queuing
- **Cognito**: Authentication (alternative to Auth0)

#### Container Orchestration
**Docker + Kubernetes**
```yaml
# Example Kubernetes Deployment
apiVersion: apps/v1
kind: Deploymentmetadata:
  name: matching-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: matching-service
  template:
    metadata:
      labels:
        app: matching-service
    spec:
      containers:
      - name: matching-service
        image: security-uber/matching-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

#### CI/CD Pipeline
**GitHub Actions + ArgoCD**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build and push Docker image
        run: |          docker build -t security-uber/api:${{ github.sha }} .
          docker push security-uber/api:${{ github.sha }}
```

### Security Architecture

#### API Security
- **Rate Limiting**: Redis-based with sliding window
- **API Keys**: For B2B integrations
- **OAuth 2.0**: For third-party access
- **WAF**: AWS WAF or Cloudflare

```typescript
// Rate Limiting with express-rate-limit
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate-limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

#### Data Security
- **Encryption at Rest**: AWS KMS
- **Encryption in Transit**: TLS 1.3
- **PII Handling**: Tokenization with Vault
- **GDPR Compliance**: Data anonymization, right to delete

```typescript
// Example: PII Tokenization with HashiCorp Vault
import { Vault } from 'node-vault';
const vault = Vault({
  endpoint: process.env.VAULT_ADDR,  token: process.env.VAULT_TOKEN,
});

// Tokenize SSN
const response = await vault.write('transform/encode/ssn', {
  value: userSSN,
});
const tokenizedSSN = response.data.encoded_value;
```

### Event-Driven Architecture

#### Message Queue: Apache Kafka / AWS Kinesis
**Event Types:**
- Booking events (created, accepted, started, completed)
- Location updates
- Payment events
- Rating submissions
- Compliance events

```typescript
// Kafka Producer Example
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'security-uber',
  brokers: ['kafka1:9092', 'kafka2:9092'],
});

const producer = kafka.producer();

await producer.send({
  topic: 'booking-events',
  messages: [
    {
      key: bookingId,
      value: JSON.stringify({
        type: 'BOOKING_CREATED',
        timestamp: Date.now(),
        data: bookingData,
      }),
    },  ],
});
```

### Development Tools & Libraries

#### Essential NPM Packages
```json
{
  "dependencies": {
    // Core
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/microservices": "^10.x",
    
    // Database
    "@prisma/client": "^5.x",
    "ioredis": "^5.x",
    "@elastic/elasticsearch": "^8.x",
    
    // Authentication
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x",
    "@auth0/auth0-react": "^2.x",
    
    // Validation
    "joi": "^17.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",
    
    // Real-time
    "socket.io": "^4.x",
    "socket.io-client": "^4.x",
    
    // Queue Processing
    "bullmq": "^4.x",
    "kafkajs": "^2.x",
    
    // Payments
    "stripe": "^14.x",    
    // Maps & Location
    "@mapbox/mapbox-gl-js": "^3.x",
    "h3-js": "^4.x",
    "geolib": "^3.x",
    
    // Communications
    "twilio": "^4.x",
    "@sendgrid/mail": "^8.x",
    "firebase-admin": "^12.x",
    
    // Monitoring
    "dd-trace": "^5.x",
    "winston": "^3.x",
    "pino": "^8.x",
    
    // Testing
    "jest": "^29.x",
    "supertest": "^6.x",
    "@testing-library/react-native": "^12.x",
    
    // Utilities
    "lodash": "^4.x",
    "date-fns": "^3.x",
    "uuid": "^9.x",
    "axios": "^1.x",
    "dotenv": "^16.x"
  }
}
```

### Cost Optimization Strategies

#### Infrastructure Costs
1. **Auto-scaling policies** based on demand
2. **Spot instances** for non-critical workloads
3. **Reserved instances** for baseline capacity
4. **CDN caching** to reduce bandwidth5. **Database read replicas** for query distribution

#### Third-Party Services
1. **Tiered API usage** (negotiate volume discounts)
2. **Caching external API responses**
3. **Batch processing** where possible
4. **Fallback providers** for cost/reliability

### Performance Optimization

#### Database Optimization
```sql
-- Key Indexes for Performance
CREATE INDEX idx_guards_location ON guards USING GIST(location);
CREATE INDEX idx_guards_available ON guards(is_available, rating DESC);
CREATE INDEX idx_bookings_status ON bookings(status, created_at DESC);
CREATE INDEX idx_bookings_guard ON bookings(guard_id, status);

-- Partitioning for large tables
CREATE TABLE bookings_2024_q1 PARTITION OF bookings
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

#### Caching Strategy
1. **CDN Level**: Static assets, images
2. **API Gateway**: Response caching (5-60 seconds)
3. **Application Level**: Redis for hot data
4. **Database Level**: Query result caching

```typescript
// Multi-level caching example
async function getGuardProfile(guardId: string) {
  // L1: Check Redis cache
  const cached = await redis.get(`guard:${guardId}`);
  if (cached) return JSON.parse(cached);
  
  // L2: Check database  const guard = await prisma.guard.findUnique({
    where: { id: guardId },
    include: { ratings: true, certifications: true }
  });
  
  // Cache for 5 minutes
  await redis.setex(
    `guard:${guardId}`,
    300,
    JSON.stringify(guard)
  );
  
  return guard;
}
```

### Scalability Considerations

#### Horizontal Scaling Points
1. **API Servers**: Stateless, behind load balancer
2. **WebSocket Servers**: Sticky sessions with Redis adapter
3. **Worker Processes**: Multiple instances with queue partitioning
4. **Database**: Read replicas, sharding by geographic region

#### Geographic Distribution
1. **Multi-region deployment** (US-East, US-West, EU)
2. **Data residency compliance** per region
3. **Edge caching** with CloudFront/Fastly
4. **Regional matching** algorithms

### Monitoring & Observability

#### Key Metrics to Track
```typescript
// Business Metrics
const metrics = {
  // Operational
  bookingsPerHour: counter('bookings.created'),
  averageMatchTime: histogram('matching.duration'),
  guardUtilization: gauge('guards.utilization'),  
  // Performance
  apiLatency: histogram('api.request.duration'),
  databaseQueryTime: histogram('db.query.duration'),
  cacheHitRate: gauge('cache.hit.rate'),
  
  // Business
  revenue: counter('revenue.total'),
  customerAcquisitionCost: gauge('cac.current'),
  guardRetention: gauge('guards.retention.rate'),
};
```

#### Logging Architecture
```typescript
// Structured logging with Winston
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.metadata()
  ),
  defaultMeta: {
    service: 'security-uber',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
  ],
});

// Centralized to ELK Stack or Datadog
```

### Disaster Recovery & High Availability
#### Backup Strategy
1. **Database**: Automated daily backups, point-in-time recovery
2. **File Storage**: S3 cross-region replication
3. **Configuration**: Version controlled in Git
4. **Secrets**: Backed up in AWS Secrets Manager

#### High Availability Setup
1. **Multi-AZ deployments** for all critical services
2. **Load balancing** with health checks
3. **Circuit breakers** for external dependencies
4. **Graceful degradation** for non-critical features

```typescript
// Circuit breaker implementation
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const breaker = new CircuitBreaker(callExternalAPI, options);
breaker.fallback(() => 'Service temporarily unavailable');
```

### API Examples

#### REST API Endpoints
```typescript
// Customer endpoints
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/bookings
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
PUT    /api/v1/bookings/:id/cancel
GET    /api/v1/guards/search
GET    /api/v1/guards/:id