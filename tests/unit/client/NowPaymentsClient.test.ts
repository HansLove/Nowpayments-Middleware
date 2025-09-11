import axios from 'axios';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { NowPaymentsConfigError } from '@/utils/errors';
import { CreatePaymentRequest, CreatePaymentResponse } from '@/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NowPaymentsClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    NowPaymentsConfiguration.reset();
    
    const mockAxiosInstance = {
      post: jest.fn(),
      defaults: {
        headers: {},
      },
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    } as any;
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      NowPaymentsConfiguration.configure({
        apiKey: 'test-api-key',
        baseURL: 'https://test.api.com',
      });

      new NowPaymentsClient();

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.api.com',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should add bearer token to headers when provided', () => {
      NowPaymentsConfiguration.configure({
        apiKey: 'test-api-key',
        bearerToken: 'test-bearer-token',
      });

      const mockAxiosInstance = {
        defaults: {
          headers: {},
        },
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      } as any;
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      new NowPaymentsClient();

      expect(mockAxiosInstance.defaults.headers.Authorization).toBe('Bearer test-bearer-token');
    });

    it('should throw error when API key is not provided', () => {
      NowPaymentsConfiguration.configure({
        apiKey: '',
      });

      expect(() => {
        new NowPaymentsClient();
      }).toThrow(NowPaymentsConfigError);
    });
  });

  describe('createPayment', () => {
    let client: NowPaymentsClient;
    let mockAxiosInstance: any;

    beforeEach(() => {
      NowPaymentsConfiguration.configure({
        apiKey: 'test-api-key',
      });

      mockAxiosInstance = {
        post: jest.fn(),
        defaults: {
          headers: {},
        },
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      };
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      client = new NowPaymentsClient();
    });

    it('should make POST request to /payment endpoint', async () => {
      const paymentData: CreatePaymentRequest = {
        price_amount: 100,
        price_currency: 'USD',
        pay_currency: 'BTC',
      };

      const mockResponse: CreatePaymentResponse = {
        payment_id: '123456789',
        payment_status: 'waiting' as any,
        pay_address: 'test-address',
        price_amount: 100,
        price_currency: 'USD',
        pay_amount: 0.001,
        pay_currency: 'BTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        purchase_id: '987654321',
        smart_contract: '',
        network: 'BTC',
        network_precision: 8,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createPayment(paymentData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/payment', paymentData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createPaymentByInvoice', () => {
    let client: NowPaymentsClient;
    let mockAxiosInstance: any;

    beforeEach(() => {
      NowPaymentsConfiguration.configure({
        apiKey: 'test-api-key',
      });

      mockAxiosInstance = {
        post: jest.fn(),
        defaults: {
          headers: {},
        },
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      };
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      client = new NowPaymentsClient();
    });

    it('should make POST request to /invoice-payment endpoint', async () => {
      const invoiceData = {
        iid: '12345',
        pay_currency: 'BTC',
      };

      const mockResponse: CreatePaymentResponse = {
        payment_id: '123456789',
        payment_status: 'waiting' as any,
        pay_address: 'test-address',
        price_amount: 100,
        price_currency: 'USD',
        pay_amount: 0.001,
        pay_currency: 'BTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        purchase_id: '987654321',
        smart_contract: '',
        network: 'BTC',
        network_precision: 8,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createPaymentByInvoice(invoiceData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/invoice-payment', invoiceData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createPayout', () => {
    let client: NowPaymentsClient;
    let mockAxiosInstance: any;

    beforeEach(() => {
      NowPaymentsConfiguration.configure({
        apiKey: 'test-api-key',
      });

      mockAxiosInstance = {
        post: jest.fn(),
        defaults: {
          headers: {},
        },
        interceptors: {
          response: {
            use: jest.fn(),
          },
        },
      };
      
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      client = new NowPaymentsClient();
    });

    it('should make POST request to /payout endpoint', async () => {
      const payoutData = {
        withdrawals: [
          {
            address: 'test-address',
            currency: 'BTC',
            amount: 0.001,
          },
        ],
      };

      const mockResponse = {
        id: '123456789',
        withdrawals: [
          {
            is_request_payouts: false,
            id: '987654321',
            address: 'test-address',
            currency: 'BTC',
            amount: '0.001',
            batch_withdrawal_id: '123456789',
            status: 'WAITING',
            created_at: '2023-01-01T00:00:00Z',
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.createPayout(payoutData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/payout', payoutData);
      expect(result).toEqual(mockResponse);
    });
  });
});