import { Request, Response, NextFunction } from 'express';
import { paymentWebhook } from '@/middlewares/webhooks/paymentWebhook';
import { PaymentWebhookCallbacks, PaymentWebhookPayload } from '@/types';
import { PaymentStatus } from '@/constants/statuses';

describe('paymentWebhook middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call onWaiting callback for waiting status', async () => {
    const onWaiting = jest.fn();
    const callbacks: PaymentWebhookCallbacks = { onWaiting };

    const payload: PaymentWebhookPayload = {
      payment_id: 123456789,
      payment_status: PaymentStatus.WAITING,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      actually_paid: 0.001,
      actually_paid_at_fiat: 100,
      pay_currency: 'BTC',
      outcome_amount: 0.001,
      outcome_currency: 'BTC',
    };

    req.body = payload;

    const middleware = paymentWebhook(callbacks);
    await middleware(req as Request, res as Response, next);

    expect(onWaiting).toHaveBeenCalledWith(payload);
    expect(res.locals!.nowPaymentsResponse).toEqual(payload);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('should call onFinished callback for finished status', async () => {
    const onFinished = jest.fn();
    const callbacks: PaymentWebhookCallbacks = { onFinished };

    const payload: PaymentWebhookPayload = {
      payment_id: 123456789,
      payment_status: PaymentStatus.FINISHED,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      actually_paid: 0.001,
      actually_paid_at_fiat: 100,
      pay_currency: 'BTC',
      outcome_amount: 0.001,
      outcome_currency: 'BTC',
    };

    req.body = payload;

    const middleware = paymentWebhook(callbacks);
    await middleware(req as Request, res as Response, next);

    expect(onFinished).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('should handle multiple callbacks', async () => {
    const onConfirming = jest.fn();
    const onConfirmed = jest.fn();
    
    const callbacks: PaymentWebhookCallbacks = { 
      onConfirming,
      onConfirmed,
    };

    const payload: PaymentWebhookPayload = {
      payment_id: 123456789,
      payment_status: PaymentStatus.CONFIRMING,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      actually_paid: 0.001,
      actually_paid_at_fiat: 100,
      pay_currency: 'BTC',
      outcome_amount: 0.001,
      outcome_currency: 'BTC',
    };

    req.body = payload;

    const middleware = paymentWebhook(callbacks);
    await middleware(req as Request, res as Response, next);

    expect(onConfirming).toHaveBeenCalledWith(payload);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('should handle unknown status gracefully', async () => {
    const onWaiting = jest.fn();
    const callbacks: PaymentWebhookCallbacks = { onWaiting };

    const payload = {
      payment_id: 123456789,
      payment_status: 'unknown_status' as any,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      actually_paid: 0.001,
      actually_paid_at_fiat: 100,
      pay_currency: 'BTC',
      outcome_amount: 0.001,
      outcome_currency: 'BTC',
    };

    req.body = payload;

    const middleware = paymentWebhook(callbacks);
    await middleware(req as Request, res as Response, next);

    expect(onWaiting).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('should handle async callbacks', async () => {
    const onFinished = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    const callbacks: PaymentWebhookCallbacks = { onFinished };

    const payload: PaymentWebhookPayload = {
      payment_id: 123456789,
      payment_status: PaymentStatus.FINISHED,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      actually_paid: 0.001,
      actually_paid_at_fiat: 100,
      pay_currency: 'BTC',
      outcome_amount: 0.001,
      outcome_currency: 'BTC',
    };

    req.body = payload;

    const middleware = paymentWebhook(callbacks);
    await middleware(req as Request, res as Response, next);

    expect(onFinished).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should handle callback errors', async () => {
    const error = new Error('Callback error');
    const onWaiting = jest.fn().mockRejectedValue(error);
    
    const callbacks: PaymentWebhookCallbacks = { onWaiting };

    const payload: PaymentWebhookPayload = {
      payment_id: 123456789,
      payment_status: PaymentStatus.WAITING,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      actually_paid: 0.001,
      actually_paid_at_fiat: 100,
      pay_currency: 'BTC',
      outcome_amount: 0.001,
      outcome_currency: 'BTC',
    };

    req.body = payload;

    const middleware = paymentWebhook(callbacks);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});