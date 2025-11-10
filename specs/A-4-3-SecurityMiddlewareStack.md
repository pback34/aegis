# Security Middleware Stack Specification

**Document Version**: 1.0
**Created**: 2025-11-09
**Decision Reference**: D-4-AuthenticationAuthorizationArchitecture

---

## 1. Overview

Security middleware stack implementing rate limiting, CORS, helmet security headers, input validation, and audit logging for the Aegis platform.

## 2. Rate Limiting (Throttler)

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // Time window: 60 seconds
      limit: 100,   // Max 100 requests per window
      storage: new ThrottlerStorageRedisService({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,  // Apply globally
    },
  ],
})
```

### Custom Rate Limits per Endpoint

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Stricter limit for auth endpoints
  @Throttle(5, 900)  // 5 requests per 15 minutes
  @Post('login')
  login() { ... }

  @Throttle(3, 900)  // 3 requests per 15 minutes
  @Post('mfa/verify')
  verifyMfa() { ... }
}
```

## 3. CORS Configuration

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      process.env.WEB_APP_URL,           // https://aegis.com
      process.env.ADMIN_APP_URL,         // https://admin.aegis.com
      'http://localhost:3000',           // Local development
    ],
    credentials: true,                    // Allow cookies
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400,                        // Cache preflight for 24 hours
  });
}
```

## 4. Helmet (Security Headers)

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Next.js requires unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'wss://realtime.ably.io'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,          // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'same-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));
```

## 5. Input Validation (Global Pipe)

```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error if unknown properties
    transform: true,           // Auto-transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true,  // Auto-convert types
    },
    exceptionFactory: (errors) => {
      // Custom error formatting
      return new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.map(e => ({
          field: e.property,
          constraints: e.constraints,
        })),
      });
    },
  }),
);
```

## 6. Audit Logging Interceptor

```typescript
// src/common/interceptors/audit-log.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers } = request;

    // Log sensitive operations
    const sensitiveRoutes = ['/auth', '/payments', '/admin'];
    const isSensitive = sensitiveRoutes.some(route => url.includes(route));

    if (!isSensitive) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.auditService.log({
            userId: user?.userId,
            method,
            url,
            statusCode: 200,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            timestamp: new Date(),
          });
        },
        error: (error) => {
          this.auditService.log({
            userId: user?.userId,
            method,
            url,
            statusCode: error.status || 500,
            errorMessage: error.message,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            timestamp: new Date(),
          });
        },
      }),
    );
  }
}
```

### Global Application

```typescript
// app.module.ts
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: AuditLogInterceptor,
  },
]
```

## 7. Request ID Middleware

```typescript
// src/common/middleware/request-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || uuidv4();
    req['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}

// Apply in AppModule
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

## 8. Environment Variables

```bash
# Rate Limiting
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
WEB_APP_URL=https://aegis.com
ADMIN_APP_URL=https://admin.aegis.com

# Security
NODE_ENV=production
HELMET_CSP_REPORT_URI=https://aegis.com/api/csp-report
```

## 9. Security Checklist

- ✅ Rate limiting enabled globally (100 req/min)
- ✅ Stricter rate limits on auth endpoints (5 attempts/15 min)
- ✅ CORS configured with allowed origins
- ✅ Helmet security headers enabled
- ✅ Content Security Policy configured
- ✅ HSTS enabled (1 year, includeSubDomains)
- ✅ Input validation with whitelist and transformation
- ✅ Audit logging for sensitive operations
- ✅ Request ID tracking for debugging

## 10. Monitoring & Alerts

```typescript
// Alert on rate limit violations
if (requestsLastMinute > 1000) {
  alert('Possible DDoS attack - high request rate');
}

// Alert on failed auth attempts
if (failedLoginsLastMinute > 10) {
  alert('Possible brute force attack');
}

// Alert on CSP violations
app.post('/api/csp-report', (req, res) => {
  logger.warn('CSP Violation:', req.body);
  // Send to monitoring service (Datadog, Sentry)
});
```

---

**End of Document**
