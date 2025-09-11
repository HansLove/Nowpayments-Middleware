import { Request, Response, NextFunction } from 'express';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { CreatePaymentByInvoiceMiddlewareOptions, ExpressMiddleware } from '@/types';
import { NowPaymentsValidationError } from '@/utils/errors';

class CreatePaymentByInvoiceMiddleware extends BaseMiddleware {
  private client: NowPaymentsClient;

  constructor() {
    super();
    this.client = new NowPaymentsClient();
  }

  create(options: CreatePaymentByInvoiceMiddlewareOptions): ExpressMiddleware {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new NowPaymentsValidationError('mapRequest function is required');
        }

        const paymentData = options.mapRequest(req);
        
        if (!paymentData.iid || !paymentData.pay_currency) {
          throw new NowPaymentsValidationError('iid and pay_currency are required');
        }

        const response = await this.client.createPaymentByInvoice(paymentData);

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

const createPaymentByInvoiceMiddleware = new CreatePaymentByInvoiceMiddleware();

export const createPaymentByInvoice = (options: CreatePaymentByInvoiceMiddlewareOptions): ExpressMiddleware =>
  createPaymentByInvoiceMiddleware.create(options);