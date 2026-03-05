import { Request, Response, NextFunction } from 'express';
import { NowPaymentsValidationError } from '@/utils/errors';
import { CreatePayoutWithDispersionMiddlewareOptions } from '@/types';
import { PayoutWithdrawalWithDispersion } from '@/types/api.types';

const mockCreatePayout = jest.fn();
const mockVerifyPayout = jest.fn();

jest.mock('@/client/NowPaymentsClient', () => ({
  NowPaymentsClient: jest.fn().mockImplementation(() => ({
    createPayout: mockCreatePayout,
    verifyPayout: mockVerifyPayout,
  })),
}));

const mockRegisterBatch = jest.fn();

jest.mock('@/dispersion/DispersionTargetStore', () => ({
  DispersionTargetStore: {
    registerBatch: mockRegisterBatch,
    register: jest.fn(),
    get: jest.fn(),
    has: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    reset: jest.fn(),
  },
}));

const mockGetConfig = jest.fn();

jest.mock('@/config/NowPaymentsConfig', () => ({
  NowPaymentsConfiguration: {
    getConfig: mockGetConfig,
    configure: jest.fn(),
    reset: jest.fn(),
  },
}));

jest.mock('@/utils/totp', () => ({
  generateTOTPCode: jest.fn().mockReturnValue('123456'),
}));

import { createPayoutWithDispersion } from '@/middlewares/createPayout';

const makeWithdrawal = (
  overrides: Partial<PayoutWithdrawalWithDispersion> = {}
): PayoutWithdrawalWithDispersion => ({
  address: '0xFROM_ADDRESS',
  currency: 'USDT',
  amount: 10,
  dispersion_network: 'polygon',
  dispersion_final_address: '0xFINAL',
  ...overrides,
});

