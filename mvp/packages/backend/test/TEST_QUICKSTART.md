# Testing Quick Start Guide

## 🚀 Quick Commands

```bash
# Run unit tests only (fast, no database needed)
npm test

# Run unit tests in watch mode (for TDD)
npm run test:watch

# Run unit tests with coverage
npm run test:cov

# Run integration tests (requires database)
npm run test:integration

# Run ALL tests with coverage
npm run test:all
```

## 📊 What's Tested?

### ✅ Unit Tests (Complete) - 123 Tests Total
- **Authentication Use Cases**
  - `RegisterUserUseCase` - 8 test cases
  - `LoginUserUseCase` - 11 test cases
  - `RefreshTokenUseCase` - 9 test cases

- **Booking Use Cases**
  - `CreateBookingUseCase` - 8 test cases

- **Domain Layer**
  - `BookingEntity` - Various state transitions
  - `Money` value object - Calculations and validations
  - `Email` value object - Format validations
  - `GeoLocation` value object - Coordinate validations
  - `PricingService` - Pricing calculations

- **Mappers**
  - `UserMapper` - 9 test cases (bidirectional mapping)

### ✅ Integration Tests (Complete) - 11 Tests Total
- **UserRepository** - 11 test cases
  - Customer CRUD operations (4 tests)
  - Guard CRUD operations with profiles (4 tests)
  - Error handling (3 tests)

## 🛠️ Setup for Integration Tests

### Option 1: Local PostgreSQL (Recommended)

#### First-time PostgreSQL Setup

If you just installed PostgreSQL, you'll need to configure it first:

```bash
# 1. Set postgres user password (requires sudo)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# 2. Create test database
sudo -u postgres psql -c "CREATE DATABASE aegis_mvp_test;"

# 3. Verify database was created
sudo -u postgres psql -c "\l" | grep aegis_mvp_test

# 4. The .env.test file already has the correct configuration
# (If not, copy from .env.example)
```

#### Regular Usage (After Initial Setup)

```bash
# Just run the integration tests
npm run test:integration

# The tests will automatically:
# - Connect to the test database
# - Create/drop schema as needed
# - Clean data between tests
```

### Option 2: Docker PostgreSQL

```bash
# 1. Start PostgreSQL with PostGIS
docker run -d \
  --name aegis-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aegis_mvp_test \
  -p 5433:5432 \
  postgis/postgis:15-3.3

# 2. Update .env.test to use port 5433
TEST_DB_PORT=5433

# 3. Run integration tests
npm run test:integration
```

## 📁 Test File Locations

```
src/
  application/use-cases/
    auth/
      ├── register-user.use-case.ts
      └── register-user.use-case.spec.ts    ← Unit test
    booking/
      ├── create-booking.use-case.ts
      └── create-booking.use-case.spec.ts   ← Unit test

  infrastructure/repositories/
    mappers/
      ├── user.mapper.ts
      └── user.mapper.spec.ts               ← Unit test

test/
  ├── setup-integration.ts                  ← Integration test setup
  └── integration/repositories/
      └── user.repository.integration.spec.ts  ← Integration test
```

## 🎯 Test Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Domain | >90% | ✅ Complete (Phase 1) |
| Application | >80% | 🟡 Partial (auth complete) |
| Infrastructure | >70% | 🟡 Partial (mappers + repo) |

## 🔍 Running Specific Tests

```bash
# Run a single test file
npm test -- register-user.use-case.spec.ts

# Run tests matching a pattern
npm test -- --testPathPattern=auth

# Run a single test case
npm test -- -t "should successfully register a new customer"

# Debug mode
npm run test:debug
```

## 🐛 Troubleshooting

### Integration Tests Fail with "Connection Refused"

**Problem**: Cannot connect to PostgreSQL

**Solutions**:

