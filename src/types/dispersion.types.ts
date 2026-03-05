import { DispersionStatus } from '@/constants/statuses';

// --- Provider Config ---

export interface BaseProviderConfig {
  network: string;
  controlledAddress: string;
  privateKey: string;
  tokenContractAddress: string;
  tokenDecimals: number;
}

export interface EvmProviderConfig extends BaseProviderConfig {
  rpcUrl: string;
}

export interface TronProviderConfig extends BaseProviderConfig {
  fullNode: string;
  apiKey?: string;
}

// --- Dispersion Status (discriminated union) ---

export interface DispersionSent {
  status: 'sent';
  txHash: string;
  estimatedGasFee: string;
}

export interface DispersionFailed {
  status: 'failed';
  error: string;
}

export type DispersionResult = DispersionSent | DispersionFailed;

// --- Provider Interface (Bridge abstraction) ---

export interface DispersionProvider {
  readonly network: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  validateAddress(address: string): boolean;
  getTokenBalance(address: string): Promise<string>;
  getNativeBalance(address: string): Promise<string>;
  estimateGasFee(toAddress: string, amount: string): Promise<string>;
  sendToken(toAddress: string, amount: string): Promise<string>;
  getControlledAddress(): string;
}

// --- Dispersion Target ---

export interface DispersionTarget {
  withdrawalId: string;
  network: string;
  finalAddress: string;
  amount: string;
  tokenCurrency: string;
}

// --- Gas Thresholds ---

export interface GasThreshold {
  minimum: string;
  critical: string;
  currency: string;
}

// --- Lifecycle Callbacks ---

export interface DispersionCallbacks {
  onStatusChange?: (
    withdrawalId: string,
    previousStatus: DispersionStatus | null,
    currentStatus: DispersionStatus,
    context: {
      network: string;
      txHash?: string;
      estimatedGasFee?: string;
      error?: string;
    }
  ) => void | Promise<void>;

  onDispersionStart?: (
    withdrawalId: string,
    target: DispersionTarget,
    network: string
  ) => void | Promise<void>;

  onDispersionSent?: (
    withdrawalId: string,
    txHash: string,
    network: string
  ) => void | Promise<void>;

  onDispersionFailed?: (
    withdrawalId: string,
    error: string,
    network: string
  ) => void | Promise<void>;

  onGasLow?: (
    network: string,
    currentBalance: string,
    threshold: GasThreshold
  ) => void | Promise<void>;

  onGasCritical?: (
    network: string,
    currentBalance: string,
    threshold: GasThreshold
  ) => void | Promise<void>;
}

// --- Dispersion Config ---

export interface DispersionConfig {
  providers: DispersionProvider[];
  callbacks?: DispersionCallbacks;
  gasThresholds?: Record<string, GasThreshold>;
}
