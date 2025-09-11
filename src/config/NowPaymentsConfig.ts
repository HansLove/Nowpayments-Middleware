import { NowPaymentsConfig } from '../types';

class NowPaymentsConfigSingleton {
  private static instance: NowPaymentsConfigSingleton;
  private config: NowPaymentsConfig | null = null;

  private constructor() {}

  static getInstance(): NowPaymentsConfigSingleton {
    if (!NowPaymentsConfigSingleton.instance) {
      NowPaymentsConfigSingleton.instance = new NowPaymentsConfigSingleton();
    }
    return NowPaymentsConfigSingleton.instance;
  }

  configure(config: NowPaymentsConfig): void {
    this.config = {
      baseURL: 'https://api.nowpayments.io/v1',
      errorHandling: 'next',
      ...config,
    };
  }

  getConfig(): NowPaymentsConfig {
    if (!this.config) {
      this.config = {
        apiKey: process.env.NOWPAYMENTS_API_KEY || '',
        bearerToken: process.env.NOWPAYMENTS_BEARER_TOKEN,
        baseURL: process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1',
        errorHandling: 'next',
      };

      if (!this.config.apiKey) {
        throw new Error('NowPayments API key is required. Either configure it or set NOWPAYMENTS_API_KEY environment variable.');
      }
    }

    return this.config;
  }

  reset(): void {
    this.config = null;
  }
}

export const NowPaymentsConfiguration = NowPaymentsConfigSingleton.getInstance();