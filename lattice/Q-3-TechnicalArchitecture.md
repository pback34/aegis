---
node_type: Question
status: Complete
priority: High
created: 2025-11-09
updated: 2025-11-09
spawned_by:
  - OBJ-1
informs:
  - R-3
tags:
  - technical
  - architecture
  - build-vs-buy
  - integrations
  - platform
---

# Q-3: Technical Architecture & Build vs. Buy Decisions

## Question

What technical architecture and third-party integrations should we use to build the Aegis platform efficiently while maintaining quality, security, and scalability?

## Context

Building an on-demand marketplace requires careful technology choices. We need to determine which components to build in-house vs. buy/integrate, select appropriate tech stack, and ensure the platform can handle real-time matching, payments, and communication at scale.

## Research Objectives

1. **Build vs. Buy Analysis**
   - Which core platform components should we build?
   - Which services should we integrate (payments, background checks, maps)?
   - What marketplace/gig economy platforms exist that we could white-label?

2. **Essential Third-Party Integrations**
   - What payment processors are best for escrow and split payments?
   - What background check services are comprehensive and API-enabled?
   - What mapping/routing services should we use?
   - What SMS/push notification services are most reliable?

3. **Offline/Connectivity Scenarios**
   - How do we handle offline scenarios gracefully?
   - What functionality must work without connectivity?
   - How do we sync data when connectivity is restored?

4. **Compliance & Data Requirements**
   - What data must be collected for legal compliance?
   - What data retention policies are required?
   - What security standards must we meet (PCI-DSS, SOC 2)?
   - How do we handle sensitive data (background checks, locations)?

## Research Questions

### Platform Architecture
- [ ] Should we build custom marketplace platform or use white-label solution?
- [ ] What are leading white-label gig economy platforms (Sharetribe, Arcadier)?
- [ ] What are pros/cons of custom build vs. white-label for our use case?
- [ ] What tech stack is optimal (language, frameworks, databases)?
- [ ] What hosting infrastructure should we use (AWS, GCP, Azure)?
- [ ] What is estimated development timeline for MVP (custom vs. white-label)?

### Core Platform Components
- [ ] **Matching Algorithm**: Build custom or use existing service?
- [ ] **Real-time Communication**: Which WebSocket/real-time service (Pusher, Ably)?
- [ ] **GPS Tracking**: Which mapping API (Google Maps, Mapbox)?
- [ ] **Video/Photo Storage**: Which service (S3, Cloudinary)?
- [ ] **Database**: SQL vs. NoSQL? PostgreSQL vs. MongoDB?
- [ ] **Mobile Apps**: Native (Swift/Kotlin) vs. React Native vs. Flutter?

### Third-Party Integrations
- [ ] **Payment Processing**:
  - Which processor supports escrow and split payments (Stripe Connect, Braintree)?
  - What are transaction fees and payout schedules?
  - Does it support multiple payment methods?

- [ ] **Background Checks**:
  - Which services are most comprehensive (Checkr, Sterling, GoodHire)?
  - What is API integration quality and turnaround time?
  - What are per-check costs?

- [ ] **License Verification**:
  - Are there APIs for state security license verification?
  - Do we need manual verification processes?

- [ ] **Identity Verification**:
  - Which KYC services should we use (Persona, Onfido, Jumio)?
  - What are false positive/negative rates?

- [ ] **SMS & Notifications**:
  - Which service for SMS (Twilio, Plivo)?
  - Which push notification service (Firebase, OneSignal)?

- [ ] **Customer Support**:
  - Which helpdesk platform (Zendesk, Intercom)?
  - Do we need live chat capabilities?

### Offline & Connectivity
- [ ] What features must work offline (guard check-in/out, emergency button)?
- [ ] How do we handle GPS tracking during connectivity loss?
- [ ] What data should be cached locally on mobile apps?
- [ ] How do we handle sync conflicts when connectivity returns?
- [ ] What user experience do we show during offline periods?

### Security & Compliance
- [ ] What data encryption standards are required (data at rest, in transit)?
- [ ] What authentication methods should we use (OAuth, JWT, MFA)?
- [ ] What PCI-DSS requirements apply to payment handling?
- [ ] What audit logging is required for compliance?
- [ ] What data retention policies are legally required?
- [ ] What privacy policy requirements exist (CCPA, state laws)?
- [ ] What penetration testing and security audits are needed?

