import express from 'express';
import {
  NowPaymentsMiddleware,
  NowPaymentsApiError,
  NowPaymentsValidationError
} from '@taloon/nowpayments-middleware';

const app = express();

app.use(express.json());

NowPaymentsMiddleware.configure({
  apiKey: 'your-api-key-here',
  email: 'your-email@example.com',
  password: 'your-password',
  errorHandling: 'next',
});

app.post('/create-payment',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => ({
      price_amount: req.body.amount,
      price_currency: req.body.currency,
      pay_currency: req.body.cryptoCurrency,
      order_id: req.body.orderId,
      order_description: req.body.description,
      customer_email: req.body.email,
      ipn_callback_url: 'https://your-domain.com/webhook/payment',
    }),
    transformResponse: (response) => ({
      paymentId: response.payment_id,
      status: response.payment_status,
      payAddress: response.pay_address,
      amount: response.pay_amount,
      currency: response.pay_currency,
      expiresAt: response.expiration_estimate_date,
    }),
    onError: async (error, req, res, next) => {
      console.error('Payment creation error:', error);

      if (error instanceof NowPaymentsValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
      }

      if (error instanceof NowPaymentsApiError) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Payment service is temporarily unavailable. Please try again later.',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment',
        },
      });
    },
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse;

    res.status(201).json({
      success: true,
      payment,
    });
  }
);

app.post('/create-payout',
  NowPaymentsMiddleware.createPayout({
    mapRequest: (req) => ({
      withdrawals: req.body.withdrawals.map((withdrawal: any) => ({
        address: withdrawal.address,
        currency: withdrawal.currency,
        amount: withdrawal.amount,
        ipn_callback_url: 'https://your-domain.com/webhook/payout',
      })),
    }),
    transformResponse: (response) => ({
      payoutId: response.id,
      withdrawals: response.withdrawals.map(w => ({
        id: w.id,
        status: w.status,
        address: w.address,
        amount: w.amount,
        currency: w.currency,
      })),
    }),
  }),
  (req, res) => {
    const payout = res.locals.nowPaymentsResponse;
    
    res.status(200).json({
      success: true,
      payout,
    });
  }
);

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  
  res.status(error.statusCode || 500).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;