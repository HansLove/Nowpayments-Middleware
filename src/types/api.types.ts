import { PaymentStatus, InvoiceStatus, PayoutStatus } from '@/constants/statuses';

export interface CreatePaymentRequest {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  ipn_callback_url?: string;
  order_id?: string;
  order_description?: string;
  customer_email?: string;
}

export interface CreatePaymentResponse {
  payment_id: string;
  payment_status: PaymentStatus;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id?: string;
  order_description?: string;
  ipn_callback_url?: string;
  created_at: string;
  updated_at: string;
  purchase_id: string;
  amount_received?: number;
  payin_extra_id?: string;
  smart_contract: string;
  network: string;
  network_precision: number;
  time_limit?: number;
  burning_percent?: number;
  expiration_estimate_date?: string;
}

export interface CreatePaymentByInvoiceRequest {
  iid: string | number;
  pay_currency: string;
  purchase_id?: string | number;
  order_description?: string;
  customer_email?: string;
  payout_address?: string;
  payout_extra_id?: string;
  payout_currency?: string;
}

export type CreatePaymentByInvoiceResponse = CreatePaymentResponse;

export interface PayoutWithdrawal {
  address: string;
  currency: string;
  amount: number;
  fiat_amount?: number;
  fiat_currency?: string;
  ipn_callback_url?: string;
}

export interface CreatePayoutRequest {
  ipn_callback_url?: string;
  withdrawals: PayoutWithdrawal[];
}

export interface PayoutWithdrawalResponse {
  is_request_payouts: boolean;
  id: string;
  address: string;
  currency: string;
  amount: string;
  fiat_amount?: string;
  fiat_currency?: string;
  batch_withdrawal_id: string;
  ipn_callback_url?: string;
  status: PayoutStatus;
  extra_id?: string;
  hash?: string;
  error?: string;
  payout_description?: string;
  unique_external_id?: string;
  created_at: string;
  requested_at?: string;
  updated_at?: string;
}

export interface CreatePayoutResponse {
  id: string;
  withdrawals: PayoutWithdrawalResponse[];
}

export interface VerifyPayoutRequest {
  verification_code: string;
}

export type VerifyPayoutResponse = string;

export interface PaymentWebhookPayload {
  payment_id: number;
  parent_payment_id?: number;
  invoice_id?: number;
  payment_status: PaymentStatus | InvoiceStatus;
  pay_address: string;
  payin_extra_id?: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  actually_paid_at_fiat: number;
  pay_currency: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  outcome_amount: number;
  outcome_currency: string;
  payment_extra_ids?: string;
  fee?: {
    currency: string;
    depositFee: number;
    withdrawalFee: number;
    serviceFee: number;
  };
}

export interface PayoutWebhookPayload {
  id: string;
  batch_withdrawal_id: string;
  status: PayoutStatus;
  error?: string;
  currency: string;
  amount: string;
  address: string;
  fee?: string;
  extra_id?: string;
  hash?: string;
  ipn_callback_url?: string;
  created_at: string;
  requested_at?: string;
  updated_at?: string;
}