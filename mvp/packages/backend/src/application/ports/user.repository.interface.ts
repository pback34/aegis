import { User } from '../../domain/entities/user.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { Guard } from '../../domain/entities/guard.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { UserId } from '../../domain/value-objects/user-id.value-object';

/**
 * Repository interface for User entity (Port)
 * Implementations should be in the infrastructure layer
 */
export interface IUserRepository {
  /**
   * Save a new user (customer or guard)
   */
  save(user: User): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Update existing user
   */
  update(user: User): Promise<User>;

  /**
   * Delete user by ID
   */
  delete(id: UserId): Promise<void>;

  /**
   * Find all guards
   */
  findAllGuards(): Promise<Guard[]>;

  /**
   * Find all available guards (is_available = true)
   */
  findAvailableGuards(): Promise<Guard[]>;

  /**
   * Find guard by ID
   */
  findGuardById(id: UserId): Promise<Guard | null>;

  /**
   * Find customer by ID
   */
  findCustomerById(id: UserId): Promise<Customer | null>;

  /**
   * Update guard location and availability
   */
  updateGuardLocation(guard: Guard): Promise<Guard>;
}
