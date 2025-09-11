export class NowPaymentsError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly originalError?: unknown;

  constructor(message: string, code: string, statusCode?: number, originalError?: unknown) {
    super(message);
    this.name = 'NowPaymentsError';
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class NowPaymentsApiError extends NowPaymentsError {
  constructor(message: string, statusCode: number, originalError?: unknown) {
    super(message, 'API_ERROR', statusCode, originalError);
    this.name = 'NowPaymentsApiError';
  }
}

export class NowPaymentsConfigError extends NowPaymentsError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'CONFIG_ERROR', undefined, originalError);
    this.name = 'NowPaymentsConfigError';
  }
}

export class NowPaymentsValidationError extends NowPaymentsError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'VALIDATION_ERROR', undefined, originalError);
    this.name = 'NowPaymentsValidationError';
  }
}

export class NowPaymentsNetworkError extends NowPaymentsError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, originalError);
    this.name = 'NowPaymentsNetworkError';
  }
}