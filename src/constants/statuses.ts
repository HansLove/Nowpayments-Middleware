export enum PaymentStatus {
  WAITING = 'waiting',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  SENDING = 'sending',
  PARTIALLY_PAID = 'partially_paid',
  FINISHED = 'finished',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum InvoiceStatus {
  WAITING = 'waiting',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  SENDING = 'sending',
  PARTIALLY_PAID = 'partially_paid',
  FINISHED = 'finished',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

export enum PayoutStatus {
  CREATING = 'creating',
  WAITING = 'waiting',
  PROCESSING = 'processing',
  SENDING = 'sending',
  FINISHED = 'finished',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

export const ALL_PAYMENT_STATUSES = Object.values(PaymentStatus);
export const ALL_INVOICE_STATUSES = Object.values(InvoiceStatus);
export const ALL_PAYOUT_STATUSES = Object.values(PayoutStatus);