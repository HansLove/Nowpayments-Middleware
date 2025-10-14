import express from 'express';
import {
  NowPaymentsMiddleware,
  PaymentStatus,
  PayoutStatus,
  NowPaymentsError,
  NowPaymentsValidationError
} from '@taloon/nowpayments-middleware';

const app = express();

app.use(express.json());

NowPaymentsMiddleware.configure({
  apiKey: process.env.NOWPAYMENTS_API_KEY || 'your-api-key',
  email: process.env.NOWPAYMENTS_EMAIL,
  password: process.env.NOWPAYMENTS_PASSWORD,
  baseURL: process.env.NOWPAYMENTS_BASE_URL,
  errorHandling: 'next',
  onError: async (error, req, res, next) => {
    console.error('Global NowPayments error handler:', {
      path: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    if (error instanceof NowPaymentsError) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code,
          message: process.env.NODE_ENV === 'production'
            ? 'Payment service error'
            : error.message,
        },
      });
    }

    next(error);
  },
});

interface Order {
  id: string;
  amount: number;
  currency: string;
  cryptoCurrency: string;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paymentId?: string;
  customerEmail: string;
}

const orders = new Map<string, Order>();
const payouts = new Map<string, any>();

app.post('/orders',
  NowPaymentsMiddleware.createPayment({
    mapRequest: (req) => {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const order: Order = {
        id: orderId,
        amount: req.body.amount,
        currency: req.body.currency,
        cryptoCurrency: req.body.cryptoCurrency,
        status: 'pending',
        customerEmail: req.body.email,
      };
      
      orders.set(orderId, order);
      
      return {
        price_amount: req.body.amount,
        price_currency: req.body.currency,
        pay_currency: req.body.cryptoCurrency,
        order_id: orderId,
        order_description: `Order ${orderId}`,
        customer_email: req.body.email,
        ipn_callback_url: `${req.protocol}://${req.get('host')}/webhook/payment`,
      };
    },
    transformResponse: (response) => {
      const orderId = response.order_id!;
      const order = orders.get(orderId);
      
      if (order) {
        order.paymentId = response.payment_id;
        orders.set(orderId, order);
      }
      
      return {
        orderId,
        paymentId: response.payment_id,
        status: response.payment_status,
        payAddress: response.pay_address,
        payAmount: response.pay_amount,
        payCurrency: response.pay_currency,
        expiresAt: response.expiration_estimate_date,
        network: response.network,
      };
    },
  }),
  (req, res) => {
    const payment = res.locals.nowPaymentsResponse as any;
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: payment,
    });
  }
);

app.get('/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  
  if (!order) {
    return res.status(404).json({
      error: 'Order not found',
    });
  }
  
  res.json({
    success: true,
    data: order,
  });
});

app.post('/payouts',
  NowPaymentsMiddleware.createPayout({
    mapRequest: (req) => ({
      withdrawals: req.body.withdrawals,
      ipn_callback_url: `${req.protocol}://${req.get('host')}/webhook/payout`,
    }),
    transformResponse: (response) => {
      payouts.set(response.id, {
        id: response.id,
        withdrawals: response.withdrawals,
        createdAt: new Date().toISOString(),
      });

      return {
        payoutId: response.id,
        withdrawals: response.withdrawals.map(w => ({
          id: w.id,
          address: w.address,
          amount: w.amount,
          currency: w.currency,
          status: w.status,
        })),
      };
    },
    onError: async (error, req, res, next) => {
      // Per-middleware handler overrides global handler
      console.error('Payout-specific error handler:', error);

      if (error instanceof NowPaymentsValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PAYOUT_VALIDATION_ERROR',
            message: 'Invalid payout data: ' + error.message,
          },
        });
      }

      if (error instanceof NowPaymentsError) {
        return res.status(error.statusCode || 500).json({
          success: false,
          error: {
            code: 'PAYOUT_ERROR',
            message: 'Failed to create payout',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: 'Unexpected payout error',
      });
    },
  }),
  (req, res) => {
    const payout = res.locals.nowPaymentsResponse;

    res.status(200).json({
      success: true,
      message: 'Payout created successfully',
      data: payout,
    });
  }
);

