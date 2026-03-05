import { Request, Response, NextFunction } from 'express';
import { NowPaymentsClient } from '@/client/NowPaymentsClient';
import { BaseMiddleware } from '@/middlewares/base/BaseMiddleware';
import {
  CreatePayoutMiddlewareOptions,
  CreatePayoutWithDispersionMiddlewareOptions,
  ExpressMiddleware,
} from '@/types';
import { CreatePayoutWithDispersionRequest } from '@/types/api.types';
import { DispersionTarget } from '@/types/dispersion.types';
import { DispersionTargetStore } from '@/dispersion/DispersionTargetStore';
import { NowPaymentsValidationError } from '@/utils/errors';
import { NowPaymentsConfiguration } from '@/config/NowPaymentsConfig';
import { generateTOTPCode } from '@/utils/totp';

class CreatePayoutMiddleware extends BaseMiddleware {
  private client: NowPaymentsClient;

  constructor() {
    super();
    this.client = new NowPaymentsClient();
  }

  create(options: CreatePayoutMiddlewareOptions): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new NowPaymentsValidationError(
            'mapRequest function is required'
          );
        }

        const payoutData = options.mapRequest(req, res);

        if (!payoutData.withdrawals || payoutData.withdrawals.length === 0) {
          throw new NowPaymentsValidationError(
            'withdrawals array is required and cannot be empty'
          );
        }

        for (const withdrawal of payoutData.withdrawals) {
          if (
            !withdrawal.address ||
            !withdrawal.currency ||
            !withdrawal.amount
          ) {
            throw new NowPaymentsValidationError(
              'Each withdrawal must have address, currency, and amount'
            );
          }
        }

        const response = await this.client.createPayout(payoutData);

        const config = NowPaymentsConfiguration.getConfig();

        if (config.twoFactorSecretKey) {
          const totpCode = generateTOTPCode(config.twoFactorSecretKey);
          await this.client.verifyPayout(response.id, totpCode);
        }

        const transformedResponse = options.transformResponse
          ? options.transformResponse(response)
          : response;

        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        await this.handleError(error, req, res, next, options.onError);
      }
    };
  }
}

let createPayoutMiddleware: CreatePayoutMiddleware | null = null;

function getCreatePayoutMiddleware(): CreatePayoutMiddleware {
  if (!createPayoutMiddleware) {
    createPayoutMiddleware = new CreatePayoutMiddleware();
  }
  return createPayoutMiddleware;
}

export const createPayout = (
  options: CreatePayoutMiddlewareOptions
): ExpressMiddleware => getCreatePayoutMiddleware().create(options);

class CreatePayoutWithDispersionMiddleware extends BaseMiddleware {
  private client: NowPaymentsClient;

  constructor() {
    super();
    this.client = new NowPaymentsClient();
  }

  create(
    options: CreatePayoutWithDispersionMiddlewareOptions
  ): ExpressMiddleware {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!options.mapRequest) {
          throw new NowPaymentsValidationError(
            'mapRequest function is required'
          );
        }

        const fullRequest: CreatePayoutWithDispersionRequest =
          options.mapRequest(req, res);

        if (!fullRequest.withdrawals || fullRequest.withdrawals.length === 0) {
          throw new NowPaymentsValidationError(
            'withdrawals array is required and cannot be empty'
          );
        }

        for (const withdrawal of fullRequest.withdrawals) {
          if (
            !withdrawal.address ||
            !withdrawal.currency ||
            !withdrawal.amount
          ) {
            throw new NowPaymentsValidationError(
              'Each withdrawal must have address, currency, and amount'
            );
          }
          if (
            !withdrawal.dispersion_network ||
            !withdrawal.dispersion_final_address
          ) {
            throw new NowPaymentsValidationError(
              'Each withdrawal must have dispersion_network and dispersion_final_address'
            );
          }
        }

        const cleanRequest = {
          ...fullRequest,
          withdrawals: fullRequest.withdrawals.map(w => {
            const {
              dispersion_network: _dn,
              dispersion_final_address: _dfa,
              dispersion_amount: _da,
              dispersion_token: _dt,
              ...cleanWithdrawal
            } = w;
            return cleanWithdrawal;
          }),
        };

        const response = await this.client.createPayout(cleanRequest);

        const config = NowPaymentsConfiguration.getConfig();
        if (config.twoFactorSecretKey) {
          const totpCode = generateTOTPCode(config.twoFactorSecretKey);
          await this.client.verifyPayout(response.id, totpCode);
        }

        const targets: DispersionTarget[] = response.withdrawals.map(
          (w, i) => ({
            withdrawalId: w.id,
            network: fullRequest.withdrawals[i].dispersion_network,
            finalAddress: fullRequest.withdrawals[i].dispersion_final_address,
            amount: fullRequest.withdrawals[i].dispersion_amount ?? w.amount,
            tokenCurrency:
              fullRequest.withdrawals[i].dispersion_token ?? w.currency,
          })
        );

        DispersionTargetStore.registerBatch(targets);

        const transformedResponse = options.transformResponse
          ? options.transformResponse(response)
          : response;

        this.saveToLocals(res, transformedResponse);
        next();
      } catch (error) {
        await this.handleError(error, req, res, next, options.onError);
      }
    };
  }
}

let createPayoutWithDispersionMiddleware: CreatePayoutWithDispersionMiddleware | null =
  null;

function getCreatePayoutWithDispersionMiddleware(): CreatePayoutWithDispersionMiddleware {
  if (!createPayoutWithDispersionMiddleware) {
    createPayoutWithDispersionMiddleware =
      new CreatePayoutWithDispersionMiddleware();
  }
  return createPayoutWithDispersionMiddleware;
}

export const createPayoutWithDispersion = (
  options: CreatePayoutWithDispersionMiddlewareOptions
): ExpressMiddleware =>
  getCreatePayoutWithDispersionMiddleware().create(options);
