import { UserMapper } from './user.mapper';
import { Customer } from '../../../domain/entities/customer.entity';
import { Guard } from '../../../domain/entities/guard.entity';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { Email } from '../../../domain/value-objects/email.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { UserStatus } from '../../../domain/entities/user.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { GuardProfileEntity } from '../../database/entities/guard-profile.entity';

describe('UserMapper', () => {
  describe('Customer Mapping', () => {
    it('should map domain Customer to database entities', () => {
      // Arrange
      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'John Doe',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        stripeCustomerId: 'cus_test_123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      // Act
      const { user: userEntity, guardProfile } = UserMapper.toPersistence(customer);

      // Assert
      expect(userEntity.id).toBe(customer.getId().getValue());
      expect(userEntity.email).toBe('customer@test.com');
      expect(userEntity.password_hash).toBe('hashedpassword123');
      expect(userEntity.role).toBe('customer');
      expect(userEntity.full_name).toBe('John Doe');
      expect(userEntity.phone).toBe('+1234567890');
      expect(userEntity.status).toBe('active');
      expect(userEntity.stripe_customer_id).toBe('cus_test_123');
      expect(guardProfile).toBeUndefined();
    });

    it('should map database entities to domain Customer', () => {
      // Arrange
      const userId = UserId.create().getValue();
      const userEntity: UserEntity = {
        id: userId,
        email: 'customer@test.com',
        password_hash: 'hashedpassword123',
        role: 'customer',
        full_name: 'John Doe',
        phone: '+1234567890',
        status: 'active',
        stripe_customer_id: 'cus_test_123',
        stripe_connect_account_id: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };

      // Act
      const customer = UserMapper.toDomain(userEntity);

      // Assert
      expect(customer).toBeInstanceOf(Customer);
      expect(customer.getId().getValue()).toBe(userId);
      expect(customer.getEmail().getValue()).toBe('customer@test.com');
      expect(customer.getPasswordHash()).toBe('hashedpassword123');
      expect(customer.getRole()).toBe('customer');
      expect(customer.getFullName()).toBe('John Doe');
      expect(customer.getPhone()).toBe('+1234567890');
      expect(customer.getStatus()).toBe('active');
      expect((customer as Customer).getStripeCustomerId()).toBe('cus_test_123');
    });

    it('should handle null phone number', () => {
      // Arrange
      const customer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const { user: userEntity } = UserMapper.toPersistence(customer);

      // Assert
      expect(userEntity.phone).toBeNull();
    });
  });

  describe('Guard Mapping', () => {
    it('should map domain Guard to database entities with profile', () => {
      // Arrange
      const guard = new Guard({
        id: UserId.create(),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Mike Guard',
        phone: '+1234567891',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001-CA',
        hourlyRate: new Money(50.0),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194),
        lastLocationUpdate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      // Act
      const { user: userEntity, guardProfile } = UserMapper.toPersistence(guard);

      // Assert - User Entity
      expect(userEntity.id).toBe(guard.getId().getValue());
      expect(userEntity.email).toBe('guard@test.com');
      expect(userEntity.role).toBe('guard');
      expect(userEntity.full_name).toBe('Mike Guard');
      expect(userEntity.phone).toBe('+1234567891');

      // Assert - Guard Profile
      expect(guardProfile).toBeDefined();
      expect(guardProfile!.user_id).toBe(guard.getId().getValue());
      expect(guardProfile!.license_number).toBe('LIC-001-CA');
      expect(guardProfile!.hourly_rate).toBe(50.0);
      expect(guardProfile!.rating).toBe(5.0);
      expect(guardProfile!.is_available).toBe(true);
      expect(guardProfile!.current_latitude).toBe(37.7749);
      expect(guardProfile!.current_longitude).toBe(-122.4194);
      expect(guardProfile!.last_location_update).toEqual(
        new Date('2024-01-01'),
      );
    });

    it('should map database entities to domain Guard', () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const userEntity: UserEntity = {
        id: guardId,
        email: 'guard@test.com',
        password_hash: 'hashedpassword123',
        role: 'guard',
        full_name: 'Mike Guard',
        phone: '+1234567891',
        status: 'active',
        stripe_customer_id: null,
        stripe_connect_account_id: 'acct_test_123',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };

      const guardProfile: GuardProfileEntity = {
        user_id: guardId,
        license_number: 'LIC-001-CA',
        hourly_rate: 50.0,
        rating: 5.0,
        is_available: true,
        current_latitude: 37.7749,
        current_longitude: -122.4194,
        last_location_update: new Date('2024-01-01'),
        user: userEntity,
      };

      // Act
      const guard = UserMapper.toDomain(userEntity, guardProfile);

      // Assert
      expect(guard).toBeInstanceOf(Guard);
      expect(guard.getId().getValue()).toBe(guardId);
      expect(guard.getEmail().getValue()).toBe('guard@test.com');
      expect(guard.getRole()).toBe('guard');

      const typedGuard = guard as Guard;
      expect(typedGuard.getLicenseNumber()).toBe('LIC-001-CA');
      expect(typedGuard.getHourlyRate()?.getAmount()).toBe(50.0);
      expect(typedGuard.getRating()).toBe(5.0);
      expect(typedGuard.getIsAvailable()).toBe(true);
      expect(typedGuard.getCurrentLocation()?.getLatitude()).toBe(37.7749);
      expect(typedGuard.getCurrentLocation()?.getLongitude()).toBe(-122.4194);
    });

    it('should handle guard with missing optional fields', () => {
      // Arrange
      const guard = new Guard({
        id: UserId.create(),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Mike Guard',
        status: UserStatus.ACTIVE,
        hourlyRate: new Money(50.0),
        rating: 5.0,
        isAvailable: false,
        currentLocation: new GeoLocation(0, 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const { user: userEntity, guardProfile } = UserMapper.toPersistence(guard);

      // Assert
      expect(guardProfile).toBeDefined();
      expect(guardProfile!.license_number).toBeNull(); // Optional field not provided
      expect(guardProfile!.hourly_rate).toBe(50.0); // Required field is set
      expect(guardProfile!.last_location_update).toBeNull(); // Optional field not provided
    });

    it('should throw error when mapping guard without profile', () => {
      // Arrange
      const guardId = UserId.create().getValue();
      const userEntity: UserEntity = {
        id: guardId,
        email: 'guard@test.com',
        password_hash: 'hashedpassword123',
        role: 'guard',
        full_name: 'Mike Guard',
        phone: null,
        status: 'active',
        stripe_customer_id: null,
        stripe_connect_account_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      expect(() => UserMapper.toDomain(userEntity, undefined)).toThrow();
    });
  });

  describe('Bidirectional Mapping', () => {
    it('should maintain data integrity through round-trip mapping (Customer)', () => {
      // Arrange
      const originalCustomer = new Customer({
        id: UserId.create(),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'John Doe',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        stripeCustomerId: 'cus_test_123',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-02T10:00:00.000Z'),
      });

      // Act - Round trip: Domain → Database → Domain
      const { user: userEntity } = UserMapper.toPersistence(originalCustomer);
      const reconstructedCustomer = UserMapper.toDomain(userEntity as any);

      // Assert
      expect(reconstructedCustomer.getId().getValue()).toBe(
        originalCustomer.getId().getValue(),
      );
      expect(reconstructedCustomer.getEmail().getValue()).toBe(
        originalCustomer.getEmail().getValue(),
      );
      expect(reconstructedCustomer.getFullName()).toBe(
        originalCustomer.getFullName(),
      );
      expect(reconstructedCustomer.getPhone()).toBe(originalCustomer.getPhone());
      expect((reconstructedCustomer as Customer).getStripeCustomerId()).toBe(
        originalCustomer.getStripeCustomerId(),
      );
    });

    it('should maintain data integrity through round-trip mapping (Guard)', () => {
      // Arrange
      const originalGuard = new Guard({
        id: UserId.create(),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Mike Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001-CA',
        hourlyRate: new Money(50.0),
        rating: 4.8,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194),
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-02T10:00:00.000Z'),
      });

      // Act - Round trip: Domain → Database → Domain
      const { user: userEntity, guardProfile } =
        UserMapper.toPersistence(originalGuard);
      const reconstructedGuard = UserMapper.toDomain(
        userEntity as UserEntity,
        guardProfile as GuardProfileEntity,
      ) as Guard;

      // Assert
      expect(reconstructedGuard.getId().getValue()).toBe(
        originalGuard.getId().getValue(),
      );
      expect(reconstructedGuard.getLicenseNumber()).toBe(
        originalGuard.getLicenseNumber(),
      );
      expect(reconstructedGuard.getHourlyRate()?.getAmount()).toBe(50.0);
      expect(reconstructedGuard.getRating()).toBe(4.8);
      expect(reconstructedGuard.getIsAvailable()).toBe(true);
      expect(reconstructedGuard.getCurrentLocation()?.getLatitude()).toBe(
        37.7749,
      );
    });
  });
});
