import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import {
  PayoutWebhookCallbacks,
  ExpressMiddleware,
  PayoutWebhookPayload,
} from '@/types';
import { PayoutStatus } from '@/constants/statuses';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { DispersionTargetStore } from '@/dispersion/DispersionTargetStore';
import { DispersionOrchestrator } from '@/dispersion/DispersionOrchestrator';

class PayoutWebhookMiddleware extends BaseMiddleware {
  create(callbacks: PayoutWebhookCallbacks): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const payload: PayoutWebhookPayload = req.body;
        const status = payload.status.toLocaleLowerCase();

        switch (status) {
          case PayoutStatus.CREATING:
            if (callbacks.onCreating) {
              await callbacks.onCreating(payload);
            }
            break;

          case PayoutStatus.WAITING:
            if (callbacks.onWaiting) {
              await callbacks.onWaiting(payload);
            }
            break;

          case PayoutStatus.PROCESSING:
            if (callbacks.onProcessing) {
              await callbacks.onProcessing(payload);
            }
            break;

          case PayoutStatus.SENDING:
            if (callbacks.onSending) {
              await callbacks.onSending(payload);
            }
            break;

          case PayoutStatus.FINISHED:
            if (callbacks.onFinished) {
              await callbacks.onFinished(payload);
            }
            await this.triggerDispersion(payload);
            break;

          case PayoutStatus.FAILED:
            if (callbacks.onFailed) {
              await callbacks.onFailed(payload);
            }
            break;

          case PayoutStatus.REJECTED:
            if (callbacks.onRejected) {
              await callbacks.onRejected(payload);
            }
            break;

          default:
            break;
        }

        this.saveToLocals(res, payload);

        res.status(200).json({ status: 'ok' });
      } catch (error) {
        await this.handleError(error, req, res, next);
      }
    };
  }

  private async triggerDispersion(
    payload: PayoutWebhookPayload
  ): Promise<void> {
    try {
      const config = NowPaymentsConfiguration.getConfig();
      if (!config.dispersion) return;

      const target = DispersionTargetStore.get(payload.id);
      if (!target) return;

      await DispersionOrchestrator.disperse(target);
    } catch (_err) {
      // Dispersion errors must not affect webhook response
    }
  }
}

let payoutWebhookMiddleware: PayoutWebhookMiddleware | null = null;

function getPayoutWebhookMiddleware(): PayoutWebhookMiddleware {
  if (!payoutWebhookMiddleware) {
    payoutWebhookMiddleware = new PayoutWebhookMiddleware();
  }
  return payoutWebhookMiddleware;
}

export const payoutWebhook = (
  callbacks: PayoutWebhookCallbacks
): ExpressMiddleware => getPayoutWebhookMiddleware().create(callbacks);
