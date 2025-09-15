# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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