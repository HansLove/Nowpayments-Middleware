# @taloon/nowpayments-middleware

Express middleware for NowPayments cryptocurrency payment integration with dependency injection support.

## Features

- 🚀 **Easy Integration** - Simple Express middleware setup
- 💉 **Dependency Injection** - Configurable request mappers and response transformers
- 🔧 **TypeScript First** - Full TypeScript support with comprehensive type definitions
- 🎣 **Webhook Support** - Built-in webhook handlers for payment and payout events
- ⚡ **Functional Programming** - Higher-order functions for clean, composable middleware
- 🛡️ **Error Handling** - Comprehensive error handling with custom error types
- 🔄 **Flexible Configuration** - Environment variables fallback and configurable error handling

## Installation

```bash
npm install @taloon/nowpayments-middleware
```

## Peer Dependencies

```bash
npm install express
```

## Quick Start

### 1. Configure the middleware

```typescript
import { NowPaymentsMiddleware } from '@taloon/nowpayments-middleware';

// Configure globally
NowPaymentsMiddleware.configure({
  apiKey: 'your-nowpayments-api-key',
  bearerToken: 'your-bearer-token', // Optional, required for payouts
  errorHandling: 'next', // or 'direct'
});
```

### 2. Create payment endpoint

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/create-payment',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
      order_id: req.body.orderId,
      customer_email: req.body.email,
      ipn_callback_url: 'https://your-domain.com/webhook/payment',
    }),
    transformResponse: (response) => ({
      paymentId: response.payment_id,
      status: response.payment_status,
      payAddress: response.pay_address,
      amount: response.pay_amount,
      currency: response.pay_currency,
    }),
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;
    res.json({ success: true, payment });
  }
);
```

### 3. Handle webhooks

```typescript
app.post('/webhook/payment',
  NowPaymentsMiddleware.paymentWebhook({
    onWaiting: async (payload) => {
      console.log('Payment waiting:', payload.payment_id);
    },
    onFinished: async (payload) => {
      console.log('Payment completed:', payload.payment_id);
      // Update your database, send notifications, etc.
    },
    onFailed: async (payload) => {
      console.log('Payment failed:', payload.payment_id);
      // Handle failed payment
    },
  })
);
```

## Configuration

### Environment Variables

You can use environment variables instead of explicit configuration:

```bash
NOWPAYMENTS_API_KEY=your-api-key
NOWPAYMENTS_BEARER_TOKEN=your-bearer-token
NOWPAYMENTS_BASE_URL=https://api.nowpayments.io/v1
```

### Configuration Options

```typescript
interface NowPaymentsConfig {
  apiKey: string;                    // Required: Your NowPayments API key
  bearerToken?: string;              // Optional: Bearer token for payouts
  baseURL?: string;                  // Optional: API base URL (default: https://api.nowpayments.io/v1)
  errorHandling?: 'next' | 'direct'; // Optional: Error handling mode (default: 'next')
}
```

## API Reference

### Middleware Functions

#### `createPayment(options)`

Creates a payment middleware for standard payments.

```typescript
interface CreatePaymentMiddlewareOptions {
  mapRequest: (req: Request) => CreatePaymentRequest;
  transformResponse?: (response: CreatePaymentResponse) => unknown;
}
```

#### `createPaymentByInvoice(options)`

Creates a payment middleware for invoice-based payments.

```typescript
interface CreatePaymentByInvoiceMiddlewareOptions {
  mapRequest: (req: Request) => CreatePaymentByInvoiceRequest;
  transformResponse?: (response: CreatePaymentByInvoiceResponse) => unknown;
}
```

#### `createPayout(options)`

Creates a payout middleware for withdrawals.

```typescript
interface CreatePayoutMiddlewareOptions {
  mapRequest: (req: Request) => CreatePayoutRequest;
  transformResponse?: (response: CreatePayoutResponse) => unknown;
}
```

#### `paymentWebhook(callbacks)`

Creates a webhook middleware for payment status updates.

```typescript
interface PaymentWebhookCallbacks {
  onWaiting?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onConfirming?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onConfirmed?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onSending?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onPartiallyPaid?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onFinished?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onFailed?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onExpired?: (payload: PaymentWebhookPayload) => void | Promise<void>;
  onRefunded?: (payload: PaymentWebhookPayload) => void | Promise<void>;
}
```

#### `payoutWebhook(callbacks)`

Creates a webhook middleware for payout status updates.

```typescript
interface PayoutWebhookCallbacks {
  onCreating?: (payload: PayoutWebhookPayload) => void | Promise<void>;
  onWaiting?: (payload: PayoutWebhookPayload) => void | Promise<void>;
  onProcessing?: (payload: PayoutWebhookPayload) => void | Promise<void>;
  onSending?: (payload: PayoutWebhookPayload) => void | Promise<void>;
  onFinished?: (payload: PayoutWebhookPayload) => void | Promise<void>;
  onFailed?: (payload: PayoutWebhookPayload) => void | Promise<void>;
  onRejected?: (payload: PayoutWebhookPayload) => void | Promise<void>;
}
```

### Payment Statuses

```typescript
enum PaymentStatus {
  WAITING = 'waiting',           // Waiting for customer payment
  CONFIRMING = 'confirming',     // Transaction confirming on blockchain
  CONFIRMED = 'confirmed',       // Transaction confirmed
  SENDING = 'sending',          // Sending to your wallet
  PARTIALLY_PAID = 'partially_paid', // Customer sent less than required
  FINISHED = 'finished',         // Payment completed
  FAILED = 'failed',            // Payment failed
  EXPIRED = 'expired',          // Payment expired (7 days)
}
```

### Payout Statuses

```typescript
enum PayoutStatus {
  CREATING = 'creating',         // Payout being created
  WAITING = 'waiting',          // Waiting to be processed
  PROCESSING = 'processing',     // Being processed
  SENDING = 'sending',          // Being sent to address
  FINISHED = 'finished',        // Payout completed
  FAILED = 'failed',            // Payout failed
  REJECTED = 'rejected',        // Payout rejected
}
```

## Error Handling

The middleware provides comprehensive error handling with custom error types:

```typescript
// Available error types
import {
  NowPaymentsError,
  NowPaymentsApiError,
  NowPaymentsConfigError,
  NowPaymentsValidationError,
  NowPaymentsNetworkError,
} from '@taloon/nowpayments-middleware';

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof NowPaymentsError) {
    return res.status(error.statusCode || 400).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }
  
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
});
```

### Error Handling Modes

- **`'next'`** (default): Passes errors to Express error handling middleware
- **`'direct'`**: Sends error responses directly (not recommended for production)

## Complete Example

```typescript
import express from 'express';
import { 
  NowPaymentsMiddleware, 
  PaymentStatus,
  NowPaymentsError 
} from '@taloon/nowpayments-middleware';

