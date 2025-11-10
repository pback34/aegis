---
node_type: Decision
decision_type: Technical
status: Proposed
created: 2025-11-09
updated: 2025-11-09
priority: High
spawned_by:
  - Q-3
informs: []
depends_on: []
tags:
  - technical
  - architecture
  - build-vs-buy
  - tech-stack
  - mvp

# AI Metadata
created_by: AI:DecisionAgent
ai_confidence: 0.88
human_review_required: true
review_status: Pending
---

# D-1: MVP Technical Architecture - Build Custom Platform

## Decision

Build a custom Aegis platform using Node.js/TypeScript + NestJS backend, React/Next.js web application, React Native mobile apps, PostgreSQL with PostGIS database, and strategic third-party integrations for payments (Stripe Connect), background checks (Checkr), mapping (Mapbox), and communications (Twilio/Ably).

## Rationale

Based on comprehensive technical architecture research from Q-3, a **custom-built platform is the optimal approach** rather than white-label solutions for several critical reasons:

### 1. White-Label Solutions Are Inadequate

Existing white-label marketplace platforms (Sharetribe, Arcadier, Jobber) fundamentally lack the specialized capabilities required for a security guard marketplace:

- **No comprehensive background check integration**: Security industry requires multi-faceted screening (criminal, license verification, reference checks) with proper audit trails
- **Insufficient GPS tracking**: Real-time location monitoring with offline buffering and accuracy requirements exceed standard marketplace features
- **Missing compliance features**: State-specific licensing rules, incident reporting with chain-of-custody, and regulatory audit logging are not supported
- **Limited matching complexity**: Security-specific matching requires license types, certifications, armed/unarmed status, and specialized skills beyond basic availability

### 2. Strategic Tech Stack Selection

**Backend: Node.js 20 LTS + TypeScript 5.x + NestJS**
- Real-time performance critical for GPS updates and job matching
- Largest developer talent pool reduces hiring costs and risk
- NestJS provides enterprise-grade architecture with dependency injection, testing, and OpenAPI generation
- Event-driven architecture supports WebSocket connections and background jobs

**Database: PostgreSQL 15+ with PostGIS extension**
- PostGIS enables accurate geospatial queries for guard-job matching by proximity
- ACID compliance essential for financial transactions and job state management
- JSONB support allows flexible metadata without sacrificing query performance
- Proven scalability to millions of rows with proper indexing

**Web Application: Next.js 14+ (React 18)**
- Server-side rendering improves SEO for customer acquisition
- Tailwind CSS + shadcn/ui enables rapid UI development
- Edge deployment reduces latency for real-time features

**Mobile Apps: React Native 0.73+ with Expo + Offline-First Architecture**
- 60-70% code sharing between iOS and Android reduces development cost
- Over-the-air updates enable rapid bug fixes without app store approval delays
- Access to native modules (GPS, camera, push notifications) when needed
- Faster development timeline (4-6 months vs 8-12 for native)
- **Offline-first design using WatermelonDB + AsyncStorage**:
  - Local database sync for job acceptance without connectivity
  - Buffered GPS updates sync when connection restored
  - Draft messages and check-ins persist locally
  - Background sync with conflict resolution
  - Critical for guards at remote sites with poor cellular coverage

### 3. Best-in-Class Third-Party Integrations

Rather than building commodity features, integrate proven specialized services:

**Stripe Connect** ($0 setup + 2.9% + $0.30/transaction)
- Only payment processor with escrow, split payments, fraud detection, and PCI-DSS Level 1 compliance
- Reduces compliance burden to simple SAQ-A questionnaire
- Handles state tax requirements and 1099 generation for guards

**Checkr** ($50-80 per guard screening)
- Industry-leading API quality and 1-3 day turnaround
- Comprehensive check types (criminal, SSN trace, driving record, sex offender registry)
- Continuous monitoring for post-hire offenses
- Creates competitive moat through superior guard quality

**Mapbox** (free tier: 50K map loads/month)
- Better offline support than Google Maps (critical for remote security sites)
- 50-60% cost savings at scale
- Accurate geocoding and routing for guard navigation

