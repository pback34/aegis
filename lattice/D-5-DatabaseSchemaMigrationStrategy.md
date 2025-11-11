---
node_type: Decision
decision_type: Technical
status: Proposed
created: 2025-11-09
updated: 2025-11-09
priority: Critical
spawned_by:
  - Q-7
  - Q-3
  - D-3
informs: []
depends_on:
  - D-1
  - D-3
tags:
  - technical
  - database
  - typeorm
  - migrations
  - postgresql
  - postgis

# AI Metadata
created_by: AI:DecisionAgent
ai_confidence: 0.89
human_review_required: true
review_status: Pending
---

# D-5: Database Schema & Migration Strategy

## Decision

Implement the 6-table PostgreSQL schema from D-3 using TypeORM 0.3+ with code-first entity definitions, automated migration generation, versioned migration files committed to Git, AWS RDS PostgreSQL 15 deployment with PostGIS extension enabled, strategic indexing (GIST for geography, GIN for JSONB, B-tree for foreign keys), class-validator decorators for entity-level validation, comprehensive seed data for development/testing, and pg_dump backup strategy with point-in-time recovery enabled.

## Rationale

Based on database schema design from D-3 and technical architecture from D-1, this implementation strategy provides **production-ready database management** with type safety, version control, and operational reliability.

### 1. TypeORM Code-First with Entity Definitions

**Why Code-First Over Schema-First:**

**Type Safety:**
- Entities are TypeScript classes (compile-time type checking)
- Prevents runtime errors from schema/code mismatches
- IDE autocomplete for all fields and relationships

**Single Source of Truth:**
- Entity definitions drive database schema
- No manual SQL to keep in sync with code
- Migrations auto-generated from entity changes

**Better Developer Experience:**
- Object-oriented querying (`userRepository.findOne({ where: { email } })`)
- Relationship loading is explicit (`relations: ['guardProfile']`)
- Easy to write and maintain compared to raw SQL

**Entity Definition Pattern:**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsEmail, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()  // Never serialize in API responses
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 100 })
  @MinLength(2)
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  @MinLength(2)
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  profile?: Record<string, any>;  // Role-specific metadata

  // Stripe integration
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  // MFA fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  mfaSecret?: string;

  @Column({ type: 'boolean', default: false })
  mfaEnabled: boolean;

  // Soft delete
  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => GuardProfile, guardProfile => guardProfile.user, { nullable: true })
  guardProfile?: GuardProfile;

  @OneToMany(() => Job, job => job.customer)
  jobsAsCustomer: Job[];

  @OneToMany(() => Job, job => job.guard)
  jobsAsGuard: Job[];
}
```

**Benefits:**
- Decorators drive validation, serialization, and database schema
- Relationships are type-safe (TypeScript knows `user.guardProfile` exists)
- Automatic timestamp management (`@CreateDateColumn`, `@UpdateDateColumn`)

### 2. Migration Strategy: Versioned & Reversible

**Migration Generation Workflow:**

```bash
# 1. Developer modifies entity (e.g., adds field to User)
# 2. Generate migration from entity changes
npm run typeorm migration:generate -- -n AddMfaToUsers

# Output: migrations/1699564321234-AddMfaToUsers.ts
```

**Generated Migration Example:**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMfaToUsers1699564321234 implements MigrationInterface {
  name = 'AddMfaToUsers1699564321234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "mfa_secret" VARCHAR(255),
      ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "mfa_secret",
      DROP COLUMN "mfa_enabled"
    `);
  }
}
```

**Migration Execution:**

```bash
# Run pending migrations (CI/CD or manual)
npm run typeorm migration:run

# Rollback last migration (emergency only)
npm run typeorm migration:revert

# Show migration status
npm run typeorm migration:show
```

**Why This Approach:**
- **Version controlled**: Migrations committed to Git with code changes
- **Reversible**: Every `up` has a `down` (rollback support)
- **Auditable**: Migration history shows all schema changes
- **Team-friendly**: Developers pull latest migrations when syncing code
- **CI/CD ready**: Automated migration runs in deployment pipeline

**Migration Naming Convention:**
```
{timestamp}-{DescriptiveName}.ts

