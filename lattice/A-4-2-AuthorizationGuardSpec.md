---
node_type: Artifact
artifact_type: Code
artifact_format: TypeScript
status: Complete
created: 2025-11-09
updated: 2025-11-09
priority: Critical
spawned_by:
  - D-4
informs: []
tags:
  - artifact
  - code
  - authorization
  - rbac
  - guards

# Artifact Location
artifact_location: ../specs/A-4-2-AuthorizationGuardSpec.md
external_files:
  - specs/A-4-2-AuthorizationGuardSpec.md
---

# A-4-2: Authorization Guard Specification

## Artifact Description

Complete implementation specification for **Role-Based Access Control (RBAC) Guards** in NestJS. Provides code-ready implementations for role-based authorization, resource ownership checks, and custom decorators.

## Content Summary

This artifact includes:

1. **RolesGuard** - Main RBAC guard checking user roles
2. **ResourceOwnershipGuard** - Base class for ownership checks
3. **Decorators**:
   - `@Roles(...roles)` - Specify required roles for endpoints
   - `@CurrentUser(field?)` - Extract user from request
   - `@Public()` - Mark endpoints as public (bypass auth)
4. **Usage examples** for all guard patterns
5. **Testing specifications** for guard behavior

## Key Implementation Features

Based on **D-4** authorization requirements:

- **3 Roles**: customer, guard, admin
- **Role enforcement**: Use `@Roles()` decorator on controllers/endpoints
- **Multiple roles**: Support OR logic (user needs one of specified roles)
- **Admin bypass**: Admins automatically pass all ownership checks
- **Resource ownership**: Extend `ResourceOwnershipGuard` for specific resources
- **Global guards**: Optional JWT guard applied globally with `@Public()` opt-out

## File Structure

```
src/common/
├── guards/
│   ├── roles.guard.ts
│   ├── resource-ownership.guard.ts
│   └── jwt-auth.guard.ts (from A-4-1)
├── decorators/
│   ├── roles.decorator.ts
│   ├── current-user.decorator.ts
│   └── public.decorator.ts
└── enums/
    └── user-role.enum.ts
```

## Related Nodes

- **Spawned by**: D-4 (Authentication & Authorization Architecture)
- **Complements**: A-4-1 (Authentication Service), A-4-3 (Security Middleware)
- **Used by**: All protected API endpoints

## Validation Criteria

- ✅ RolesGuard implementation complete
- ✅ ResourceOwnershipGuard base class provided
- ✅ All decorators (@Roles, @CurrentUser, @Public) implemented
- ✅ Usage examples for all patterns
- ✅ Testing specifications included

**Status**: ✅ Complete - Ready for implementation
