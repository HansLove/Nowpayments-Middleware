import { Request, Response, NextFunction } from 'express';
import { PayoutWebhookCallbacks, PayoutWebhookPayload } from '@/types';
import { PayoutStatus } from '@/constants/statuses';

const mockDisperse = jest.fn();

jest.mock('@/dispersion/DispersionOrchestrator', () => ({
  DispersionOrchestrator: {
    disperse: mockDisperse,
    initialize: jest.fn(),
    shutdown: jest.fn(),
    reset: jest.fn(),
  },
}));

const mockDispersionStoreGet = jest.fn();

jest.mock('@/dispersion/DispersionTargetStore', () => ({
  DispersionTargetStore: {
    get: mockDispersionStoreGet,
    has: jest.fn(),
    register: jest.fn(),
    registerBatch: jest.fn(),
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

import { payoutWebhook } from '@/middlewares/webhooks/payoutWebhook';

const makePayload = (
  status: PayoutStatus,
  id: string = 'w-001'
): PayoutWebhookPayload => ({
  id,
  batch_withdrawal_id: 'batch-001',
  status,
  currency: 'USDT',
  amount: '10.0',
  address: '0xFROM_ADDRESS',
  created_at: '2024-01-01T00:00:00Z',
});

describe('payoutWebhook middleware (dispersion)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {} };
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    mockGetConfig.mockReturnValue({ apiKey: 'test-key' });
    mockDisperse.mockResolvedValue({
      status: 'sent',
      txHash: '0xTX',
      estimatedGasFee: '0.005',
    });
    mockDispersionStoreGet.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('callback execution order', () => {
    it('executes onFinished callback BEFORE triggering dispersion', async () => {
      const callOrder: string[] = [];

      const mockTarget = {
        withdrawalId: 'w-001',
        network: 'polygon',
        finalAddress: '0xFINAL',
        amount: '10.0',
        tokenCurrency: 'USDT',
      };

      mockGetConfig.mockReturnValue({
        apiKey: 'test-key',
        dispersion: { providers: [] },
      });
      mockDispersionStoreGet.mockReturnValue(mockTarget);
      mockDisperse.mockImplementation(async () => {
        callOrder.push('disperse');
        return { status: 'sent', txHash: '0xTX', estimatedGasFee: '0.005' };
      });

      const onFinished = jest.fn().mockImplementation(async () => {
        callOrder.push('onFinished');
      });

      const callbacks: PayoutWebhookCallbacks = { onFinished };
      req.body = makePayload(PayoutStatus.FINISHED);

      const middleware = payoutWebhook(callbacks);
      await middleware(req as Request, res as Response, next);

      expect(callOrder.indexOf('onFinished')).toBeLessThan(
        callOrder.indexOf('disperse')
      );
    });
  });

  describe('dispersion triggering', () => {
    it('triggers dispersion when config.dispersion is set and target exists in store', async () => {
      const mockTarget = {
        withdrawalId: 'w-001',
        network: 'polygon',
        finalAddress: '0xFINAL',
        amount: '10.0',
        tokenCurrency: 'USDT',
      };

      mockGetConfig.mockReturnValue({
        apiKey: 'test-key',
        dispersion: { providers: [] },
      });
      mockDispersionStoreGet.mockReturnValue(mockTarget);

      req.body = makePayload(PayoutStatus.FINISHED, 'w-001');

      const middleware = payoutWebhook({});
      await middleware(req as Request, res as Response, next);

      expect(mockDispersionStoreGet).toHaveBeenCalledWith('w-001');
      expect(mockDisperse).toHaveBeenCalledWith(mockTarget);
    });

    it('does NOT trigger dispersion when config.dispersion is NOT set', async () => {
      mockGetConfig.mockReturnValue({ apiKey: 'test-key' });

      req.body = makePayload(PayoutStatus.FINISHED, 'w-001');

      const middleware = payoutWebhook({});
      await middleware(req as Request, res as Response, next);

      expect(mockDisperse).not.toHaveBeenCalled();
    });

    it('does NOT trigger dispersion when no target is found in store for the payload id', async () => {
      mockGetConfig.mockReturnValue({
        apiKey: 'test-key',
        dispersion: { providers: [] },
      });
      mockDispersionStoreGet.mockReturnValue(undefined);

      req.body = makePayload(PayoutStatus.FINISHED, 'w-no-target');

      const middleware = payoutWebhook({});
      await middleware(req as Request, res as Response, next);

      expect(mockDisperse).not.toHaveBeenCalled();
    });

    it('returns 200 OK even when dispersion fails', async () => {
      const mockTarget = {
        withdrawalId: 'w-001',
        network: 'polygon',
        finalAddress: '0xFINAL',
        amount: '10.0',
        tokenCurrency: 'USDT',
      };

      mockGetConfig.mockReturnValue({
        apiKey: 'test-key',
        dispersion: { providers: [] },
      });
      mockDispersionStoreGet.mockReturnValue(mockTarget);
      mockDisperse.mockRejectedValue(new Error('Dispersion network error'));

      req.body = makePayload(PayoutStatus.FINISHED, 'w-001');

      const middleware = payoutWebhook({});
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('other statuses do NOT trigger dispersion', () => {
    const nonDispersionStatuses = [
      PayoutStatus.WAITING,
      PayoutStatus.PROCESSING,
      PayoutStatus.SENDING,
      PayoutStatus.FAILED,
      PayoutStatus.REJECTED,
      PayoutStatus.CREATING,
    ];

    nonDispersionStatuses.forEach(status => {
      it(`does not trigger dispersion for status "${status}"`, async () => {
        mockGetConfig.mockReturnValue({
          apiKey: 'test-key',
          dispersion: { providers: [] },
        });

        req.body = makePayload(status);

        const middleware = payoutWebhook({});
        await middleware(req as Request, res as Response, next);

        expect(mockDisperse).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
      });
    });
  });

  describe('standard webhook behavior', () => {
    it('calls onFinished callback for finished status', async () => {
      const onFinished = jest.fn();
      const callbacks: PayoutWebhookCallbacks = { onFinished };

      const payload = makePayload(PayoutStatus.FINISHED);
      req.body = payload;

      const middleware = payoutWebhook(callbacks);
      await middleware(req as Request, res as Response, next);

      expect(onFinished).toHaveBeenCalledWith(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('calls onFailed callback for failed status', async () => {
      const onFailed = jest.fn();
      const callbacks: PayoutWebhookCallbacks = { onFailed };

      const payload = makePayload(PayoutStatus.FAILED);
      req.body = payload;

      const middleware = payoutWebhook(callbacks);
      await middleware(req as Request, res as Response, next);

      expect(onFailed).toHaveBeenCalledWith(payload);
      expect(mockDisperse).not.toHaveBeenCalled();
    });

    it('calls onWaiting callback for waiting status', async () => {
      const onWaiting = jest.fn();
      const callbacks: PayoutWebhookCallbacks = { onWaiting };

      const payload = makePayload(PayoutStatus.WAITING);
      req.body = payload;

      const middleware = payoutWebhook(callbacks);
      await middleware(req as Request, res as Response, next);

      expect(onWaiting).toHaveBeenCalledWith(payload);
    });

    it('saves payload to res.locals', async () => {
      const payload = makePayload(PayoutStatus.FINISHED);
      req.body = payload;

      const middleware = payoutWebhook({});
      await middleware(req as Request, res as Response, next);

      expect(res.locals!.nowPaymentsResponse).toEqual(payload);
    });

    it('handles callback errors and calls next with the error', async () => {
      const callbackError = new Error('Callback failure');
      const onFinished = jest.fn().mockRejectedValue(callbackError);
      const callbacks: PayoutWebhookCallbacks = { onFinished };

      req.body = makePayload(PayoutStatus.FINISHED);

      const middleware = payoutWebhook(callbacks);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(callbackError);
    });
  });
});
