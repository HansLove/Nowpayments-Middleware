import { checkGasBalance, GasCheckResult } from '@/dispersion/GasChecker';
import { DispersionProvider, GasThreshold } from '@/types/dispersion.types';

function makeMockProvider(nativeBalance: string): DispersionProvider {
  return {
    network: 'polygon',
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    validateAddress: jest.fn().mockReturnValue(true),
    getTokenBalance: jest.fn(),
    getNativeBalance: jest.fn().mockResolvedValue(nativeBalance),
    estimateGasFee: jest.fn(),
    sendToken: jest.fn(),
    getControlledAddress: jest.fn().mockReturnValue('0xCONTROLLED'),
  };
}

describe('checkGasBalance', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns canProceed=true and isLow=false when balance is above minimum', async () => {
    const provider = makeMockProvider('0.5');
    const threshold: GasThreshold = {
      minimum: '0.1',
      critical: '0.05',
      currency: 'MATIC',
    };

    const result: GasCheckResult = await checkGasBalance(provider, threshold);

    expect(result.canProceed).toBe(true);
    expect(result.isLow).toBe(false);
    expect(result.isCritical).toBe(false);
    expect(result.currentBalance).toBe('0.5');
  });

  it('returns canProceed=false and isCritical=true when balance is below critical', async () => {
    const provider = makeMockProvider('0.02');
    const threshold: GasThreshold = {
      minimum: '0.1',
      critical: '0.05',
      currency: 'MATIC',
    };

    const result: GasCheckResult = await checkGasBalance(provider, threshold);

    expect(result.canProceed).toBe(false);
    expect(result.isCritical).toBe(true);
    expect(result.isLow).toBe(true);
    expect(result.currentBalance).toBe('0.02');
  });

  it('returns isLow=true and canProceed=true when balance is between critical and minimum', async () => {
    const provider = makeMockProvider('0.08');
    const threshold: GasThreshold = {
      minimum: '0.1',
      critical: '0.05',
      currency: 'MATIC',
    };

    const result: GasCheckResult = await checkGasBalance(provider, threshold);

    expect(result.isLow).toBe(true);
    expect(result.canProceed).toBe(true);
    expect(result.isCritical).toBe(false);
    expect(result.currentBalance).toBe('0.08');
  });

  it('returns isLow=false when balance equals minimum', async () => {
    const provider = makeMockProvider('0.1');
    const threshold: GasThreshold = {
      minimum: '0.1',
      critical: '0.05',
      currency: 'MATIC',
    };

    const result: GasCheckResult = await checkGasBalance(provider, threshold);

    expect(result.isLow).toBe(false);
    expect(result.canProceed).toBe(true);
  });

  it('calls getControlledAddress and getNativeBalance on the provider', async () => {
    const provider = makeMockProvider('0.5');
    const threshold: GasThreshold = {
      minimum: '0.1',
      critical: '0.05',
      currency: 'MATIC',
    };

    await checkGasBalance(provider, threshold);

    expect(provider.getControlledAddress).toHaveBeenCalled();
    expect(provider.getNativeBalance).toHaveBeenCalledWith('0xCONTROLLED');
  });

  it('returns currentBalance from provider', async () => {
    const provider = makeMockProvider('1.23456');
    const threshold: GasThreshold = {
      minimum: '0.1',
      critical: '0.05',
      currency: 'MATIC',
    };

    const result: GasCheckResult = await checkGasBalance(provider, threshold);

    expect(result.currentBalance).toBe('1.23456');
  });
});
