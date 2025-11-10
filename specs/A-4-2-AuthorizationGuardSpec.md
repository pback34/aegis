# Authorization Guard Specification

**Document Version**: 1.0
**Created**: 2025-11-09
**Decision Reference**: D-4-AuthenticationAuthorizationArchitecture

---

## 1. Overview

This document specifies the **Role-Based Access Control (RBAC) Guards** for the Aegis platform, implementing authorization checks based on user roles (customer, guard, admin) and resource ownership.

## 2. Role Definitions

```typescript
// src/common/enums/user-role.enum.ts
export enum UserRole {
  CUSTOMER = 'customer',
  GUARD = 'guard',
  ADMIN = 'admin',
}
```

## 3. Roles Guard Implementation

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

## 4. Roles Decorator

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

## 5. Current User Decorator

```typescript
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

## 6. Resource Ownership Guard

```typescript
// src/common/guards/resource-ownership.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    // Admins bypass ownership checks
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Check resource ownership (implement per controller)
    const resource = await this.getResource(resourceId);

    if (resource.userId !== user.userId) {
      throw new ForbiddenException('You do not own this resource');
    }

    return true;
  }

  // Override in specific guards
  protected async getResource(id: string): Promise<any> {
    throw new Error('getResource must be implemented by subclass');
  }
}
```

## 7. Usage Examples

### 7.1 Protect Endpoint by Role

```typescript
@Controller('jobs')
export class JobsController {
  // Only customers can create jobs
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  createJob(@CurrentUser('userId') userId: string, @Body() dto: CreateJobDto) {
    return this.jobsService.create(userId, dto);
  }

  // Only guards can accept jobs
  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GUARD)
  acceptJob(@CurrentUser('userId') guardId: string, @Param('id') jobId: string) {
    return this.jobsService.accept(jobId, guardId);
  }

  // Only admins can view all jobs
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllJobs() {
    return this.jobsService.findAll();
  }
}
```

### 7.2 Multiple Roles

```typescript
// Both customers and guards can view job details
@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.GUARD)
getJob(@Param('id') id: string) {
  return this.jobsService.findOne(id);
}
```

### 7.3 Resource Ownership Check

```typescript
// Custom guard for job ownership
@Injectable()
export class JobOwnershipGuard extends ResourceOwnershipGuard {
  constructor(private jobsService: JobsService) {
    super();
  }

  protected async getResource(id: string) {
    return this.jobsService.findOne(id);
  }
}

// Usage in controller
@Patch(':id')
@UseGuards(JwtAuthGuard, JobOwnershipGuard)
updateJob(@Param('id') id: string, @Body() dto: UpdateJobDto) {
  return this.jobsService.update(id, dto);
}
```

## 8. Global Guards Configuration

```typescript
// src/main.ts or app.module.ts
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,  // Apply JWT auth globally
    },
  ],
})
export class AppModule {}

// Public endpoints opt-out with decorator
@Public()  // Custom decorator
@Post('auth/login')
login() { ... }
```

## 9. Public Decorator

```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Modified JwtAuthGuard to respect @Public()
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

## 10. Testing

```typescript
describe('RolesGuard', () => {
  it('should allow access if user has required role', () => {
    const context = createMockExecutionContext({
      user: { role: UserRole.ADMIN },
      requiredRoles: [UserRole.ADMIN],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user lacks required role', () => {
    const context = createMockExecutionContext({
      user: { role: UserRole.CUSTOMER },
      requiredRoles: [UserRole.ADMIN],
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access if user has one of multiple required roles', () => {
    const context = createMockExecutionContext({
      user: { role: UserRole.GUARD },
      requiredRoles: [UserRole.CUSTOMER, UserRole.GUARD],
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
```

---

**End of Document**
