import { NowPaymentsConfig } from '../types';

class NowPaymentsConfigSingleton {
  private static instance: NowPaymentsConfigSingleton;
  private config: NowPaymentsConfig;

  private constructor() {
    // Read environment variables once at singleton initialization
    this.config = {
      apiKey: process.env.NOWPAYMENTS_API_KEY || '',
      email: process.env.NOWPAYMENTS_EMAIL,
      password: process.env.NOWPAYMENTS_PASSWORD,
      twoFactorSecretKey: process.env.NOWPAYMENTS_2FA_SECRET,
      baseURL: process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1',
      errorHandling: 'next',
    };
  }

  static getInstance(): NowPaymentsConfigSingleton {
    if (!NowPaymentsConfigSingleton.instance) {
      NowPaymentsConfigSingleton.instance = new NowPaymentsConfigSingleton();
    }
    return NowPaymentsConfigSingleton.instance;
  }

  configure(config: NowPaymentsConfig): void {
    // Merge: user-provided values override current config (env vars or previous config)
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getConfig(): NowPaymentsConfig {
    if (!this.config.apiKey) {
      throw new Error('NowPayments API key is required. Either configure it or set NOWPAYMENTS_API_KEY environment variable.');
    }

    return this.config;
  }

  reset(): void {
    // Re-read environment variables (useful for testing)
    this.config = {
      apiKey: process.env.NOWPAYMENTS_API_KEY || '',
      email: process.env.NOWPAYMENTS_EMAIL,
      password: process.env.NOWPAYMENTS_PASSWORD,
      twoFactorSecretKey: process.env.NOWPAYMENTS_2FA_SECRET,
      baseURL: process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1',
      errorHandling: 'next',
    };
  }
}

export const NowPaymentsConfiguration = NowPaymentsConfigSingleton.getInstance();