---
node_type: Decision
decision_type: Design
status: Proposed
created: 2025-11-09
updated: 2025-11-09
priority: High
spawned_by:
  - Q-7
  - Q-3
informs: []
depends_on:
  - D-1
tags:
  - technical
  - database
  - schema
  - postgresql
  - postgis
  - mvp

# AI Metadata
created_by: AI:DecisionAgent
ai_confidence: 0.87
human_review_required: true
review_status: Pending
---

# D-3: MVP Database Schema Design

## Decision

Implement a lean 6-table PostgreSQL database schema with PostGIS extension for geospatial queries: `users` (with role-based polymorphism for customer/guard/admin), `guard_profiles` (one-to-one guard-specific data), `jobs` (security job requests with status state machine), `location_history` (GPS tracking points with 30-day retention), `payments` (Stripe transaction records), and `background_checks` (stubbed for MVP with manual approval). Use JSONB columns for flexible metadata (skills, certifications, job requirements), TypeORM for migrations and entity management, and strategic indexes (GIST for geography, GIN for JSONB, composite for common queries).

## Rationale

Based on comprehensive database schema research from Q-7 and technical architecture decisions from Q-3, this schema design provides the **optimal balance between simplicity and functionality** for the Aegis MVP while supporting future scalability.

### 1. Single `users` Table with Role Polymorphism

**Design Decision**: One `users` table with `role` enum (customer/guard/admin) rather than separate tables.

**Rationale:**

- **Simplified authentication**: Single query to verify credentials regardless of role
- **Unified user management**: Password resets, email verification, account status apply to all roles
- **Flexible role transitions**: Users can potentially be both customers and guards (future feature)
- **Reduced join complexity**: Fewer polymorphic joins when querying user data
- **Clear separation via `guard_profiles`**: Guard-specific data lives in separate table, avoiding sparse columns

**Trade-off**: Users table has some null fields depending on role (e.g., `stripe_customer_id` null for guards), but JSONB profiles can absorb role-specific metadata if needed.

### 2. Separate `guard_profiles` Table (One-to-One)

**Design Decision**: Guard-specific data (license, skills, availability, location) in dedicated table.

**Rationale:**

- **Cleaner data organization**: Prevents users table from becoming bloated with guard-only fields
- **Better query performance**: Customer queries don't scan irrelevant guard fields
- **Clear separation of concerns**: Guard onboarding and profile management isolated
- **Easier guard-specific indexing**: Can index on `availability_status`, `current_location` without affecting customer queries
- **Supports future guard verification workflows**: Background checks, license renewal, certification expiry tracked here

**Key Fields**:
```sql
guard_profiles:
  - user_id (FK to users, UNIQUE)
  - license_number, license_state, license_expiry
  - skills (JSONB array: ["armed", "k9", "crowd_control"])
  - certifications (JSONB array)
  - hourly_rate_cents (INTEGER to avoid float precision errors)
  - availability_status (ENUM: available, busy, offline)
  - current_location (GEOGRAPHY(Point, 4326) for PostGIS)
```

### 3. PostGIS for Geospatial Queries

**Design Decision**: Use PostGIS `GEOGRAPHY(Point, 4326)` type for all location data.

**Rationale:**

- **Accurate distance calculations**: GEOGRAPHY type uses spherical earth model (WGS 84), critical for 10-15 mile radius matching
- **Efficient spatial indexes**: GIST indexes enable fast "find guards within X miles" queries
- **Native SQL geospatial functions**: `ST_DWithin(location, point, distance)` for proximity matching
- **Industry standard**: WGS 84 (SRID 4326) is GPS standard, ensures compatibility
- **No conversion overhead**: Store GPS coordinates directly without projection transformations

**Example Query**:
```sql
-- Find guards within 15 miles of job location
SELECT * FROM guard_profiles
WHERE availability_status = 'available'
  AND ST_DWithin(
    current_location,
    ST_MakePoint(-118.2437, 34.0522)::geography, -- LA coordinates
    24140  -- 15 miles in meters
  );
```

**Performance**: GIST index on `current_location` makes this query O(log n) instead of O(n) table scan.

### 4. JSONB for Flexible Metadata

**Design Decision**: Use JSONB columns for skills, certifications, and job requirements.

**Rationale:**

