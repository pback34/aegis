import { DataSource } from 'typeorm';
import { UserEntity } from '../src/infrastructure/database/entities/user.entity';
import { GuardProfileEntity } from '../src/infrastructure/database/entities/guard-profile.entity';
import { BookingEntity } from '../src/infrastructure/database/entities/booking.entity';
import { LocationUpdateEntity } from '../src/infrastructure/database/entities/location-update.entity';
import { PaymentEntity } from '../src/infrastructure/database/entities/payment.entity';

/**
 * Test Database Configuration
 * Uses a separate test database to avoid interfering with development data
 */
export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_DATABASE || 'aegis_mvp_test',
  entities: [
    UserEntity,
    GuardProfileEntity,
    BookingEntity,
    LocationUpdateEntity,
    PaymentEntity,
  ],
  synchronize: true, // Auto-create schema for tests (OK for test DB)
  dropSchema: true, // Drop schema before each test run
  logging: false,
});

/**
 * Global setup for integration tests
 * Call this before running integration tests
 */
export async function setupTestDatabase(): Promise<DataSource> {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
  return testDataSource;
}

/**
 * Global teardown for integration tests
 * Call this after running integration tests
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
}

/**
 * Clean all tables between tests
 * Call this in beforeEach or afterEach
 */
export async function cleanDatabase(): Promise<void> {
  const entities = testDataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.query(
      `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
    );
  }
}