app.post('/webhook/payment',
  NowPaymentsMiddleware.paymentWebhook({
    onWaiting: async (payload) => {
      console.log(`💰 Payment ${payload.payment_id} is waiting for funds`);
      
      const order = Array.from(orders.values()).find(o => o.paymentId === payload.payment_id.toString());
      if (order) {
        order.status = 'pending';
        orders.set(order.id, order);
      }
    },
    
    onConfirming: async (payload) => {
      console.log(`⏳ Payment ${payload.payment_id} is confirming on blockchain`);
    },
    
    onConfirmed: async (payload) => {
      console.log(`✅ Payment ${payload.payment_id} confirmed on blockchain`);
    },
    
    onFinished: async (payload) => {
      console.log(`🎉 Payment ${payload.payment_id} completed successfully!`);
      console.log(`Order: ${payload.order_id}`);
      console.log(`Amount: ${payload.actually_paid} ${payload.pay_currency}`);
      
      if (payload.order_id) {
        const order = orders.get(payload.order_id);
        if (order) {
          order.status = 'paid';
          orders.set(payload.order_id, order);
          
          console.log(`📦 Order ${payload.order_id} marked as paid`);
        }
      }
    },
    
    onPartiallyPaid: async (payload) => {
      console.log(`⚠️  Payment ${payload.payment_id} partially paid`);
      console.log(`Expected: ${payload.pay_amount} ${payload.pay_currency}`);
      console.log(`Received: ${payload.actually_paid} ${payload.pay_currency}`);
    },
    
    onFailed: async (payload) => {
      console.log(`❌ Payment ${payload.payment_id} failed`);
      
      if (payload.order_id) {
        const order = orders.get(payload.order_id);
        if (order) {
          order.status = 'failed';
          orders.set(payload.order_id, order);
          
          console.log(`📦 Order ${payload.order_id} marked as failed`);
        }
      }
    },
    
    onExpired: async (payload) => {
      console.log(`⏰ Payment ${payload.payment_id} expired`);
      
      if (payload.order_id) {
        const order = orders.get(payload.order_id);
        if (order) {
          order.status = 'expired';
          orders.set(payload.order_id, order);
          
          console.log(`📦 Order ${payload.order_id} marked as expired`);
        }
      }
    },
  })
);

app.post('/webhook/payout',
  NowPaymentsMiddleware.payoutWebhook({
    onWaiting: async (payload) => {
      console.log(`💸 Payout ${payload.id} is waiting to be processed`);
    },
    
    onProcessing: async (payload) => {
      console.log(`⚙️  Payout ${payload.id} is being processed`);
    },
    
    onSending: async (payload) => {
      console.log(`📤 Payout ${payload.id} is being sent to ${payload.address}`);
    },
    
    onFinished: async (payload) => {
      console.log(`✅ Payout ${payload.id} completed!`);
      console.log(`Amount: ${payload.amount} ${payload.currency}`);
      console.log(`Address: ${payload.address}`);
      console.log(`Hash: ${payload.hash}`);
      
      const payout = payouts.get(payload.batch_withdrawal_id);
      if (payout) {
        payout.status = 'completed';
        payout.completedAt = new Date().toISOString();
        payouts.set(payload.batch_withdrawal_id, payout);
      }
    },
    
    onFailed: async (payload) => {
      console.log(`❌ Payout ${payload.id} failed: ${payload.error}`);
      
      const payout = payouts.get(payload.batch_withdrawal_id);
      if (payout) {
        payout.status = 'failed';
        payout.error = payload.error;
        payouts.set(payload.batch_withdrawal_id, payout);
      }
    },
    
    onRejected: async (payload) => {
      console.log(`🚫 Payout ${payload.id} was rejected`);
      
      const payout = payouts.get(payload.batch_withdrawal_id);
      if (payout) {
        payout.status = 'rejected';
        payouts.set(payload.batch_withdrawal_id, payout);
      }
    },
  })
);

app.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      totalOrders: orders.size,
      totalPayouts: payouts.size,
      orders: Array.from(orders.values()),
      payouts: Array.from(payouts.values()),
    },
  });
});

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 NowPayments middleware example running on port ${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /orders - Create new payment order`);
  console.log(`   GET  /orders/:orderId - Get order status`);
  console.log(`   POST /payouts - Create payout`);
  console.log(`   POST /webhook/payment - Payment webhook`);
  console.log(`   POST /webhook/payout - Payout webhook`);
  console.log(`   GET  /status - Application status`);
});

export default app;