Examples:
1699564321234-InitialSchema.ts
1699564567890-AddPostGISExtension.ts
1699564789012-CreateJobsTable.ts
1699564901234-AddLocationIndexes.ts
```

### 3. Initial Schema Migrations (Week 1)

**Migration 0: Enable Extensions**

```typescript
export class EnableExtensions1699564100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // Verify PostGIS installation
    const result = await queryRunner.query(`SELECT PostGIS_Version()`);
    console.log('PostGIS version:', result[0].postgis_version);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "postgis"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
```

**Migration 1: Create Enums**

```typescript
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
      DROP TYPE IF EXISTS "user_role";
      DROP TYPE IF EXISTS "user_status";
      DROP TYPE IF EXISTS "job_status";
      DROP TYPE IF EXISTS "job_type";
      DROP TYPE IF EXISTS "payment_status";
      DROP TYPE IF EXISTS "availability_status";
    `);
  }
}
```

**Migration 2: Create Users Table**

```typescript
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
        "deleted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX "idx_users_email" ON "users" ("email");
      CREATE INDEX "idx_users_role_status" ON "users" ("role", "status");
      CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at") WHERE "deleted_at" IS NULL;

      -- Trigger for updated_at
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
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON "users"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
```

**Migration 3: Create Guard Profiles Table**

```typescript
export class CreateGuardProfilesTable1699564400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "guard_profiles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "license_number" VARCHAR(100) NOT NULL,
        "license_state" VARCHAR(2) NOT NULL,
        "license_expiry" DATE NOT NULL,
        "skills" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "certifications" JSONB DEFAULT '[]'::jsonb,
        "hourly_rate_cents" INTEGER NOT NULL CHECK (hourly_rate_cents > 0),
        "availability_status" availability_status NOT NULL DEFAULT 'offline',
        "current_location" GEOGRAPHY(Point, 4326),
        "bio" TEXT,
        "years_experience" INTEGER,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE UNIQUE INDEX "idx_guard_profiles_user_id" ON "guard_profiles" ("user_id");
      CREATE INDEX "idx_guard_profiles_availability" ON "guard_profiles" ("availability_status") WHERE "availability_status" = 'available';
      CREATE INDEX "idx_guard_profiles_location" ON "guard_profiles" USING GIST ("current_location");
      CREATE INDEX "idx_guard_profiles_skills" ON "guard_profiles" USING GIN ("skills");
      CREATE INDEX "idx_guard_profiles_license_state" ON "guard_profiles" ("license_state");

      -- Trigger for updated_at
      CREATE TRIGGER update_guard_profiles_updated_at
      BEFORE UPDATE ON "guard_profiles"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "guard_profiles"`);
  }
}
```

**Migration 4: Create Jobs Table**

```typescript
export class CreateJobsTable1699564500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "guard_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "status" job_status NOT NULL DEFAULT 'requested',
        "job_type" job_type NOT NULL DEFAULT 'basic',

        -- Location
        "location_address" TEXT NOT NULL,
        "location_coordinates" GEOGRAPHY(Point, 4326) NOT NULL,

        -- Timing
        "start_time" TIMESTAMP NOT NULL,
        "end_time" TIMESTAMP NOT NULL,
        "duration_hours" INTEGER GENERATED ALWAYS AS (
          EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
        ) STORED,

        -- Actual timing (for compliance)
        "actual_start_time" TIMESTAMP,
        "actual_end_time" TIMESTAMP,

        -- Pricing
        "hourly_rate_cents" INTEGER NOT NULL CHECK (hourly_rate_cents > 0),
        "total_amount_cents" INTEGER NOT NULL CHECK (total_amount_cents > 0),
        "platform_fee_cents" INTEGER,

        -- Requirements
        "required_skills" JSONB DEFAULT '[]'::jsonb,
        "special_instructions" TEXT,

        -- Tracking
        "tracking_points" JSONB DEFAULT '[]'::jsonb,
        "check_in_location" GEOGRAPHY(Point, 4326),
        "check_out_location" GEOGRAPHY(Point, 4326),

        -- Timestamps
        "requested_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "matched_at" TIMESTAMP,
        "accepted_at" TIMESTAMP,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "cancelled_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX "idx_jobs_customer_id" ON "jobs" ("customer_id");
      CREATE INDEX "idx_jobs_guard_id" ON "jobs" ("guard_id");
      CREATE INDEX "idx_jobs_status_start_time" ON "jobs" ("status", "start_time");
      CREATE INDEX "idx_jobs_location" ON "jobs" USING GIST ("location_coordinates");
      CREATE INDEX "idx_jobs_created_at" ON "jobs" ("created_at" DESC);

      -- Trigger for updated_at
      CREATE TRIGGER update_jobs_updated_at
      BEFORE UPDATE ON "jobs"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "jobs"`);
  }
}
```