### Scalability & Performance
- [ ] What concurrent users should the MVP support?
- [ ] What response time SLAs are critical (matching, GPS updates)?
- [ ] What database scaling strategy should we use?
- [ ] What CDN should we use for asset delivery?
- [ ] What monitoring and observability tools are needed (Datadog, New Relic)?

## Success Criteria

This research is complete when we can answer:

1. ✓ Build vs. buy decision made for core platform
2. ✓ Third-party integration vendors selected (payments, background checks, maps)
3. ✓ Tech stack defined (languages, frameworks, databases, hosting)
4. ✓ Offline scenario handling strategy documented
5. ✓ Security and compliance requirements mapped to architecture
6. ✓ MVP development timeline and cost estimated

## Research Methods

- Technical architecture research (industry best practices)
- Vendor comparison analysis (feature/cost matrix)
- API documentation review for key integrations
- Security standards research (PCI-DSS, SOC 2, OWASP)
- Reference architecture review (similar marketplaces)
- Developer community research (Stack Overflow, GitHub)

## Expected Outputs

- Build vs. buy recommendation matrix
- Recommended tech stack with rationale
- Third-party vendor selection (top 3 options per category)
- Integration architecture diagram
- Offline handling strategy document
- Security and compliance checklist
- MVP development timeline and cost estimate
- Technical risk assessment

## Priority & Timeline

- **Priority:** High (informs development planning)
- **Timeline:** Week 1-2
- **Blockers:** None (can proceed in parallel with legal research)

## Findings

After comprehensive technical architecture research, we have determined that **building a custom platform is the optimal approach** for Aegis rather than using white-label solutions. The specialized security requirements, unique matching algorithms, and compliance needs of the security guard marketplace make existing white-label platforms inadequate for our use case.

Our recommended architecture combines a **custom-built core platform** (using Node.js/TypeScript with NestJS framework, PostgreSQL database, and React/React Native for web and mobile) with **best-in-class third-party integrations** for non-core features like payments, background checks, and communications. This "build vs. buy" hybrid approach allows us to focus development resources on our competitive differentiators while leveraging proven, specialized services for commodity features.

**Total MVP Investment:** $154K-271K including development ($100K-160K), infrastructure and third-party services ($19K-40K annually), and legal/compliance costs ($21K-46K). The realistic development timeline is **4-6 months** with a lean contractor team or development agency. Post-launch monthly operating costs are projected at $4,500-10,500/month, which scales with usage and can be offset by transaction revenue.

## Key Insights

- **Custom Build Justification:** White-label platforms (Sharetribe, Arcadier, Jobber) lack the depth required for security-specific features including comprehensive background checks, license verification, real-time GPS tracking, and incident reporting with proper audit trails

- **Strategic Tech Stack:** Node.js/TypeScript with NestJS provides the best balance of real-time performance, developer availability, and ecosystem maturity; React Native enables code sharing between iOS/Android while keeping development costs reasonable

- **Payment Infrastructure:** Stripe Connect is the clear choice for marketplace payments, providing escrow, split payments, fraud detection, and PCI-DSS Level 1 compliance (reducing our burden to simple SAQ-A questionnaire)

- **Background Checks at Scale:** Checkr offers the best API quality and turnaround time (1-3 days) with comprehensive check types at $50-80 per guard; this is a competitive moat worth the investment

- **Offline-First Mobile Design:** Critical features (emergency panic button, check-in/check-out, current shift details) must work offline with local queuing and sync when connectivity restored—using WatermelonDB for reactive offline-first database

- **Real-time Architecture:** Ably provides superior mobile support and connection recovery compared to Pusher, with generous free tier (3M messages/month) making it ideal for live location updates and job status changes

- **GPS Tracking Reliability:** Multi-source location data (GPS + WiFi + cell towers) with offline buffering and photo proof requirements mitigates unreliable cellular connectivity at remote security sites

- **Security-First Design:** TLS 1.3 everywhere, AES-256 encryption for sensitive data (SSN, background checks), MFA required for admins, field-level encryption, and comprehensive audit logging for compliance

