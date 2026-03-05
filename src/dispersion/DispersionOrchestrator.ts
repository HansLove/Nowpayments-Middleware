import {
  DispersionConfig,
  DispersionProvider,
  DispersionResult,
  DispersionTarget,
  GasThreshold,
} from '@/types/dispersion.types';
import { DispersionStatus } from '@/constants/statuses';
import { DispersionTargetStore } from '@/dispersion/DispersionTargetStore';
import { checkGasBalance } from '@/dispersion/GasChecker';

class DispersionOrchestratorSingleton {
  private static instance: DispersionOrchestratorSingleton;
  private providers: Map<string, DispersionProvider> = new Map();
  private config: DispersionConfig | null = null;

  private constructor() {}

  static getInstance(): DispersionOrchestratorSingleton {
    if (!DispersionOrchestratorSingleton.instance) {
      DispersionOrchestratorSingleton.instance =
        new DispersionOrchestratorSingleton();
    }
    return DispersionOrchestratorSingleton.instance;
  }

  async initialize(config: DispersionConfig): Promise<void> {
    this.config = config;
    this.providers.clear();

    for (const provider of config.providers) {
      await provider.connect();
      this.providers.set(provider.network, provider);
    }
  }

  async disperse(target: DispersionTarget): Promise<DispersionResult> {
    const provider = this.providers.get(target.network);

    if (!provider) {
      const error = `disperse: no provider registered for network "${target.network}"`;
      await this.invokeOnStatusChange(
        target.withdrawalId,
        null,
        DispersionStatus.FAILED,
        {
          network: target.network,
          amount: target.amount,
          tokenCurrency: target.tokenCurrency,
          error,
        }
      );
      await this.invokeOnDispersionFailed(
        target.withdrawalId,
        error,
        target.network
      );
      return { status: 'failed', error };
    }

    await this.invokeOnStatusChange(
      target.withdrawalId,
      null,
      DispersionStatus.PENDING,
      {
        network: target.network,
        amount: target.amount,
        tokenCurrency: target.tokenCurrency,
      }
    );
    await this.invokeOnDispersionStart(
      target.withdrawalId,
      target,
      target.network
    );

    const gasThreshold = this.config?.gasThresholds?.[target.network];
    if (gasThreshold) {
      const gasCheck = await checkGasBalance(provider, gasThreshold);

      if (gasCheck.isLow && !gasCheck.isCritical) {
        await this.invokeOnGasLow(
          target.network,
          gasCheck.currentBalance,
          gasThreshold
        );
      }

      if (gasCheck.isCritical) {
        await this.invokeOnGasCritical(
          target.network,
          gasCheck.currentBalance,
          gasThreshold
        );
        const error = `disperse: gas balance critical on "${target.network}": ${gasCheck.currentBalance} ${gasThreshold.currency}`;
        await this.invokeOnStatusChange(
          target.withdrawalId,
          DispersionStatus.PENDING,
          DispersionStatus.FAILED,
          {
            network: target.network,
            amount: target.amount,
            tokenCurrency: target.tokenCurrency,
            error,
          }
        );
        await this.invokeOnDispersionFailed(
          target.withdrawalId,
          error,
          target.network
        );
        return { status: 'failed', error };
      }
    }

    await this.invokeOnStatusChange(
      target.withdrawalId,
      DispersionStatus.PENDING,
      DispersionStatus.PROCESSING,
      {
        network: target.network,
        amount: target.amount,
        tokenCurrency: target.tokenCurrency,
      }
    );

    try {
      const estimatedGasFee = await provider.estimateGasFee(
        target.finalAddress,
        target.amount
      );
      const txHash = await provider.sendToken(
        target.finalAddress,
        target.amount
      );

      await this.invokeOnStatusChange(
        target.withdrawalId,
        DispersionStatus.PROCESSING,
        DispersionStatus.SENT,
        {
          network: target.network,
          amount: target.amount,
          tokenCurrency: target.tokenCurrency,
          txHash,
          estimatedGasFee,
        }
      );
      await this.invokeOnDispersionSent(
        target.withdrawalId,
        txHash,
        target.network
      );

      DispersionTargetStore.remove(target.withdrawalId);

      return { status: 'sent', txHash, estimatedGasFee };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await this.invokeOnStatusChange(
        target.withdrawalId,
        DispersionStatus.PROCESSING,
        DispersionStatus.FAILED,
        {
          network: target.network,
          amount: target.amount,
          tokenCurrency: target.tokenCurrency,
          error,
        }
      );
      await this.invokeOnDispersionFailed(
        target.withdrawalId,
        error,
        target.network
      );
      return { status: 'failed', error };
    }
  }

  async shutdown(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.disconnect();
    }
    this.providers.clear();
  }

  reset(): void {
    this.providers.clear();
    this.config = null;
  }

  // --- Private callback invokers (silent error handling) ---

  private async invokeOnStatusChange(
    withdrawalId: string,
    previousStatus: DispersionStatus | null,
    currentStatus: DispersionStatus,
    context: {
      network: string;
      amount: string;
      tokenCurrency: string;
      txHash?: string;
      estimatedGasFee?: string;
      error?: string;
    }
  ): Promise<void> {
    if (!this.config?.callbacks?.onStatusChange) return;
    try {
      await this.config.callbacks.onStatusChange(
        withdrawalId,
        previousStatus,
        currentStatus,
        context
      );
    } catch (_err) {
      // Callback errors must not propagate
    }
  }

  private async invokeOnDispersionStart(
    withdrawalId: string,
    target: DispersionTarget,
    network: string
  ): Promise<void> {
    if (!this.config?.callbacks?.onDispersionStart) return;
    try {
      await this.config.callbacks.onDispersionStart(
        withdrawalId,
        target,
        network
      );
    } catch (_err) {
      // Callback errors must not propagate
    }
  }

  private async invokeOnDispersionSent(
    withdrawalId: string,
    txHash: string,
    network: string
  ): Promise<void> {
    if (!this.config?.callbacks?.onDispersionSent) return;
    try {
      await this.config.callbacks.onDispersionSent(
        withdrawalId,
        txHash,
        network
      );
    } catch (_err) {
      // Callback errors must not propagate
    }
  }

  private async invokeOnDispersionFailed(
    withdrawalId: string,
    error: string,
    network: string
  ): Promise<void> {
    if (!this.config?.callbacks?.onDispersionFailed) return;
    try {
      await this.config.callbacks.onDispersionFailed(
        withdrawalId,
        error,
        network
      );
    } catch (_err) {
      // Callback errors must not propagate
    }
  }

  private async invokeOnGasLow(
    network: string,
    currentBalance: string,
    threshold: GasThreshold
  ): Promise<void> {
    if (!this.config?.callbacks?.onGasLow) return;
    try {
      await this.config.callbacks.onGasLow(network, currentBalance, threshold);
    } catch (_err) {
      // Callback errors must not propagate
    }
  }

  private async invokeOnGasCritical(
    network: string,
    currentBalance: string,
    threshold: GasThreshold
  ): Promise<void> {
    if (!this.config?.callbacks?.onGasCritical) return;
    try {
      await this.config.callbacks.onGasCritical(
        network,
        currentBalance,
        threshold
      );
    } catch (_err) {
      // Callback errors must not propagate
    }
  }
}

export const DispersionOrchestrator =
  DispersionOrchestratorSingleton.getInstance();