**Migration 5: Create Payments Table**

```typescript
export class CreatePaymentsTable1699564600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "job_id" UUID NOT NULL UNIQUE REFERENCES "jobs"("id") ON DELETE RESTRICT,

        -- Stripe references
        "stripe_payment_intent_id" VARCHAR(255) NOT NULL UNIQUE,
        "stripe_charge_id" VARCHAR(255),
        "stripe_transfer_id" VARCHAR(255),

        -- Amounts
        "amount_cents" INTEGER NOT NULL CHECK (amount_cents > 0),
        "platform_fee_cents" INTEGER NOT NULL CHECK (platform_fee_cents >= 0),
        "guard_payout_cents" INTEGER NOT NULL CHECK (guard_payout_cents > 0),

        -- Status
        "status" payment_status NOT NULL DEFAULT 'pending',

        -- Timestamps
        "authorized_at" TIMESTAMP,
        "captured_at" TIMESTAMP,
        "failed_at" TIMESTAMP,
        "refunded_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE UNIQUE INDEX "idx_payments_stripe_payment_intent_id" ON "payments" ("stripe_payment_intent_id");
      CREATE UNIQUE INDEX "idx_payments_job_id" ON "payments" ("job_id");
      CREATE INDEX "idx_payments_status" ON "payments" ("status");

      -- Trigger for updated_at
      CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON "payments"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
  }
}
```

**Migration 6: Create Location History Table**

```typescript
export class CreateLocationHistoryTable1699564700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "location_history" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "guard_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "job_id" UUID NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
        "location" GEOGRAPHY(Point, 4326) NOT NULL,
        "accuracy_meters" REAL,
        "recorded_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX "idx_location_history_guard_job" ON "location_history" ("guard_id", "job_id");
      CREATE INDEX "idx_location_history_job_recorded" ON "location_history" ("job_id", "recorded_at" DESC);
      CREATE INDEX "idx_location_history_created_at" ON "location_history" ("created_at");
      CREATE INDEX "idx_location_history_location" ON "location_history" USING GIST ("location");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "location_history"`);
  }
}
```

**Migration 7: Create Background Checks Table (Stubbed for MVP)**

```typescript
export class CreateBackgroundChecksTable1699564800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "background_checks" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "guard_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,

        -- MVP: Simple boolean flags
        "criminal_check_passed" BOOLEAN,
        "license_check_passed" BOOLEAN,
        "reference_check_passed" BOOLEAN,

        -- Future: Checkr integration
        "checkr_candidate_id" VARCHAR(255),
        "checkr_report_id" VARCHAR(255),

        -- Admin approval
        "approved_by_admin_id" UUID REFERENCES "users"("id"),
        "approved_at" TIMESTAMP,
        "rejected_at" TIMESTAMP,
        "rejection_reason" TEXT,

        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE UNIQUE INDEX "idx_background_checks_guard_id" ON "background_checks" ("guard_id");

      -- Trigger for updated_at
      CREATE TRIGGER update_background_checks_updated_at
      BEFORE UPDATE ON "background_checks"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "background_checks"`);
  }
}
```

### 4. Seed Data Strategy

**Development/Testing Seed Migration:**