- **Avoids premature normalization**: Don't create separate `skills` and `guard_skills` tables when taxonomy is still evolving
- **Flexible schema evolution**: Add new skills or certifications without migrations
- **Efficient array operations**: GIN indexes enable fast `skills @> '["armed"]'::jsonb` containment queries
- **Preserves type safety**: JSONB validates JSON structure on insert
- **Better than TEXT**: Queryable and indexable, unlike plain text or serialized JSON

**Example Data**:
```json
{
  "skills": ["armed", "unarmed", "patrol", "access_control"],
  "certifications": [
    {"type": "CPR", "issuer": "Red Cross", "expiry": "2026-01-15"},
    {"type": "First Aid", "issuer": "Red Cross", "expiry": "2026-01-15"}
  ]
}
```

**Query Pattern**:
```sql
-- Find guards with specific skill
SELECT * FROM guard_profiles
WHERE skills @> '["armed"]'::jsonb;

-- GIN index makes this fast
CREATE INDEX idx_guard_profiles_skills ON guard_profiles USING GIN (skills);
```

### 5. Money as Cents (INTEGER)

**Design Decision**: Store all monetary values as INTEGER cents, not DECIMAL or FLOAT.

**Rationale:**

- **No floating-point precision errors**: Avoid `0.1 + 0.2 = 0.30000000000000004` bugs in financial calculations
- **Integer arithmetic is exact**: Addition, subtraction, multiplication are always precise
- **Simpler application logic**: Convert to dollars only for display (`cents / 100`)
- **PostgreSQL INTEGER is efficient**: 4 bytes, supports up to $21M (2^31 / 100)
- **Industry best practice**: Stripe API uses cents, payment processors use smallest currency unit

**Example**:
```sql
jobs:
  - hourly_rate_cents INTEGER  -- $50/hr stored as 5000
  - total_amount_cents INTEGER -- $200 total stored as 20000

payments:
  - amount_cents INTEGER
  - platform_fee_cents INTEGER
  - guard_payout_cents INTEGER
```

### 6. Job Status State Machine

**Design Decision**: `jobs.status` enum with linear state progression for MVP.

**Rationale:**

- **Type safety**: PostgreSQL ENUM prevents invalid statuses in database
- **Clear state transitions**: `requested → matched → accepted → in_progress → completed → cancelled`
- **Simplified business logic**: Linear progression for MVP (no complex state graphs)
- **Audit trail**: Combined with `created_at`, `matched_at`, `started_at`, `completed_at` timestamps for compliance

**Status Flow**:
```
requested: Customer creates job
    ↓
matched: System assigns guard
    ↓
accepted: Guard accepts job
    ↓
in_progress: Guard checks in (starts job)
    ↓
completed: Guard checks out (job done)
    ↓
paid: Payment captured successfully

(cancelled can happen from any state)
```

### 7. Location History with 30-Day Retention

**Design Decision**: Separate `location_history` table with automated 30-day deletion.

**Rationale:**

- **Privacy compliance**: CCPA data minimization requires limiting location data retention
- **Audit trail**: 30 days sufficient for dispute resolution and customer safety investigations
- **Performance optimization**: Prevents jobs table from bloating with location points
- **Flexible storage**: JSONB `tracking_points` array stores last 50 locations per job in `jobs` table for real-time tracking, `location_history` archives all points

**Schema**:
```sql
location_history:
  - id (PK)
  - guard_id (FK to users)
  - job_id (FK to jobs)
  - location (GEOGRAPHY(Point, 4326))
  - accuracy_meters (FLOAT)
  - recorded_at (TIMESTAMP)
  - created_at (TIMESTAMP DEFAULT NOW())

-- Automatic deletion via cron job or trigger
DELETE FROM location_history WHERE created_at < NOW() - INTERVAL '30 days';
```

**Index**: Composite index on `(job_id, recorded_at)` for efficient time-series queries.

### 8. TypeORM Migrations for Version Control

**Design Decision**: Use TypeORM migrations for all schema changes.

**Rationale:**

- **Version control**: Migrations tracked in Git alongside code
- **Reversibility**: Every migration has `up` and `down` functions
- **Team collaboration**: Developers sync schema changes via Git pull
- **Deployment automation**: Migrations run automatically in CI/CD pipeline
- **NestJS integration**: TypeORM is first-class citizen in NestJS ecosystem

