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

        const paymentData = options.mapRequest(req, res);
        
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
        await this.handleError(error, req, res, next, options.onError);
      }
    };
  }
}

let createPaymentByInvoiceMiddleware: CreatePaymentByInvoiceMiddleware | null = null;

function getCreatePaymentByInvoiceMiddleware(): CreatePaymentByInvoiceMiddleware {
  if (!createPaymentByInvoiceMiddleware) {
    createPaymentByInvoiceMiddleware = new CreatePaymentByInvoiceMiddleware();
  }
  return createPaymentByInvoiceMiddleware;
}

export const createPaymentByInvoice = (options: CreatePaymentByInvoiceMiddlewareOptions): ExpressMiddleware =>
  getCreatePaymentByInvoiceMiddleware().create(options);