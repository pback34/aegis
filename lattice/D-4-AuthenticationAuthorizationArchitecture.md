---
node_type: Decision
decision_type: Design
status: Proposed
created: 2025-11-09
updated: 2025-11-09
priority: Critical
spawned_by:
  - Q-6
  - Q-3
  - D-2
informs: []
depends_on:
  - D-1
  - D-2
tags:
  - technical
  - architecture
  - authentication
  - authorization
  - security
  - jwt
  - rbac

# AI Metadata
created_by: AI:DecisionAgent
ai_confidence: 0.90
human_review_required: true
review_status: Pending
---

# D-4: Authentication & Authorization Architecture

## Decision

Implement a stateless JWT-based authentication system with role-based access control (RBAC) using Passport.js + JWT strategy in NestJS, featuring short-lived access tokens (15 minutes) with rotating refresh tokens (7 days), httpOnly cookies for web security, secure mobile storage (iOS Keychain/Android Keystore), bcrypt password hashing (12 rounds), and comprehensive security middleware stack including rate limiting, CORS, helmet, and audit logging.

## Rationale

Based on API design decisions from D-2 and security research from Q-6, this authentication architecture provides the **optimal balance between security, scalability, and developer experience** for the Aegis platform.

### 1. JWT Over Session-Based Authentication

**Why JWT is Superior for Our Use Case:**

**Stateless Scalability:**
- No server-side session storage required (scales horizontally without sticky sessions)
- No Redis/database lookup on every request (faster API response times)
- Load balancers can route requests to any backend server without session affinity

