# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-05

### Added

- Dispersion module for on-chain token routing via controlled wallet after payout completion
- `PolygonDispersionProvider` for EVM-compatible chains using ethers v6 (optional peer dependency)
- `TronDispersionProvider` for Tron network using tronweb v6 (optional peer dependency)
- `DispersionOrchestrator` implementing the Bridge pattern for provider-agnostic token routing
- `DispersionTargetStore` for managing on-chain dispersion targets
- `GasChecker` utility for pre-flight gas validation before dispersion
- `dispersion-guide.mdx` documentation for the new module
- Test suites for all dispersion components (5 new test files, 1000+ lines)

### Changed

- `createPayout` middleware extended to support optional dispersion configuration
- `payoutWebhook` middleware extended to trigger dispersion on payout completion
- `NowPaymentsConfig` updated to support dispersion provider configuration
- `statuses.ts` updated with dispersion-relevant status constants
- New dispersion types exported from `src/types/dispersion.types.ts`

## [1.7.0] - 2026-01-01

### Added

- `createInvoicePayment` middleware for creating invoice-based payments without leaving the website
- Client method `createInvoicePayment` in `NowPaymentsClient`
- New API types for invoice payment requests and responses
- Documentation and examples for invoice payment flow

## [1.6.0] - 2025-12-01

### Added

- `payout_description` field to `CreatePayoutRequest` for categorizing payout batches
- `res` (Response) parameter added to `mapRequest` functions, providing access to `res.locals` from previous middleware

### Changed

- `mapRequest` signature now includes `res` parameter: `(req, res) => RequestType` (breaking change)
- `NowPaymentsConfig` refactored to read environment variables once at initialization for performance
- Fixed environment variable fallback behavior when using `configure()` with partial config
- Documented all environment variables including `NOWPAYMENTS_2FA_SECRET`

## [1.5.0] - 2025-11-01

### Added

- `res` (Response) object available when mapping a request to the NowPayments API schema
- Updated all middleware to pass response object through `mapRequest`

## [1.4.0] - 2025-10-20

### Added

- Callback-based error handling with `onError` handlers (3-tier priority system)
  - Per-middleware `onError` handler (highest priority)
  - Global `onError` in configuration (medium priority)
  - Legacy `errorHandling` mode (fallback for backward compatibility)
- `error-handling.mdx` documentation
- `error-handling.ts` example with comprehensive usage patterns

### Changed

- All core middleware updated to support the new `onError` callback system
- Consistent `onError` naming across all middleware options

## [1.3.1] - 2025-10-15

### Fixed

- Lowercase webhook status values for consistency across payment and payout webhooks

## [1.3.0] - 2025-10-12

### Added

- Automatic payout verification via TOTP immediately after payout creation
- `otpauth` dependency for TOTP generation
- `totp.ts` utility for generating one-time passwords
- `NOWPAYMENTS_2FA_SECRET` environment variable support

### Changed

- `createPayout` middleware now automatically verifies payouts using TOTP when `twoFaSecret` is configured

## [1.2.1] - 2025-10-10

### Fixed

- Webhook status comparison normalized to lowercase for consistency

## [1.2.0] - 2025-10-08

### Added

- Automatic payout verification support via TOTP after creation

## [1.1.0] - 2025-10-07

### Added

- Bearer token authentication support for NowPayments API
- Email and password configuration options for automatic token retrieval
- AuthManager singleton for token caching and automatic refresh (4-minute cache)
- `@RequiresAuth` decorator for methods requiring authentication (e.g., payouts)
- Automated NPM publishing commands (`publish:patch`, `publish:minor`, `publish:major`)

### Changed

- Configuration now supports `email` and `password` instead of direct `bearerToken`
- Authentication tokens are now automatically managed and refreshed
- Updated documentation to reflect email/password authentication flow
- Improved MDX documentation with Context7 integration preparation

### Fixed

- Corrected documentation to use `email` and `password` configuration instead of incorrect `bearerToken` references

## [1.0.1] - 2025-01-15

### Changed

- Updated documentation: removed peer dependencies section and npm publication notice
- Updated minimum Node.js requirement to 18.18.0 (required for modern dependencies)

## [1.0.0] - 2025-01-11

### Added

- Initial release of NowPayments middleware for Express.js
- Complete TypeScript implementation with strict type checking
- Support for creating payments with `createPayment` middleware
- Support for creating invoice-based payments with `createPaymentByInvoice` middleware
- Support for creating payouts with `createPayout` middleware
- Webhook handlers for payment status updates (`paymentWebhook`)
- Webhook handlers for payout status updates (`payoutWebhook`)
- Comprehensive error handling system with custom error types:
  - `NowPaymentsApiError` for API-related errors
  - `NowPaymentsConfigError` for configuration errors
  - `NowPaymentsValidationError` for validation errors
  - `NowPaymentsNetworkError` for network-related errors
- Flexible configuration system with environment variable fallbacks
- Request transformation system via `mapRequest` functions
- Response transformation system via `transformResponse` functions
- Complete test suite with Jest (36 tests across 5 test suites)
- Path aliases support (`@/*`) for clean imports
- Examples for basic usage, webhook handling, and complete e-commerce flows
- Support for both sandbox and production environments
- Configurable error handling modes ('next' vs 'direct')
- TypeScript declarations and source maps
- ESLint and Prettier configuration for code quality

### Technical Details

- Built with TypeScript 5.9+
- Uses axios for HTTP client with custom interceptors
- Singleton pattern for configuration management
- Higher-order functions for middleware creation
- Comprehensive JSDoc documentation
- Support for async/await in webhook callbacks
- Express.js middleware pattern compliance
- Peer dependency on Express.js (^4.17.0 || ^5.0.0)

### Supported NowPayments Features

- Payment creation with crypto currency selection
- Invoice-based payment creation
- Payout creation with withdrawal specifications
- Real-time webhook notifications for all payment states:
  - waiting, confirming, confirmed, sending, partially_paid, finished, failed, expired, refunded
- Real-time webhook notifications for all payout states:
  - creating, waiting, processing, sending, finished, failed, rejected
- Automatic response handling and data storage in `res.locals`

### Developer Experience

- Hot-reloadable configuration
- Comprehensive error messages with context
- TypeScript IntelliSense support
- Jest testing utilities and mocks
- Example implementations for common use cases
- Detailed README with usage examples
- Professional package structure ready for npm publishing
