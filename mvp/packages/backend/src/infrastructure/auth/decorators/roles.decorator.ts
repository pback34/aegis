import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator
 * Specify which roles are allowed to access this route
 *
 * @param roles - Array of role names (e.g., 'customer', 'guard', 'admin')
 *
 * @example
 * ```typescript
 * @Roles('guard')
 * @Post('accept-booking')
 * async acceptBooking(@Param('id') id: string, @CurrentUser() user: User) {
 *   return this.bookingService.accept(id, user);
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