**Ably** (free tier: 3M messages/month)
- Superior mobile connection recovery vs Pusher
- Real-time location updates and job status changes
- Presence detection for guard online/offline status

**Twilio** ($0.0079 per SMS)
- Most reliable SMS delivery for critical notifications
- Two-way communication for check-in confirmations
- International expansion ready

### 4. Development Economics

**Agency/Contractor Approach**: $100K-160K for 4-6 month MVP
- 2-3 senior contractors or development agency
- Faster time-to-market than building in-house team
- Lower upfront cost vs full-time employees ($456K first year)
- Acceptable trade-off: less control but proven execution

**Total MVP Investment**: $154K-271K
- Development: $100K-160K
- Infrastructure/services: $19K-40K annually
- Legal/compliance: $21K-46K
- Post-launch monthly operating costs: $4,500-10,500

### 5. Scalability & Security Built-In

**Infrastructure: AWS ECS Fargate + RDS + CloudFront**
- Auto-scaling containerized services handle surge demand
- RDS PostgreSQL with read replicas for query performance
- CloudFront CDN for global asset delivery
- Initial costs: $500-1,500/month, scales with usage

**Security-First Design**
- TLS 1.3 everywhere, AES-256 for sensitive data
- JWT authentication with 15-min access tokens, 7-day rotating refresh tokens
- MFA required for admin accounts
- Field-level encryption for SSN and background check results
- Comprehensive audit logging for compliance

**Mobile Performance Optimizations**
- **Battery efficiency**: Lazy loading for large maps, adaptive GPS sampling rates
- **Network optimization**: Request batching, image compression, aggressive caching
- **Startup performance**: Code splitting, lazy module loading, splash screen optimization
- **Memory management**: Component unmounting, image recycling, connection pooling
- Target: < 3s app launch time, < 5% battery drain per hour during active tracking

## Alternatives Considered

### Alternative 1: White-Label Marketplace Platform (Sharetribe, Arcadier)

**Pros:**
- Faster initial launch (2-3 months vs 6 months)
- Lower upfront development cost ($30K-50K)
- Pre-built marketplace features (listings, bookings, payments)

**Cons:**
- **Fundamentally inadequate for security industry requirements**
- No background check integration depth
- Insufficient GPS tracking and offline capabilities
- Limited customization for state-specific compliance
- Vendor lock-in with monthly fees ($500-2,000)
- Poor differentiation from competitors
- **REJECTED**: Cannot deliver core value proposition

### Alternative 2: Fully Native Mobile Apps (Swift/Kotlin)

**Pros:**
- Best possible performance and user experience
- Full access to platform capabilities
- No cross-platform framework limitations

**Cons:**
- **2x development cost** (separate iOS and Android teams)
- Slower iteration cycle (8-12 months to MVP)
- Requires specialized talent (Swift and Kotlin developers)
- No code sharing increases maintenance burden
- **REJECTED**: Cost and timeline unacceptable for MVP

### Alternative 3: Ruby on Rails Backend

**Pros:**
- Rapid development with convention-over-configuration
- Mature ecosystem for marketplace applications
- Good developer experience

**Cons:**
- Weaker real-time performance vs Node.js
- Smaller talent pool increases hiring difficulty
- Less suitable for WebSocket-heavy applications
- **REJECTED**: Node.js better fit for real-time requirements

### Alternative 4: Monolithic Architecture

**Pros:**
- Simpler initial deployment
- Easier local development
- Fewer moving parts

**Cons:**
- Harder to scale individual components
- Longer CI/CD pipelines as codebase grows
- Team coordination challenges as product evolves
- **DEFERRED**: Start with modular monolith, migrate to microservices if needed

## Implications

### Development Requirements

1. **Immediate hiring needs**:
   - Senior Node.js/TypeScript developer (backend lead)
   - Full-stack developer (React/React Native)
   - DevOps engineer (part-time, can be contractor)
   - QA engineer (manual + automation)

2. **Infrastructure setup**:
   - AWS account with IAM roles and security groups
   - CI/CD pipeline (GitHub Actions or GitLab CI)
   - Staging and production environments
   - Monitoring and logging (Datadog, Sentry)

