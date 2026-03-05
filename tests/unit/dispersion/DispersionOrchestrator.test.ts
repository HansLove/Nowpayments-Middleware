import { DispersionOrchestrator } from '@/dispersion/DispersionOrchestrator';
import { DispersionTargetStore } from '@/dispersion/DispersionTargetStore';
import {
  DispersionProvider,
  DispersionTarget,
  DispersionConfig,
  GasThreshold,
} from '@/types/dispersion.types';

function makeMockProvider(network: string): jest.Mocked<DispersionProvider> {
  return {
    network,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    validateAddress: jest.fn().mockReturnValue(true),
    getTokenBalance: jest.fn().mockResolvedValue('100.0'),
    getNativeBalance: jest.fn().mockResolvedValue('1.0'),
    estimateGasFee: jest.fn().mockResolvedValue('0.005'),
    sendToken: jest.fn().mockResolvedValue('0xTX_HASH_ABC'),
    getControlledAddress: jest.fn().mockReturnValue('0xCONTROLLED'),
  };
}

function makeTarget(network: string = 'polygon'): DispersionTarget {
  return {
    withdrawalId: 'w-001',
    network,
    finalAddress: '0xFINAL_ADDRESS',
    amount: '10.0',
    tokenCurrency: 'USDT',
  };
}