- **Cost-Effective Scaling:** AWS Fargate for auto-scaling containerized services, RDS PostgreSQL with read replicas, Redis caching, and CloudFront CDN provide enterprise-grade infrastructure at startup-friendly costs ($500-1,500/month initially)

- **Lean Development Approach:** Development agency or 2-3 senior contractors ($100K-160K total) can deliver MVP in 6 months versus full in-house team ($456K), with acceptable trade-offs in velocity and control

## Recommendations

### Immediate Next Steps

1. **Finalize Development Partner:** Choose between development agency (fixed cost, less control) or contractor team (more control, variable cost) based on available funding and desired involvement level

2. **Establish Vendor Accounts:** Set up Stripe Connect account, Checkr API access, Mapbox account, and AWS infrastructure to enable early integration testing and sandbox development

3. **Legal & Compliance Engagement:** Engage employment law attorney to review platform design and state-specific requirements before finalizing feature scope; obtain cyber insurance quotes

4. **Security Foundation First:** Implement authentication, authorization, encryption, and audit logging in Phase 1 (weeks 1-4) before building features on top—security retrofitting is expensive and risky

### Technical Architecture Decisions

- **Core Platform:** Build custom using Node.js 20 LTS + TypeScript 5.x + NestJS framework, PostgreSQL 15+ with PostGIS, Redis 7+ for caching, deployed on AWS ECS Fargate
- **Web Application:** Next.js 14+ (React 18) with Tailwind CSS and shadcn/ui components for rapid development with excellent UX
- **Mobile Apps:** React Native 0.73+ with Expo managed workflow for faster development and OTA updates; can eject to bare workflow if native modules needed
- **Payments:** Stripe Connect for escrow and split payments (2.9% + $0.30 per transaction)
- **Background Checks:** Checkr for comprehensive screening ($50-80 per guard)
- **Identity Verification:** Persona for KYC/document verification ($1-3 per verification)
- **GPS/Mapping:** Mapbox for cost-effective mapping with better offline support than Google Maps
- **Communications:** Twilio for SMS ($0.0079 per message), OneSignal for push notifications (free tier), Ably for real-time updates (free tier initially)
- **Monitoring:** Datadog for infrastructure/APM/logs ($100-200/month), Sentry for error tracking (free tier)

### MVP Scope & Timeline

**Phase 1-2 (Weeks 1-10):** Foundation + Core Features
- Authentication, user management, database schema, admin dashboard
- Job posting/browsing, guard onboarding (KYC + background checks), basic matching, payment integration

**Phase 3-4 (Weeks 11-16):** Mobile + Real-time
- React Native apps for iOS/Android, GPS tracking, offline sync, real-time updates, messaging

**Phase 5-6 (Weeks 17-24):** Admin Tools + Launch
- Compliance features, incident reporting, audit logs, testing, security audit, app store submission

### Risk Mitigation Priorities

1. **GPS Reliability:** Implement geofencing, photo proof requirements, and multi-source location data to compensate for unreliable connectivity at remote sites
2. **Payment Security:** Use Stripe Radar fraud detection, require photo evidence of service, hold funds in escrow with 24-hour review period
3. **Regulatory Compliance:** Build flexible system for state-specific rules, consult legal counsel quarterly, monitor legislative changes
4. **Third-party Dependencies:** Implement retry logic, fallback options, and monitoring for all critical integrations (Stripe, Checkr, Mapbox)
5. **Scope Creep:** Enforce strict MVP feature list, defer nice-to-haves to Phase 2, maintain product discipline

### Long-term Considerations

- **Plan for Scale:** Architecture supports 10K+ concurrent users with horizontal scaling, read replicas, and caching—sufficient for growth to 50K+ total users
- **Vendor Flexibility:** Abstract third-party integrations behind service interfaces to enable swapping vendors if needed (avoid deep coupling)
- **Security Posture:** Budget for annual penetration testing ($5K-10K), implement bug bounty program post-launch, maintain security monitoring and incident response plan
- **Data Strategy:** Implement automated data retention policies, CCPA-compliant export/deletion capabilities, and clear privacy controls from day one

## Related Nodes

- **Spawned by:** OBJ-1 (Build Aegis Platform)
- **Research Report:** R-3 (Technical Architecture & Build vs. Buy Research Report)
- **Informs:** Development timeline, vendor selection, MVP feature scope, budget planning