```typescript
export class SeedDevelopmentData1699565000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper: Hash password
    const bcrypt = require('bcrypt');
    const hashPassword = async (plain: string) => {
      return await bcrypt.hash(plain, 12);
    };

    // Seed admin user
    const adminPasswordHash = await hashPassword('admin123');
    await queryRunner.query(`
      INSERT INTO "users" (id, email, password_hash, role, first_name, last_name, phone_number)
      VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'admin@aegis.com',
        '${adminPasswordHash}',
        'admin',
        'Admin',
        'User',
        '+1-555-0100'
      )
    `);

    // Seed customer user
    const customerPasswordHash = await hashPassword('customer123');
    await queryRunner.query(`
      INSERT INTO "users" (id, email, password_hash, role, first_name, last_name, phone_number, stripe_customer_id)
      VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'customer@example.com',
        '${customerPasswordHash}',
        'customer',
        'John',
        'Customer',
        '+1-555-0200',
        'cus_test_1234567890'
      )
    `);

    // Seed 3 guard users
    const guardPasswordHash = await hashPassword('guard123');

    await queryRunner.query(`
      INSERT INTO "users" (id, email, password_hash, role, first_name, last_name, phone_number)
      VALUES
        ('gggggggg-1111-1111-1111-gggggggggggg', 'guard1@example.com', '${guardPasswordHash}', 'guard', 'Mike', 'Guardian', '+1-555-0301'),
        ('gggggggg-2222-2222-2222-gggggggggggg', 'guard2@example.com', '${guardPasswordHash}', 'guard', 'Sarah', 'Protector', '+1-555-0302'),
        ('gggggggg-3333-3333-3333-gggggggggggg', 'guard3@example.com', '${guardPasswordHash}', 'guard', 'James', 'Sentinel', '+1-555-0303')
    `);

    // Seed guard profiles (LA area coordinates)
    await queryRunner.query(`
      INSERT INTO "guard_profiles" (
        user_id, license_number, license_state, license_expiry,
        skills, hourly_rate_cents, availability_status, current_location, bio, years_experience
      )
      VALUES
        (
          'gggggggg-1111-1111-1111-gggggggggggg',
          'CA-GUARD-12345',
          'CA',
          '2026-12-31',
          '["unarmed", "patrol", "access_control"]'::jsonb,
          5000,
          'available',
          ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography,  -- Los Angeles
          'Experienced security guard with 5 years in event security.',
          5
        ),
        (
          'gggggggg-2222-2222-2222-gggggggggggg',
          'CA-GUARD-67890',
          'CA',
          '2027-06-30',
          '["armed", "executive_protection", "k9"]'::jsonb,
          8000,
          'available',
          ST_SetSRID(ST_MakePoint(-118.3, 34.1), 4326)::geography,  -- Santa Monica
          'Elite security professional specializing in executive protection.',
          10
        ),
        (
          'gggggggg-3333-3333-3333-gggggggggggg',
          'CA-GUARD-11111',
          'CA',
          '2026-03-15',
          '["unarmed", "crowd_control", "event"]'::jsonb,
          4500,
          'offline',
          ST_SetSRID(ST_MakePoint(-118.4, 34.0), 4326)::geography,  -- Culver City
          'Friendly and professional, great for public events.',
          3
        )
    `);

    // Seed background checks (all approved)
    await queryRunner.query(`
      INSERT INTO "background_checks" (
        guard_id, criminal_check_passed, license_check_passed, reference_check_passed,
        approved_by_admin_id, approved_at
      )
      VALUES
        ('gggggggg-1111-1111-1111-gggggggggggg', true, true, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),
        ('gggggggg-2222-2222-2222-gggggggggggg', true, true, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),
        ('gggggggg-3333-3333-3333-gggggggggggg', true, true, true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW())
    `);

    // Seed a sample job (completed)
    await queryRunner.query(`
      INSERT INTO "jobs" (
        id, customer_id, guard_id, status, job_type,
        location_address, location_coordinates,
        start_time, end_time,
        hourly_rate_cents, total_amount_cents, platform_fee_cents,
        required_skills, special_instructions,
        actual_start_time, actual_end_time,
        requested_at, matched_at, accepted_at, started_at, completed_at
      )
      VALUES (
        'jjjjjjjj-1111-1111-1111-jjjjjjjjjjjj',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'gggggggg-1111-1111-1111-gggggggggggg',
        'completed',
        'event',
        '123 Main St, Los Angeles, CA 90001',
        ST_SetSRID(ST_MakePoint(-118.25, 34.05), 4326)::geography,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day' + INTERVAL '4 hours',
        5000,
        20000,
        4000,
        '["unarmed", "crowd_control"]'::jsonb,
        'Corporate event, business casual attire required.',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day' + INTERVAL '4 hours 5 minutes',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day 12 hours',
        NOW() - INTERVAL '1 day 6 hours',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day' + INTERVAL '4 hours 5 minutes'
      )
    `);

    // Seed payment for completed job
    await queryRunner.query(`
      INSERT INTO "payments" (
        job_id, stripe_payment_intent_id, stripe_charge_id,
        amount_cents, platform_fee_cents, guard_payout_cents,
        status, authorized_at, captured_at
      )
      VALUES (
        'jjjjjjjj-1111-1111-1111-jjjjjjjjjjjj',
        'pi_test_1234567890',
        'ch_test_0987654321',
        20000,
        4000,
        16000,
        'captured',
        NOW() - INTERVAL '1 day 12 hours',
        NOW() - INTERVAL '23 hours'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete in reverse order (respecting foreign keys)
    await queryRunner.query(`DELETE FROM "payments"`);
    await queryRunner.query(`DELETE FROM "jobs"`);
    await queryRunner.query(`DELETE FROM "background_checks"`);
    await queryRunner.query(`DELETE FROM "guard_profiles"`);
    await queryRunner.query(`DELETE FROM "users"`);
  }
}
```

**Seed Credentials Summary:**
```
Admin:
  Email: admin@aegis.com
  Password: admin123

