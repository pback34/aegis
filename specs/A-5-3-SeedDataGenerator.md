# Seed Data Generator Specification

**Document Version**: 1.0
**Created**: 2025-11-09
**Decision Reference**: D-5

---

## Overview

Seed migration creating demo users (admin, customer, 3 guards), guard profiles with LA area coordinates, sample completed job, and payment record for development/testing.

## Seed Migration

```typescript
// migrations/1699565000000-SeedDevelopmentData.ts
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedDevelopmentData1699565000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash passwords
    const hashPassword = async (plain: string) => await bcrypt.hash(plain, 12);

    const adminPw = await hashPassword('admin123');
    const customerPw = await hashPassword('customer123');
    const guardPw = await hashPassword('guard123');

    // Seed admin
    await queryRunner.query(`
      INSERT INTO "users" (id, email, password_hash, role, first_name, last_name, phone_number)
      VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'admin@aegis.com',
        '${adminPw}',
        'admin',
        'Admin',
        'User',
        '+1-555-0100'
      )
    `);

    // Seed customer
    await queryRunner.query(`
      INSERT INTO "users" (id, email, password_hash, role, first_name, last_name, phone_number, stripe_customer_id)
      VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'customer@example.com',
        '${customerPw}',
        'customer',
        'John',
        'Customer',
        '+1-555-0200',
        'cus_test_1234567890'
      )
    `);

    // Seed 3 guards
    await queryRunner.query(`
      INSERT INTO "users" (id, email, password_hash, role, first_name, last_name, phone_number)
      VALUES
        ('gggggggg-1111-1111-1111-gggggggggggg', 'guard1@example.com', '${guardPw}', 'guard', 'Mike', 'Guardian', '+1-555-0301'),
        ('gggggggg-2222-2222-2222-gggggggggggg', 'guard2@example.com', '${guardPw}', 'guard', 'Sarah', 'Protector', '+1-555-0302'),
        ('gggggggg-3333-3333-3333-gggggggggggg', 'guard3@example.com', '${guardPw}', 'guard', 'James', 'Sentinel', '+1-555-0303')
    `);

    // Seed guard profiles (LA area)
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
          ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography,
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
          ST_SetSRID(ST_MakePoint(-118.3, 34.1), 4326)::geography,
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
          ST_SetSRID(ST_MakePoint(-118.4, 34.0), 4326)::geography,
          'Friendly and professional, great for public events.',
          3
        )
    `);

    // Seed background checks
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

    // Seed completed job
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

    // Seed payment
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
    await queryRunner.query(`DELETE FROM "payments"`);
    await queryRunner.query(`DELETE FROM "jobs"`);
    await queryRunner.query(`DELETE FROM "background_checks"`);
    await queryRunner.query(`DELETE FROM "guard_profiles"`);
    await queryRunner.query(`DELETE FROM "users"`);
  }
}
```

## Seed Credentials

```
Admin:
  Email: admin@aegis.com
  Password: admin123

Customer:
  Email: customer@example.com
  Password: customer123

Guards:
  Email: guard1@example.com (available, unarmed, $50/hr)
  Email: guard2@example.com (available, armed + K9, $80/hr)
  Email: guard3@example.com (offline, event specialist, $45/hr)
  Password: guard123 (all guards)
```

## Running Seed

```bash
# Run all migrations including seed
npm run typeorm migration:run

# Or run only seed migration
npm run typeorm migration:run -- --transaction=each --only SeedDevelopmentData
```

---

**End of Document**
