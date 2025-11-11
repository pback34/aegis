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

### ✅ Unit Tests (Complete)
- **Authentication Use Cases**
  - `RegisterUserUseCase` - 8 test cases
  - `LoginUserUseCase` - 11 test cases
  - `RefreshTokenUseCase` - 9 test cases

- **Booking Use Cases**
  - `CreateBookingUseCase` - 8 test cases

- **Mappers**
  - `UserMapper` - 11 test cases (bidirectional mapping)

### ✅ Integration Tests (Complete)
- **UserRepository** - 11 test cases
  - Customer CRUD operations
  - Guard CRUD operations with profiles
  - Guard availability filtering
  - Location updates

## 🛠️ Setup for Integration Tests

### Option 1: Local PostgreSQL (Recommended)

```bash
# 1. Create test database
createdb aegis_mvp_test

# 2. Set environment variables (or use .env.test)
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USERNAME=postgres
export TEST_DB_PASSWORD=postgres
export TEST_DB_DATABASE=aegis_mvp_test

# 3. Run integration tests
npm run test:integration
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

**Solution**: Make sure PostgreSQL is running and test database exists

```bash
# Check if PostgreSQL is running
pg_isready

# Create test database if missing
createdb aegis_mvp_test

# Verify connection
psql -U postgres -d aegis_mvp_test -c "SELECT 1;"
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

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('MyUseCase', () => {
  let useCase: MyUseCase;
  let mockRepository: jest.Mocked<IMyRepository>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      // ... other methods
    };

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
