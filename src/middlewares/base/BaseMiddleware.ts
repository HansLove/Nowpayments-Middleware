import { Request, Response, NextFunction } from 'express';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { NowPaymentsError } from '@/utils/errors';
import { ErrorHandlingMode, ErrorHandler } from '@/types';

export abstract class BaseMiddleware {
  protected async handleError(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
    onError?: ErrorHandler
  ): Promise<void> {
    // Priority 1: Per-middleware error handler
    if (onError) {
      await onError(error, req, res, next);
      return;
    }

    // Priority 2: Global error handler
    const config = NowPaymentsConfiguration.getConfig();
    if (config.onError) {
      await config.onError(error, req, res, next);
      return;
    }

    // Priority 3: Legacy errorHandling mode (fallback)
    const errorHandling: ErrorHandlingMode = config.errorHandling || 'next';

    if (errorHandling === 'direct') {
      this.sendErrorResponse(error, res);
      return;
    }

    next(error);
  }

  private sendErrorResponse(error: unknown, res: Response): void {
    if (error instanceof NowPaymentsError) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }

  protected saveToLocals(res: Response, data: unknown): void {
    res.locals.nowPaymentsResponse = data;
  }
}