# NowPayments Middleware - Technical Guidelines

A TypeScript Express middleware library for NowPayments cryptocurrency payment integration with dependency injection support. This document contains complete technical guidelines for development, architecture patterns, and coding standards.

The library provides a clean, composable API for integrating NowPayments into Express applications, emphasizing type safety, error handling, and functional programming patterns.

## Quick Reference

- **README.md**: [README.md](README.md) - User-facing documentation, installation, and usage examples
- **Build**: `npm run build` (TypeScript compilation + path alias resolution)
- **Test**: `npm test` (Jest with coverage: `npm run test:coverage`)
- **Lint**: `npm run lint` (ESLint + Prettier: `npm run format`)
- **Type Check**: `npm run type-check`
- **Docs**: MDX documentation in [docs/](./docs/) for API reference, examples, and guides

### Documentation Structure

- `docs/api-reference.mdx` - Complete API documentation
- `docs/configuration-examples.mdx` - Configuration patterns and examples
- `docs/error-handling.mdx` - Error handling strategies
- `docs/payment-examples.mdx` - Payment integration examples
- `docs/quick-start.mdx` - Quick start guide
- `docs/webhook-examples.mdx` - Webhook implementation examples

## Code Standards

### Naming Conventions

**Classes and Types** (PascalCase):

```typescript
// Classes
class NowPaymentsClient {}
class BaseMiddleware {}

// Interfaces/Types
interface CreatePaymentRequest {}
type ExpressMiddleware = (req, res, next) => void | Promise<void>;
```

**Functions and Variables** (camelCase with descriptive verbs):

```typescript
// Functions: verb + noun
function createPayment(options) {}
function getConfig() {}
function setupInterceptors() {}

// Variables: descriptive nouns
const paymentData = options.mapRequest(req);
const transformedResponse = options.transformResponse(response);
```

**Constants** (SCREAMING_SNAKE_CASE):

```typescript
// In src/constants/statuses.ts
export enum PaymentStatus {
  WAITING = 'waiting',
  FINISHED = 'finished',
}
```

**Files**:

- Implementation files: camelCase (`createPayment.ts`, `paymentWebhook.ts`)
- Class files: PascalCase matching class name (`NowPaymentsClient.ts`, `BaseMiddleware.ts`)
- Test files: Mirror source with `.test.ts` suffix (`NowPaymentsClient.test.ts`)

### Common Patterns

#### 1. Higher-Order Functions for Middleware Creation

The library uses higher-order functions to create configurable Express middleware:

```typescript
// Pattern: Function that returns middleware
export const createPayment = (
  options: CreatePaymentMiddlewareOptions
): ExpressMiddleware => getCreatePaymentMiddleware().create(options);

// Usage allows dependency injection
app.post(
  '/payment',
  NowPaymentsMiddleware.createPayment({
    mapRequest: req => ({
      /* transform request */
    }),
    transformResponse: response => ({
      /* transform response */
    }),
  }),
  (req, res) => {
    const result = res.locals.nowPaymentsResponse;
    res.json(result);
  }
);
```

**Location**: `src/middlewares/createPayment.ts:52`, `src/middlewares/createPayout.ts:52`

#### 2. Singleton Pattern for Configuration

Configuration uses singleton pattern with lazy initialization and environment variable fallback:

```typescript
// Pattern: Private constructor + getInstance()
class NowPaymentsConfigSingleton {
  private static instance: NowPaymentsConfigSingleton;
  private config: NowPaymentsConfig | null = null;

  static getInstance(): NowPaymentsConfigSingleton {
    if (!NowPaymentsConfigSingleton.instance) {
      NowPaymentsConfigSingleton.instance = new NowPaymentsConfigSingleton();
    }
    return NowPaymentsConfigSingleton.instance;
  }

  // Includes reset() method for testing
  reset(): void {
    this.config = null;
  }
}
```

**Location**: `src/config/NowPaymentsConfig.ts:3-47`
**Testing note**: Use `reset()` method to clear singleton state between tests

#### 3. Guard Clauses for Validation

Early returns and guard clauses are preferred over nested conditionals:

