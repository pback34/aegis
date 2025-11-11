import { User, UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { Customer } from '../../../domain/entities/customer.entity';
import { Guard } from '../../../domain/entities/guard.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { Money } from '../../../domain/value-objects/money.value-object';
import { GeoLocation } from '../../../domain/value-objects/geo-location.value-object';
import { UserEntity } from '../../database/entities/user.entity';
import { GuardProfileEntity } from '../../database/entities/guard-profile.entity';

export class UserMapper {
  static toDomain(entity: UserEntity, guardProfile?: GuardProfileEntity): User {
    const baseProps = {
      id: new UserId(entity.id),
      email: new Email(entity.email),
      passwordHash: entity.password_hash,
      fullName: entity.full_name,
      phone: entity.phone || undefined,
      status: entity.status as UserStatus,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };

    if (entity.role === 'guard' && guardProfile) {
      return new Guard({
        ...baseProps,
        licenseNumber: guardProfile.license_number || undefined,
        hourlyRate: guardProfile.hourly_rate ? new Money(guardProfile.hourly_rate) : undefined,
        rating: guardProfile.rating,
        isAvailable: guardProfile.is_available,
        currentLocation:
          guardProfile.current_latitude && guardProfile.current_longitude
            ? new GeoLocation(guardProfile.current_latitude, guardProfile.current_longitude)
            : new GeoLocation(0, 0),
        lastLocationUpdate: guardProfile.last_location_update || undefined,
      });
    } else if (entity.role === 'customer') {
      return new Customer({
        ...baseProps,
        stripeCustomerId: entity.stripe_customer_id || undefined,
      });
    }

    // Fallback for admin or unexpected roles
    throw new Error(`Unsupported user role: ${entity.role}`);
  }

  static toPersistence(
    user: User,
  ): { user: Partial<UserEntity>; guardProfile?: Partial<GuardProfileEntity> } {
    const userEntity: Partial<UserEntity> = {
      id: user.getId().getValue(),
      email: user.getEmail().getValue(),
      password_hash: user.getPasswordHash(),
      role: user.getRole(),
      full_name: user.getFullName(),
      phone: user.getPhone() || null,
      status: user.getStatus(),
      created_at: user.getCreatedAt(),
      updated_at: user.getUpdatedAt(),
    };

    if (user instanceof Customer) {
      userEntity.stripe_customer_id = user.getStripeCustomerId() || null;
    } else if (user instanceof Guard) {
      userEntity.stripe_connect_account_id = user.getStripeConnectAccountId() || null;

      const guardProfile: Partial<GuardProfileEntity> = {
        user_id: user.getId().getValue(),
        license_number: user.getLicenseNumber() || null,
        hourly_rate: user.getHourlyRate()?.getAmount() || null,
        rating: user.getRating(),
        is_available: user.isAvailable(),
        current_latitude: user.getCurrentLocation()?.getLatitude() || null,
        current_longitude: user.getCurrentLocation()?.getLongitude() || null,
        last_location_update: user.getLastLocationUpdate() || null,
      };

      return { user: userEntity, guardProfile };
    }

    return { user: userEntity };
  }
}