Customer:
  Email: customer@example.com
  Password: customer123

Guards:
  Email: guard1@example.com (available, unarmed)
  Email: guard2@example.com (available, armed + K9)
  Email: guard3@example.com (offline, event specialist)
  Password: guard123 (all guards)
```

### 5. Entity-Level Validation with class-validator

**Validation in Entities:**

```typescript
import { IsEmail, IsEnum, MinLength, IsOptional, Min, Max } from 'class-validator';

@Entity('users')
export class User {
  @Column()
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @Column()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  firstName: string;

  @Column()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role: UserRole;
}

@Entity('guard_profiles')
export class GuardProfile {
  @Column()
  @Min(1000, { message: 'Hourly rate must be at least $10' })  // $10 = 1000 cents
  @Max(100000, { message: 'Hourly rate cannot exceed $1000' })  // $1000 = 100000 cents
  hourlyRateCents: number;

  @Column()
  @Min(0, { message: 'Years of experience cannot be negative' })
  @Max(50, { message: 'Years of experience seems unrealistic' })
  @IsOptional()
  yearsExperience?: number;
}
```

**Validation in DTOs (API Layer):**

```typescript
export class CreateJobDto {
  @IsString()
  @MinLength(10)
  locationAddress: string;

  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLongitude: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLatitude: number;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  @IsAfter('startTime', { message: 'End time must be after start time' })
  endTime: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];
}
```

**Why Dual Validation (Entity + DTO):**
- **DTO validation**: Catches invalid API input before processing
- **Entity validation**: Last line of defense, ensures data integrity at database layer
- **Different concerns**: DTOs validate user input, entities validate business rules

### 6. Database Configuration & Connection Pooling

**TypeORM Configuration:**

```typescript
// config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),

  // Entities
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  // Migrations
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,  // Run manually in CI/CD, not automatically

  // Connection pool
  extra: {
    max: 20,              // Max connections in pool
    min: 5,               // Min connections maintained
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 2000,  // Fail fast if connection takes > 2s
  },

  // Logging
  logging: configService.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
  logger: 'advanced-console',

  // SSL (production only)
  ssl: configService.get('NODE_ENV') === 'production' ? {
    rejectUnauthorized: false,  // AWS RDS uses self-signed cert
  } : false,

  // Performance
  cache: {
    type: 'redis',
    options: {
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
    },
    duration: 60000,  // Cache query results for 60 seconds
  },
});
```

**Environment Variables:**
```bash
# Development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aegis_dev
DB_PASSWORD=dev_password
DB_NAME=aegis_dev

