import { Request, Response, NextFunction } from 'express';
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  CreatePaymentByInvoiceRequest,
  CreatePaymentByInvoiceResponse,
  CreatePayoutRequest,
  CreatePayoutResponse,
  PaymentWebhookPayload,
  PayoutWebhookPayload,
} from './api.types';

export type ErrorHandlingMode = 'next' | 'direct';

export interface NowPaymentsConfig {
  apiKey: string;
  bearerToken?: string;
  baseURL?: string;
  errorHandling?: ErrorHandlingMode;
}

export interface RequestMapper<T> {
  (req: Request): T;
}

export interface ResponseTransformer<T, U> {
  (response: T): U;
}

export interface CreatePaymentMiddlewareOptions {
  mapRequest: RequestMapper<CreatePaymentRequest>;
  transformResponse?: ResponseTransformer<CreatePaymentResponse, unknown>;
}

export interface CreatePaymentByInvoiceMiddlewareOptions {
  mapRequest: RequestMapper<CreatePaymentByInvoiceRequest>;
  transformResponse?: ResponseTransformer<CreatePaymentByInvoiceResponse, unknown>;
}

export interface CreatePayoutMiddlewareOptions {
  mapRequest: RequestMapper<CreatePayoutRequest>;
  transformResponse?: ResponseTransformer<CreatePayoutResponse, unknown>;
}

export type AsyncCallback<T> = (payload: T) => void | Promise<void>;

export interface PaymentWebhookCallbacks {
  onWaiting?: AsyncCallback<PaymentWebhookPayload>;
  onConfirming?: AsyncCallback<PaymentWebhookPayload>;
  onConfirmed?: AsyncCallback<PaymentWebhookPayload>;
  onSending?: AsyncCallback<PaymentWebhookPayload>;
  onPartiallyPaid?: AsyncCallback<PaymentWebhookPayload>;
  onFinished?: AsyncCallback<PaymentWebhookPayload>;
  onFailed?: AsyncCallback<PaymentWebhookPayload>;
  onExpired?: AsyncCallback<PaymentWebhookPayload>;
  onRefunded?: AsyncCallback<PaymentWebhookPayload>;
}

export interface PayoutWebhookCallbacks {
  onCreating?: AsyncCallback<PayoutWebhookPayload>;
  onWaiting?: AsyncCallback<PayoutWebhookPayload>;
  onProcessing?: AsyncCallback<PayoutWebhookPayload>;
  onSending?: AsyncCallback<PayoutWebhookPayload>;
  onFinished?: AsyncCallback<PayoutWebhookPayload>;
  onFailed?: AsyncCallback<PayoutWebhookPayload>;
  onRejected?: AsyncCallback<PayoutWebhookPayload>;
}

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

declare global {
  namespace Express {
    interface Locals {
      nowPaymentsResponse?: unknown;
    }
  }
}