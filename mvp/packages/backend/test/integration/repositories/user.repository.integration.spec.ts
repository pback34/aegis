import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
  testDataSource,
} from '../../setup-integration';
import { UserRepository } from '../../../src/infrastructure/repositories/user.repository';
import { UserEntity } from '../../../src/infrastructure/database/entities/user.entity';
import { GuardProfileEntity } from '../../../src/infrastructure/database/entities/guard-profile.entity';
import { Customer } from '../../../src/domain/entities/customer.entity';
import { Guard } from '../../../src/domain/entities/guard.entity';
import { UserId } from '../../../src/domain/value-objects/user-id.value-object';
import { Email } from '../../../src/domain/value-objects/email.value-object';
import { Money } from '../../../src/domain/value-objects/money.value-object';
import { GeoLocation } from '../../../src/domain/value-objects/geo-location.value-object';
import { UserStatus } from '../../../src/domain/entities/user.entity';

describe('UserRepository Integration Tests', () => {
  let repository: UserRepository;
  let userEntityRepository: Repository<UserEntity>;
  let guardProfileRepository: Repository<GuardProfileEntity>;

  beforeAll(async () => {
    await setupTestDatabase();

    userEntityRepository = testDataSource.getRepository(UserEntity);
    guardProfileRepository = testDataSource.getRepository(GuardProfileEntity);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userEntityRepository,
        },
        {
          provide: getRepositoryToken(GuardProfileEntity),
          useValue: guardProfileRepository,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('Customer Operations', () => {
    it('should save and retrieve a customer', async () => {
      // Arrange
      const customer = new Customer({
        id: UserId.generate(),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'John Doe',
        phone: '+1234567890',
        status: UserStatus.ACTIVE,
        stripeCustomerId: 'cus_test_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const saved = await repository.save(customer);
      const retrieved = await repository.findById(customer.getId());

      // Assert
      expect(saved).toBeInstanceOf(Customer);
      expect(retrieved).toBeInstanceOf(Customer);
      expect(retrieved!.getId().getValue()).toBe(customer.getId().getValue());
      expect(retrieved!.getEmail().getValue()).toBe('customer@test.com');
      expect(retrieved!.getFullName()).toBe('John Doe');
      expect(retrieved!.getPhone()).toBe('+1234567890');
      expect((retrieved as Customer).getStripeCustomerId()).toBe('cus_test_123');
    });

    it('should find customer by email', async () => {
      // Arrange
      const customer = new Customer({
        id: UserId.generate(),
        email: new Email('findme@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Jane Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.save(customer);

      // Act
      const found = await repository.findByEmail(new Email('findme@test.com'));

      // Assert
      expect(found).toBeInstanceOf(Customer);
      expect(found!.getEmail().getValue()).toBe('findme@test.com');
      expect(found!.getFullName()).toBe('Jane Doe');
    });

    it('should update customer information', async () => {
      // Arrange
      const customer = new Customer({
        id: UserId.generate(),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.save(customer);

      // Modify customer
      const customerWithNewName = new Customer({
        id: customer.getId(),
        email: customer.getEmail(),
        passwordHash: customer.getPasswordHash(),
        fullName: 'John Updated Doe',
        status: customer.getStatus(),
        stripeCustomerId: 'cus_updated_123',
        createdAt: customer.getCreatedAt(),
        updatedAt: new Date(),
      });

      // Act
      const updated = await repository.update(customerWithNewName);
      const retrieved = await repository.findById(customer.getId());

      // Assert
      expect(updated.getFullName()).toBe('John Updated Doe');
      expect(retrieved!.getFullName()).toBe('John Updated Doe');
      expect((retrieved as Customer).getStripeCustomerId()).toBe(
        'cus_updated_123',
      );
    });

    it('should delete customer', async () => {
      // Arrange
      const customer = new Customer({
        id: UserId.generate(),
        email: new Email('customer@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'John Doe',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.save(customer);

      // Act
      await repository.delete(customer.getId());
      const retrieved = await repository.findById(customer.getId());

      // Assert
      expect(retrieved).toBeNull();
    });
  });

  describe('Guard Operations', () => {
    it('should save and retrieve a guard with profile', async () => {
      // Arrange
      const guard = new Guard({
        id: UserId.generate(),
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
        lastLocationUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const saved = await repository.save(guard);
      const retrieved = await repository.findById(guard.getId());

      // Assert
      expect(saved).toBeInstanceOf(Guard);
      expect(retrieved).toBeInstanceOf(Guard);
      expect(retrieved!.getId().getValue()).toBe(guard.getId().getValue());
      expect(retrieved!.getEmail().getValue()).toBe('guard@test.com');

      const retrievedGuard = retrieved as Guard;
      expect(retrievedGuard.getLicenseNumber()).toBe('LIC-001-CA');
      expect(retrievedGuard.getHourlyRate()?.getAmount()).toBe(50.0);
      expect(retrievedGuard.getRating()).toBe(5.0);
      expect(retrievedGuard.isAvailable()).toBe(true);
      expect(retrievedGuard.getCurrentLocation()?.getLatitude()).toBe(37.7749);
      expect(retrievedGuard.getCurrentLocation()?.getLongitude()).toBe(-122.4194);
    });

    it('should find all guards', async () => {
      // Arrange
      const guard1 = new Guard({
        id: UserId.generate(),
        email: new Email('guard1@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Guard One',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001',
        hourlyRate: new Money(50),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const guard2 = new Guard({
        id: UserId.generate(),
        email: new Email('guard2@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Guard Two',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-002',
        hourlyRate: new Money(45),
        rating: 4.8,
        isAvailable: false,
        currentLocation: new GeoLocation(34.0522, -118.2437),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.save(guard1);
      await repository.save(guard2);

      // Act
      const allGuards = await repository.findAllGuards();

      // Assert
      expect(allGuards).toHaveLength(2);
      expect(allGuards[0]).toBeInstanceOf(Guard);
      expect(allGuards[1]).toBeInstanceOf(Guard);
    });

    it('should find only available guards', async () => {
      // Arrange
      const availableGuard = new Guard({
        id: UserId.generate(),
        email: new Email('available@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Available Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001',
        hourlyRate: new Money(50),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const unavailableGuard = new Guard({
        id: UserId.generate(),
        email: new Email('unavailable@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Unavailable Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-002',
        hourlyRate: new Money(45),
        rating: 4.8,
        isAvailable: false,
        currentLocation: new GeoLocation(34.0522, -118.2437),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.save(availableGuard);
      await repository.save(unavailableGuard);

      // Act
      const availableGuards = await repository.findAvailableGuards();

      // Assert
      expect(availableGuards).toHaveLength(1);
      expect(availableGuards[0].getEmail().getValue()).toBe('available@test.com');
      expect(availableGuards[0].isAvailable()).toBe(true);
    });

    it('should update guard location', async () => {
      // Arrange
      const guard = new Guard({
        id: UserId.generate(),
        email: new Email('guard@test.com'),
        passwordHash: 'hashedpassword123',
        fullName: 'Mike Guard',
        status: UserStatus.ACTIVE,
        licenseNumber: 'LIC-001',
        hourlyRate: new Money(50),
        rating: 5.0,
        isAvailable: true,
        currentLocation: new GeoLocation(37.7749, -122.4194), // SF
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.save(guard);

      // Update location
      const newLocation = new GeoLocation(34.0522, -118.2437); // LA
      guard.updateLocation(newLocation);

      // Act
      await repository.updateGuardLocation(guard);
      const retrieved = await repository.findGuardById(guard.getId());

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved!.getCurrentLocation()?.getLatitude()).toBe(34.0522);
      expect(retrieved!.getCurrentLocation()?.getLongitude()).toBe(-118.2437);
    });
  });

  describe('Error Cases', () => {
    it('should return null for non-existent user', async () => {
      // Act
      const result = await repository.findById(UserId.generate());

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-existent email', async () => {
      // Act
      const result = await repository.findByEmail(
        new Email('nonexistent@test.com'),
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return empty array when no guards exist', async () => {
      // Act
      const guards = await repository.findAllGuards();

      // Assert
      expect(guards).toEqual([]);
    });
  });
});