3. **Third-party account setup**:
   - Stripe Connect platform account (2-week approval process)
   - Checkr API access (verify state coverage)
   - Mapbox account and API keys
   - Twilio account with phone number provisioning
   - Ably account for real-time messaging

### Legal & Compliance

4. **Legal engagement required**:
   - Employment law attorney review of contractor classification
   - Privacy policy and terms of service drafting
   - State-specific security guard licensing research
   - Cyber insurance procurement ($2K-5K annually)

5. **Security requirements**:
   - Annual penetration testing ($5K-10K)
   - Security audit before launch
   - Incident response plan and runbooks
   - Data breach insurance and notification procedures

### Timeline & Phases

6. **Development phases** (24 weeks total):
   - **Phase 1-2 (Weeks 1-10)**: Foundation + core features (auth, jobs, matching, payments)
   - **Phase 3-4 (Weeks 11-16)**: Mobile apps + real-time (GPS, offline sync, messaging)
   - **Phase 5-6 (Weeks 17-24)**: Admin tools + launch prep (compliance, testing, app store)

7. **Critical path dependencies**:
   - Stripe Connect approval must complete before payment integration (week 8)
   - Checkr integration can be mocked initially, go live by week 16
   - App store submission requires 1-2 weeks review (build buffer into timeline)

### Operational Impact

8. **Post-launch support needs**:
   - 24/7 on-call rotation for production incidents
   - Customer support integration (Zendesk or Intercom)
   - Guard onboarding and training materials
   - Admin dashboard training for operations team

9. **Ongoing maintenance costs**:
   - Infrastructure: $500-1,500/month (scales with users)
   - Third-party services: $1,000-3,000/month (Stripe, Checkr, Twilio)
   - Monitoring/logging: $200-500/month (Datadog, Sentry)
   - Domain, SSL, misc: $100-200/month

## Risks & Mitigation

### Risk 1: GPS Reliability at Remote Sites

**Risk**: Cellular connectivity unreliable at remote security sites affects real-time tracking

**Mitigation**:
- Implement offline buffering with sync when connectivity restored
- Use multi-source location data (GPS + WiFi + cell towers)
- Require photo proof at check-in/check-out as backup verification
- Implement geofencing with entrance/exit detection
- **Severity**: Medium | **Likelihood**: High | **Priority**: Must address

### Risk 2: Third-Party Integration Failures

**Risk**: Stripe, Checkr, or Mapbox outages block critical platform functions

**Mitigation**:
- Implement retry logic with exponential backoff
- Build fallback options where possible (manual payment processing, admin background check approval)
- Monitor integration health with alerting
- Maintain vendor relationships for priority support
- **Severity**: High | **Likelihood**: Low | **Priority**: Build defense

### Risk 3: Scope Creep During Development

**Risk**: Feature additions during development delay MVP launch

**Mitigation**:
- Enforce strict MVP feature list (approved in writing)
- Defer all "nice-to-haves" to Phase 2 backlog
- Weekly product discipline reviews
- Change request process with timeline impact analysis
- **Severity**: Medium | **Likelihood**: High | **Priority**: Process control

### Risk 4: Regulatory Compliance Gaps

**Risk**: State-specific security guard regulations overlooked during development

**Mitigation**:
- Build flexible system for state-specific rules (config-driven, not hardcoded)
- Legal counsel review quarterly
- Monitor legislative changes via industry associations
- Document compliance requirements in decision log
- **Severity**: High | **Likelihood**: Medium | **Priority**: Legal review required

### Risk 5: Payment Security Breach

**Risk**: Security breach exposes customer payment data

**Mitigation**:
- Use Stripe tokenization (never store card numbers)
- Implement Stripe Radar fraud detection
- Require photo evidence of service before payout
- 24-hour escrow hold with manual review for high-value transactions
- Maintain PCI-DSS SAQ-A compliance
- **Severity**: Critical | **Likelihood**: Low | **Priority**: Security audit mandatory

### Risk 6: Insufficient Guard Supply at Launch

**Risk**: Not enough guards available when customer demand arrives