**Workflow**:
```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n AddBackgroundChecks

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

### 9. Strategic Indexes for Performance

**Design Decision**: Create indexes for common query patterns, but avoid over-indexing.

**Rationale:**

- **Read-heavy workload**: MVP will have more reads than writes (guard searches, job lookups)
- **Index trade-offs understood**: Indexes speed reads but slow writes and increase storage
- **Targeted indexing**: Focus on foreign keys, status filters, and geospatial queries

**Essential Indexes**:

**users table**:
- `idx_users_email` (UNIQUE) - Login queries
- `idx_users_role_status` (role, status) - Admin user management

**guard_profiles table**:
- `idx_guard_profiles_user_id` (UNIQUE) - Enforce one-to-one
- `idx_guard_profiles_availability` (availability_status) PARTIAL `WHERE availability_status = 'available'` - Guard search
- `idx_guard_profiles_location` (current_location) GIST - Geospatial matching
- `idx_guard_profiles_skills` (skills) GIN - Skill filtering

**jobs table**:
- `idx_jobs_customer_id` (customer_id) - Customer job history
- `idx_jobs_guard_id` (guard_id) - Guard job history
- `idx_jobs_status_start_time` (status, start_time) - Active jobs sorted by time
- `idx_jobs_location` (location_coordinates) GIST - Nearby jobs

**payments table**:
- `idx_payments_stripe_payment_intent_id` (UNIQUE) - Webhook deduplication
- `idx_payments_job_id` (UNIQUE) - One payment per job
- `idx_payments_status` (status) - Payment reconciliation

**location_history table**:
- `idx_location_history_job_recorded` (job_id, recorded_at) - Time-series queries
- `idx_location_history_created` (created_at) - Retention cleanup

## Alternatives Considered

### Alternative 1: Separate `customers` and `guards` Tables

**Pros:**
- No null fields (each table has only relevant columns)
- Clearer data model (explicit separation)

**Cons:**
- Polymorphic joins complicate authentication queries
- User can't easily be both customer and guard (future flexibility lost)
- Two tables to maintain for common user operations (password reset, email verification)
- More complex admin queries (UNION to get all users)
- **REJECTED**: Flexibility and simplicity of single table outweigh null field concerns

### Alternative 2: NoSQL (MongoDB) Instead of PostgreSQL

**Pros:**
- Schema flexibility without migrations
- Horizontal scaling easier (sharding)
- JSONB-like documents native

**Cons:**
- **No geospatial indexes as mature as PostGIS**
- Weaker transaction support (critical for payments)
- No foreign key constraints (data integrity burden on application)
- Team less familiar with MongoDB
- Harder to do complex joins for reporting
- **REJECTED**: PostgreSQL + PostGIS is better fit for geospatial + transactional workload

### Alternative 3: Store Location Points in Separate Table Instead of JSONB Array

**Pros:**
- Better normalization
- Easier to query individual location points

**Cons:**
- More complex queries (JOIN required for every location fetch)
- Higher storage overhead (separate rows vs. JSONB array)
- Slower real-time location updates (INSERT vs. UPDATE)
- **PARTIALLY ADOPTED**: Use `location_history` table for archives, keep last 50 points in `jobs.tracking_points` JSONB for real-time access

### Alternative 4: Soft Deletes for All Tables

**Pros:**
- Data recovery if accidental deletion
- Audit trail of deleted records

**Cons:**
- Complicates every query (add `WHERE deleted_at IS NULL`)
- Indexes must include `deleted_at` (overhead)
- Harder to enforce UNIQUE constraints
- **PARTIALLY ADOPTED**: Soft delete only for `users` table (CCPA compliance), hard delete for jobs/payments (financial audit requires immutable records, use status instead)

## Implications

### Development Requirements

1. **PostgreSQL 15+ with PostGIS Extension**:
   - Install PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`
   - Verify installation: `SELECT PostGIS_Version();`
   - Enable in initial migration

2. **TypeORM Setup**:
   - Configure TypeORM with PostgreSQL connection
   - Create TypeORM entities matching schema
   - Set up migration generation and execution scripts
   - Configure test database for integration tests

3. **Seed Data for Development**:
   - Create seed migration with demo users (1 customer, 3 guards, 1 admin)
   - Password: `demo123` (bcrypt hashed)
   - Guard profiles with varied skills and locations (LA area)
   - Sample jobs in different states
   - Test payment records

### Query Performance

4. **Index Monitoring**:
   - Use `pg_stat_user_indexes` to monitor index usage
   - Remove unused indexes after 1 month in production
   - Add missing indexes based on slow query logs

5. **Query Optimization**:
   - Use `EXPLAIN ANALYZE` for slow queries (> 50ms)
   - Implement Redis caching for hot queries (active jobs, guard availability)
   - Use read replicas for reporting queries (post-MVP)

