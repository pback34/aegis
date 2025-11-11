import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'guard', 'admin')),
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        stripe_customer_id VARCHAR(255),
        stripe_connect_account_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create guard_profiles table
    await queryRunner.query(`
      CREATE TABLE guard_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        license_number VARCHAR(50),
        hourly_rate DECIMAL(10, 2),
        rating DECIMAL(3, 2) DEFAULT 5.0,
        is_available BOOLEAN DEFAULT false,
        current_latitude DECIMAL(10, 8),
        current_longitude DECIMAL(11, 8),
        last_location_update TIMESTAMP
      );
    `);

    // Create bookings table
    await queryRunner.query(`
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guard_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('requested', 'matched', 'accepted', 'in_progress', 'completed', 'cancelled')),
        service_location_address TEXT NOT NULL,
        service_location_lat DECIMAL(10, 8) NOT NULL,
        service_location_lng DECIMAL(11, 8) NOT NULL,
        scheduled_start TIMESTAMP NOT NULL,
        scheduled_end TIMESTAMP NOT NULL,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        hourly_rate DECIMAL(10, 2),
        estimated_hours DECIMAL(4, 2),
        estimated_total DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create location_updates table
    await queryRunner.query(`
      CREATE TABLE location_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        guard_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy_meters DECIMAL(8, 2),
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for location_updates
    await queryRunner.query(`
      CREATE INDEX idx_location_booking ON location_updates(booking_id, timestamp DESC);
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guard_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        platform_fee DECIMAL(10, 2) NOT NULL,
        guard_payout DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'refunded', 'failed')),
        stripe_payment_intent_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Enable PostGIS extension for geospatial queries (optional for MVP, but good to have)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payments CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS location_updates CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bookings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS guard_profiles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis;`);
  }
}