```typescript
// ✅ Good: Guard clauses
if (!options.mapRequest) {
  throw new NowPaymentsValidationError('mapRequest function is required');
}

if (!paymentData.price_amount || !paymentData.price_currency) {
  throw new NowPaymentsValidationError('Required fields missing');
}

const response = await this.client.createPayment(paymentData);

// ❌ Avoid: Nested conditionals
if (options.mapRequest) {
  if (paymentData.price_amount && paymentData.price_currency) {
    const response = await this.client.createPayment(paymentData);
  }
}
```

**Location**: `src/middlewares/createPayment.ts:18-26`

#### 4. Class Inheritance with Abstract Base

Middleware classes extend abstract base class for shared error handling:

```typescript
// Abstract base class
export abstract class BaseMiddleware {
  protected handleError(
    error: unknown,
    res: Response,
    next: NextFunction
  ): void {
    // Shared error handling logic
  }

  protected saveToLocals(res: Response, data: unknown): void {
    res.locals.nowPaymentsResponse = data;
  }
}

// Concrete implementations
class CreatePaymentMiddleware extends BaseMiddleware {
  create(options: CreatePaymentMiddlewareOptions): ExpressMiddleware {
    return async (req, res, next) => {
      try {
        // Implementation
        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        this.handleError(error, res, next);
      }
    };
  }
}
```

**Location**: `src/middlewares/base/BaseMiddleware.ts:6-42`, `src/middlewares/createPayment.ts:7-41`

#### 5. Custom Error Hierarchy

Comprehensive error handling with typed error classes:

```typescript
// Base error
export class NowPaymentsError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly originalError?: unknown;
}

// Specific error types
export class NowPaymentsApiError extends NowPaymentsError {}
export class NowPaymentsConfigError extends NowPaymentsError {}
export class NowPaymentsValidationError extends NowPaymentsError {}
export class NowPaymentsNetworkError extends NowPaymentsError {}
```

**Location**: `src/utils/errors.ts:1-41`
**Usage**: Always catch and transform errors into appropriate error types

#### 6. Decorator Pattern for Authentication

TypeScript decorators for cross-cutting concerns:

```typescript
// Decorator for methods requiring authentication
@RequiresAuth
async createPayout(data: CreatePayoutRequest): Promise<CreatePayoutResponse> {
  const response = await this.axiosInstance.post('/payout', data);
  return response.data;
}
```

**Location**: `src/client/NowPaymentsClient.ts:80-87`, `src/decorators/RequiresAuth.ts`
**Note**: Requires `experimentalDecorators: true` in tsconfig.json

#### 7. Factory Functions with Module-Level Caching

Factory pattern for singleton-like middleware instances:

```typescript
let createPaymentMiddleware: CreatePaymentMiddleware | null = null;

function getCreatePaymentMiddleware(): CreatePaymentMiddleware {
  if (!createPaymentMiddleware) {
    createPaymentMiddleware = new CreatePaymentMiddleware();
  }
  return createPaymentMiddleware;
}

export const createPayment = (options): ExpressMiddleware =>
  getCreatePaymentMiddleware().create(options);
```

**Location**: `src/middlewares/createPayment.ts:43-53`

#### 8. Path Aliases for Clean Imports

TypeScript path aliases for cleaner, more maintainable imports:

```typescript
// tsconfig.json configuration
{
  "baseUrl": "./src",
  "paths": {
    "@/*": ["./*"],
    "@/types": ["./types"],
    "@/config": ["./config"],
    "@/client": ["./client"],
    "@/middlewares": ["./middlewares"],
    "@/utils": ["./utils"],
    "@/constants": ["./constants"]
  }
}

// Usage in source files
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { NowPaymentsValidationError } from '@/utils/errors';
```

**Configuration**: `tsconfig.json:24-33`
**Build**: Requires `tsc-alias` for compilation (`npm run build`)

### Antipatterns to Address

#### 1. Module-Level Mutable State

**Current pattern** (`src/middlewares/createPayment.ts:43`):

```typescript
let createPaymentMiddleware: CreatePaymentMiddleware | null = null;
```

**Issue**: Mutable module-level state can cause issues in testing and concurrent scenarios.