**Mitigation**:
- Recruit 50-100 guards before customer marketing launch
- Implement guard referral bonuses ($100-200 per qualified guard)
- Partner with existing security companies for initial supply
- Phase geographic rollout (one city at a time)
- **Severity**: High | **Likelihood**: Medium | **Priority**: Operations focus

## Success Metrics

To validate this decision post-implementation:

1. **Development velocity**: MVP delivered in 4-6 months (target: 5 months)
2. **Development cost**: Total spend within $100K-160K budget
3. **System performance**: p95 API response time < 200ms, GPS updates < 5s latency
4. **Integration reliability**: 99.5% uptime for critical integrations (Stripe, GPS tracking)
5. **Developer satisfaction**: Team velocity stable or increasing sprint-over-sprint
6. **Technical debt**: Maintain < 20% of sprint capacity on bug fixes and refactoring

## Dependencies

### Blocks These Decisions/Artifacts

- D-2: MVP API Design (needs tech stack confirmation)
- D-3: MVP Database Schema (needs PostgreSQL confirmation)
- A-*: All implementation artifacts (backend, frontend, mobile, infrastructure)

### Depends On

- Q-3: Technical Architecture Research (COMPLETED)
- OBJ-1: Build Aegis Platform (defines business requirements)

## Next Steps After Approval

1. **Vendor Setup** (Week 1):
   - Create Stripe Connect platform account
   - Set up AWS organization and staging/production accounts
   - Provision Checkr API sandbox access
   - Register Mapbox and Ably accounts

2. **Team Formation** (Weeks 1-2):
   - Source and interview development agency or contractors
   - Negotiate contracts with clear deliverables and timeline
   - Establish communication cadence (daily standups, weekly demos)

3. **Project Kickoff** (Week 2):
   - Finalize MVP feature scope and user stories
   - Set up project management and tracking (Linear, Jira, or GitHub Projects)
   - Create technical design documents for Phase 1
   - Establish code review and deployment processes

4. **Infrastructure Foundation** (Weeks 2-3):
   - Set up AWS infrastructure (VPC, RDS, ECS, CloudFront)
   - Configure CI/CD pipeline with staging and production environments
   - Implement monitoring and logging (Datadog, Sentry)
   - Create database migration framework with TypeORM

5. **Parallel Development Streams** (Weeks 3-24):
   - Backend API development (NestJS, PostgreSQL, integrations)
   - Web application development (Next.js, Tailwind, shadcn/ui)
   - Mobile app development (React Native, Expo)
   - Admin dashboard development

## Related Nodes

- **Spawned by**: Q-3 (Technical Architecture & Build vs. Buy Research)
- **Informs**: D-2 (API Design), D-3 (Database Schema), all technical artifacts
- **Depends on**: OBJ-1 (Build Aegis Platform)

## Review Notes

**For Human Reviewer:**

This is a **High priority, high-confidence (0.88) technical decision** that establishes the foundation for all platform development. Key points for your consideration:

1. **Build vs. Buy**: The research strongly favors custom build. Do you agree white-label solutions are inadequate for security industry requirements?

2. **Tech Stack**: Node.js + React Native is optimized for speed and cost. Are you comfortable with this stack vs. alternatives (Rails, native apps)?

3. **Budget & Timeline**: $154K-271K total, 4-6 months to MVP. Does this align with available funding and launch goals?

4. **Third-Party Dependencies**: Heavy reliance on Stripe, Checkr, Mapbox. Are you comfortable with this vendor dependency?

5. **Development Approach**: Agency/contractors vs in-house team. Do you prefer more control (in-house) or faster execution (agency)?

Please approve, request revisions, or reject with feedback.

---

**AI Confidence Rationale**: 0.88 confidence based on:
- ✅ Comprehensive research with clear cost and timeline analysis
- ✅ Well-established technology choices with industry precedent
- ✅ Clear competitive advantages of custom build documented
- ⚠️ Some uncertainty around exact development timeline (4-6 month range)
- ⚠️ Budget range is wide ($154K-271K) depending on scope decisions

**Human review required**: YES (High priority + impacts entire technical roadmap)
