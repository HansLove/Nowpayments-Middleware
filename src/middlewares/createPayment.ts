import { Request, Response, NextFunction } from 'express';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { CreatePaymentMiddlewareOptions, ExpressMiddleware } from '@/types';
import { NowPaymentsValidationError } from '@/utils/errors';

class CreatePaymentMiddleware extends BaseMiddleware {
  private client: NowPaymentsClient;

  constructor() {
    super();
    this.client = new NowPaymentsClient();
  }

  create(options: CreatePaymentMiddlewareOptions): ExpressMiddleware {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new NowPaymentsValidationError('mapRequest function is required');
        }

        const paymentData = options.mapRequest(req);
        
        if (!paymentData.price_amount || !paymentData.price_currency || !paymentData.pay_currency) {
          throw new NowPaymentsValidationError('price_amount, price_currency, and pay_currency are required');
        }

        const response = await this.client.createPayment(paymentData);

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

let createPaymentMiddleware: CreatePaymentMiddleware | null = null;

function getCreatePaymentMiddleware(): CreatePaymentMiddleware {
  if (!createPaymentMiddleware) {
    createPaymentMiddleware = new CreatePaymentMiddleware();
  }
  return createPaymentMiddleware;
}

export const createPayment = (options: CreatePaymentMiddlewareOptions): ExpressMiddleware =>
  getCreatePaymentMiddleware().create(options);