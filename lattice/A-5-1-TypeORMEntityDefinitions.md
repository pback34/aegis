---
node_type: Artifact
artifact_type: Code
artifact_format: TypeScript
status: Complete
created: 2025-11-09
updated: 2025-11-09
priority: Critical
spawned_by:
  - D-3
  - D-5
informs: []
tags:
  - artifact
  - code
  - database
  - typeorm
  - entities
  - postgis

# Artifact Location
artifact_location: ../specs/A-5-1-TypeORMEntityDefinitions.md
external_files:
  - specs/A-5-1-TypeORMEntityDefinitions.md
---

# A-5-1: TypeORM Entity Definitions

## Artifact Description

Complete TypeORM entity definitions for all 6 database tables: users, guard_profiles, jobs, payments, location_history, background_checks. Includes PostGIS geography types, JSONB columns, class-validator decorators, relationships, and indexes.

## Content Summary

**6 Complete TypeORM Entities**:

1. **User** - Main user table with role polymorphism (customer/guard/admin), MFA fields, soft delete
2. **GuardProfile** - One-to-one guard data with PostGIS current_location, JSONB skills, hourly rate
3. **Job** - Security job requests with status state machine, PostGIS coordinates, tracking points
4. **Payment** - Stripe payment tracking with amount breakdown (total, fee, payout)
5. **LocationHistory** - GPS tracking points with PostGIS, 30-day retention
6. **BackgroundCheck** - Stubbed for MVP with manual approval workflow

## Key Features

- **PostGIS Geography Type**: `Point` with SRID 4326 for all location fields
- **JSONB Columns**: skills, certifications, trackingPoints with GIN indexes
- **Generated Columns**: durationHours auto-calculated from timestamps
- **Validation Decorators**: `@IsEmail`, `@MinLength`, `@Min`, `@Max` for entity-level validation
- **Security**: `@Exclude()` on sensitive fields (passwordHash, mfaSecret)
- **Indexes**: GIST (spatial), GIN (JSONB), B-tree (foreign keys, status fields)
- **Relationships**: OneToOne, OneToMany, ManyToOne with proper JoinColumn

## File Structure

```
src/modules/
├── users/entities/user.entity.ts
├── guards/entities/guard-profile.entity.ts
├── jobs/entities/job.entity.ts
├── payments/entities/payment.entity.ts
├── locations/entities/location-history.entity.ts
└── background-checks/entities/background-check.entity.ts
```

## Related Nodes

- **Spawned by**: D-3 (Database Schema), D-5 (Migration Strategy)
- **Leads to**: A-5-2 (Migrations), A-5-3 (Seed Data)
- **Used by**: All API services and repositories

**Status**: ✅ Complete - Ready for implementation
