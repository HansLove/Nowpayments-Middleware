import express from 'express';
import { NowPaymentsMiddleware } from '@taloon/nowpayments-middleware';

const app = express();

app.use(express.json());

NowPaymentsMiddleware.configure({
  apiKey: 'your-api-key-here',
  errorHandling: 'next',
});

app.post('/webhook/payment',
  NowPaymentsMiddleware.paymentWebhook({
    onWaiting: async (payload) => {
      console.log('Payment waiting:', payload.payment_id);
      
    },
    
    onConfirming: async (payload) => {
      console.log('Payment confirming:', payload.payment_id);
      
    },
    
    onConfirmed: async (payload) => {
      console.log('Payment confirmed:', payload.payment_id);
      
    },
    
    onSending: async (payload) => {
      console.log('Payment sending:', payload.payment_id);
      
    },
    
    onPartiallyPaid: async (payload) => {
      console.log('Payment partially paid:', payload.payment_id);
      console.log('Expected:', payload.pay_amount);
      console.log('Received:', payload.actually_paid);
      
    },
    
    onFinished: async (payload) => {
      console.log('Payment finished:', payload.payment_id);
      console.log('Order ID:', payload.order_id);
      
      try {
        console.log('✅ Payment completed successfully');
      } catch (error) {
        console.error('Error updating order:', error);
      }
    },
    
    onFailed: async (payload) => {
      console.log('Payment failed:', payload.payment_id);
      
      try {
        console.log('❌ Payment failed - order cancelled');
      } catch (error) {
        console.error('Error cancelling order:', error);
      }
    },
    
    onExpired: async (payload) => {
      console.log('Payment expired:', payload.payment_id);
      
      try {
        console.log('⏰ Payment expired - order cancelled');
      } catch (error) {
        console.error('Error handling expired payment:', error);
      }
    },
    
    onRefunded: async (payload) => {
      console.log('Payment refunded:', payload.payment_id);
      
      try {
        console.log('💰 Payment refunded - order refunded');
      } catch (error) {
        console.error('Error processing refund:', error);
      }
    },
  })
);

app.post('/webhook/payout',
  NowPaymentsMiddleware.payoutWebhook({
    onWaiting: async (payload) => {
      console.log('Payout waiting:', payload.id);
    },
    
    onProcessing: async (payload) => {
      console.log('Payout processing:', payload.id);
    },
    
    onSending: async (payload) => {
      console.log('Payout sending:', payload.id);
    },
    
    onFinished: async (payload) => {
      console.log('Payout finished:', payload.id);
      console.log('Hash:', payload.hash);
      
      try {
        console.log('✅ Payout completed successfully');
      } catch (error) {
        console.error('Error updating payout status:', error);
      }
    },
    
    onFailed: async (payload) => {
      console.log('Payout failed:', payload.id);
      console.log('Error:', payload.error);
      
      try {
        console.log('❌ Payout failed - manual review required');
      } catch (error) {
        console.error('Error handling failed payout:', error);
      }
    },
    
    onRejected: async (payload) => {
      console.log('Payout rejected:', payload.id);
      
      try {
        console.log('🚫 Payout rejected - returning funds');
      } catch (error) {
        console.error('Error handling rejected payout:', error);
      }
    },
  })
);

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Webhook error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});

export default app;