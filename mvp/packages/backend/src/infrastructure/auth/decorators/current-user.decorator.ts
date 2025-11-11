import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../domain/entities/user.entity';

/**
 * Current User decorator
 * Extract the authenticated user from the request
 *
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: User) {
 *   return {
 *     id: user.getId().getValue(),
 *     email: user.getEmail().getValue(),
 *     role: user.getRole(),
 *   };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