describe('DispersionOrchestrator', () => {
  beforeEach(() => {
    DispersionOrchestrator.reset();
    DispersionTargetStore.reset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialize()', () => {
    it('connects all providers and maps them by network', async () => {
      const polygonProvider = makeMockProvider('polygon');
      const tronProvider = makeMockProvider('tron');

      const config: DispersionConfig = {
        providers: [polygonProvider, tronProvider],
      };

      await DispersionOrchestrator.initialize(config);

      expect(polygonProvider.connect).toHaveBeenCalledTimes(1);
      expect(tronProvider.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disperse()', () => {
    it('returns status sent with txHash and estimatedGasFee on success', async () => {
      const provider = makeMockProvider('polygon');
      provider.estimateGasFee.mockResolvedValue('0.005');
      provider.sendToken.mockResolvedValue('0xSUCCESS_HASH');

      await DispersionOrchestrator.initialize({ providers: [provider] });

      const target = makeTarget('polygon');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('sent');
      if (result.status === 'sent') {
        expect(result.txHash).toBe('0xSUCCESS_HASH');
        expect(result.estimatedGasFee).toBe('0.005');
      }
    });

    it('calls estimateGasFee and sendToken on the provider', async () => {
      const provider = makeMockProvider('polygon');

      await DispersionOrchestrator.initialize({ providers: [provider] });

      const target = makeTarget('polygon');
      await DispersionOrchestrator.disperse(target);

      expect(provider.estimateGasFee).toHaveBeenCalledWith(
        target.finalAddress,
        target.amount
      );
      expect(provider.sendToken).toHaveBeenCalledWith(
        target.finalAddress,
        target.amount
      );
    });

    it('invokes onStatusChange and onDispersionSent callbacks on success', async () => {
      const provider = makeMockProvider('polygon');
      const onStatusChange = jest.fn().mockResolvedValue(undefined);
      const onDispersionSent = jest.fn().mockResolvedValue(undefined);

      await DispersionOrchestrator.initialize({
        providers: [provider],
        callbacks: { onStatusChange, onDispersionSent },
      });

      const target = makeTarget('polygon');
      await DispersionOrchestrator.disperse(target);

      expect(onStatusChange).toHaveBeenCalled();
      expect(onDispersionSent).toHaveBeenCalledWith(
        target.withdrawalId,
        '0xTX_HASH_ABC',
        'polygon'
      );
    });

    it('returns status failed when no provider is registered for the network', async () => {
      await DispersionOrchestrator.initialize({ providers: [] });

      const target = makeTarget('unknown-network');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('failed');
      if (result.status === 'failed') {
        expect(result.error).toContain('unknown-network');
      }
    });

    it('invokes onDispersionFailed when no provider found for network', async () => {
      const onDispersionFailed = jest.fn().mockResolvedValue(undefined);

      await DispersionOrchestrator.initialize({
        providers: [],
        callbacks: { onDispersionFailed },
      });

      const target = makeTarget('missing-net');
      await DispersionOrchestrator.disperse(target);

      expect(onDispersionFailed).toHaveBeenCalledWith(
        target.withdrawalId,
        expect.stringContaining('missing-net'),
        'missing-net'
      );
    });

    it('returns status failed and calls onGasCritical when gas is critical', async () => {
      const provider = makeMockProvider('polygon');
      provider.getNativeBalance.mockResolvedValue('0.02');

      const onGasCritical = jest.fn().mockResolvedValue(undefined);
      const onDispersionFailed = jest.fn().mockResolvedValue(undefined);

      const threshold: GasThreshold = {
        minimum: '0.1',
        critical: '0.05',
        currency: 'MATIC',
      };

      await DispersionOrchestrator.initialize({
        providers: [provider],
        callbacks: { onGasCritical, onDispersionFailed },
        gasThresholds: { polygon: threshold },
      });

      const target = makeTarget('polygon');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('failed');
      expect(onGasCritical).toHaveBeenCalledWith('polygon', '0.02', threshold);
      expect(onDispersionFailed).toHaveBeenCalled();
    });

    it('returns status failed when sendToken throws', async () => {
      const provider = makeMockProvider('polygon');
      provider.sendToken.mockRejectedValue(new Error('Network error'));

      await DispersionOrchestrator.initialize({ providers: [provider] });

      const target = makeTarget('polygon');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('failed');
      if (result.status === 'failed') {
        expect(result.error).toBe('Network error');
      }
    });

    it('does not propagate errors thrown inside onStatusChange callback', async () => {
      const provider = makeMockProvider('polygon');
      const onStatusChange = jest
        .fn()
        .mockRejectedValue(new Error('Callback exploded'));

      await DispersionOrchestrator.initialize({
        providers: [provider],
        callbacks: { onStatusChange },
      });

      const target = makeTarget('polygon');
      await expect(
        DispersionOrchestrator.disperse(target)
      ).resolves.not.toThrow();
    });

    it('does not propagate errors thrown inside onDispersionSent callback', async () => {
      const provider = makeMockProvider('polygon');
      const onDispersionSent = jest
        .fn()
        .mockRejectedValue(new Error('Sent callback failed'));

      await DispersionOrchestrator.initialize({
        providers: [provider],
        callbacks: { onDispersionSent },
      });

      const target = makeTarget('polygon');
      await expect(
        DispersionOrchestrator.disperse(target)
      ).resolves.not.toThrow();
    });

    it('removes the target from store on successful send', async () => {
      const provider = makeMockProvider('polygon');

      await DispersionOrchestrator.initialize({ providers: [provider] });

      const target = makeTarget('polygon');
      DispersionTargetStore.register(target);

      await DispersionOrchestrator.disperse(target);

      expect(DispersionTargetStore.has(target.withdrawalId)).toBe(false);
    });

    it('works without gasThresholds configured (backward compatibility)', async () => {
      const provider = makeMockProvider('polygon');

      await DispersionOrchestrator.initialize({
        providers: [provider],
      });

      const target = makeTarget('polygon');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('sent');
      expect(provider.getNativeBalance).not.toHaveBeenCalled();
    });

    it('invokes onGasLow callback when balance is low but not critical', async () => {
      const provider = makeMockProvider('polygon');
      provider.getNativeBalance.mockResolvedValue('0.08');

      const onGasLow = jest.fn().mockResolvedValue(undefined);
      const threshold: GasThreshold = {
        minimum: '0.1',
        critical: '0.05',
        currency: 'MATIC',
      };

      await DispersionOrchestrator.initialize({
        providers: [provider],
        callbacks: { onGasLow },
        gasThresholds: { polygon: threshold },
      });

      const target = makeTarget('polygon');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('sent');
      expect(onGasLow).toHaveBeenCalledWith('polygon', '0.08', threshold);
    });
  });

  describe('shutdown()', () => {
    it('calls disconnect on all providers', async () => {
      const polygonProvider = makeMockProvider('polygon');
      const tronProvider = makeMockProvider('tron');

      await DispersionOrchestrator.initialize({
        providers: [polygonProvider, tronProvider],
      });

      await DispersionOrchestrator.shutdown();

      expect(polygonProvider.disconnect).toHaveBeenCalledTimes(1);
      expect(tronProvider.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset()', () => {
    it('clears providers so disperse returns failed for previously registered network', async () => {
      const provider = makeMockProvider('polygon');
      await DispersionOrchestrator.initialize({ providers: [provider] });

      DispersionOrchestrator.reset();

      const target = makeTarget('polygon');
      const result = await DispersionOrchestrator.disperse(target);

      expect(result.status).toBe('failed');
    });
  });
});
