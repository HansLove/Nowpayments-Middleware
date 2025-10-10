import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { PaymentWebhookCallbacks, ExpressMiddleware, PaymentWebhookPayload } from '@/types';
import { PaymentStatus, InvoiceStatus } from '@/constants/statuses';

class PaymentWebhookMiddleware extends BaseMiddleware {
  create(callbacks: PaymentWebhookCallbacks): ExpressMiddleware {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const payload: PaymentWebhookPayload = req.body;
        const status = payload.payment_status.toLocaleLowerCase();

        switch (status) {
          case PaymentStatus.WAITING:
            if (callbacks.onWaiting) {
              await callbacks.onWaiting(payload);
            }
            break;

          case PaymentStatus.CONFIRMING:
            if (callbacks.onConfirming) {
              await callbacks.onConfirming(payload);
            }
            break;

          case PaymentStatus.CONFIRMED:
            if (callbacks.onConfirmed) {
              await callbacks.onConfirmed(payload);
            }
            break;

          case PaymentStatus.SENDING:
            if (callbacks.onSending) {
              await callbacks.onSending(payload);
            }
            break;

          case PaymentStatus.PARTIALLY_PAID:
            if (callbacks.onPartiallyPaid) {
              await callbacks.onPartiallyPaid(payload);
            }
            break;

          case PaymentStatus.FINISHED:
            if (callbacks.onFinished) {
              await callbacks.onFinished(payload);
            }
            break;

          case PaymentStatus.FAILED:
            if (callbacks.onFailed) {
              await callbacks.onFailed(payload);
            }
            break;

          case PaymentStatus.EXPIRED:
            if (callbacks.onExpired) {
              await callbacks.onExpired(payload);
            }
            break;

          case InvoiceStatus.REFUNDED:
            if (callbacks.onRefunded) {
              await callbacks.onRefunded(payload);
            }
            break;

          default:
            break;
        }

        this.saveToLocals(res, payload);
        
        res.status(200).json({ status: 'ok' });
      } catch (error) {
        this.handleError(error, res, next);
      }
    };
  }
}

let paymentWebhookMiddleware: PaymentWebhookMiddleware | null = null;

function getPaymentWebhookMiddleware(): PaymentWebhookMiddleware {
  if (!paymentWebhookMiddleware) {
    paymentWebhookMiddleware = new PaymentWebhookMiddleware();
  }
  return paymentWebhookMiddleware;
}

export const paymentWebhook = (callbacks: PaymentWebhookCallbacks): ExpressMiddleware =>
  getPaymentWebhookMiddleware().create(callbacks);