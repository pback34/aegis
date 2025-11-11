---
node_type: Question
status: Complete
priority: High
created: 2025-11-09
updated: 2025-11-09
spawned_by:
  - Q-3
informs:
  - R-7
tags:
  - technical
  - database
  - schema
  - mvp
  - demo
---

# Q-7: Database Schema Design for MVP/Demo

## Question

What database schema (tables, fields, relationships) do we need for a working MVP/proof-of-concept that supports the core booking flow with minimal complexity?

## Context

Based on Q-3's recommendation to use PostgreSQL with PostGIS for location data, we need to define a minimal but functional database schema. The goal is to support the core flows (job creation, matching, tracking, payment) without over-engineering for scale or advanced features.

**MVP Scope:** Focus on essential tables and fields that make the demo work, avoid premature optimization.

## Research Objectives

1. **Core Database Tables**
   - What are the minimum tables needed (Users, Jobs, Locations, Payments)?
   - What fields are essential for MVP vs. nice-to-have?
   - What relationships are required?

2. **User & Authentication**
   - Single users table with role field, or separate customers/guards tables?
   - What auth fields are needed (email, password_hash, role)?
   - Guard-specific fields (license_number, skills, hourly_rate)?

3. **Jobs & Matching**
   - How do we model a security job request?
   - How do we track job status (requested, matched, in_progress, complete)?
   - How do we represent guard assignment to job?

4. **Location Tracking**
   - How do we store location history for GPS tracking?
   - Do we need PostGIS point types or simple lat/lng?
   - How often do we persist location updates?

5. **Payments**
   - What payment state do we need to track?
   - Do we store Stripe payment intent IDs and customer IDs?
   - Separate transactions table or embed in jobs?

## Research Questions

### Table Structure
- [ ] What are the core tables for MVP (users, jobs, locations, payments)?
- [ ] Single users table or separate customers/guards tables?
- [ ] Do we need a separate matches/assignments table or embed in jobs?
- [ ] Do we need a separate guard_profiles table or embed in users?

### Users Table
- [ ] Common fields: id, email, password_hash, role (customer/guard/admin), created_at
- [ ] Guard-specific: license_number, hourly_rate, skills (JSON or separate table?), availability
- [ ] Customer-specific: stripe_customer_id, default_payment_method
- [ ] Can we use JSONB for flexible guard metadata in MVP?

### Jobs Table
- [ ] Essential fields: id, customer_id, guard_id (nullable until matched), status, start_time, duration
- [ ] Location: address, lat, lng (use PostGIS geography type?)
- [ ] Pricing: hourly_rate, total_amount, platform_fee
- [ ] Job type: security_type (basic, event, executive), special_requirements (JSONB?)
- [ ] Timestamps: requested_at, matched_at, started_at, completed_at

### Location Tracking
- [ ] Separate location_history table or embed current location in jobs?
- [ ] Fields: guard_id, job_id, lat, lng, accuracy, timestamp
- [ ] How long to retain location history (24 hours, 7 days)?
- [ ] Use PostGIS geography vs simple decimal lat/lng?

### Payments
- [ ] Separate payments table or embed in jobs?
- [ ] Fields: job_id, stripe_payment_intent_id, amount, status, created_at
- [ ] Track both customer charge and guard payout?
- [ ] Do we need refunds table for MVP?

### Relationships & Constraints
- [ ] What foreign keys are required?
- [ ] What indexes are needed for performance (location queries, job lookups)?
- [ ] What constraints ensure data integrity (status transitions, required fields)?

### Migration Strategy
- [ ] TypeORM migrations or raw SQL?
- [ ] Seed data needed for demo (test users, test jobs)?
- [ ] How to handle schema changes during MVP development?

## Success Criteria

This research is complete when we can answer:

1. ✓ List of database tables with fields and types
2. ✓ Primary relationships and foreign keys
3. ✓ Essential indexes for performance
4. ✓ Migration approach and seed data strategy
5. ✓ Recommended schema design for MVP

## Research Methods

- Reference marketplace database patterns (user-job-payment models)
- Review PostgreSQL and PostGIS best practices
- Analyze TypeORM entity patterns for NestJS
- Consider denormalization trade-offs for MVP simplicity
- Reference Stripe integration data storage patterns

## Expected Outputs

- Entity-relationship diagram (ERD) for core tables
- Table definitions with fields and data types
- List of required indexes
- Sample TypeORM entity code (optional)
- Migration and seed data strategy

## Findings

Research R-7 has determined that a **lean 6-table schema** provides the optimal balance between simplicity and functionality for the Aegis MVP. The recommended approach uses PostgreSQL with PostGIS for spatial queries, JSONB for flexible metadata fields, and TypeORM for migrations and entity management.

**Core Schema Design:** A single `users` table with role-based polymorphism (customer/guard/admin) simplifies authentication and reduces join complexity. Guard-specific data (license, skills, availability, location) is separated into a `guard_profiles` table for cleaner data organization. Jobs, location history, and payments each have dedicated tables with appropriate foreign key constraints.

**Key Technical Decisions:** All location data uses PostGIS geography type for accurate distance calculations with spatial indexes (GIST). Money fields are stored as integers (cents) to avoid floating-point precision issues. Skills and job requirements use JSONB arrays for flexible taxonomy without premature normalization. Status fields use PostgreSQL enums for type safety.