# Production (AWS RDS)
DB_HOST=aegis-prod.abcdef123456.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=aegis_prod
DB_PASSWORD=<strong-random-password>
DB_NAME=aegis_prod
```

### 7. Backup & Recovery Strategy

**Automated Daily Backups (AWS RDS):**

```typescript
// AWS RDS automated backups
{
  backupRetentionPeriod: 7,          // Keep 7 days of backups
  preferredBackupWindow: "03:00-04:00",  // Daily at 3am UTC
  enablePointInTimeRecovery: true,   // Allow restore to any point in last 7 days
}
```

**Manual Backup (pg_dump):**

```bash
# Backup entire database
pg_dump -h $DB_HOST -U $DB_USERNAME -F c -b -v -f "backup_$(date +%Y%m%d_%H%M%S).dump" $DB_NAME

# Backup schema only (for migrations comparison)
pg_dump -h $DB_HOST -U $DB_USERNAME --schema-only -f "schema_$(date +%Y%m%d).sql" $DB_NAME

# Restore from backup
pg_restore -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -v "backup_20251109_120000.dump"
```

**Pre-Deployment Backup:**

```bash
# CI/CD pipeline step before running migrations
- name: Backup database before migration
  run: |
    pg_dump -h $DB_HOST -U $DB_USERNAME -F c -b -v -f "pre_migration_backup.dump" $DB_NAME
    aws s3 cp pre_migration_backup.dump s3://aegis-backups/pre-migration/$(date +%Y%m%d_%H%M%S).dump
```

## Alternatives Considered

### Alternative 1: Prisma ORM Instead of TypeORM

**Pros:**
- Modern developer experience (better than TypeORM)
- Excellent TypeScript support (auto-generated types)
- Better migration tooling (prisma migrate)
- Growing community and momentum

**Cons:**
- Less mature PostGIS support (geographic types not first-class)
- Weaker NestJS integration (TypeORM is more native)
- Limited enterprise features (no query result caching)
- Team less familiar with Prisma

**REJECTED**: TypeORM has better PostGIS support and NestJS integration (critical for our use case).

### Alternative 2: Raw SQL with Knex.js

**Pros:**
- Full control over queries (no ORM magic)
- Better performance (no abstraction overhead)
- Easier to optimize complex queries

**Cons:**
- **No type safety** (manual TypeScript interfaces)
- More boilerplate (write more code for basic operations)
- Harder to maintain (schema drift between code and database)
- Migration tooling less robust than TypeORM

**REJECTED**: Loss of type safety and increased maintenance burden outweigh performance gains.

### Alternative 3: Schema-First (SQL Files) Instead of Code-First

**Pros:**
- More explicit (see exact SQL being executed)
- Easier for DBAs to review
- No ORM magic or generated migrations

**Cons:**
- **Schema/code drift** (must manually keep entities in sync with SQL)
- No compile-time type checking (runtime errors from mismatches)
- More manual work (write entities AND migrations)
- Harder for developers (need SQL expertise)

**REJECTED**: Code-first with generated migrations is more maintainable and type-safe.

## Implications

### Development Workflow

**1. Making Schema Changes:**
```bash
# 1. Developer modifies entity (e.g., add field to User.entity.ts)
# 2. Generate migration
npm run typeorm migration:generate -- -n AddFieldToUser
# 3. Review generated migration (ensure up/down are correct)
# 4. Test migration locally
npm run typeorm migration:run
# 5. Commit migration file to Git
git add migrations/1699565678901-AddFieldToUser.ts
git commit -m "feat: add field to user entity"
```

**2. Running Migrations in CI/CD:**
```yaml
# .github/workflows/deploy.yml
- name: Run database migrations
  run: |
    npm run typeorm migration:run
  env:
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

**3. Rollback Procedure (Emergency):**
```bash
# Rollback last migration
npm run typeorm migration:revert

# Restore from backup (if migration:revert fails)
pg_restore -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -v backup.dump
```

### Testing Requirements

**4. Database Testing Setup:**
```typescript
// test/setup.ts
beforeAll(async () => {
  // Use separate test database
  const connection = await createConnection({
    ...databaseConfig,
    database: 'aegis_test',
    synchronize: true,  // Auto-sync schema in tests (fast setup)
    dropSchema: true,   // Drop schema before each test run
  });
});

afterEach(async () => {
  // Clear all tables after each test
  await connection.synchronize(true);
});
```

