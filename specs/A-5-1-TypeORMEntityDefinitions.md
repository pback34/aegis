# TypeORM Entity Definitions Specification

**Document Version**: 1.0
**Created**: 2025-11-09
**Decision References**: D-3, D-5

---

## 1. Overview

Complete TypeORM entity definitions for all 6 database tables implementing the schema from D-3 with PostGIS geography types, JSONB metadata, class-validator decorators, and relationships.

## 2. User Entity

```typescript
// src/modules/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { IsEmail, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';

export enum UserRole {
  CUSTOMER = 'customer',
  GUARD = 'guard',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role', 'status'])
@Index(['deletedAt'], { where: 'deleted_at IS NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  @Exclude()  // Never serialize in API responses
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  @MinLength(2)
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  @MinLength(2)
  lastName: string;

  @Column({ type: 'varchar', length: 20, name: 'phone_number', nullable: true })
  phoneNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  profile?: Record<string, any>;

  // Stripe integration
  @Column({ type: 'varchar', length: 255, name: 'stripe_customer_id', nullable: true })
  stripeCustomerId?: string;

  // MFA fields
  @Column({ type: 'varchar', length: 255, name: 'mfa_secret', nullable: true })
  @Exclude()
  mfaSecret?: string;

  @Column({ type: 'boolean', name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ type: 'jsonb', name: 'mfa_backup_codes', nullable: true })
  @Exclude()
  mfaBackupCodes?: string[];

  // Soft delete
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
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

## 3. Guard Profile Entity

```typescript
// src/modules/guards/entities/guard-profile.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Min, Max } from 'class-validator';
import { Point } from 'geojson';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

@Entity('guard_profiles')
@Index(['userId'], { unique: true })
@Index(['availabilityStatus'], { where: "availability_status = 'available'" })  // Partial index
export class GuardProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'license_number' })
  licenseNumber: string;

  @Column({ type: 'varchar', length: 2, name: 'license_state' })
  licenseState: string;

  @Column({ type: 'date', name: 'license_expiry' })
  licenseExpiry: Date;

  @Column({ type: 'jsonb', default: '[]' })
  @Index({ using: 'GIN' })  // GIN index for JSONB
  skills: string[];

  @Column({ type: 'jsonb', default: '[]' })
  certifications: Array<{
    type: string;
    issuer: string;
    expiry: string;
  }>;

  @Column({ type: 'integer', name: 'hourly_rate_cents' })
  @Min(1000)   // Min $10/hr
  @Max(100000) // Max $1000/hr
  hourlyRateCents: number;

  @Column({ type: 'enum', enum: AvailabilityStatus, name: 'availability_status', default: AvailabilityStatus.OFFLINE })
  availabilityStatus: AvailabilityStatus;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'current_location',
    nullable: true,
  })
  @Index({ spatial: true })  // GIST spatial index
  currentLocation?: Point;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'integer', name: 'years_experience', nullable: true })
  @Min(0)
  @Max(50)
  yearsExperience?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, user => user.guardProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Job, job => job.guard)
  jobs: Job[];
}
```

## 4. Job Entity

```typescript
// src/modules/jobs/entities/job.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Point } from 'geojson';

export enum JobStatus {
  REQUESTED = 'requested',
  MATCHED = 'matched',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  BASIC = 'basic',
  EVENT = 'event',
  EXECUTIVE = 'executive',
  SPECIALIZED = 'specialized',
}

