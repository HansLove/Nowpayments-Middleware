import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { 
  NowPaymentsApiError, 
  NowPaymentsNetworkError, 
  NowPaymentsConfigError 
} from '@/utils/errors';
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  CreatePaymentByInvoiceRequest,
  CreatePaymentByInvoiceResponse,
  CreatePayoutRequest,
  CreatePayoutResponse,
} from '@/types';

export class NowPaymentsClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    const config = NowPaymentsConfiguration.getConfig();
    
    if (!config.apiKey) {
      throw new NowPaymentsConfigError('API key is required');
    }

    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    });

    if (config.bearerToken) {
      this.axiosInstance.defaults.headers.Authorization = `Bearer ${config.bearerToken}`;
    }

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response) {
          const statusCode = error.response.status;
          const message = (error.response.data as any)?.message || error.message;
          throw new NowPaymentsApiError(message, statusCode, error);
        }
        
        if (error.request) {
          throw new NowPaymentsNetworkError('Network error occurred', error);
        }
        
        throw new NowPaymentsNetworkError('Unknown error occurred', error);
      }
    );
  }

  async createPayment(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const response = await this.axiosInstance.post<CreatePaymentResponse>('/payment', data);
    return response.data;
  }

  async createPaymentByInvoice(data: CreatePaymentByInvoiceRequest): Promise<CreatePaymentByInvoiceResponse> {
    const response = await this.axiosInstance.post<CreatePaymentByInvoiceResponse>('/invoice-payment', data);
    return response.data;
  }

  async createPayout(data: CreatePayoutRequest): Promise<CreatePayoutResponse> {
    const response = await this.axiosInstance.post<CreatePayoutResponse>('/payout', data);
    return response.data;
  }
}