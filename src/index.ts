import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { createPayment } from '@/middlewares/createPayment';
import { createPaymentByInvoice } from '@/middlewares/createPaymentByInvoice';
import { createPayout } from '@/middlewares/createPayout';
import { paymentWebhook } from '@/middlewares/webhooks/paymentWebhook';
import { payoutWebhook } from '@/middlewares/webhooks/payoutWebhook';

export * from '@/types';
export * from '@/utils/errors';
export * from '@/constants/statuses';

export {
  createPayment,
  createPaymentByInvoice,
  createPayout,
  paymentWebhook,
  payoutWebhook,
};

export const NowPaymentsMiddleware = {
  configure: NowPaymentsConfiguration.configure.bind(NowPaymentsConfiguration),
  createPayment,
  createPaymentByInvoice,
  createPayout,
  paymentWebhook,
  payoutWebhook,
};