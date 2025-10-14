import { Request, Response, NextFunction } from 'express';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { CreatePayoutMiddlewareOptions, ExpressMiddleware } from '@/types';
import { NowPaymentsValidationError } from '@/utils/errors';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { generateTOTPCode } from '@/utils/totp';

class CreatePayoutMiddleware extends BaseMiddleware {
  private client: NowPaymentsClient;

  constructor() {
    super();
    this.client = new NowPaymentsClient();
  }

  create(options: CreatePayoutMiddlewareOptions): ExpressMiddleware {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new NowPaymentsValidationError('mapRequest function is required');
        }

        const payoutData = options.mapRequest(req);
        
        if (!payoutData.withdrawals || payoutData.withdrawals.length === 0) {
          throw new NowPaymentsValidationError('withdrawals array is required and cannot be empty');
        }

        for (const withdrawal of payoutData.withdrawals) {
          if (!withdrawal.address || !withdrawal.currency || !withdrawal.amount) {
            throw new NowPaymentsValidationError('Each withdrawal must have address, currency, and amount');
          }
        }

        const response = await this.client.createPayout(payoutData);

        const config = NowPaymentsConfiguration.getConfig();

        if (config.twoFactorSecretKey) {
          const totpCode = generateTOTPCode(config.twoFactorSecretKey);
          await this.client.verifyPayout(response.id, totpCode);
        }

        const transformedResponse = options.transformResponse
          ? options.transformResponse(response)
          : response;

        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        await this.handleError(error, req, res, next, options.onError);
      }
    };
  }
}

let createPayoutMiddleware: CreatePayoutMiddleware | null = null;

function getCreatePayoutMiddleware(): CreatePayoutMiddleware {
  if (!createPayoutMiddleware) {
    createPayoutMiddleware = new CreatePayoutMiddleware();
  }
  return createPayoutMiddleware;
}

export const createPayout = (options: CreatePayoutMiddlewareOptions): ExpressMiddleware =>
  getCreatePayoutMiddleware().create(options);