### Data Privacy & Compliance

6. **CCPA Compliance**:
   - Implement user data export API (JSON format)
   - Implement user data deletion workflow (soft delete users, cascade delete related data)
   - Location history auto-deletion after 30 days
   - Document data retention policies

7. **Encryption**:
   - Application-level encryption for SSN (if stored) using AES-256
   - Password hashing with bcrypt (10+ rounds)
   - Stripe customer IDs and payment intent IDs stored as-is (Stripe handles PCI compliance)

### Scalability Considerations

8. **Expected Load** (MVP):
   - < 500 concurrent users
   - < 100 active jobs at any time
   - < 10 location updates per second
   - PostgreSQL on AWS RDS (db.t3.medium) sufficient

9. **Scaling Strategy** (Post-MVP):
   - Read replicas for read-heavy queries
   - Connection pooling (PgBouncer) for high concurrency
   - Partition `location_history` by month (time-series optimization)
   - Consider moving hot data to Redis (guard availability, active job status)

### Testing & Validation

10. **Database Tests**:
    - Unit tests for TypeORM entities (validation, relationships)
    - Integration tests with test database (reset between tests)
    - Migration tests (up and down functions work correctly)
    - Index tests (verify EXPLAIN ANALYZE uses indexes)

11. **Data Integrity**:
    - Foreign key constraints enforced (ON DELETE RESTRICT for financial data)
    - Check constraints for data validation (rating 1-5, positive amounts)
    - Unique constraints (email, stripe_payment_intent_id)
    - NOT NULL constraints for required fields

## Risks & Mitigation

### Risk 1: PostGIS Complexity for Team

**Risk**: Team unfamiliar with PostGIS geography types and spatial queries

**Mitigation**:
- Provide PostGIS tutorial and documentation links
- Create reusable query helpers in repository (e.g., `findGuardsNearLocation(lat, lng, radiusMiles)`)
- Test geospatial queries thoroughly with known coordinates
- Use PostGIS visual tools (QGIS) to verify query results
- **Severity**: Medium | **Likelihood**: Medium | **Priority**: Training needed

### Risk 2: JSONB Schema Drift

**Risk**: Unvalidated JSONB data leads to inconsistent structure over time

**Mitigation**:
- Define JSON Schema for JSONB fields in application layer
- Validate JSONB structure in DTO decorators before database insert
- Document expected JSONB structure in schema comments
- Periodically audit JSONB data for inconsistencies
- **Severity**: Low | **Likelihood**: Medium | **Priority**: Validation layer required

### Risk 3: Index Overhead on Writes

**Risk**: Too many indexes slow down INSERT/UPDATE operations

**Mitigation**:
- Start with minimal indexes, add based on query patterns
- Monitor write performance (INSERT/UPDATE latency)
- Remove unused indexes after 1 month (pg_stat_user_indexes)
- Use partial indexes where appropriate (e.g., only index available guards)
- **Severity**: Low | **Likelihood**: Low | **Priority**: Monitor and adjust

### Risk 4: Location Data Privacy Violation

**Risk**: Storing location history longer than necessary violates CCPA

