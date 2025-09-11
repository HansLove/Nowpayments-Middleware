import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { NowPaymentsConfig } from '@/types';

describe('NowPaymentsConfig', () => {
  beforeEach(() => {
    NowPaymentsConfiguration.reset();
    delete process.env.NOWPAYMENTS_API_KEY;
    delete process.env.NOWPAYMENTS_BEARER_TOKEN;
    delete process.env.NOWPAYMENTS_BASE_URL;
  });

  describe('configure', () => {
    it('should set configuration with provided values', () => {
      const config: NowPaymentsConfig = {
        apiKey: 'test-api-key',
        bearerToken: 'test-bearer-token',
        baseURL: 'https://test.api.com',
        errorHandling: 'direct',
      };

      NowPaymentsConfiguration.configure(config);
      
      const result = NowPaymentsConfiguration.getConfig();
      expect(result).toEqual(config);
    });

    it('should merge with default values', () => {
      const config: NowPaymentsConfig = {
        apiKey: 'test-api-key',
      };

      NowPaymentsConfiguration.configure(config);
      
      const result = NowPaymentsConfiguration.getConfig();
      expect(result).toEqual({
        apiKey: 'test-api-key',
        baseURL: 'https://api.nowpayments.io/v1',
        errorHandling: 'next',
      });
    });
  });

  describe('getConfig', () => {
    it('should return configured values', () => {
      const config: NowPaymentsConfig = {
        apiKey: 'configured-api-key',
        bearerToken: 'configured-bearer-token',
      };

      NowPaymentsConfiguration.configure(config);
      
      const result = NowPaymentsConfiguration.getConfig();
      expect(result.apiKey).toBe('configured-api-key');
      expect(result.bearerToken).toBe('configured-bearer-token');
    });

    it('should fallback to environment variables when not configured', () => {
      process.env.NOWPAYMENTS_API_KEY = 'env-api-key';
      process.env.NOWPAYMENTS_BEARER_TOKEN = 'env-bearer-token';
      process.env.NOWPAYMENTS_BASE_URL = 'https://env.api.com';
      
      const result = NowPaymentsConfiguration.getConfig();
      expect(result.apiKey).toBe('env-api-key');
      expect(result.bearerToken).toBe('env-bearer-token');
      expect(result.baseURL).toBe('https://env.api.com');
      expect(result.errorHandling).toBe('next');
    });

    it('should throw error when no API key is provided', () => {
      expect(() => {
        NowPaymentsConfiguration.getConfig();
      }).toThrow('NowPayments API key is required');
    });

    it('should use default values for optional fields', () => {
      process.env.NOWPAYMENTS_API_KEY = 'test-api-key';
      
      const result = NowPaymentsConfiguration.getConfig();
      expect(result.baseURL).toBe('https://api.nowpayments.io/v1');
      expect(result.errorHandling).toBe('next');
      expect(result.bearerToken).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset configuration to null', () => {
      const config: NowPaymentsConfig = {
        apiKey: 'test-api-key',
      };

      NowPaymentsConfiguration.configure(config);
      NowPaymentsConfiguration.reset();
      
      process.env.NOWPAYMENTS_API_KEY = 'env-api-key';
      const result = NowPaymentsConfiguration.getConfig();
      expect(result.apiKey).toBe('env-api-key');
    });
  });

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const instance1 = NowPaymentsConfiguration;
      const instance2 = NowPaymentsConfiguration;
      
      expect(instance1).toBe(instance2);
    });
  });
});