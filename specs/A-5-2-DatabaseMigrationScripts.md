# Database Migration Scripts Specification

**Document Version**: 1.0
**Created**: 2025-11-09
**Decision Reference**: D-5

---

## Overview

Initial TypeORM migration scripts implementing the 6-table schema with PostGIS, enums, indexes, and triggers.

## Migration 0: Enable Extensions

```typescript
// migrations/1699564100000-EnableExtensions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableExtensions1699564100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    const result = await queryRunner.query(`SELECT PostGIS_Version()`);
    console.log('PostGIS version:', result[0].postgis_version);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "postgis"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
```

## Migration 1: Create Enums

```typescript
// migrations/1699564200000-CreateEnums.ts
export class CreateEnums1699564200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('customer', 'guard', 'admin');
      CREATE TYPE "user_status" AS ENUM ('active', 'inactive', 'suspended');
      CREATE TYPE "job_status" AS ENUM ('requested', 'matched', 'accepted', 'in_progress', 'completed', 'cancelled');
      CREATE TYPE "job_type" AS ENUM ('basic', 'event', 'executive', 'specialized');
      CREATE TYPE "payment_status" AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded');
      CREATE TYPE "availability_status" AS ENUM ('available', 'busy', 'offline');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TYPE IF EXISTS "availability_status";
      DROP TYPE IF EXISTS "payment_status";
      DROP TYPE IF EXISTS "job_type";
      DROP TYPE IF EXISTS "job_status";
      DROP TYPE IF EXISTS "user_status";
      DROP TYPE IF EXISTS "user_role";
    `);
  }
}
```

## Migration 2: Create Users Table

```typescript
// migrations/1699564300000-CreateUsersTable.ts
export class CreateUsersTable1699564300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "role" user_role NOT NULL DEFAULT 'customer',
        "status" user_status NOT NULL DEFAULT 'active',
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "phone_number" VARCHAR(20),
        "profile" JSONB,
        "stripe_customer_id" VARCHAR(255),
        "mfa_secret" VARCHAR(255),
        "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
        "mfa_backup_codes" JSONB,
        "deleted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX "idx_users_email" ON "users" ("email");
      CREATE INDEX "idx_users_role_status" ON "users" ("role", "status");
      CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at") WHERE "deleted_at" IS NULL;

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON "users"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);
  }
}
```

## Migrations 3-7: Remaining Tables

Similar structure for:
- **Migration 3**: guard_profiles table (with PostGIS current_location, GIN skills index)
- **Migration 4**: jobs table (with PostGIS location_coordinates, generated duration_hours column)
- **Migration 5**: payments table (with Stripe references, unique indexes)
- **Migration 6**: location_history table (with PostGIS location, composite indexes)
- **Migration 7**: background_checks table (stubbed MVP fields)

## Running Migrations

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n MigrationName

# Run pending migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert

# Show migration status
npm run typeorm migration:show
```

## package.json Scripts

```json
{
  "scripts": {
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "migration:generate": "npm run typeorm -- migration:generate -d src/config/typeorm.config.ts",
    "migration:run": "npm run typeorm -- migration:run -d src/config/typeorm.config.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/config/typeorm.config.ts",
    "migration:show": "npm run typeorm -- migration:show -d src/config/typeorm.config.ts"
  }
}
```

---

**End of Document**
