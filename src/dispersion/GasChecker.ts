import { DispersionProvider, GasThreshold } from '@/types/dispersion.types';

export interface GasCheckResult {
  canProceed: boolean;
  isLow: boolean;
  isCritical: boolean;
  currentBalance: string;
}

export async function checkGasBalance(
  provider: DispersionProvider,
  threshold: GasThreshold
): Promise<GasCheckResult> {
  const controlledAddress = provider.getControlledAddress();
  const currentBalance = await provider.getNativeBalance(controlledAddress);

  const balanceFloat = parseFloat(currentBalance);
  const minimumFloat = parseFloat(threshold.minimum);
  const criticalFloat = parseFloat(threshold.critical);

  const isCritical = balanceFloat < criticalFloat;
  const isLow = balanceFloat < minimumFloat;
  const canProceed = !isCritical;

  return {
    canProceed,
    isLow,
    isCritical,
    currentBalance,
  };
}
