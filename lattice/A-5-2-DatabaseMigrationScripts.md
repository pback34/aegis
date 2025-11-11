---
node_type: Artifact
artifact_type: Code
artifact_format: TypeScript
status: Complete
created: 2025-11-09
updated: 2025-11-09
priority: Critical
spawned_by:
  - D-5
informs: []
tags:
  - artifact
  - code
  - database
  - migrations
  - typeorm
  - postgis

# Artifact Location
artifact_location: ../specs/A-5-2-DatabaseMigrationScripts.md
external_files:
  - specs/A-5-2-DatabaseMigrationScripts.md
---

# A-5-2: Database Migration Scripts

## Artifact Description

TypeORM migration scripts for initial database schema setup: enable PostGIS extension, create enums, create all 6 tables with indexes and triggers.

## Content Summary

**7 Initial Migrations**:
1. Enable PostGIS and uuid-ossp extensions
2. Create enums (user_role, job_status, payment_status, etc.)
3. Create users table with updated_at trigger
4. Create guard_profiles table with PostGIS and GIN indexes
5. Create jobs table with generated columns
6. Create payments and location_history tables
7. Create background_checks table

Plus npm scripts for migration management (generate, run, revert, show).

## Related Nodes

- **Spawned by**: D-5 (Migration Strategy)
- **Implements**: A-5-1 (Entity Definitions)

**Status**: ✅ Complete - Ready for implementation