**5. Integration Tests for Entities:**
```typescript
describe('GuardProfile Entity', () => {
  it('should enforce hourly rate minimum', async () => {
    const guardProfile = new GuardProfile();
    guardProfile.hourlyRateCents = 500;  // $5/hr (too low)

    const errors = await validate(guardProfile);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('hourlyRateCents');
  });

  it('should save valid guard profile', async () => {
    const guardProfile = guardProfileRepository.create({
      userId: user.id,
      licenseNumber: 'CA-12345',
      licenseState: 'CA',
      licenseExpiry: new Date('2026-12-31'),
      skills: ['unarmed', 'patrol'],
      hourlyRateCents: 5000,
    });

    const saved = await guardProfileRepository.save(guardProfile);
    expect(saved.id).toBeDefined();
  });
});
```

### Performance Optimization

**6. Query Optimization Patterns:**
```typescript
// BAD: N+1 query problem
const jobs = await jobRepository.find();
for (const job of jobs) {
  const customer = await userRepository.findOne(job.customerId);  // N additional queries
}

// GOOD: Eager loading with relations
const jobs = await jobRepository.find({
  relations: ['customer', 'guard'],  // Single query with JOIN
});

// GOOD: Use QueryBuilder for complex queries
const availableGuards = await guardProfileRepository
  .createQueryBuilder('gp')
  .leftJoinAndSelect('gp.user', 'user')
  .where('gp.availability_status = :status', { status: 'available' })
  .andWhere('ST_DWithin(gp.current_location, ST_MakePoint(:lng, :lat)::geography, :distance)', {
    lng: -118.2437,
    lat: 34.0522,
    distance: 24140,  // 15 miles in meters
  })
  .andWhere('gp.skills @> :skills', { skills: JSON.stringify(['unarmed']) })
  .getMany();
```

**7. Index Usage Monitoring:**
```sql
-- Check which indexes are being used
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check for missing indexes (sequential scans on large tables)
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND seq_scan > 1000 AND seq_tup_read / seq_scan > 10000
ORDER BY seq_tup_read DESC;
```

## Risks & Mitigation

### Risk 1: Migration Fails Mid-Deployment

**Risk**: Migration partially completes, leaving database in inconsistent state.

**Mitigation**:
- Wrap migrations in transactions (TypeORM default)
- Take backup before every production migration
- Test migrations in staging first (identical schema to production)
- Have rollback plan ready (migration:revert + restore from backup)
- **Severity**: High | **Likelihood**: Low | **Priority**: Testing + backups mandatory

### Risk 2: PostGIS Extension Not Installed

**Risk**: Production RDS instance doesn't have PostGIS enabled.

**Mitigation**:
- First migration explicitly enables PostGIS extension
- Verify PostGIS version in migration output
- Test PostGIS queries in staging before production
- AWS RDS PostgreSQL supports PostGIS out-of-box (just needs CREATE EXTENSION)
- **Severity**: High | **Likelihood**: Very Low | **Priority**: Test in staging

### Risk 3: Connection Pool Exhaustion

**Risk**: Too many concurrent requests exhaust database connections.

**Mitigation**:
- Configure appropriate pool size (max: 20 connections for MVP)
- Monitor active connections (pg_stat_activity)
- Implement connection timeout (fail fast if pool exhausted)
- Scale RDS instance if needed (larger instance = more connections)
- **Severity**: Medium | **Likelihood**: Medium | **Priority**: Monitoring required

### Risk 4: Slow Queries Degrade Performance

**Risk**: Missing indexes or complex queries cause slow API responses.

**Mitigation**:
- Monitor slow queries with pg_stat_statements extension
- Set slow query log threshold (> 100ms)
- Use EXPLAIN ANALYZE for complex queries
- Add indexes based on production query patterns
- **Severity**: Medium | **Likelihood**: Medium | **Priority**: Query monitoring required

### Risk 5: Schema Drift Between Environments

**Risk**: Development, staging, production schemas become inconsistent.

**Mitigation**:
- Run same migrations in all environments (never manual schema changes)
- Version control all migrations (committed to Git)
- Use migration:show to verify all migrations applied
- Automated CI/CD runs migrations (no manual steps)
- **Severity**: Medium | **Likelihood**: Low | **Priority**: Automated migrations

## Success Metrics

