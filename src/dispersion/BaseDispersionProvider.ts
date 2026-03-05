import {
  BaseProviderConfig,
  DispersionProvider,
} from '@/types/dispersion.types';

export abstract class BaseDispersionProvider<TConfig extends BaseProviderConfig>
  implements DispersionProvider
{
  protected config: TConfig;
  protected connected: boolean = false;

  constructor(config: TConfig) {
    this.config = config;
  }

  get network(): string {
    return this.config.network;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getControlledAddress(): string {
    return this.config.controlledAddress;
  }

  protected async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract validateAddress(address: string): boolean;
  abstract getTokenBalance(address: string): Promise<string>;
  abstract getNativeBalance(address: string): Promise<string>;
  abstract estimateGasFee(toAddress: string, amount: string): Promise<string>;
  abstract sendToken(toAddress: string, amount: string): Promise<string>;
}
