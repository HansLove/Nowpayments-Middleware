import { Request, Response, NextFunction } from 'express';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import { CreateInvoicePaymentMiddlewareOptions, ExpressMiddleware } from '@/types';
import { NowPaymentsValidationError } from '@/utils/errors';

class CreateInvoicePaymentMiddleware extends BaseMiddleware {
  private client: NowPaymentsClient;

  constructor() {
    super();
    this.client = new NowPaymentsClient();
  }

  create(options: CreateInvoicePaymentMiddlewareOptions): ExpressMiddleware {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new NowPaymentsValidationError('mapRequest function is required');
        }

        const requestData = options.mapRequest(req, res);

        if (!requestData.price_amount || !requestData.price_currency || !requestData.pay_currency) {
          throw new NowPaymentsValidationError(
            'price_amount, price_currency, and pay_currency are required'
          );
        }

        // Step 1: Create invoice (internal)
        const invoiceResponse = await this.client.createInvoice({
          price_amount: requestData.price_amount,
          price_currency: requestData.price_currency,
          order_id: requestData.order_id,
          order_description: requestData.order_description,
          ipn_callback_url: requestData.ipn_callback_url,
          success_url: requestData.success_url,
          cancel_url: requestData.cancel_url,
        });

        // Step 2: Create payment from invoice
        const paymentResponse = await this.client.createPaymentByInvoice({
          iid: invoiceResponse.id,
          pay_currency: requestData.pay_currency,
          customer_email: requestData.customer_email,
          payout_address: requestData.payout_address,
          payout_extra_id: requestData.payout_extra_id,
          payout_currency: requestData.payout_currency,
        });

        const transformedResponse = options.transformResponse
          ? options.transformResponse(paymentResponse)
          : paymentResponse;

        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        await this.handleError(error, req, res, next, options.onError);
      }
    };
  }
}

let createInvoicePaymentMiddleware: CreateInvoicePaymentMiddleware | null = null;

function getCreateInvoicePaymentMiddleware(): CreateInvoicePaymentMiddleware {
  if (!createInvoicePaymentMiddleware) {
    createInvoicePaymentMiddleware = new CreateInvoicePaymentMiddleware();
  }
  return createInvoicePaymentMiddleware;
}

export const createInvoicePayment = (options: CreateInvoicePaymentMiddlewareOptions): ExpressMiddleware =>
  getCreateInvoicePaymentMiddleware().create(options);