```bash
# 1. Check if PostgreSQL is running
systemctl is-active postgresql
# or
pg_isready

# 2. Start PostgreSQL if not running
sudo systemctl start postgresql

# 3. Check if test database exists
sudo -u postgres psql -l | grep aegis_mvp_test

# 4. Create test database if missing
sudo -u postgres psql -c "CREATE DATABASE aegis_mvp_test;"
```

### Integration Tests Fail with "Password Authentication Failed"

**Problem**: PostgreSQL rejects the password

**Solutions**:

```bash
# Option 1: Set postgres user password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Option 2: Use PGPASSWORD environment variable
PGPASSWORD=postgres psql -U postgres -h localhost -d aegis_mvp_test -c "SELECT 1;"

# Option 3: Use peer authentication (no password needed)
# Edit /etc/postgresql/*/main/pg_hba.conf
# Change "md5" to "trust" for local connections (development only!)
```

### Tests Fail with "Type 'null' is not assignable to type 'User'"

**Problem**: Repository methods return `User | null` but code expects `User`

**Solution**: This has been fixed in `user.repository.ts` by adding null checks:

```typescript
const reloaded = await this.findById(user.getId());
if (!reloaded) {
  throw new Error('Failed to reload saved user');
}
return reloaded;
```

### Tests Fail with Rating Being String Instead of Number

**Problem**: PostgreSQL decimal columns return strings

**Solution**: This has been fixed in `user.mapper.ts` by adding `Number()` conversions:

```typescript
rating: Number(guardProfile.rating),
hourlyRate: guardProfile.hourly_rate ? new Money(Number(guardProfile.hourly_rate)) : new Money(0),
```

### Unit Tests Fail with "Cannot find module"

**Solution**: Install dependencies

```bash
npm install
```

### Tests Timeout

**Solution**: Increase timeout in jest.config.js

```javascript
testTimeout: 30000, // 30 seconds
```

## 📚 Test Writing Patterns

### Unit Test Template

**Important**: For use case unit tests, we use **direct instantiation** instead of NestJS Test modules to keep tests fast and focused.

```typescript
describe('MyUseCase', () => {
  let useCase: MyUseCase;
  let mockRepository: jest.Mocked<IMyRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      // ... other methods
    };

    // Direct instantiation (no NestJS DI)
    useCase = new MyUseCase(mockRepository);
  });

  describe('Happy Path', () => {
    it('should do something successfully', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(expectedResult);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('Error Cases', () => {
    it('should throw error when validation fails', async () => {
      // Arrange & Act & Assert
      await expect(useCase.execute(invalidInput))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

**Why Direct Instantiation?**
- ⚡ **Faster**: No NestJS module compilation overhead
- 🎯 **Focused**: Tests only the use case logic
- 🔍 **Clearer**: Explicit dependency injection
- 🐛 **Easier to Debug**: No DI magic to trace through

### Integration Test Template

```typescript
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '../../setup-integration';

describe('MyRepository Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should perform database operation', async () => {
    // Arrange
    const entity = new MyEntity({ /* ... */ });

    // Act
    await repository.save(entity);
    const retrieved = await repository.findById(entity.getId());

    // Assert
    expect(retrieved).toBeDefined();
    expect(retrieved!.getId()).toBe(entity.getId());
  });
});
```

## 🎓 Best Practices

1. **Write tests first** (TDD) - Especially for domain logic
2. **Use AAA pattern** - Arrange, Act, Assert
3. **One assertion per test** - Makes failures easier to diagnose
4. **Clean test data** - Use `beforeEach` to reset state
5. **Descriptive test names** - Should read like documentation
6. **Mock external dependencies** - In unit tests only
7. **Test error cases** - Not just happy paths

## 📈 Next Steps

- [ ] Add more booking use case tests
- [ ] Add location use case tests
- [ ] Add payment use case tests
- [ ] Add booking repository integration tests
- [ ] Add payment repository integration tests
- [ ] Setup CI/CD pipeline with automated tests

## 📖 Full Documentation

See [TESTING.md](./TESTING.md) for comprehensive testing strategy and guidelines.

---

**Questions?** Check the main [README](../README.md) or create an issue.
