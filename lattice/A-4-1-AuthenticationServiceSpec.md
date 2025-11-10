---
node_type: Artifact
artifact_type: Design
artifact_format: SDS
status: Complete
created: 2025-11-09
updated: 2025-11-09
priority: Critical
spawned_by:
  - D-4
informs: []
tags:
  - artifact
  - design
  - authentication
  - sds
  - implementation-spec

# Artifact Location
artifact_location: ../specs/A-4-1-AuthenticationServiceSpec.md
external_files:
  - specs/A-4-1-AuthenticationServiceSpec.md
---

# A-4-1: Authentication Service Specification

## Artifact Description

Complete Software Design Specification (SDS) for the **Authentication Service** in the Aegis platform. This document provides implementation-ready specifications for developers to build the authentication system with NestJS, JWT tokens, bcrypt password hashing, token rotation, MFA support, and Redis-based token revocation.

## Purpose

Provide a comprehensive, detailed specification that developers can directly implement without additional design decisions. Covers all aspects of authentication including registration, login, token management, MFA, and security considerations.

## Scope

**Included in this specification:**

1. **Architecture & Module Structure**
   - NestJS module organization
   - Dependencies and configuration
   - System context diagrams

2. **API Endpoints (6 endpoints)**
   - POST /auth/register - User registration
   - POST /auth/login - Password-based login
   - POST /auth/refresh - Token refresh with rotation
   - POST /auth/logout - Logout and token revocation
   - POST /auth/mfa/enable - Enable MFA for user
   - POST /auth/mfa/verify - Verify and activate MFA

3. **Data Models & Interfaces**
   - JwtPayload interface
   - AuthResponse interface
   - MfaSecretResponse interface
   - DTOs with class-validator decorators

4. **Core Service Methods**
   - generateTokens() - JWT access + refresh token generation
   - blacklistToken() - Redis-based token blacklisting
   - verifyMfaCode() - TOTP and backup code verification
   - encryptSecret() / decryptSecret() - AES-256-GCM encryption
   - generateBackupCodes() - Secure backup code generation

5. **Controller Implementation**
   - Complete NestJS controller with httpOnly cookie handling
   - Request/response handling for all endpoints
   - Guard decorators for protected routes

6. **Passport Strategies**
   - JwtStrategy for token validation
   - LocalStrategy for username/password auth

7. **Security Implementation**
   - bcrypt password hashing (12 rounds)
   - JWT signing with HS256
   - Token rotation on refresh
   - MFA with TOTP (speakeasy)
   - Secret encryption with AES-256-GCM

8. **Testing Requirements**
   - Unit test specifications
   - Integration test specifications
   - E2E test examples

9. **Deployment Considerations**
   - Environment variables
   - Security checklist
   - Monitoring and alerting
   - Rate limiting configuration

## Content Summary

The full specification is available in `specs/A-4-1-AuthenticationServiceSpec.md` and includes:

- **13 sections** covering all aspects of authentication
- **Code-complete examples** for all service methods, controllers, and strategies
- **TypeScript interfaces** with full type definitions
- **Security best practices** based on D-4 architecture decisions
- **Testing requirements** with example test cases
- **Deployment checklist** for production readiness

### Key Technical Decisions Implemented

Based on **D-4: Authentication & Authorization Architecture**:

1. **Stateless JWT Authentication**
   - Access tokens: 15 minutes (HS256)
   - Refresh tokens: 7 days with rotation
   - Redis blacklist for revocation

2. **Password Security**
   - bcrypt with 12 rounds (~300-400ms)
   - Password complexity: min 8 chars, uppercase, lowercase, number

3. **Token Storage**
   - Web: httpOnly cookies (XSS protection)
   - Mobile: Authorization header (Keychain/Keystore)

4. **MFA Implementation**
   - TOTP with speakeasy library
   - QR code generation with qrcode library
   - 10 backup codes (SHA-256 hashed, single-use)
   - AES-256-GCM encryption for secrets

5. **Audit Logging**
   - All auth events logged (registration, login success/failure, token refresh, logout, MFA changes)

## Implementation Notes

### Dependencies Required

```json
{
  "@nestjs/jwt": "^10.1.0",
  "@nestjs/passport": "^10.0.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "ioredis": "^5.3.2"
}
```

### Environment Variables

```bash
JWT_SECRET=<256-bit-random-secret>
JWT_REFRESH_SECRET=<256-bit-random-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=<256-bit-random-key>
REDIS_HOST=localhost
REDIS_PORT=6379
```

### File Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   ├── refresh-token.dto.ts
│   └── verify-mfa.dto.ts
└── interfaces/
    ├── jwt-payload.interface.ts
    └── auth-response.interface.ts
```

## Leads To

This artifact enables the following implementation tasks:

- **T-4-1**: Implement Auth Module & Service (registration, login, token management)
- **T-4-2**: Implement JWT Strategies & Guards (Passport.js integration)
- **T-4-3**: Implement MFA Setup & Verification (TOTP, backup codes)
- **T-4-4**: Implement Token Blacklist (Redis integration)
- **T-4-5**: Write Authentication Tests (unit, integration, E2E)

## Related Nodes

- **Spawned by**: D-4 (Authentication & Authorization Architecture)
- **Implements**: JWT authentication, bcrypt password hashing, MFA, token rotation
- **Complements**: A-4-2 (Authorization Guards), A-4-3 (Security Middleware)
- **Depends on**: User entity from A-5-1, Redis configuration

## Validation Criteria

This artifact is complete and implementation-ready when:

- ✅ All 6 API endpoints are fully specified with DTOs
- ✅ All service methods have complete TypeScript implementations
- ✅ Controller includes httpOnly cookie handling
- ✅ JWT strategies are production-ready
- ✅ MFA flow is completely specified (setup, verification, backup codes)
- ✅ Security considerations are documented
- ✅ Testing requirements are clear
- ✅ Environment variables are listed
- ✅ Deployment checklist is provided

**Status**: ✅ Complete - Ready for implementation

## Notes

- This SDS provides **code-complete examples** - developers can copy and adapt the TypeScript code directly
- All security considerations from D-4 are implemented (token rotation, httpOnly cookies, bcrypt, MFA)
- Redis integration is required for token blacklist (high availability recommended for production)
- MFA secrets are encrypted with AES-256-GCM before storage
- Audit logging integration points are specified but require Audit Service implementation

---

**Artifact Created**: 2025-11-09
**Decision Reference**: D-4-AuthenticationAuthorizationArchitecture.md
**External File**: specs/A-4-1-AuthenticationServiceSpec.md (13 sections, 500+ lines)
