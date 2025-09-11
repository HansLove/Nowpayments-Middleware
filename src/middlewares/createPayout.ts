import { Request, Response, NextFunction } from 'express';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { CreatePayoutMiddlewareOptions, ExpressMiddleware } from '@/types';
import { NowPaymentsValidationError } from '@/utils/errors';

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

        const transformedResponse = options.transformResponse
          ? options.transformResponse(response)
          : response;

        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        this.handleError(error, res, next);
      }
    };
  }
}

const createPayoutMiddleware = new CreatePayoutMiddleware();

export const createPayout = (options: CreatePayoutMiddlewareOptions): ExpressMiddleware =>
  createPayoutMiddleware.create(options);