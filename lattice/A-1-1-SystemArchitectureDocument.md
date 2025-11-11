---
node_type: Artifact
artifact_type: Design
artifact_format: SDD
status: Complete
created: 2025-11-10
updated: 2025-11-10
priority: Critical
spawned_by:
  - D-1
  - D-2
  - D-3
  - D-4
  - D-5
informs: []
tags:
  - artifact
  - design
  - architecture
  - c4-diagrams
  - system-design
  - sdd

# Artifact Location
artifact_location: ../specs/A-1-1-SystemArchitectureDocument.md
external_files:
  - specs/A-1-1-SystemArchitectureDocument.md
---

# A-1-1: System Architecture Document

## Artifact Description

Comprehensive **System Architecture Document** for the Aegis platform with C4 diagrams (Context, Container, Component), data flow diagrams, technology stack overview, deployment architecture, integration patterns, and security architecture. This document provides a complete visual and textual overview of the entire system.

## Purpose

Provide architects, developers, and stakeholders with a complete understanding of:
- How all system components interact
- Technology choices and their rationale
- Data flows for critical business processes
- Deployment and scaling strategies
- Security and compliance architecture
- Integration patterns with third-party services

## Content Summary

This comprehensive architecture document includes:

### **1. C4 Architecture Diagrams (Mermaid)**

**C4 Level 1 - System Context**:
- Shows Aegis platform with 3 user types (customers, guards, admins)
- External systems: Stripe, Checkr, Mapbox, Ably, Twilio, AWS
- High-level interactions and data flows

**C4 Level 2 - Container Diagram**:
- Web Application (Next.js)
- Customer Mobile App (React Native)
- Guard Mobile App (React Native)
- Backend API (NestJS)
- Database (PostgreSQL + PostGIS)
- Cache (Redis)
- External service integrations

**C4 Level 3 - Component Diagram (Backend API)**:
- Auth Module (JWT, MFA, token management)
- Users Module (profiles, management)
- Jobs Module (CRUD, lifecycle)
- Matching Module (algorithm, scoring)
- Locations Module (GPS tracking)
- Payments Module (Stripe integration)
- Guards Module (profiles, availability)
- Admin Module (dashboard, monitoring)
- Notifications Module (push, SMS, real-time)
- Security Middleware & Audit Interceptor

### **2. Technology Stack**

Complete breakdown of all technologies:
- **Frontend**: Next.js 14, React 18, React Native 0.73+, Tailwind CSS, TypeScript 5.x
- **Backend**: NestJS 10+, Node.js 20 LTS, TypeScript 5.x, TypeORM 0.3+
- **Database**: PostgreSQL 15+, PostGIS 3.x, Redis 7+
- **Third-Party**: Stripe Connect, Ably, Mapbox, Checkr (mocked), Twilio (mocked)
- **DevOps**: AWS ECS Fargate, RDS, S3, CloudFront, GitHub Actions, Datadog, Sentry

### **3. Data Flow Diagrams (Mermaid Sequence Diagrams)**

**Job Creation & Matching Flow**:
- Customer creates job → Matching algorithm runs → Guard receives offer → Guard accepts → Customer notified

**Real-time Location Tracking Flow**:
- Guard checks in → GPS updates every 30s → Backend stores → Ably broadcasts → Customer sees live map

**Payment Processing Flow**:
- Payment intent created → Authorized on job creation → Captured on completion → 24-hour hold → Payout to guard

### **4. Deployment Architecture**

AWS infrastructure diagram showing:
- CloudFront CDN for static assets
- Application Load Balancer for HTTPS termination
- ECS Fargate cluster (2-10 containers auto-scaling)
- RDS PostgreSQL (primary + read replica)
- ElastiCache Redis (session store + cache)
- S3 for file storage and backups

### **5. Security Architecture**

Multi-layer security diagram:
- **External Layer**: AWS WAF (DDoS protection), CloudFront (SSL/TLS)
- **Network Layer**: ALB (HTTPS only), Security Groups
- **Application Layer**: Rate limiting, CORS, Helmet headers, JWT auth, RBAC, input validation
- **Data Layer**: Field encryption (AES-256), audit logging, encrypted backups

Complete authentication/authorization sequence diagram showing:
- Login flow with bcrypt password verification
- JWT token generation (15-min access, 7-day refresh)
- Token storage (httpOnly cookies web, Keychain mobile)
- Token refresh with rotation
- RBAC permission checks

### **6. Data Architecture**

**Entity Relationship Diagram (Mermaid ERD)**:
- All 6 tables with relationships
- Primary keys, foreign keys, unique constraints
- Key fields documented

**Database Indexes Strategy Table**:
- GIST indexes for geospatial queries
- GIN indexes for JSONB containment
- B-tree indexes for foreign keys and filtering
- Partial indexes for performance optimization

### **7. Integration Architecture**

Third-party integration patterns diagram showing:
- Stripe Connect (REST API + webhooks)
- Ably (REST + WebSocket channels)
- Mapbox (Geocoding, Directions APIs)
- Checkr (mocked for MVP)
- Twilio (mocked for MVP)

Integration status table:
- Live integrations (Stripe, Ably, Mapbox)
- Mocked integrations (Checkr, Twilio, Persona)
- Critical path analysis

### **8. Scalability & Performance**

**Performance Targets Table**:
- API response time: p95 < 200ms, p99 < 500ms
- Database queries: < 50ms
- Matching algorithm: < 5 seconds
- Location update latency: < 2 seconds

