import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { createPayment } from '@/middlewares/createPayment';
import { createPaymentByInvoice } from '@/middlewares/createPaymentByInvoice';
import { createInvoicePayment } from '@/middlewares/createInvoicePayment';
import {
  createPayout,
  createPayoutWithDispersion,
} from '@/middlewares/createPayout';
import { paymentWebhook } from '@/middlewares/webhooks/paymentWebhook';
import { payoutWebhook } from '@/middlewares/webhooks/payoutWebhook';
import { BaseDispersionProvider } from '@/dispersion/BaseDispersionProvider';
import { DispersionTargetStore } from '@/dispersion/DispersionTargetStore';
import { DispersionOrchestrator } from '@/dispersion/DispersionOrchestrator';
import { PolygonDispersionProvider } from '@/dispersion/providers/PolygonDispersionProvider';
import { TronDispersionProvider } from '@/dispersion/providers/TronDispersionProvider';

export * from '@/types';
export * from '@/utils/errors';
export * from '@/constants/statuses';

export {
  createPayment,
  createPaymentByInvoice,
  createInvoicePayment,
  createPayout,
  createPayoutWithDispersion,
  paymentWebhook,
  payoutWebhook,
  BaseDispersionProvider,
  DispersionTargetStore,
  DispersionOrchestrator,
  PolygonDispersionProvider,
  TronDispersionProvider,
};

export const NowPaymentsMiddleware = {
  configure: NowPaymentsConfiguration.configure.bind(NowPaymentsConfiguration),
  createPayment,
  createPaymentByInvoice,
  createInvoicePayment,
  createPayout,
  createPayoutWithDispersion,
  paymentWebhook,
  payoutWebhook,
};