**Future consideration**: Evaluate moving to pure factory functions or dependency injection container for better testability and isolation.

#### 2. Singleton Configuration

**Current pattern** (`src/config/NowPaymentsConfig.ts`):

```typescript
export const NowPaymentsConfiguration =
  NowPaymentsConfigSingleton.getInstance();
```

**Issue**: Global singleton state makes parallel testing difficult and couples components.

**Current mitigation**: `reset()` method exists for test cleanup (used in test files).

**Future consideration**: When refactoring, consider dependency injection or configuration context pattern for better testability.

#### 3. Direct Environment Variable Access

**Current pattern** (`src/config/NowPaymentsConfig.ts:27-32`):

```typescript
this.config = {
  apiKey: process.env.NOWPAYMENTS_API_KEY || '',
  email: process.env.NOWPAYMENTS_EMAIL,
  // ...
};
```

**Issue**: Direct `process.env` access is harder to test and mock.

**Current mitigation**: Configuration can be set explicitly via `configure()` method.

**Future consideration**: Extract environment variable reading to separate module for easier testing and validation.

## Architecture

### Project Structure

```
src/
├── auth/              # Authentication management
│   └── AuthManager.ts
├── client/            # HTTP client for NowPayments API
│   └── NowPaymentsClient.ts
├── config/            # Configuration singleton
│   └── NowPaymentsConfig.ts
├── constants/         # Constants and enums (statuses)
│   └── statuses.ts
├── decorators/        # TypeScript decorators
│   └── RequiresAuth.ts
├── middlewares/       # Express middleware implementations
│   ├── base/
│   │   └── BaseMiddleware.ts
│   ├── webhooks/
│   │   ├── paymentWebhook.ts
│   │   └── payoutWebhook.ts
│   ├── createPayment.ts
│   ├── createPaymentByInvoice.ts
│   └── createPayout.ts
├── types/             # TypeScript type definitions
│   ├── api.types.ts
│   ├── auth.types.ts
│   ├── middleware.types.ts
│   └── index.ts
├── utils/             # Utilities and errors
│   ├── errors.ts
│   └── totp.ts
└── index.ts           # Public API exports
```

### Design Principles

1. **Separation of Concerns**: Clear boundaries between HTTP client, middleware, configuration, and types
2. **Dependency Injection**: Request mappers and response transformers injected at middleware creation
3. **Type Safety**: Comprehensive TypeScript types for all API interactions
4. **Error Handling**: Typed error hierarchy with configurable error handling modes
5. **Functional Composition**: Higher-order functions for middleware creation
6. **Single Responsibility**: Each module has a focused, well-defined purpose

### Key Components

**NowPaymentsClient** (`src/client/NowPaymentsClient.ts`)
HTTP client wrapping axios for NowPayments API communication. Handles authentication, request/response transformation, and error interception.

**BaseMiddleware** (`src/middlewares/base/BaseMiddleware.ts`)
Abstract base class providing shared error handling and response storage for all middleware implementations.

**NowPaymentsConfiguration** (`src/config/NowPaymentsConfig.ts`)
Singleton managing global configuration with environment variable fallback and runtime configuration support.

**Error Hierarchy** (`src/utils/errors.ts`)
Custom error classes extending base `NowPaymentsError` for different failure scenarios (API, Config, Validation, Network).

**AuthManager** (`src/auth/AuthManager.ts`)
Handles NowPayments authentication with email/password, including bearer token management and 2FA support for payouts.

## Build & Development

### Scripts

```bash
# Development
npm run build:watch      # TypeScript compilation in watch mode
npm run type-check       # Type checking without build
npm run test:watch       # Jest in watch mode

# Quality
npm run lint            # ESLint check
npm run lint:fix        # ESLint with auto-fix
npm run format          # Prettier formatting
npm run test:coverage   # Jest with coverage report

# Publishing
npm run prepublishOnly  # Pre-publish checks (clean, type-check, build)
npm run publish:patch   # Patch version bump and publish
npm run publish:minor   # Minor version bump and publish
npm run publish:major   # Major version bump and publish
```

### Build Process