@Entity('jobs')
@Index(['customerId'])
@Index(['guardId'])
@Index(['status', 'startTime'])
@Index(['createdAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId: string;

  @Column({ type: 'uuid', name: 'guard_id', nullable: true })
  guardId?: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.REQUESTED })
  status: JobStatus;

  @Column({ type: 'enum', enum: JobType, name: 'job_type', default: JobType.BASIC })
  jobType: JobType;

  // Location
  @Column({ type: 'text', name: 'location_address' })
  locationAddress: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    name: 'location_coordinates',
  })
  @Index({ spatial: true })
  locationCoordinates: Point;

  // Timing
  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time' })
  endTime: Date;

  @Column({ type: 'integer', name: 'duration_hours', generated: 'STORED', asExpression: `EXTRACT(EPOCH FROM (end_time - start_time)) / 3600` })
  durationHours: number;

  // Actual timing
  @Column({ type: 'timestamp', name: 'actual_start_time', nullable: true })
  actualStartTime?: Date;

  @Column({ type: 'timestamp', name: 'actual_end_time', nullable: true })
  actualEndTime?: Date;

  // Pricing
  @Column({ type: 'integer', name: 'hourly_rate_cents' })
  hourlyRateCents: number;

  @Column({ type: 'integer', name: 'total_amount_cents' })
  totalAmountCents: number;

  @Column({ type: 'integer', name: 'platform_fee_cents', nullable: true })
  platformFeeCents?: number;

  // Requirements
  @Column({ type: 'jsonb', name: 'required_skills', default: '[]' })
  requiredSkills: string[];

  @Column({ type: 'text', name: 'special_instructions', nullable: true })
  specialInstructions?: string;

  // Tracking
  @Column({ type: 'jsonb', name: 'tracking_points', default: '[]' })
  trackingPoints: Array<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  }>;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, name: 'check_in_location', nullable: true })
  checkInLocation?: Point;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, name: 'check_out_location', nullable: true })
  checkOutLocation?: Point;

  // Timestamps
  @Column({ type: 'timestamp', name: 'requested_at', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ type: 'timestamp', name: 'matched_at', nullable: true })
  matchedAt?: Date;

  @Column({ type: 'timestamp', name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.jobsAsCustomer)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, user => user.jobsAsGuard, { nullable: true })
  @JoinColumn({ name: 'guard_id' })
  guard?: User;

  @OneToOne(() => Payment, payment => payment.job, { nullable: true })
  payment?: Payment;
}
```

## 5. Payment Entity

```typescript
// src/modules/payments/entities/payment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
@Index(['stripePaymentIntentId'], { unique: true })
@Index(['jobId'], { unique: true })
@Index(['status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id', unique: true })
  jobId: string;

  // Stripe references
  @Column({ type: 'varchar', length: 255, name: 'stripe_payment_intent_id', unique: true })
  stripePaymentIntentId: string;

  @Column({ type: 'varchar', length: 255, name: 'stripe_charge_id', nullable: true })
  stripeChargeId?: string;

  @Column({ type: 'varchar', length: 255, name: 'stripe_transfer_id', nullable: true })
  stripeTransferId?: string;

  // Amounts
  @Column({ type: 'integer', name: 'amount_cents' })
  amountCents: number;

  @Column({ type: 'integer', name: 'platform_fee_cents' })
  platformFeeCents: number;

  @Column({ type: 'integer', name: 'guard_payout_cents' })
  guardPayoutCents: number;

  // Status
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // Timestamps
  @Column({ type: 'timestamp', name: 'authorized_at', nullable: true })
  authorizedAt?: Date;

  @Column({ type: 'timestamp', name: 'captured_at', nullable: true })
  capturedAt?: Date;

  @Column({ type: 'timestamp', name: 'failed_at', nullable: true })
  failedAt?: Date;

  @Column({ type: 'timestamp', name: 'refunded_at', nullable: true })
  refundedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Job, job => job.payment)
  @JoinColumn({ name: 'job_id' })
  job: Job;
}
```

## 6. Location History Entity

```typescript
// src/modules/locations/entities/location-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Point } from 'geojson';

@Entity('location_history')
@Index(['guardId', 'jobId'])
@Index(['jobId', 'recordedAt'])
@Index(['createdAt'])
export class LocationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'guard_id' })
  guardId: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  location: Point;

  @Column({ type: 'real', name: 'accuracy_meters', nullable: true })
  accuracyMeters?: number;

  @Column({ type: 'timestamp', name: 'recorded_at' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'guard_id' })
  guard: User;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;
}
```

## 7. Background Check Entity

```typescript
// src/modules/background-checks/entities/background-check.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity('background_checks')
@Index(['guardId'], { unique: true })
export class BackgroundCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'guard_id', unique: true })
  guardId: string;

  // MVP: Simple boolean flags
  @Column({ type: 'boolean', name: 'criminal_check_passed', nullable: true })
  criminalCheckPassed?: boolean;

  @Column({ type: 'boolean', name: 'license_check_passed', nullable: true })
  licenseCheckPassed?: boolean;

  @Column({ type: 'boolean', name: 'reference_check_passed', nullable: true })
  referenceCheckPassed?: boolean;

  // Future: Checkr integration
  @Column({ type: 'varchar', length: 255, name: 'checkr_candidate_id', nullable: true })
  checkrCandidateId?: string;

  @Column({ type: 'varchar', length: 255, name: 'checkr_report_id', nullable: true })
  checkrReportId?: string;

  // Admin approval
  @Column({ type: 'uuid', name: 'approved_by_admin_id', nullable: true })
  approvedByAdminId?: string;

  @Column({ type: 'timestamp', name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', name: 'rejected_at', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User)
  @JoinColumn({ name: 'guard_id' })
  guard: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_admin_id' })
  approvedByAdmin?: User;
}
```

## 8. TypeORM Configuration

```typescript
// src/config/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],

  // Connection pool
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // Logging
  logging: configService.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],

  // SSL (production)
  ssl: configService.get('NODE_ENV') === 'production' ? {
    rejectUnauthorized: false,
  } : false,

  // Cache
  cache: {
    type: 'redis',
    options: {
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
    },
    duration: 60000, // 60 seconds
  },
});
```

---

**End of Document**