1. **Migration reliability**: 100% of migrations succeed in staging and production
2. **Query performance**: 95% of queries complete in < 50ms
3. **Index efficiency**: 90%+ of queries use indexes (verified with EXPLAIN ANALYZE)
4. **Connection utilization**: < 70% of pool connections used under normal load
5. **Backup success**: Daily backups complete successfully, tested restore monthly
6. **Schema consistency**: Zero schema drift between environments

## Dependencies

### Blocks These Decisions/Artifacts

- **A-5-1**: TypeORM Entity Definitions (User, GuardProfile, Job, Payment, LocationHistory, BackgroundCheck)
- **A-5-2**: Database Migration Scripts (initial schema + indexes)
- **A-5-3**: Seed Data Generator (demo users, test jobs)
- All API endpoints (require database entities to query)
- All backend services (require repositories to access data)

### Depends On

- **D-1**: MVP Technical Architecture (establishes PostgreSQL, TypeORM, AWS RDS)
- **D-3**: MVP Database Schema Design (defines 6-table schema)

## Next Steps After Approval

**Week 1: Setup & Initial Migrations (Days 1-2)**
1. Install TypeORM dependencies and configure NestJS module
2. Set up AWS RDS PostgreSQL 15 instance with PostGIS
3. Create TypeORM config with connection pooling and SSL
4. Create initial 7 migrations (extensions, enums, tables)
5. Run migrations in development environment
6. Verify PostGIS functionality with test queries

**Week 1: Entity Definitions (Days 3-4)**
7. Create TypeORM entities for all 6 tables
8. Add class-validator decorators for validation
9. Define relationships (OneToOne, OneToMany, ManyToOne)
10. Add custom repository methods for complex queries
11. Write unit tests for entity validation

**Week 1: Seed Data (Day 5)**
12. Create seed migration with demo users and jobs
13. Test seed data in development environment
14. Document seed credentials for team

**Week 2: Testing & Optimization (Days 1-3)**
15. Set up test database with synchronize mode
16. Write integration tests for all entities
17. Test geospatial queries (PostGIS functions)
18. Verify index usage with EXPLAIN ANALYZE
19. Load test with 10K rows to verify performance

**Week 2: Production Preparation (Days 4-5)**
20. Set up staging RDS instance (mirror of production)
21. Run migrations in staging
22. Configure automated daily backups
23. Set up monitoring for slow queries and connection pool
24. Create runbooks for migration rollback and database recovery

## Related Nodes

- **Spawned by**: Q-7 (Database Schema Design for MVP/Demo), Q-3 (Technical Architecture), D-3 (Database Schema Decision)
- **Informs**: A-5-1, A-5-2, A-5-3 (Database implementation artifacts)
- **Depends on**: D-1 (Tech Stack), D-3 (Schema Design)

## Review Notes

**For Human Reviewer:**

This is a **Critical priority, high-confidence (0.89) technical decision** that establishes the database implementation strategy. Key points for your consideration:

1. **TypeORM vs alternatives**: Do you agree with TypeORM choice, or prefer Prisma/Knex.js?
2. **Code-first migrations**: Are you comfortable with auto-generated migrations, or prefer manual SQL?
3. **Seed data approach**: Is the seed migration strategy acceptable, or prefer separate seeding tool?
4. **AWS RDS**: Do you have AWS account ready, or need to use different provider?
5. **Connection pool size**: Is max 20 connections sufficient for MVP, or need larger pool?
6. **Backup strategy**: Is 7-day retention acceptable, or need longer retention?

**Infrastructure Questions:**
- Do you have AWS RDS PostgreSQL 15 instance provisioned?
- Do you have separate databases for dev/staging/production?
- Do you have Redis for query caching?
- Do you have S3 bucket for backup storage?

Please approve, request revisions, or reject with feedback.

---

**AI Confidence Rationale**: 0.89 confidence based on:
- ✅ TypeORM is mature and well-integrated with NestJS (proven stack)
- ✅ Migration strategy follows industry best practices (versioned, reversible)
- ✅ PostGIS support in TypeORM is solid (custom column types work well)
- ✅ Comprehensive schema from D-3 provides clear implementation path
- ⚠️ Slight uncertainty around PostGIS query performance at scale (need production testing)
- ⚠️ Migration generation can be finicky (need careful review of generated SQL)

**Human review required**: YES (Critical priority + database foundation for entire platform)