**Scaling Strategy (3 Phases)**:
- MVP: 2 API containers, db.t3.medium, cache.t3.micro (50-100 guards)
- Growth: 5 API containers (auto-scale 2-10), db.t3.large + read replica (500-1000 guards)
- Scale: 10-50 containers, db.r5.xlarge + 2 replicas, Redis cluster (5000+ guards)

**Caching Strategy Table**:
- Active jobs (5 min TTL)
- Guard availability (5 min TTL)
- User sessions (7 day TTL)
- Query results (60 sec TTL)

### **9. Disaster Recovery & Business Continuity**

**Backup Strategy Table**:
- Database: Daily automated (7-day retention, RTO < 1 hour)
- Pre-migration snapshots (30-day retention)
- S3 versioning (90-day retention)

**Failure Scenarios Table**:
- API container failure (auto-restart, < 1 min recovery)
- Database failure (automatic failover, < 2 min recovery)
- Redis failure (graceful degradation, < 5 min recovery)
- External service outages (queue and retry)

### **10. Compliance & Privacy**

**Data Retention Policies**:
- User data: Until deletion + 90 days (CCPA, GDPR)
- Location history: 30 days (automated deletion)
- Payment records: 7 years (IRS compliance)
- Audit logs: 90 days

**Privacy by Design**:
- Location tracking only during active jobs
- User data export API (CCPA right to access)
- Account deletion API (CCPA right to deletion)
- Explicit consent for location tracking

### **11. Monitoring & Observability**

Monitoring stack diagram:
- Datadog (infrastructure, APM, logs)
- Sentry (error tracking)
- Ably metrics (message volume, latency)
- Grafana (custom metrics)

Key metrics and alert thresholds table

### **12. Future Architecture Evolution**

**Microservices Migration Path**:
- Current: Modular monolith
- Future: Extract services as needed (Auth, Matching, Locations, Payments)
- When to extract each service

**Multi-Region Deployment**:
- US-West and US-East regions
- Route53 geographic routing
- Database replication across regions

## Diagrams Included

- ✅ C4 Context Diagram (system with users and external systems)
- ✅ C4 Container Diagram (web app, mobile apps, API, database, cache)
- ✅ C4 Component Diagram (backend API modules)
- ✅ Job Creation & Matching Flow (sequence diagram)
- ✅ Real-time Location Tracking Flow (sequence diagram)
- ✅ Payment Processing Flow (sequence diagram)
- ✅ AWS Infrastructure Diagram (deployment architecture)
- ✅ Security Layers Diagram (multi-layer security)
- ✅ Authentication & Authorization Flow (sequence diagram)
- ✅ Entity Relationship Diagram (database schema)
- ✅ Third-Party Integration Patterns (service integrations)
- ✅ Monitoring Stack Diagram (observability)
- ✅ Scaling Strategy Diagram (3 phases: MVP, Growth, Scale)
- ✅ Microservices Migration Path (future evolution)
- ✅ Multi-Region Deployment (national scale)

**Total**: 15 Mermaid diagrams + 12 comprehensive tables

## Key Features

- **Visual-First**: All major architectural concepts illustrated with diagrams
- **Complete Stack**: Every technology choice documented with rationale
- **Production-Ready**: Includes DR, monitoring, compliance, and security
- **Future-Proof**: Evolution path to microservices and multi-region
- **Actionable**: Performance targets, alert thresholds, and metrics defined

## Use Cases

**For Architects**:
- Understand system boundaries and integration points
- Plan future scaling and evolution
- Review security and compliance posture

**For Developers**:
- Understand how components interact
- See data flows for features they're implementing
- Reference technology stack and patterns

**For DevOps**:
- Understand deployment architecture
- Plan infrastructure scaling
- Set up monitoring and alerts

**For Stakeholders**:
- Visualize the complete system
- Understand technology investments
- Review security and compliance measures

## Related Nodes

- **Spawned by**: D-1, D-2, D-3, D-4, D-5 (all architecture decisions)
- **Synthesizes**: Q-3, Q-6, Q-7, Q-8, Q-10, Q-11 (research findings)
- **Complements**: All other artifacts (A-4-1, A-4-2, A-4-3, A-5-1, A-5-2, A-5-3)
- **Informs**: Future decisions (D-6, D-7, D-8, D-9) and implementation planning

## Validation Criteria

This artifact is complete and comprehensive when:

- ✅ C4 diagrams at 3 levels (Context, Container, Component)
- ✅ All technology choices documented
- ✅ Data flows for critical processes illustrated
- ✅ Deployment and scaling strategies defined
- ✅ Security architecture documented
- ✅ Integration patterns specified
- ✅ Performance targets and monitoring defined
- ✅ DR and compliance covered
- ✅ Future evolution path outlined

**Status**: ✅ Complete - Ready for review and use

## Document Metadata

- **Format**: Markdown with Mermaid diagrams
- **Size**: ~25KB, 1400+ lines
- **Diagrams**: 15 Mermaid diagrams (C4, sequence, ERD, flow charts)
- **Tables**: 12 comprehensive tables
- **Sections**: 14 major sections + appendices
- **References**: Links to all decision and research documents

---

**Artifact Created**: 2025-11-10
**Based On**: D-1, D-2, D-3, D-4, D-5 + Q-3, Q-6, Q-7, Q-8, Q-10, Q-11
**External File**: specs/A-1-1-SystemArchitectureDocument.md (comprehensive SDD with 15 diagrams)
