import { UserId, Email } from '../value-objects';

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

export interface UserProps {
  id?: UserId;
  email: Email;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class User {
  protected readonly id: UserId;
  protected email: Email;
  protected passwordHash: string;
  protected readonly role: UserRole;
  protected fullName: string;
  protected phone?: string;
  protected status: UserStatus;
  protected readonly createdAt: Date;
  protected updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id || UserId.create();
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.fullName = props.fullName;
    this.phone = props.phone;
    this.status = props.status;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();

    this.validate();
  }

  protected validate(): void {
    if (!this.fullName || this.fullName.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters');
    }
    if (this.phone && !this.isValidPhone(this.phone)) {
      throw new Error('Invalid phone number format');
    }
  }

  private isValidPhone(phone: string): boolean {
    // Simple validation: 10-15 digits with optional + and spaces/dashes
    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    return phoneRegex.test(phone);
  }

  // Getters
  getId(): UserId {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRole(): UserRole {
    return this.role;
  }

  getFullName(): string {
    return this.fullName;
  }

  getPhone(): string | undefined {
    return this.phone;
  }

  getStatus(): UserStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business methods
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isSuspended(): boolean {
    return this.status === UserStatus.SUSPENDED;
  }

  updateProfile(fullName: string, phone?: string): void {
    if (fullName) {
      this.fullName = fullName;
    }
    if (phone !== undefined) {
      this.phone = phone;
    }
    this.validate();
    this.touch();
  }

  updateEmail(newEmail: Email): void {
    this.email = newEmail;
    this.touch();
  }

  updatePassword(newPasswordHash: string): void {
    if (!newPasswordHash || newPasswordHash.length < 10) {
      throw new Error('Invalid password hash');
    }
    this.passwordHash = newPasswordHash;
    this.touch();
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
    this.touch();
  }

  deactivate(): void {
    this.status = UserStatus.INACTIVE;
    this.touch();
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
    this.touch();
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }

  equals(other: User): boolean {
    return this.id.equals(other.id);
  }
}