**Mitigation**:
- Automated cron job deletes location_history > 30 days old
- Alert if deletion job fails (dead man's switch)
- Document data retention policy in privacy policy
- Provide user data export/deletion API for CCPA requests
- **Severity**: High | **Likelihood**: Low | **Priority**: Automated deletion required

### Risk 5: Integer Cents Overflow

**Risk**: Hourly rates > $21M cause INTEGER overflow (unlikely but possible)

**Mitigation**:
- Use BIGINT for cents if rates exceed $10K/hour anticipated
- Add CHECK constraint: `hourly_rate_cents BETWEEN 0 AND 1000000` (max $10K/hr)
- Validate input in application layer (max $500/hr for MVP)
- Monitor for edge cases in production
- **Severity**: Low | **Likelihood**: Very Low | **Priority**: Input validation sufficient

### Risk 6: Migration Failures in Production

**Risk**: Migration fails mid-deployment, leaving database in inconsistent state

**Mitigation**:
- Test all migrations in staging before production
- Use database transactions in migrations (TypeORM default)
- Take database backup before production migrations
- Have rollback plan (migration:revert + code rollback)
- **Severity**: High | **Likelihood**: Low | **Priority**: Testing and backups mandatory

## Success Metrics

To validate this decision post-implementation:

1. **Query performance**: 95% of queries complete in < 50ms
2. **Geospatial accuracy**: Guard matching within 15 miles has 100% accuracy (verified with test coordinates)
3. **Data integrity**: Zero foreign key violations, zero orphaned records
4. **Migration success**: 100% of migrations run cleanly in staging and production
5. **Index efficiency**: All slow queries (> 50ms) use indexes (verified with EXPLAIN ANALYZE)
6. **Storage efficiency**: Database size < 1GB for 1000 users, 10K jobs (typical MVP scale)

## Dependencies

### Blocks These Decisions/Artifacts

- A-*: Backend database implementation artifacts
- A-*: TypeORM entity definitions and migrations
- D-2: API endpoints that query database

### Depends On

- **D-1**: MVP Technical Architecture (MUST be approved first - establishes PostgreSQL + PostGIS)
- Q-7: Database Schema Research (COMPLETED)
- Q-3: Technical Architecture Research (COMPLETED)

## Next Steps After Approval

1. **PostgreSQL + PostGIS Setup** (Week 1):
   - Provision AWS RDS PostgreSQL 15 instance (db.t3.medium)
   - Install PostGIS extension: `CREATE EXTENSION postgis;`
   - Configure connection pooling and SSL
   - Set up separate databases for development, testing, staging, production

2. **TypeORM Configuration** (Week 1):
   - Install dependencies: `typeorm`, `pg`, `@nestjs/typeorm`
   - Configure TypeORM module in NestJS app
   - Set up migration scripts in package.json
   - Create initial migration with PostGIS extension enable

3. **Define Entities** (Week 2):
   - Create TypeORM entities for all 6 tables
   - Add validation decorators (class-validator)
   - Define relationships (OneToOne, OneToMany, ManyToOne)
   - Add JSONB type handling for skills and metadata

4. **Create Initial Migrations** (Week 2):
   - Migration 1: Enable PostGIS extension
   - Migration 2: Create users and guard_profiles tables
   - Migration 3: Create jobs and location_history tables
   - Migration 4: Create payments and background_checks tables
   - Migration 5: Create all indexes (GIST, GIN, B-tree, partial)

5. **Seed Data** (Week 2):
   - Create seed migration with demo users (customer, guards, admin)
   - Generate sample guard profiles with LA area coordinates
   - Create sample jobs in various states
   - Add test payment records

6. **Validation & Testing** (Week 3):
   - Write integration tests for all entities
   - Test geospatial queries with known coordinates
   - Verify indexes are used (EXPLAIN ANALYZE)
   - Test migrations up and down
   - Load test with 10K rows to verify performance

## Related Nodes

- **Spawned by**: Q-7 (Database Schema Design for MVP/Demo), Q-3 (Technical Architecture)
- **Informs**: All backend implementation artifacts, D-2 (API Design)
- **Depends on**: D-1 (MVP Technical Architecture)

## Review Notes

**For Human Reviewer:**

This is a **High priority, high-confidence (0.87) design decision** that establishes the data model for the entire platform. Key points for your consideration:

1. **6 Tables**: Is this the right scope for MVP? Are we missing critical tables or over-engineering?

2. **Single users table vs. separate customers/guards**: Do you agree with role polymorphism approach, or prefer separate tables?

3. **PostGIS for geospatial**: Are you comfortable with PostGIS complexity, or prefer simple lat/lng decimals?

4. **JSONB for skills**: Do you agree with flexible JSONB approach, or prefer normalized skills table?

5. **Money as cents (INTEGER)**: Are you comfortable storing $50/hr as 5000 cents instead of DECIMAL(10,2)?

6. **30-day location retention**: Is 30 days the right balance between compliance and customer safety?

7. **TypeORM migrations**: Are you comfortable with TypeORM, or prefer raw SQL migrations?

Please approve, request revisions, or reject with feedback.

---

**AI Confidence Rationale**: 0.87 confidence based on:
- ✅ Comprehensive schema design following PostgreSQL best practices
- ✅ PostGIS is proven technology for geospatial queries (industry standard)
- ✅ JSONB provides flexibility without sacrificing query performance
- ✅ TypeORM is mature and well-integrated with NestJS
- ⚠️ Some uncertainty around exact number of indexes needed (may need to add/remove based on query patterns)
- ⚠️ PostGIS complexity may slow initial development if team is unfamiliar

**Human review required**: YES (High priority + establishes entire data model)
