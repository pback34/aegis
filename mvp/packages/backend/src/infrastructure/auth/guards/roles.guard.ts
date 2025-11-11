import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../../domain/entities/user.entity';

/**
 * Roles Guard
 * Checks if the authenticated user has the required role(s)
 * Use with @Roles() decorator
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the route metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the user from the request (added by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest<{ user: User }>();

    if (!user) {
      return false;
    }

    // Check if the user's role matches any of the required roles
    const userRole = user.getRole();
    return requiredRoles.includes(userRole);
  }
}
