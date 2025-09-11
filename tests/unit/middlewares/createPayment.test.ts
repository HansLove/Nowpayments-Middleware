import { Request, Response, NextFunction } from 'express';
import { CreatePaymentMiddlewareOptions } from '@/types';
import { NowPaymentsValidationError } from '@/utils/errors';
import { PaymentStatus } from '@/constants/statuses';

// Mock the client before importing the middleware
const mockCreatePayment = jest.fn();
jest.mock('@/client/NowPaymentsClient', () => {
  return {
    NowPaymentsClient: jest.fn().mockImplementation(() => ({
      createPayment: mockCreatePayment,
    })),
  };
});

// Import middleware after mocking
import { createPayment } from '@/middlewares/createPayment';

describe('createPayment middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  beforeEach(() => {
    req = {
      body: {
        amount: 100,
        currency: 'USD',
        cryptoCurrency: 'BTC',
      },
    };
    res = {
      locals: {},
    };
    next = jest.fn();
    
    mockCreatePayment.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create payment and call next', async () => {
    const options: CreatePaymentMiddlewareOptions = {
      mapRequest: (req) => ({
        price_amount: req.body.amount,
        price_currency: req.body.currency,
        pay_currency: req.body.cryptoCurrency,
      }),
    };

    const mockResponse = {
      payment_id: '123456789',
      payment_status: PaymentStatus.WAITING,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      pay_currency: 'BTC',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      purchase_id: '987654321',
      smart_contract: '',
      network: 'BTC',
      network_precision: 8,
    };

    mockCreatePayment.mockResolvedValue(mockResponse);

    const middleware = createPayment(options);
    await middleware(req as Request, res as Response, next);

    expect(mockCreatePayment).toHaveBeenCalledWith({
      price_amount: 100,
      price_currency: 'USD',
      pay_currency: 'BTC',
    });
    expect(res.locals!.nowPaymentsResponse).toEqual(mockResponse);
    expect(next).toHaveBeenCalled();
  });

  it('should transform response when transformResponse is provided', async () => {
    const options: CreatePaymentMiddlewareOptions = {
      mapRequest: (req) => ({
        price_amount: req.body.amount,
        price_currency: req.body.currency,
        pay_currency: req.body.cryptoCurrency,
      }),
      transformResponse: (response) => ({
        id: response.payment_id,
        status: response.payment_status,
        address: response.pay_address,
      }),
    };

    const mockResponse = {
      payment_id: '123456789',
      payment_status: PaymentStatus.WAITING,
      pay_address: 'test-address',
      price_amount: 100,
      price_currency: 'USD',
      pay_amount: 0.001,
      pay_currency: 'BTC',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      purchase_id: '987654321',
      smart_contract: '',
      network: 'BTC',
      network_precision: 8,
    };

    mockCreatePayment.mockResolvedValue(mockResponse);

    const middleware = createPayment(options);
    await middleware(req as Request, res as Response, next);

    expect(res.locals!.nowPaymentsResponse).toEqual({
      id: '123456789',
      status: 'waiting',
      address: 'test-address',
    });
    expect(next).toHaveBeenCalled();
  });

  it('should throw validation error when mapRequest is not provided', async () => {
    const options = {} as CreatePaymentMiddlewareOptions;

    const middleware = createPayment(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NowPaymentsValidationError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'mapRequest function is required',
    }));
  });

  it('should throw validation error when required fields are missing', async () => {
    const options: CreatePaymentMiddlewareOptions = {
      mapRequest: () => ({
        price_amount: 0,
        price_currency: '',
        pay_currency: 'BTC',
      }),
    };

    const middleware = createPayment(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NowPaymentsValidationError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'price_amount, price_currency, and pay_currency are required',
    }));
  });

  it('should handle client errors', async () => {
    const options: CreatePaymentMiddlewareOptions = {
      mapRequest: (req) => ({
        price_amount: req.body.amount,
        price_currency: req.body.currency,
        pay_currency: req.body.cryptoCurrency,
      }),
    };

    const error = new Error('API Error');
    mockCreatePayment.mockRejectedValue(error);

    const middleware = createPayment(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});