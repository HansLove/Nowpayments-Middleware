import express from 'express';
import {
  NowPaymentsMiddleware,
  NowPaymentsError,
  NowPaymentsApiError,
  NowPaymentsConfigError,
  NowPaymentsValidationError,
  NowPaymentsNetworkError,
} from '@taloon/nowpayments-middleware';

const app = express();

app.use(express.json());

// Example 1: Global Error Handler with Logging
// This handler applies to all NowPayments middleware operations
NowPaymentsMiddleware.configure({
  apiKey: process.env.NOWPAYMENTS_API_KEY || 'your-api-key',
  email: process.env.NOWPAYMENTS_EMAIL,
  password: process.env.NOWPAYMENTS_PASSWORD,
  onError: async (error, req, res, next) => {
    // Structured logging
    const errorLog = {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof NowPaymentsError ? error.code : undefined,
        statusCode: error instanceof NowPaymentsError ? error.statusCode : undefined,
      },
    };

    console.error('NowPayments Error:', JSON.stringify(errorLog, null, 2));

    // Handle different error types
    if (error instanceof NowPaymentsApiError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: 'PAYMENT_API_ERROR',
          message: process.env.NODE_ENV === 'production'
            ? 'Payment service is currently unavailable'
            : error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (error instanceof NowPaymentsValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (error instanceof NowPaymentsNetworkError) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Payment service is temporarily unavailable. Please try again.',
          retryable: true,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (error instanceof NowPaymentsConfigError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Service configuration error',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (error instanceof NowPaymentsError) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code,
          message: process.env.NODE_ENV === 'production'
            ? 'Payment operation failed'
            : error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Pass non-NowPayments errors to Express error handler
    next(error);
  },
});

// Example 2: Basic Payment with Per-Middleware Error Handler
// This handler overrides the global handler for this specific endpoint
app.post('/payment/basic',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
      order_id: req.body.orderId,
      customer_email: req.body.email,
      ipn_callback_url: `${req.protocol}://${req.get('host')}/webhook/payment`,
    }),
    onError: async (error, req, res, next) => {
      console.log('Per-middleware error handler for basic payment');

      if (error instanceof NowPaymentsValidationError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment data',
          details: error.message,
        });
      }

      // For other errors, use global handler
      if (error instanceof NowPaymentsError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          error: 'Payment creation failed',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Unexpected error',
      });
    },
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;
    res.status(201).json({ success: true, payment });
  }
);

// Example 3: Payment with Retry Logic
app.post('/payment/with-retry',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
      order_id: req.body.orderId,
      customer_email: req.body.email,
    }),
    onError: async (error, req, res, next) => {
      if (error instanceof NowPaymentsNetworkError) {
        const retryCount = parseInt((req.headers['x-retry-count'] as string) || '0', 10);
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          const retryAfter = Math.pow(2, retryCount) * 1000; // Exponential backoff

          return res.status(503).json({
            success: false,
            error: {
              code: 'NETWORK_ERROR',
              message: 'Service temporarily unavailable',
              retryable: true,
              retryAfter,
              retryCount,
              maxRetries,
            },
          });
        }

        return res.status(503).json({
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Service unavailable after maximum retries',
            retryable: false,
            retriesExhausted: true,
          },
        });
      }

      if (error instanceof NowPaymentsError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            code: error.code,
            message: 'Payment failed',
          },
        });
      }

      res.status(500).json({ success: false, error: 'Unexpected error' });
    },
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;
    res.status(201).json({ success: true, payment });
  }
);

