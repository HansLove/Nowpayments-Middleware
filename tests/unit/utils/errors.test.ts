import {
  NowPaymentsError,
  NowPaymentsApiError,
  NowPaymentsConfigError,
  NowPaymentsValidationError,
  NowPaymentsNetworkError,
} from '@/utils/errors';

describe('Error classes', () => {
  describe('NowPaymentsError', () => {
    it('should create error with message and code', () => {
      const error = new NowPaymentsError('Test message', 'TEST_CODE');
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('NowPaymentsError');
      expect(error.statusCode).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });

    it('should create error with all parameters', () => {
      const originalError = new Error('Original error');
      const error = new NowPaymentsError('Test message', 'TEST_CODE', 400, originalError);
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('NowPaymentsApiError', () => {
    it('should create API error with correct properties', () => {
      const error = new NowPaymentsApiError('API failed', 500);
      
      expect(error.message).toBe('API failed');
      expect(error.code).toBe('API_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('NowPaymentsApiError');
    });

    it('should create API error with original error', () => {
      const originalError = new Error('HTTP error');
      const error = new NowPaymentsApiError('API failed', 500, originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('NowPaymentsConfigError', () => {
    it('should create config error with correct properties', () => {
      const error = new NowPaymentsConfigError('Config missing');
      
      expect(error.message).toBe('Config missing');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.statusCode).toBeUndefined();
      expect(error.name).toBe('NowPaymentsConfigError');
    });

    it('should create config error with original error', () => {
      const originalError = new Error('Validation failed');
      const error = new NowPaymentsConfigError('Config missing', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('NowPaymentsValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new NowPaymentsValidationError('Invalid data');
      
      expect(error.message).toBe('Invalid data');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBeUndefined();
      expect(error.name).toBe('NowPaymentsValidationError');
    });

    it('should create validation error with original error', () => {
      const originalError = new Error('Schema validation failed');
      const error = new NowPaymentsValidationError('Invalid data', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('NowPaymentsNetworkError', () => {
    it('should create network error with correct properties', () => {
      const error = new NowPaymentsNetworkError('Network timeout');
      
      expect(error.message).toBe('Network timeout');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBeUndefined();
      expect(error.name).toBe('NowPaymentsNetworkError');
    });

    it('should create network error with original error', () => {
      const originalError = new Error('Connection refused');
      const error = new NowPaymentsNetworkError('Network timeout', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('inheritance', () => {
    it('should be instances of Error and NowPaymentsError', () => {
      const apiError = new NowPaymentsApiError('API error', 500);
      const configError = new NowPaymentsConfigError('Config error');
      const validationError = new NowPaymentsValidationError('Validation error');
      const networkError = new NowPaymentsNetworkError('Network error');
      
      expect(apiError).toBeInstanceOf(Error);
      expect(apiError).toBeInstanceOf(NowPaymentsError);
      expect(apiError).toBeInstanceOf(NowPaymentsApiError);
      
      expect(configError).toBeInstanceOf(Error);
      expect(configError).toBeInstanceOf(NowPaymentsError);
      expect(configError).toBeInstanceOf(NowPaymentsConfigError);
      
      expect(validationError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(NowPaymentsError);
      expect(validationError).toBeInstanceOf(NowPaymentsValidationError);
      
      expect(networkError).toBeInstanceOf(Error);
      expect(networkError).toBeInstanceOf(NowPaymentsError);
      expect(networkError).toBeInstanceOf(NowPaymentsNetworkError);
    });
  });
});