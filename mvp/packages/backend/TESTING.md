# Testing Strategy - Aegis MVP Backend

This document outlines the comprehensive testing strategy for the Aegis MVP backend application following clean architecture principles.

## Testing Pyramid

```
        /\
       /E2\       End-to-End Tests (Planned for Phase 4)
      /____\      - Full API flow tests
     /      \     - Real external services
    /  INT   \    Integration Tests (Phase 2)
   /          \   - Repository + Database
  /____________\  - Use cases + Real repos
 /              \
/     UNIT       \ Unit Tests (Phase 1 & 2)
/________________\ - Domain entities & services
                   - Use cases (mocked repos)
                   - Mappers
```

## 1. Unit Tests

### What We Test
- **Domain Layer** (Phase 1): Entities, Value Objects, Domain Services
- **Application Layer** (Phase 2): Use Cases with mocked repositories
- **Infrastructure Layer** (Phase 2): Mappers

### Characteristics
- ✅ Fast execution (<2 minutes)
- ✅ No external dependencies
- ✅ Highly isolated
- ✅ >90% coverage target for domain layer
- ✅ >80% coverage target for application layer

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Watch mode (TDD)
npm run test:watch

# With coverage report
npm run test:cov

# Debug mode
npm run test:debug
```

### Examples

#### Domain Layer (Already Complete)
- `booking.entity.spec.ts` - Booking state machine
- `money.value-object.spec.ts` - Money calculations
- `pricing.service.spec.ts` - Pricing algorithms

#### Application Layer (New)
- `register-user.use-case.spec.ts` - User registration logic
- `login-user.use-case.spec.ts` - Authentication logic
- `create-booking.use-case.spec.ts` - Booking creation flow

#### Mappers
- `user.mapper.spec.ts` - Domain ↔ Database conversion

## 2. Integration Tests

### What We Test
- **Repository Integration**: Real database operations
- **Use Case Integration**: Use cases with real repositories (future)
- **Database Migrations**: Schema correctness

### Characteristics
- ⚡ Moderate execution time (2-5 minutes)
- 🗄️ Requires test database
- 🔄 Auto setup/teardown
- 🧪 Isolated test data

### Setup Test Database

#### Option 1: Local PostgreSQL (Recommended for Development)

```bash
# Create test database
createdb aegis_mvp_test

# Configure environment
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5432
export TEST_DB_USERNAME=postgres
export TEST_DB_PASSWORD=postgres
export TEST_DB_DATABASE=aegis_mvp_test

# Or create .env.test file
cat > .env.test <<EOF
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=postgres
TEST_DB_DATABASE=aegis_mvp_test
EOF
```

#### Option 2: Docker PostgreSQL (Recommended for CI)

```bash
# Start PostgreSQL with PostGIS in Docker
docker run -d \
  --name aegis-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aegis_mvp_test \
  -p 5433:5432 \
  postgis/postgis:15-3.3
```

#### Option 3: Testcontainers (Future Enhancement)

```typescript
// Will automatically start/stop PostgreSQL container
// No manual setup needed
```

### Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm test -- user.repository.integration.spec.ts

# With coverage
npm run test:integration -- --coverage
```

### Test Structure

```typescript
describe('UserRepository Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Teardown test database
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean all tables before each test
    await cleanDatabase();
  });

  it('should save and retrieve a customer', async () => {
    // Test with real database...
  });
});
```

## 3. Contract Tests (Mappers)

### What We Test
- Bidirectional mapping correctness
- Data integrity through round-trip conversions
- Null/undefined handling

### Running Mapper Tests

```bash
# Mapper tests are part of unit tests
npm test -- mapper.spec.ts
```

## 4. End-to-End Tests (Future - Phase 4)

### What We Will Test
- Complete API flows
- Real external services (Stripe, Ably)
- Multi-step user journeys

### Planned Tools
- Playwright or Supertest
- Test mode for external services
- Dedicated test environment

## Test Organization

```
packages/backend/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── booking.entity.ts
│   │   │   └── booking.entity.spec.ts          ← Unit tests
│   │   └── services/
│   │       ├── pricing.service.ts
│   │       └── pricing.service.spec.ts         ← Unit tests
│   ├── application/
│   │   └── use-cases/
│   │       ├── auth/
│   │       │   ├── register-user.use-case.ts
│   │       │   └── register-user.use-case.spec.ts  ← Unit tests
│   │       └── booking/
│   │           ├── create-booking.use-case.ts
│   │           └── create-booking.use-case.spec.ts ← Unit tests
│   └── infrastructure/
│       └── repositories/
│           ├── mappers/
│           │   ├── user.mapper.ts
│           │   └── user.mapper.spec.ts         ← Unit tests
│           └── user.repository.ts
└── test/
    ├── setup-integration.ts                    ← Integration test setup
    └── integration/
        └── repositories/
            └── user.repository.integration.spec.ts  ← Integration tests
```

