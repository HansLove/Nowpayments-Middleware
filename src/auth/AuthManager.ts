import axios, { AxiosInstance } from 'axios';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import {
  NowPaymentsApiError,
  NowPaymentsNetworkError,
  NowPaymentsConfigError
} from '@/utils/errors';
import { AuthRequest, AuthResponse, TokenCache } from '@/types/auth.types';

class AuthManagerSingleton {
  private static instance: AuthManagerSingleton;
  private tokenCache: TokenCache | null = null;
  private authInstance: AxiosInstance | null = null;

  private constructor() {}

  static getInstance(): AuthManagerSingleton {
    if (!AuthManagerSingleton.instance) {
      AuthManagerSingleton.instance = new AuthManagerSingleton();
    }
    return AuthManagerSingleton.instance;
  }

  private getAuthInstance(): AxiosInstance {
    if (!this.authInstance) {
      const config = NowPaymentsConfiguration.getConfig();
      this.authInstance = axios.create({
        baseURL: config.baseURL,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    return this.authInstance;
  }

  private async requestNewToken(): Promise<string> {
    const config = NowPaymentsConfiguration.getConfig();

    if (!config.email || !config.password) {
      throw new NowPaymentsConfigError('Email and password are required for authentication');
    }

    const authRequest: AuthRequest = {
      email: config.email,
      password: config.password,
    };

    try {
      const response = await this.getAuthInstance().post<AuthResponse>('/auth', authRequest);
      return response.data.token;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const statusCode = error.response.status;
          const message = error.response.data?.message || 'Authentication failed';
          throw new NowPaymentsApiError(message, statusCode, error);
        }

        if (error.request) {
          throw new NowPaymentsNetworkError('Network error during authentication', error);
        }
      }

      throw new NowPaymentsNetworkError('Unknown error during authentication', error);
    }
  }

  async getToken(): Promise<string> {
    if (this.tokenCache && new Date() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const newToken = await this.requestNewToken();

    this.tokenCache = {
      token: newToken,
      expiresAt: new Date(Date.now() + 4 * 60 * 1000), // 4 minutes
    };

    return newToken;
  }

  clearToken(): void {
    this.tokenCache = null;
  }

  isTokenValid(): boolean {
    return this.tokenCache !== null && new Date() < this.tokenCache.expiresAt;
  }
}

export const AuthManager = AuthManagerSingleton.getInstance();