1. **Clean**: Remove `dist/` folder
2. **Type Check**: Verify TypeScript types without emitting
3. **Compile**: `tsc -p tsconfig.build.json` (generates declarations and source maps)
4. **Path Alias Resolution**: `tsc-alias` resolves `@/` imports in compiled output

### Testing

- **Framework**: Jest with ts-jest
- **Location**: `tests/` directory mirrors `src/` structure
- **Pattern**: Unit tests in `tests/unit/`, organized by module
- **Coverage**: Configured in `jest.config.js`
- **Mocking**: Use `NowPaymentsConfiguration.reset()` to clear singleton between tests

Example test structure:

```
tests/unit/
├── client/
│   └── NowPaymentsClient.test.ts
├── config/
│   └── NowPaymentsConfig.test.ts
├── middlewares/
│   ├── webhooks/
│   │   └── paymentWebhook.test.ts
│   └── createPayment.test.ts
└── utils/
    └── errors.test.ts
```

## Technology Stack

### Core Dependencies

- **Express**: ^4.17.0 || ^5.0.0 (peer dependency - middleware framework)
- **Axios**: ^1.7.9 (HTTP client for NowPayments API)
- **OTPAuth**: ^9.3.4 (TOTP generation for automatic payout verification)
- **TypeScript**: ^5.7.2 (language and type system)

### Development Tools

- **Jest**: Testing framework with ts-jest for TypeScript support
- **ESLint**: TypeScript ESLint with Prettier integration
- **tsc-alias**: Path alias resolution in compiled output
- **dotenv**: Development environment variables

### TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS (for npm package compatibility)
- **Strict Mode**: Enabled with comprehensive checks
- **Decorators**: Experimental decorators enabled for @RequiresAuth
- **Path Aliases**: Configured for `@/*` imports

## Cross-References

### Related Documentation

- [testing-strategy.md](testing-strategy.md) - Comprehensive testing approach and patterns
- [local-installation.md](local-installation.md) - Local development setup
- [nowpayments-middleware-plan.md](nowpayments-middleware-plan.md) - Project planning and roadmap
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

### External Resources

- [NowPayments API Documentation](https://documenter.getpostman.com/view/7907941/S1a32n38)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)

## Development Workflow

### Adding New Middleware

1. Create middleware class extending `BaseMiddleware` in `src/middlewares/`
2. Define request/response types in `src/types/api.types.ts`
3. Add corresponding client method in `src/client/NowPaymentsClient.ts` if needed
4. Create factory function with module-level caching
5. Export from `src/index.ts`
6. Add tests in `tests/unit/middlewares/`
7. Document in `docs/api-reference.mdx` and add examples in `docs/`

### Adding New Error Types

1. Extend `NowPaymentsError` in `src/utils/errors.ts`
2. Set appropriate `code` and `statusCode`
3. Export from `src/index.ts`
4. Add tests in `tests/unit/utils/errors.test.ts`
5. Document in `docs/error-handling.mdx`

### Updating Configuration

1. Update `NowPaymentsConfig` interface in `src/types/`
2. Modify `NowPaymentsConfigSingleton` in `src/config/NowPaymentsConfig.ts`
3. Update environment variable documentation in README.md
4. Add configuration examples in `docs/configuration-examples.mdx`
5. Update tests in `tests/unit/config/NowPaymentsConfig.test.ts`

## Maintenance Notes

### When Adding Dependencies

- Ensure compatibility with Node.js >= 18.18.0
- Keep peer dependencies minimal (currently only Express)
- Regular dependencies should support CommonJS for package compatibility
- Update `package.json` keywords if adding new features

### Before Publishing

1. Update version in `package.json` (or use `npm run publish:*` scripts)
2. Document changes in `CHANGELOG.md`
3. Run `npm run prepublishOnly` to verify build
4. Test installation in separate project using `local-installation.md` guide
5. Ensure all tests pass (`npm test`)
6. Verify type definitions are generated (`dist/*.d.ts`)

### Breaking Changes Checklist

- Increment major version
- Document migration path in CHANGELOG.md
- Update examples in `examples/` directory
- Update all MDX documentation in `docs/`
- Update README.md with new API usage
- Consider deprecation warnings before removal