describe('createPayoutWithDispersion middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {} };
    res = { locals: {} };
    next = jest.fn();
    mockGetConfig.mockReturnValue({ apiKey: 'test-key' });
    mockCreatePayout.mockReset();
    mockVerifyPayout.mockReset();
    mockRegisterBatch.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls next with NowPaymentsValidationError when mapRequest is not provided', async () => {
    const options = {} as CreatePayoutWithDispersionMiddlewareOptions;

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NowPaymentsValidationError));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'mapRequest function is required' })
    );
  });

  it('calls next with NowPaymentsValidationError when withdrawals array is empty', async () => {
    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NowPaymentsValidationError));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'withdrawals array is required and cannot be empty',
      })
    );
  });

  it('calls next with NowPaymentsValidationError when dispersion_network is missing', async () => {
    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({
        withdrawals: [makeWithdrawal({ dispersion_network: '' })],
      }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NowPaymentsValidationError));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Each withdrawal must have dispersion_network and dispersion_final_address',
      })
    );
  });

  it('calls next with NowPaymentsValidationError when dispersion_final_address is missing', async () => {
    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({
        withdrawals: [makeWithdrawal({ dispersion_final_address: '' })],
      }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(NowPaymentsValidationError));
  });

  it('strips dispersion_* fields before calling createPayout API', async () => {
    const withdrawal = makeWithdrawal({
      dispersion_network: 'polygon',
      dispersion_final_address: '0xFINAL',
      dispersion_amount: '10.0',
      dispersion_token: 'USDT',
    });

    mockCreatePayout.mockResolvedValue({
      id: 'payout-001',
      withdrawals: [
        {
          id: 'w-001',
          address: '0xFROM_ADDRESS',
          currency: 'USDT',
          amount: '10',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    });

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    const calledWith = mockCreatePayout.mock.calls[0][0];
    expect(calledWith.withdrawals[0]).not.toHaveProperty('dispersion_network');
    expect(calledWith.withdrawals[0]).not.toHaveProperty(
      'dispersion_final_address'
    );
    expect(calledWith.withdrawals[0]).not.toHaveProperty('dispersion_amount');
    expect(calledWith.withdrawals[0]).not.toHaveProperty('dispersion_token');
    expect(calledWith.withdrawals[0]).toMatchObject({
      address: '0xFROM_ADDRESS',
      currency: 'USDT',
      amount: 10,
    });
  });

  it('auto-maps by index: response.withdrawals[i] maps to fullRequest.withdrawals[i]', async () => {
    const withdrawal0 = makeWithdrawal({
      dispersion_network: 'polygon',
      dispersion_final_address: '0xFINAL_0',
      dispersion_amount: '5.0',
    });
    const withdrawal1 = makeWithdrawal({
      address: '0xFROM_1',
      dispersion_network: 'tron',
      dispersion_final_address: 'TFinal1234567890123456789012345',
      dispersion_amount: '15.0',
    });

    mockCreatePayout.mockResolvedValue({
      id: 'payout-001',
      withdrawals: [
        {
          id: 'w-001',
          address: '0xFROM_ADDRESS',
          currency: 'USDT',
          amount: '10',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'w-002',
          address: '0xFROM_1',
          currency: 'USDT',
          amount: '10',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    });

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal0, withdrawal1] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(mockRegisterBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        withdrawalId: 'w-001',
        network: 'polygon',
        finalAddress: '0xFINAL_0',
        amount: '5.0',
      }),
      expect.objectContaining({
        withdrawalId: 'w-002',
        network: 'tron',
        finalAddress: 'TFinal1234567890123456789012345',
        amount: '15.0',
      }),
    ]);
  });

  it('calls DispersionTargetStore.registerBatch with correct targets', async () => {
    const withdrawal = makeWithdrawal({
      dispersion_network: 'polygon',
      dispersion_final_address: '0xFINAL',
      dispersion_amount: '10.0',
      dispersion_token: 'USDT',
    });

    mockCreatePayout.mockResolvedValue({
      id: 'payout-001',
      withdrawals: [
        {
          id: 'w-999',
          address: '0xFROM_ADDRESS',
          currency: 'USDT',
          amount: '10',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    });

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(mockRegisterBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        withdrawalId: 'w-999',
        network: 'polygon',
        finalAddress: '0xFINAL',
        amount: '10.0',
        tokenCurrency: 'USDT',
      }),
    ]);
  });

  it('uses withdrawal amount and currency from response when dispersion_amount and dispersion_token are not set', async () => {
    const withdrawal = makeWithdrawal({
      dispersion_network: 'polygon',
      dispersion_final_address: '0xFINAL',
    });

    mockCreatePayout.mockResolvedValue({
      id: 'payout-001',
      withdrawals: [
        {
          id: 'w-500',
          address: '0xFROM_ADDRESS',
          currency: 'USDT',
          amount: '10.5',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    });

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(mockRegisterBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        withdrawalId: 'w-500',
        amount: '10.5',
        tokenCurrency: 'USDT',
      }),
    ]);
  });

  it('applies transformResponse when provided and saves result to res.locals', async () => {
    const withdrawal = makeWithdrawal();

    const apiResponse = {
      id: 'payout-001',
      withdrawals: [
        {
          id: 'w-001',
          address: '0xFROM_ADDRESS',
          currency: 'USDT',
          amount: '10',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };

    mockCreatePayout.mockResolvedValue(apiResponse);

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal] }),
      transformResponse: response => ({ payoutId: response.id }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(res.locals!.nowPaymentsResponse).toEqual({ payoutId: 'payout-001' });
    expect(next).toHaveBeenCalled();
  });

  it('saves raw response to res.locals when transformResponse is not provided', async () => {
    const withdrawal = makeWithdrawal();

    const apiResponse = {
      id: 'payout-001',
      withdrawals: [
        {
          id: 'w-001',
          address: '0xFROM_ADDRESS',
          currency: 'USDT',
          amount: '10',
          batch_withdrawal_id: 'batch-001',
          is_request_payouts: true,
          status: 'waiting',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };

    mockCreatePayout.mockResolvedValue(apiResponse);

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(res.locals!.nowPaymentsResponse).toEqual(apiResponse);
    expect(next).toHaveBeenCalled();
  });

  it('calls next with error when createPayout API fails', async () => {
    const withdrawal = makeWithdrawal();
    const apiError = new Error('API failure');

    mockCreatePayout.mockRejectedValue(apiError);

    const options: CreatePayoutWithDispersionMiddlewareOptions = {
      mapRequest: () => ({ withdrawals: [withdrawal] }),
    };

    const middleware = createPayoutWithDispersion(options);
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(apiError);
  });
});