**Performance Strategy:** Essential indexes cover foreign keys, status filters, and location-based queries. PostGIS spatial indexes enable efficient "nearest guard" matching queries. Composite indexes optimize common query patterns like finding active jobs ordered by time. The schema supports 500+ concurrent users in MVP phase with room to scale using read replicas and partitioning.

## Key Insights

- **Single users table with roles** simplifies authentication and eliminates polymorphic join complexity while maintaining clear role separation through guard_profiles
- **PostGIS geography type** provides accurate real-world distance calculations (crucial for 10-15 mile radius matching) with efficient spatial indexes
- **JSONB for skills and metadata** avoids premature normalization and allows flexible taxonomy evolution without schema migrations
- **Store money as cents** prevents floating-point precision errors in financial calculations and payment processing
- **Soft deletes with deleted_at** enable CCPA compliance (user data retention) while maintaining referential integrity for historical records
- **Generated columns** (duration_hours) reduce application logic and ensure consistent calculations at database level
- **Partial indexes** (WHERE availability_status = 'available') significantly reduce index size and improve query performance for filtered queries
- **Foreign key RESTRICT on financial tables** protects critical payment and job data from accidental deletion
- **30-day location retention** balances customer safety needs (job tracking) with privacy compliance (CCPA data minimization)
- **TypeORM migrations** provide version control, reversibility, and team collaboration for schema changes with minimal friction

## Recommendations

### Tables & Structure

1. **Implement 6-table schema**: users, guard_profiles, jobs, location_history, payments, (optional: sessions in Redis)
2. **Use single users table** with role enum (customer/guard/admin) for unified authentication
3. **Create guard_profiles table** with one-to-one relationship to users for guard-specific data
4. **Leverage JSONB columns** for skills, certifications, job requirements, and flexible metadata
5. **Use PostGIS geography(Point, 4326)** for all location fields (current_location, job coordinates, check-in points)

### Relationships & Constraints

6. **Foreign keys with ON DELETE RESTRICT** for jobs and payments (protect financial data)
7. **Foreign keys with ON DELETE CASCADE** for guard_profiles and location_history (dependent data)
8. **Unique constraints** on guard_profiles.user_id (enforce one-to-one), users.email (prevent duplicates)
9. **Implement soft deletes** (deleted_at timestamp) for users table to support CCPA compliance
10. **CHECK constraints** for data validation (rating ranges, date logic, positive amounts)

### Indexes & Performance

11. **Create GIST spatial indexes** on all geography columns (guard_profiles.current_location, jobs.location_coordinates)
12. **Use GIN indexes** for JSONB columns (skills, required_skills) to enable efficient array containment queries
13. **Add composite indexes** for common patterns (jobs.status + start_time, location_history.guard_id + job_id + recorded_at)
14. **Implement partial indexes** for filtered queries (guard_profiles WHERE availability_status = 'available')
15. **Monitor index usage** with pg_stat_user_indexes and adjust based on production query patterns

### Migrations & Data Management

16. **Use TypeORM migrations** for all schema changes with clear up/down functions for reversibility
17. **Create seed migration** with demo users (customer, 3 guards, admin) using password 'demo123' for testing
18. **Implement automated cleanup** via cron jobs (location_history > 30 days, inactive users > 1 year)
19. **Provide data export API** for CCPA compliance (users can request full data export as JSON/PDF)
20. **Test all migrations in staging** before production deployment with database backup

### PostgreSQL Features

21. **Define enum types** for type safety (user_role, user_status, job_status, job_type, payment_status)
22. **Use generated columns** for auto-calculated fields (duration_hours from start_time and end_time)
23. **Create triggers** for updated_at timestamp auto-update on all tables with UPDATE operations
24. **Enable PostGIS extension** in initial migration and verify installation (SELECT PostGIS_Version())

### Security & Privacy

25. **Exclude password_hash** from JSON serialization using @Exclude decorator in TypeORM entities
26. **Store monetary values as INTEGER cents** (hourly_rate_cents, total_amount_cents) to avoid precision errors
27. **Encrypt sensitive fields** at application level (SSN, background check results) before database storage
28. **Retain location data for 30 days only** then automatic deletion for privacy compliance (CCPA data minimization)

## Priority & Timeline

- **Priority:** High (blocks development start)
- **Timeline:** Completed
- **Blockers:** None

## Notes

**Focus on MVP/Demo Scope:**
- Prove data model works for core flow
- Use JSONB for flexible fields (guard skills, job requirements) to avoid over-engineering
- Defer: Ratings, reviews, messaging, incident reports, analytics tables
- Simple status enums for jobs (requested, matched, in_progress, complete, cancelled)
- Minimal location tracking (store current position, don't over-optimize history)

**PostgreSQL + PostGIS:**
- Use geography type for location data (accurate distance calculations)
- Leverage PostGIS spatial queries for guard-job matching by proximity
- Use built-in JSON support for flexible metadata

**Related Nodes:**
- Spawned by: Q-3 (Technical Architecture)
- Will inform: Decision on database schema, Artifact for database specification
