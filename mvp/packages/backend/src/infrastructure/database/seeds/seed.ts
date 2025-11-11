import { AppDataSource } from '../../config/typeorm.config';
import { UserEntity } from '../entities/user.entity';
import { GuardProfileEntity } from '../entities/guard-profile.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Starting database seeding...');

  // Initialize data source
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(UserEntity);
  const guardProfileRepository = AppDataSource.getRepository(GuardProfileEntity);

  try {
    // Create 1 test customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customerId = uuidv4();

    const customer = userRepository.create({
      id: customerId,
      email: 'customer@test.com',
      password_hash: customerPassword,
      role: 'customer',
      full_name: 'John Customer',
      phone: '+1234567890',
      status: 'active',
      stripe_customer_id: 'cus_test_123',
    });

    await userRepository.save(customer);
    console.log('✓ Created customer: customer@test.com / customer123');

    // Create 2 test guards
    const guard1Password = await bcrypt.hash('guard123', 10);
    const guard1Id = uuidv4();

    const guard1 = userRepository.create({
      id: guard1Id,
      email: 'guard1@test.com',
      password_hash: guard1Password,
      role: 'guard',
      full_name: 'Mike Guard',
      phone: '+1234567891',
      status: 'active',
      stripe_connect_account_id: 'acct_test_guard1',
    });

    await userRepository.save(guard1);

    const guard1Profile = guardProfileRepository.create({
      user_id: guard1Id,
      license_number: 'LIC-001-CA',
      hourly_rate: 50.0,
      rating: 5.0,
      is_available: true,
      current_latitude: 37.7749, // San Francisco
      current_longitude: -122.4194,
      last_location_update: new Date(),
    });

    await guardProfileRepository.save(guard1Profile);
    console.log('✓ Created guard 1: guard1@test.com / guard123 (San Francisco)');

    const guard2Password = await bcrypt.hash('guard123', 10);
    const guard2Id = uuidv4();

    const guard2 = userRepository.create({
      id: guard2Id,
      email: 'guard2@test.com',
      password_hash: guard2Password,
      role: 'guard',
      full_name: 'Sarah Security',
      phone: '+1234567892',
      status: 'active',
      stripe_connect_account_id: 'acct_test_guard2',
    });

    await userRepository.save(guard2);

    const guard2Profile = guardProfileRepository.create({
      user_id: guard2Id,
      license_number: 'LIC-002-CA',
      hourly_rate: 45.0,
      rating: 4.8,
      is_available: true,
      current_latitude: 34.0522, // Los Angeles
      current_longitude: -118.2437,
      last_location_update: new Date(),
    });

    await guardProfileRepository.save(guard2Profile);
    console.log('✓ Created guard 2: guard2@test.com / guard123 (Los Angeles)');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nTest Credentials:');
    console.log('Customer: customer@test.com / customer123');
    console.log('Guard 1:  guard1@test.com / guard123 (SF, $50/hr)');
    console.log('Guard 2:  guard2@test.com / guard123 (LA, $45/hr)');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seed;