**Mobile-First Architecture:**
- Native mobile apps require token-based auth (sessions don't work well on mobile)
- Tokens can be securely stored in iOS Keychain / Android Keystore
- Single authentication mechanism for web + iOS + Android reduces complexity

**Microservices Ready:**
- JWT can be validated by any service without centralized auth server
- Token contains all necessary claims (userId, role, permissions)
- Future-proofs architecture for service-to-service authentication

**Trade-off Accepted:**
- Immediate token revocation requires token blacklist (implemented in Redis)
- Tokens expire and need refresh (15-minute access tokens mitigate risk)

### 2. Short-Lived Access Tokens + Rotating Refresh Tokens

**Security Model:**

```
Access Token (15 minutes):
- Used for API authorization (every request)
- Contains: { userId, email, role, iat, exp }
- Signed with HS256 (HMAC-SHA256)
- Cannot be revoked (short lifetime mitigates risk)

Refresh Token (7 days):
- Used to obtain new access tokens
- Stored in Redis with user metadata
- Rotated on each use (old token invalidated)
- Can be revoked immediately (logout, password change)
```

**Why 15 Minutes for Access Tokens:**
- Short enough to limit exposure if token stolen (XSS, MitM attack)
- Long enough to avoid constant refresh requests (reduces server load)
- Industry best practice for public APIs (Auth0, Firebase use similar durations)

**Why 7 Days for Refresh Tokens:**
- Balances user convenience (don't force login too often) with security
- Mobile apps can refresh in background (seamless UX)
- Shorter than typical "remember me" (30 days) but reasonable for gig workers

**Rotation Strategy:**
```
User requests new access token with refresh token:
1. Validate refresh token signature and expiration
2. Check Redis for refresh token (not blacklisted)
3. Generate NEW access token (15 min) + NEW refresh token (7 days)
4. Invalidate OLD refresh token in Redis
5. Return both new tokens to client
6. Client stores new tokens and repeats
```

**Benefits:**
- Limits refresh token reuse attacks (old tokens immediately invalid)
- Detected compromise triggers re-authentication (stolen token won't work after victim refreshes)
- Audit trail in Redis (track all refresh events)

### 3. Role-Based Access Control (RBAC)

**Three-Tier Role Model:**

```typescript
enum UserRole {
  CUSTOMER = 'customer',  // Can create jobs, view guard profiles, make payments
  GUARD = 'guard',        // Can accept jobs, update location, complete jobs
  ADMIN = 'admin'         // Full platform access, user management, dashboard
}
```

**Authorization Implementation:**

**Guards (NestJS Authorization Guards):**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Post('/jobs')
createJob() { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GUARD)
@Patch('/jobs/:id/accept')
acceptJob() { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('/admin/dashboard')
getDashboard() { ... }
```

**Resource Ownership Checks:**
- Customers can only access their own jobs (`job.customerId === userId`)
- Guards can only accept jobs assigned to them
- Admins bypass ownership checks (full access for support/debugging)

**Permission Granularity:**
```typescript
// Future-proof: Can extend to fine-grained permissions
interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions?: string[];  // e.g., ['jobs:create', 'payments:read']
}
```

**Why RBAC vs ABAC (Attribute-Based Access Control):**
- **RBAC is simpler**: Three roles cover all MVP use cases
- **Predictable**: Easy to reason about who can do what
- **Easier to audit**: Role changes are logged, not complex policy evaluations
- **Defer ABAC**: Can add attribute-based policies later if needed (e.g., "guards can only see jobs in their licensed states")

### 4. Password Security with bcrypt

**Hashing Strategy:**

```typescript
import * as bcrypt from 'bcrypt';

// Registration: Hash password before storing
const saltRounds = 12;  // 2^12 iterations (slower = more secure)
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Login: Compare plain password with stored hash
const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
```

**Why bcrypt Over Alternatives:**

| Algorithm | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **bcrypt** | Adaptive (can increase rounds), time-tested, resistant to GPU attacks | Slower than Argon2 | ✅ **CHOSEN** - Industry standard, excellent libraries |
| Argon2 | Winner of password hashing competition, memory-hard | Less mature Node.js support | ⚠️ Defer to future (bcrypt sufficient for MVP) |
| scrypt | Memory-hard, good security | Complex parameters, less common | ❌ Not worth complexity vs bcrypt |
| PBKDF2 | Simple, FIPS approved | More vulnerable to GPU attacks | ❌ Inferior to bcrypt |
| SHA-256 | Fast | **INSECURE** - too fast for passwords | ❌ **NEVER USE** |

**Rounds Calibration:**
- **12 rounds**: ~300-400ms hashing time on modern server
- **Acceptable UX**: Login delay imperceptible to users
- **Strong security**: 2^12 = 4,096 iterations makes brute force infeasible
- **Future-proof**: Can increase to 14 rounds in 2-3 years as hardware improves

**Password Policy:**
```typescript
// Enforced at application layer (DTO validation)
minLength: 8
requireUppercase: true
requireLowercase: true
requireNumber: true
requireSpecialChar: false  // Too restrictive for MVP, users struggle
maxLength: 128             // Prevent DoS via extremely long passwords
```

### 5. Token Storage Strategy (Web vs Mobile)

**Web Application (httpOnly Cookies):**

```typescript
// Set access token in httpOnly cookie (immune to XSS)
response.cookie('access_token', accessToken, {
  httpOnly: true,        // JavaScript cannot access (XSS protection)
  secure: true,          // HTTPS only (production)
  sameSite: 'strict',    // CSRF protection
  maxAge: 15 * 60 * 1000 // 15 minutes
});

// Set refresh token in separate httpOnly cookie
response.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

**Why httpOnly Cookies for Web:**
- **XSS Protection**: Malicious JavaScript cannot steal tokens (most common attack vector)
- **Automatic Transmission**: Browser sends cookie on every request (no manual header management)
- **CSRF Protection**: `sameSite: 'strict'` prevents cross-site request forgery
- **Better than localStorage**: localStorage is accessible to any JavaScript (vulnerable to XSS)

**Mobile Application (Secure Storage):**

```typescript
// React Native: Use react-native-keychain
import * as Keychain from 'react-native-keychain';

// Store tokens securely
await Keychain.setGenericPassword('access_token', accessToken, {
  service: 'com.aegis.auth',
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY, // Optional: require FaceID/TouchID
});

// Retrieve tokens
const credentials = await Keychain.getGenericPassword({ service: 'com.aegis.auth' });
const accessToken = credentials.password;
```

**Why Keychain/Keystore for Mobile:**
- **OS-Level Encryption**: iOS Keychain and Android Keystore use hardware-backed encryption
- **Isolated Storage**: Each app has isolated keychain/keystore (no cross-app access)
- **Biometric Protection**: Optional FaceID/TouchID required to access tokens
- **Better than AsyncStorage**: AsyncStorage is unencrypted and accessible to root/jailbreak

**Trade-off: Web Cookies vs Mobile Headers:**
- **Web**: Cookies sent automatically, no Authorization header needed
- **Mobile**: Must manually set `Authorization: Bearer ${accessToken}` header on each request
- **Backend supports both**: Check for cookie first, fall back to Authorization header

### 6. Security Middleware Stack

**Layer 1: Rate Limiting (Prevent Brute Force)**

```typescript
// Auth endpoints (login, register, refresh)
@UseGuards(ThrottlerGuard)
@Throttle(5, 900)  // 5 requests per 15 minutes per IP
@Post('/auth/login')
async login() { ... }

// General API endpoints
@UseGuards(ThrottlerGuard)
@Throttle(100, 60)  // 100 requests per minute per user
@Get('/jobs')
async getJobs() { ... }
```

**Implementation:**
```typescript
// Use @nestjs/throttler
ThrottlerModule.forRoot({
  ttl: 60,           // Time window in seconds
  limit: 100,        // Max requests in time window
  storage: new ThrottlerStorageRedisService(redis),  // Share limits across servers
});
```

**Why Rate Limiting:**
- **Prevent brute force**: Attacker can't try millions of passwords
- **Prevent DoS**: Malicious users can't overwhelm API
- **Fair usage**: Ensures resources available for all users

**Layer 2: CORS (Cross-Origin Resource Sharing)**

```typescript
// Configure allowed origins
app.enableCors({
  origin: [
    'https://aegis.com',           // Production web app
    'https://admin.aegis.com',     // Admin dashboard
    'http://localhost:3000',       // Local development
  ],
  credentials: true,                // Allow cookies to be sent
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Why CORS:**
- **Prevent unauthorized domains** from calling API
- **Allow credentials** (cookies) from trusted origins only
- **Security layer** against malicious websites making requests on behalf of users

**Layer 3: Helmet (Security Headers)**

```typescript
import helmet from 'helmet';

// Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Allow inline scripts (Next.js requirement)
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],  // Allow Stripe API calls
    },
  },
  hsts: {
    maxAge: 31536000,    // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

**Security Headers Enabled:**
- **X-Content-Type-Options**: Prevent MIME sniffing attacks
- **X-Frame-Options**: Prevent clickjacking (no iframes)
- **X-XSS-Protection**: Enable browser XSS filtering
- **Strict-Transport-Security (HSTS)**: Force HTTPS
- **Content-Security-Policy (CSP)**: Restrict resource loading (prevent XSS)

**Layer 4: Input Validation (DTO with class-validator)**

```typescript
// Registration DTO with validation
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;
}
```

**Why Input Validation:**
- **Prevent injection attacks** (SQL injection, NoSQL injection, XSS)
- **Data integrity**: Only valid data enters system
- **Clear error messages**: Users get immediate feedback on invalid input

**Layer 5: Audit Logging**

```typescript
// Log all authentication events
@Injectable()
export class AuditLogger {
  async logAuthEvent(event: AuthEvent) {
    await this.auditLogRepository.create({
      userId: event.userId,
      eventType: event.type,  // LOGIN_SUCCESS, LOGIN_FAILED, TOKEN_REFRESH, LOGOUT
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date(),
      metadata: event.metadata,
    });
  }
}
```

**Audit Log Events:**
- Login success/failure (track brute force attempts)
- Token refresh (detect stolen tokens)
- Password change (security event)
- Logout (user-initiated or forced)
- Role changes (admin escalation)

**Retention:** 90 days for security investigations, CCPA compliance

### 7. Token Revocation & Blacklisting

**Problem:** JWTs cannot be invalidated before expiration (stateless design).

**Solution:** Redis-based token blacklist for immediate revocation scenarios.

**When to Revoke:**
1. **User logs out** (invalidate refresh token)
2. **Password changed** (invalidate all tokens)
3. **Account suspended** (invalidate all tokens)
4. **Security incident** (admin force-logout)

**Implementation:**

```typescript
// Blacklist refresh token
async revokeRefreshToken(tokenId: string) {
  const ttl = 7 * 24 * 60 * 60;  // 7 days (match refresh token expiry)
  await redis.set(`blacklist:refresh:${tokenId}`, '1', 'EX', ttl);
}

// Check if token is blacklisted
async isTokenBlacklisted(tokenId: string): Promise<boolean> {
  const result = await redis.get(`blacklist:refresh:${tokenId}`);
  return result !== null;
}

// Logout: Blacklist refresh token
async logout(refreshToken: string) {
  const decoded = this.jwtService.verify(refreshToken);
  await this.revokeRefreshToken(decoded.jti);  // jti = JWT ID (unique identifier)
}

// Password change: Blacklist all user's tokens
async revokeAllUserTokens(userId: string) {
  const userTokens = await this.refreshTokenRepository.find({ userId });
  await Promise.all(userTokens.map(t => this.revokeRefreshToken(t.tokenId)));
}
```

**Why Redis:**
- Fast lookups (< 1ms) for token validation
- Automatic expiration (TTL matches token expiry)
- Shared across all backend servers (distributed blacklist)

**Trade-off:**
- Access tokens cannot be blacklisted (15-minute exposure window acceptable)
- Redis dependency (mitigated by Redis HA setup)

### 8. MFA for Admin Accounts

**Requirement:** Admins have elevated privileges (user management, payment refunds, data access).

**Implementation:** TOTP (Time-based One-Time Password) with authenticator apps.

```typescript
// Enable MFA for user
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

async enableMFA(userId: string) {
  const secret = speakeasy.generateSecret({
    name: 'Aegis Security',
    issuer: 'Aegis',
  });

  // Store secret in user record (encrypted)
  await this.userRepository.update(userId, {
    mfaSecret: this.encryptSecret(secret.base32),
    mfaEnabled: false,  // Not enabled until verified
  });

  // Generate QR code for authenticator app
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  return { secret: secret.base32, qrCode: qrCodeUrl };
}

// Verify MFA code
async verifyMFA(userId: string, token: string): Promise<boolean> {
  const user = await this.userRepository.findOne(userId);
  const secret = this.decryptSecret(user.mfaSecret);

  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1,  // Allow 1 time-step tolerance (±30 seconds)
  });
}
```

**MFA Flow:**
1. Admin enables MFA in settings
2. System generates secret and QR code
3. Admin scans QR code with Google Authenticator / Authy
4. Admin enters 6-digit code to verify setup
5. System marks `mfaEnabled: true`
6. Future logins require password + 6-digit code

**Enforcement:**
- MFA required for all admin accounts (enforced at application level)
- MFA optional for customers and guards (can be enabled in settings)
- Backup codes provided (10 single-use codes for emergency access)

## Alternatives Considered

### Alternative 1: Session-Based Authentication (Redis Sessions)

**Pros:**
- Easy immediate revocation (delete session from Redis)
- Server controls session lifetime (no token expiration logic)
- Familiar pattern (traditional web apps)

**Cons:**
- **Requires sticky sessions** or Redis lookup on every request (slower, less scalable)
- **Doesn't work well on mobile** (requires custom session management)
- **Centralized bottleneck** (Redis failure = authentication failure)
- **Harder to scale** (session affinity complicates load balancing)

**REJECTED**: JWT is more scalable and mobile-friendly, token blacklist mitigates revocation concerns.

### Alternative 2: OAuth 2.0 with Third-Party Providers (Google, Apple Sign-In)

**Pros:**
- Users don't create passwords (better security, less friction)
- Social login improves conversion (faster registration)
- Delegated authentication (we don't handle credentials)

**Cons:**
- **Dependency on third parties** (Google/Apple outage = login outage)
- **Not suitable for all users** (some guards may not have Google accounts)
- **Privacy concerns** (users may not trust social login for work app)
- **Additional complexity** (OAuth flow + fallback password auth)

**DEFERRED**: Implement OAuth as optional alternative in post-MVP, keep password auth as primary.

### Alternative 3: Longer-Lived Access Tokens (1 hour or more)

**Pros:**
- Fewer refresh requests (reduced server load)
- Simpler client logic (less token rotation)

**Cons:**
- **Longer exposure window** if token stolen (1 hour vs 15 minutes)
- **Violates security best practices** (OAuth 2.0 RFC recommends short-lived tokens)
- **Harder to detect compromises** (stolen token valid for longer)

**REJECTED**: 15 minutes is industry standard, longer duration not worth security risk.

### Alternative 4: Refresh Token Reuse (Don't Rotate)

**Pros:**
- Simpler implementation (no rotation logic)
- Fewer database writes (don't update refresh token on each use)

**Cons:**
- **Stolen refresh token valid for 7 days** (attacker can generate access tokens)
- **No compromise detection** (victim and attacker both use same refresh token)
- **Worse security** (violates OAuth 2.0 best practices)

**REJECTED**: Token rotation is security best practice, worth the implementation complexity.

## Implications

### Development Requirements

**1. NestJS Modules to Implement:**
- `AuthModule`: Registration, login, logout, token refresh
- `JwtModule`: Token generation and validation (using `@nestjs/jwt`)
- `PassportModule`: Passport strategies (`passport-jwt`, `passport-local`)
- `SecurityModule`: Rate limiting, CORS, helmet, audit logging

**2. Dependencies to Install:**
```json
{
  "@nestjs/jwt": "^10.1.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/throttler": "^5.0.0",
  "passport": "^0.6.0",
  "passport-jwt": "^4.0.1",
  "passport-local": "^1.0.0",
  "bcrypt": "^5.1.1",
  "helmet": "^7.0.0",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1"
}
```

**3. Environment Variables:**
```bash
JWT_SECRET=<256-bit random secret>           # For signing access tokens
JWT_REFRESH_SECRET=<256-bit random secret>   # For signing refresh tokens
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12
REDIS_URL=redis://localhost:6379
```

**4. Database Migrations:**
- Add `passwordHash` column to `users` table (VARCHAR, NOT NULL)
- Add `mfaSecret` column to `users` table (VARCHAR, NULLABLE, encrypted)
- Add `mfaEnabled` column to `users` table (BOOLEAN, DEFAULT false)
- Create `audit_logs` table (userId, eventType, ipAddress, userAgent, timestamp, metadata JSONB)

### Security Hardening

**5. TLS/HTTPS Requirements:**
- All environments (staging, production) must use HTTPS
- Minimum TLS 1.3 (or TLS 1.2 with modern ciphers)
- HSTS header enforces HTTPS (prevents downgrade attacks)

**6. Secret Management:**
- Store JWT secrets in AWS Secrets Manager or HashiCorp Vault (not in .env files)
- Rotate JWT secrets every 90 days (invalidates all existing tokens, force re-login)
- Different secrets for staging and production environments

**7. Monitoring & Alerting:**
- Alert on failed login rate > 10/min (possible brute force attack)
- Alert on password change rate > 5/hour (possible account compromise)
- Monitor token refresh rate (spike indicates token theft or bot activity)
- Track average session duration (detect anomalies)

### Frontend/Mobile Integration

**8. Web Application (Next.js):**
```typescript
// Use httpOnly cookies (automatic)
// No manual Authorization header needed

// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',  // Send cookies
  body: JSON.stringify({ email, password }),
});

// Subsequent API calls
const jobs = await fetch('/api/jobs', {
  credentials: 'include',  // Cookies sent automatically
});
```

**9. Mobile Application (React Native):**
```typescript
// Store tokens in Keychain
import * as Keychain from 'react-native-keychain';
import axios from 'axios';

// Login
const { data } = await axios.post('/api/auth/login', { email, password });
await Keychain.setGenericPassword('access_token', data.accessToken);
await Keychain.setGenericPassword('refresh_token', data.refreshToken);

// Subsequent API calls with interceptor
axios.interceptors.request.use(async (config) => {
  const credentials = await Keychain.getGenericPassword({ service: 'access_token' });
  config.headers.Authorization = `Bearer ${credentials.password}`;
  return config;
});

// Handle token refresh on 401
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Refresh token and retry
      const refreshToken = await Keychain.getGenericPassword({ service: 'refresh_token' });
      const { data } = await axios.post('/api/auth/refresh', { refreshToken: refreshToken.password });
      await Keychain.setGenericPassword('access_token', data.accessToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return axios.request(error.config);
    }
    throw error;
  }
);
```

### Testing Requirements

**10. Unit Tests:**
- Test JWT generation and validation
- Test bcrypt hashing and comparison
- Test role-based guards (allow/deny based on role)
- Test rate limiting logic

**11. Integration Tests:**
- Test registration flow (create user, hash password, return tokens)
- Test login flow (verify password, generate tokens)
- Test refresh flow (validate refresh token, rotate tokens)
- Test logout flow (blacklist refresh token)
- Test MFA flow (enable, verify, login with MFA)

**12. Security Tests:**
- Test password complexity requirements (weak passwords rejected)
- Test rate limiting (blocked after 5 failed attempts)
- Test token expiration (expired tokens rejected)
- Test CORS (unauthorized origins blocked)
- Test XSS prevention (httpOnly cookies not accessible)

## Risks & Mitigation

### Risk 1: JWT Secret Compromise

**Risk**: If JWT secret leaks, attacker can forge tokens for any user.

**Mitigation**:
- Store secrets in AWS Secrets Manager (not in code or .env)
- Rotate secrets every 90 days (invalidates all existing tokens)
- Use different secrets for staging and production
- Monitor secret access logs (detect unauthorized access)
- **Severity**: Critical | **Likelihood**: Low | **Priority**: Secret management mandatory

### Risk 2: Token Theft via XSS Attack

**Risk**: Malicious JavaScript steals tokens from localStorage or cookies.

**Mitigation**:
- Use httpOnly cookies for web (JavaScript cannot access)
- Implement Content Security Policy (restrict inline scripts)
- Sanitize all user-generated content (prevent XSS injection)
- Use helmet middleware (security headers)
- **Severity**: High | **Likelihood**: Medium | **Priority**: httpOnly cookies + CSP required

### Risk 3: Brute Force Password Attacks

**Risk**: Attacker tries millions of passwords to guess credentials.

**Mitigation**:
- Rate limit auth endpoints (5 attempts per 15 minutes)
- Use bcrypt with 12 rounds (slow hashing makes brute force infeasible)
- Implement account lockout after 10 failed attempts (24-hour lockout)
- Monitor failed login patterns (alert on spikes)
- **Severity**: High | **Likelihood**: High | **Priority**: Rate limiting required

### Risk 4: Refresh Token Theft on Mobile

**Risk**: Attacker extracts refresh token from mobile device (rooted/jailbroken).

**Mitigation**:
- Use iOS Keychain / Android Keystore (hardware-backed encryption)
- Detect jailbreak/root and refuse authentication (optional)
- Rotate refresh tokens on each use (stolen token invalidated quickly)
- Monitor for anomalous refresh patterns (same token used from multiple IPs)
- **Severity**: Medium | **Likelihood**: Low | **Priority**: Keychain/Keystore required

### Risk 5: Redis Downtime Breaks Authentication

**Risk**: Redis failure prevents token refresh and blacklist checks.

**Mitigation**:
- Use Redis HA (high availability) with replication and auto-failover
- Implement graceful degradation (if Redis down, allow access tokens but no refresh)
- Monitor Redis health (alert on downtime)
- Have runbook for Redis recovery
- **Severity**: High | **Likelihood**: Low | **Priority**: Redis HA setup

### Risk 6: Password Reset Vulnerabilities

**Risk**: Attacker can reset victim's password via email token.

**Mitigation**:
- Use cryptographically secure random tokens (not predictable)
- Tokens expire after 1 hour (short window)
- Single-use tokens (invalidated after reset)
- Send confirmation email after password change
- **Severity**: High | **Likelihood**: Medium | **Priority**: Secure token generation

## Success Metrics

To validate this decision post-implementation:

1. **Security**: Zero authentication-related security incidents in first 90 days
2. **Performance**: Token validation < 5ms (JWT signature verification)
3. **Reliability**: Authentication uptime > 99.9% (includes Redis HA)
4. **User Experience**: < 1% of users report authentication issues
5. **Compliance**: Pass security audit (penetration testing) before production launch
6. **Scalability**: Support 500+ concurrent users with < 10ms auth overhead per request

## Dependencies

### Blocks These Decisions/Artifacts

- **A-4-1**: Authentication Service Specification (registration, login, token refresh)
- **A-4-2**: Authorization Guard Specification (role-based access control)
- **A-4-3**: Security Middleware Stack (rate limiting, CORS, helmet, audit logging)
- All API endpoint implementations (require auth guards)
- Frontend/mobile login flows (require auth API)

### Depends On

- **D-1**: MVP Technical Architecture (establishes NestJS, Redis, PostgreSQL)
- **D-2**: MVP API Design (establishes JWT + RBAC approach)
- **D-5**: Database Schema (requires `users` table with `passwordHash`, `mfaSecret`)

## Next Steps After Approval

**Week 1: Core Authentication (Days 1-3)**
1. Install dependencies (`@nestjs/jwt`, `@nestjs/passport`, `bcrypt`, `passport-jwt`)
2. Create `AuthModule`, `UsersModule`, `SecurityModule` in NestJS
3. Implement JWT strategy with Passport.js
4. Create authentication DTOs with validation (RegisterDto, LoginDto)
5. Implement registration endpoint (hash password, create user, return tokens)
6. Implement login endpoint (verify password, generate tokens)
7. Write unit tests for auth service (80%+ coverage)

**Week 1: Token Management (Days 4-5)**
8. Implement refresh token rotation (store in Redis, invalidate on use)
9. Implement logout (blacklist refresh token)
10. Implement token revocation (password change, account suspension)
11. Create Redis service for token blacklist
12. Write integration tests for auth flows

**Week 2: Authorization & Security (Days 1-3)**
13. Create role-based guards (RolesGuard with @Roles decorator)
14. Implement resource ownership checks (users can only access their data)
15. Configure rate limiting with @nestjs/throttler
16. Configure CORS with allowed origins
17. Configure helmet with security headers
18. Create audit logging service

**Week 2: MFA & Hardening (Days 4-5)**
19. Implement MFA setup (generate secret, QR code)
20. Implement MFA verification (TOTP validation)
21. Create backup codes system
22. Implement password reset flow (secure tokens, email)
23. Create security monitoring dashboard (failed logins, token refreshes)
24. Run security tests (OWASP ZAP scan, penetration testing)

**Week 3: Frontend/Mobile Integration**
25. Implement web login flow (httpOnly cookies)
26. Implement mobile login flow (Keychain storage, axios interceptors)
27. Implement token refresh on 401 responses
28. E2E tests for complete auth flows
29. Documentation for frontend/mobile teams

## Related Nodes

- **Spawned by**: Q-6 (API Design), Q-3 (Technical Architecture), D-2 (API Design Decision)
- **Informs**: A-4-1, A-4-2, A-4-3 (Authentication artifacts)
- **Depends on**: D-1 (Tech Stack), D-2 (API Design), D-5 (Database Schema)

## Review Notes

**For Human Reviewer:**

This is a **Critical priority, high-confidence (0.90) design decision** that establishes the security foundation for the entire platform. Key points for your consideration:

1. **JWT vs Sessions**: Do you agree with JWT approach for scalability and mobile support?
2. **15-minute access tokens**: Is this acceptable, or do you prefer longer (1 hour)?
3. **httpOnly cookies for web**: Are you comfortable with cookie-based approach vs Authorization headers?
4. **MFA for admins**: Should we require MFA for all admins, or make it optional?
5. **bcrypt with 12 rounds**: Is 300-400ms hashing time acceptable for login UX?
6. **Token rotation**: Do you agree with rotating refresh tokens on each use (more secure but more complex)?

**Critical Security Questions:**
- Do you have AWS Secrets Manager or similar for JWT secret storage?
- Do you have budget for Redis HA setup (required for production)?
- Do you have security team to conduct penetration testing before launch?

Please approve, request revisions, or reject with feedback.

---

**AI Confidence Rationale**: 0.90 confidence based on:
- ✅ Industry-standard JWT approach (Auth0, Firebase use similar patterns)
- ✅ Well-documented security best practices (OWASP, OAuth 2.0 RFC)
- ✅ Proven NestJS + Passport.js implementation patterns
- ✅ Comprehensive research from Q-6 and D-2
- ⚠️ Slight uncertainty around MFA requirements (some orgs require for all users, some just admins)
- ⚠️ Redis HA setup adds operational complexity (but necessary for production)

**Human review required**: YES (Critical priority + security foundation for entire platform)
