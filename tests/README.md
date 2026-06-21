# TokenIQ Test Suite

Testing infrastructure for TokenIQ using Vitest.

## Structure

```
tests/
├── unit/                    # Unit tests for individual functions
│   ├── generator.test.ts    # Tests for token/cost generation logic
│   └── crypto.test.ts       # Tests for encryption/decryption
├── integration/             # Integration tests with database
│   └── api.test.ts          # Tests for database operations and aggregations
├── setup.ts                 # Test environment setup and mocks
└── README.md
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with UI
```bash
npm run test:ui
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

### Run all tests sequentially (unit then integration)
```bash
npm run test:all
```

### Watch mode (re-run on file changes)
```bash
npm run test -- --watch
```

## Test Coverage

### Unit Tests
- **generator.test.ts** (7 tests)
  - Model selection based on PR size (300-line threshold)
  - Token calculation proportional to lines changed
  - Output token estimation (40% of input)
  - Cache token estimation (30% of input)
  - Cost calculation for both GPT-4o and GPT-4o-mini models

- **crypto.test.ts** (4 tests)
  - Encryption and decryption of strings
  - Unique ciphertexts for identical plaintexts (IV randomization)
  - Error handling for invalid/corrupted ciphertexts

### Integration Tests
- **api.test.ts** (3 tests)
  - Repository creation and retrieval
  - Pull request creation with usage records
  - Aggregation of usage data across multiple PRs

## Test Data

- Unit tests use mock data (no database required)
- Integration tests use a real SQLite database (created in-memory or at `prisma/dev.db`)
- Integration tests clean up after themselves

## Environment

- **Framework**: Vitest 4.1.9
- **Testing Library**: @testing-library/react, @testing-library/jest-dom
- **Environment**: jsdom
- **Mocks**: Next.js router, Next.js image component

## Writing New Tests

1. **Unit Tests**: Place in `tests/unit/` for pure function testing
   ```typescript
   import { describe, it, expect } from 'vitest'
   import { functionToTest } from '@/lib/module'

   describe('functionToTest', () => {
     it('should do something', () => {
       expect(functionToTest(input)).toBe(expected)
     })
   })
   ```

2. **Integration Tests**: Place in `tests/integration/` for database operations
   ```typescript
   import { describe, it, expect, beforeAll, afterAll } from 'vitest'
   import { prisma } from '@/lib/db'

   describe('Database operations', () => {
     beforeAll(async () => {
       // Setup
     })

     afterAll(async () => {
       // Cleanup
       await prisma.$disconnect()
     })

     it('should perform operation', async () => {
       // Test
     })
   })
   ```

## CI/CD Integration

To run tests in CI/CD:

```bash
# Install dependencies
npm ci

# Run migrations
npx prisma migrate deploy

# Run all tests
npm run test:all
```