// Example 4: Payout with Detailed Error Reporting
app.post('/payout/detailed-errors',
  NowPaymentsMiddleware.createPayout({
    mapRequest: (req) => ({
      withdrawals: req.body.withdrawals,
    }),
    onError: async (error, req, res, next) => {
      const errorResponse: any = {
        success: false,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || undefined,
      };

      if (error instanceof NowPaymentsValidationError) {
        errorResponse.error = {
          type: 'VALIDATION_ERROR',
          message: 'Invalid payout data',
          details: error.message,
          field: extractFieldFromError(error.message),
        };
        return res.status(400).json(errorResponse);
      }

      if (error instanceof NowPaymentsApiError) {
        errorResponse.error = {
          type: 'API_ERROR',
          message: 'NowPayments API error',
          statusCode: error.statusCode,
          retryable: error.statusCode >= 500,
        };
        return res.status(error.statusCode).json(errorResponse);
      }

      if (error instanceof NowPaymentsNetworkError) {
        errorResponse.error = {
          type: 'NETWORK_ERROR',
          message: 'Network communication error',
          retryable: true,
        };
        return res.status(503).json(errorResponse);
      }

      if (error instanceof NowPaymentsError) {
        errorResponse.error = {
          type: error.code,
          message: error.message,
          statusCode: error.statusCode,
        };
        return res.status(error.statusCode || 500).json(errorResponse);
      }

      errorResponse.error = {
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      };
      res.status(500).json(errorResponse);
    },
  }),
  (req, res) => {
    const payout = res.locals.nowPaymentsResponse;
    res.status(200).json({ success: true, payout });
  }
);

// Example 5: Error Handler with External Service Integration
// (Simulating Sentry/logging service)
interface ErrorLogger {
  logError: (error: unknown, context: Record<string, any>) => void;
}

const errorLogger: ErrorLogger = {
  logError: (error, context) => {
    console.log('📝 Logging to external service:', { error, context });
  },
};

app.post('/payment/with-monitoring',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
    }),
    onError: async (error, req, res, next) => {
      // Log to external service
      errorLogger.logError(error, {
        endpoint: '/payment/with-monitoring',
        method: req.method,
        ip: req.ip,
        userId: req.body.userId,
      });

      if (error instanceof NowPaymentsError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            code: error.code,
            message: 'Payment operation failed',
            reference: generateErrorReference(),
          },
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal error',
        reference: generateErrorReference(),
      });
    },
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;
    res.status(201).json({ success: true, payment });
  }
);

// Example 6: Development vs Production Error Handling
const isDevelopment = process.env.NODE_ENV === 'development';

app.post('/payment/environment-aware',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
    }),
    onError: async (error, req, res, next) => {
      const baseResponse = {
        success: false,
        timestamp: new Date().toISOString(),
      };

      if (error instanceof NowPaymentsError) {
        const response: any = {
          ...baseResponse,
          error: {
            code: error.code,
            message: isDevelopment ? error.message : 'Payment operation failed',
          },
        };

        // Include detailed information in development
        if (isDevelopment) {
          response.error.details = {
            statusCode: error.statusCode,
            originalError: error.originalError,
            stack: error.stack,
          };
        }

        return res.status(error.statusCode || 500).json(response);
      }

      const response: any = {
        ...baseResponse,
        error: {
          message: isDevelopment
            ? (error instanceof Error ? error.message : 'Unknown error')
            : 'Internal server error',
        },
      };

      if (isDevelopment && error instanceof Error) {
        response.error.stack = error.stack;
      }

      res.status(500).json(response);
    },
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;
    res.status(201).json({ success: true, payment });
  }
);

// Utility Functions
function extractFieldFromError(message: string): string | undefined {
  const match = message.match(/([a-z_]+) (?:is|are) required/i);
  return match ? match[1] : undefined;
}

function generateErrorReference(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Express Error Handler (for non-NowPayments errors)
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error handler:', error);

  res.status(error.status || 500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message,
    },
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Error handling examples running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /payment/basic - Basic payment with per-middleware error handler`);
  console.log(`   POST /payment/with-retry - Payment with retry logic`);
  console.log(`   POST /payout/detailed-errors - Payout with detailed error reporting`);
  console.log(`   POST /payment/with-monitoring - Payment with monitoring integration`);
  console.log(`   POST /payment/environment-aware - Environment-aware error handling`);
});

export default app;