const app = express();
app.use(express.json());

// Configuration
NowPaymentsMiddleware.configure({
  apiKey: process.env.NOWPAYMENTS_API_KEY!,
  bearerToken: process.env.NOWPAYMENTS_BEARER_TOKEN,
  errorHandling: 'next',
});

// Create payment
app.post('/orders',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
      order_id: `order_${Date.now()}`,
      order_description: `Order for ${req.body.amount} ${req.body.currency}`,
      customer_email: req.body.email,
      ipn_callback_url: `${req.protocol}://${req.get('host')}/webhook/payment`,
    }),
    transformResponse: (response) => ({
      orderId: response.order_id,
      paymentId: response.payment_id,
      status: response.payment_status,
      payAddress: response.pay_address,
      payAmount: response.pay_amount,
      payCurrency: response.pay_currency,
      expiresAt: response.expiration_estimate_date,
    }),
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;
    res.status(201).json({ success: true, data: payment });
  }
);

// Payment webhook
app.post('/webhook/payment',
  NowPaymentsMiddleware.paymentWebhook({
    onFinished: async (payload) => {
      console.log(`Payment completed: ${payload.payment_id}`);
      // Update database, send confirmation email, etc.
    },
    onFailed: async (payload) => {
      console.log(`Payment failed: ${payload.payment_id}`);
      // Handle failure, cancel order, notify user, etc.
    },
    onExpired: async (payload) => {
      console.log(`Payment expired: ${payload.payment_id}`);
      // Cancel order, notify user about expiration
    },
  })
);

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Application error:', error);
  
  if (error instanceof NowPaymentsError) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Examples

Check out the `/examples` directory for more comprehensive examples:

- `basic-payment.ts` - Basic payment and payout creation
- `webhook-handler.ts` - Webhook handling examples
- `complete-flow.ts` - Full payment flow with order management

## API Endpoints Supported

### NowPayments API Coverage

- ✅ **Create Payment** (`POST /v1/payment`)
- ✅ **Create Payment by Invoice** (`POST /v1/invoice-payment`)
- ✅ **Create Payout** (`POST /v1/payout`)
- ✅ **Payment Webhooks** (IPN callbacks)
- ✅ **Payout Webhooks** (IPN callbacks)

## Requirements

- Node.js >= 14.0.0
- Express.js >= 4.17.0
- Valid NowPayments API key
- Bearer token (required for payouts)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Building

```bash
# Build the project
npm run build

# Build and watch for changes
npm run build:watch

# Clean build artifacts
npm run clean
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Create an issue on [GitHub](https://github.com/DieGopherLT/nowpayments-middleware/issues)
- 📖 Check the [NowPayments API Documentation](https://documenter.getpostman.com/view/7907941/S1a32n38)
- 💬 Community support through GitHub Discussions

## Changelog

### 1.0.0
- Initial release
- Support for payment creation, invoice payments, and payouts
- Webhook handling for payment and payout events
- TypeScript support with comprehensive type definitions
- Configurable error handling
- Environment variable fallback support