## Testing Best Practices

### 1. Test Naming Convention

```typescript
describe('FeatureName', () => {
  describe('Happy Path', () => {
    it('should do expected behavior', () => {});
  });

  describe('Error Cases', () => {
    it('should throw error when invalid input', () => {});
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {});
  });
});
```

### 2. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should register a new customer', async () => {
  // Arrange - Setup test data
  const dto = { email: 'test@example.com', ... };

  // Act - Execute the behavior
  const result = await useCase.execute(dto);

  // Assert - Verify the outcome
  expect(result.email).toBe('test@example.com');
});
```

### 3. Test Independence

- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order
- Clean database between integration tests

### 4. Mock vs Real Dependencies

**Unit Tests**: Mock all external dependencies
```typescript
const mockRepository: jest.Mocked<IUserRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  // ...
};
```

**Integration Tests**: Use real infrastructure
```typescript
const repository = new UserRepository(
  testDataSource.getRepository(UserEntity),
  testDataSource.getRepository(GuardProfileEntity),
);
```

### 5. Test Coverage Goals

- **Domain Layer**: >90% (critical business logic)
- **Application Layer**: >80% (use cases)
- **Infrastructure Layer**: >70% (mappers, repositories)
- **Overall**: >80%

## Continuous Integration

### Pre-commit Hooks (Future)

```bash
# Run tests before commit
npm test

# Run linter
npm run lint

# Check formatting
npm run format
```

### CI Pipeline (Future)

```yaml
# GitHub Actions example
- name: Run Unit Tests
  run: npm test

- name: Run Integration Tests
  run: |
    docker-compose up -d postgres
    npm run test:integration
    docker-compose down
```

## Common Test Patterns

### 1. Testing Use Cases with Mocked Repositories

```typescript
describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      // ... other methods
    };

    useCase = new RegisterUserUseCase(mockUserRepository);
  });

  it('should register a new user', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation(async (user) => user);

    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(mockUserRepository.save).toHaveBeenCalled();
  });
});
```

### 2. Testing Repository with Real Database

```typescript
describe('UserRepository Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should save and retrieve user', async () => {
    const customer = new Customer({ /* ... */ });

    await repository.save(customer);
    const retrieved = await repository.findById(customer.getId());

    expect(retrieved).toBeDefined();
    expect(retrieved!.getEmail().getValue()).toBe(customer.getEmail().getValue());
  });
});
```

### 3. Testing Mappers (Bidirectional)

```typescript
it('should maintain data integrity through round-trip', () => {
  const original = new Customer({ /* ... */ });

  // Domain → Database
  const { user: entity } = UserMapper.toPersistence(original);

  // Database → Domain
  const reconstructed = UserMapper.toDomain(entity);

  // Should be equivalent
  expect(reconstructed.getId().getValue()).toBe(original.getId().getValue());
  expect(reconstructed.getEmail().getValue()).toBe(original.getEmail().getValue());
});
```

## Debugging Tests

### 1. Run Single Test File

```bash
npm test -- user.mapper.spec.ts
```

### 2. Run Single Test Case

```bash
npm test -- -t "should register a new customer"
```

### 3. Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Test Maintenance

- **Review coverage reports**: Identify untested code
- **Update tests with code changes**: Keep tests in sync
- **Remove flaky tests**: Fix or remove unreliable tests
- **Refactor test code**: Apply DRY principles to tests

## Summary

| Test Type | Phase | Coverage | Speed | Dependencies |
|-----------|-------|----------|-------|--------------|
| **Unit Tests** | 1 & 2 | >80% | <2 min | None |
| **Integration Tests** | 2 | >70% | <5 min | Test DB |
| **E2E Tests** | 4 | Critical paths | <10 min | All services |

---

**Current Status**: ✅ Unit tests for auth use cases and mappers complete
**Next**: Integration tests for all repositories
**Future**: E2E tests for complete API flows

---

For questions or issues, refer to the [main README](./README.md) or create an issue in the repository.
