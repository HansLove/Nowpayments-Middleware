import { Response, NextFunction } from 'express';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { NowPaymentsError } from '@/utils/errors';
import { ErrorHandlingMode } from '@/types';

export abstract class BaseMiddleware {
  protected handleError(error: unknown, res: Response, next: NextFunction): void {
    const config = NowPaymentsConfiguration.getConfig();
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