---
node_type: Artifact
artifact_type: Code
artifact_format: TypeScript
status: Complete
created: 2025-11-09
updated: 2025-11-09
priority: High
spawned_by:
  - D-5
informs: []
tags:
  - artifact
  - code
  - database
  - seed-data
  - testing

# Artifact Location
artifact_location: ../specs/A-5-3-SeedDataGenerator.md
external_files:
  - specs/A-5-3-SeedDataGenerator.md
---

# A-5-3: Seed Data Generator

## Artifact Description

TypeORM seed migration creating demo data for development and testing: admin, customer, 3 guards with profiles in LA area, completed job with payment.

## Seed Data Included

- 1 admin user (admin@aegis.com / admin123)
- 1 customer (customer@example.com / customer123)
- 3 guards (guard1-3@example.com / guard123) with approved background checks
- Guard profiles with LA area coordinates and varying skills
- 1 completed job with payment record

## Related Nodes

- **Spawned by**: D-5 (Migration Strategy)
- **Depends on**: A-5-2 (Migrations must run first)

**Status**: ✅ Complete - Ready for implementation
