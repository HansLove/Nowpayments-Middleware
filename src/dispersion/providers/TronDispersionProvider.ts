import { TronProviderConfig } from '@/types/dispersion.types';
import { BaseDispersionProvider } from '@/dispersion/BaseDispersionProvider';

export class TronDispersionProvider extends BaseDispersionProvider<TronProviderConfig> {
  private tronWeb: any = null;

  async connect(): Promise<void> {
    let TronWebModule: any;
    try {
      TronWebModule = await import('tronweb');
    } catch (_err) {
      throw new Error(
        'TronDispersionProvider requires "tronweb" ^6.0.0. Install it: npm install tronweb@^6'
      );
    }

    const TronWeb =
      TronWebModule.default ?? TronWebModule.TronWeb ?? TronWebModule;
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers['TRON-PRO-API-KEY'] = this.config.apiKey;
    }

    this.tronWeb = new TronWeb({
      fullHost: this.config.fullNode,
      privateKey: this.config.privateKey,
      headers,
    });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.tronWeb = null;
    this.connected = false;
  }

  validateAddress(address: string): boolean {
    return address.startsWith('T') && address.length === 34;
  }

  async getNativeBalance(address: string): Promise<string> {
    await this.ensureConnected();
    const balanceSun = await this.tronWeb.trx.getBalance(address);
    return (balanceSun / 1_000_000).toFixed(6);
  }

  async getTokenBalance(address: string): Promise<string> {
    await this.ensureConnected();

    const result =
      await this.tronWeb.transactionBuilder.triggerConstantContract(
        this.config.tokenContractAddress,
        'balanceOf(address)',
        {},
        [{ type: 'address', value: address }],
        this.config.controlledAddress
      );

    const hexResult: string = result.constant_result?.[0] ?? '0';
    const balance = BigInt('0x' + hexResult);
    const divisor = BigInt(10 ** this.config.tokenDecimals);
    const intPart = balance / divisor;
    const fracPart = balance % divisor;
    return `${intPart}.${fracPart.toString().padStart(this.config.tokenDecimals, '0')}`;
  }

  async estimateGasFee(toAddress: string, amount: string): Promise<string> {
    await this.ensureConnected();

    const parsedAmount = BigInt(
      Math.round(parseFloat(amount) * 10 ** this.config.tokenDecimals)
    );
    const params = [
      { type: 'address', value: toAddress },
      { type: 'uint256', value: parsedAmount.toString() },
    ];

    try {
      return await this.estimateGasFeeWithEnergyApi(params);
    } catch (_primaryErr) {
      try {
        return await this.estimateGasFeeWithConstantContract(params);
      } catch (_fallbackErr) {
        return '15';
      }
    }
  }

  async sendToken(toAddress: string, amount: string): Promise<string> {
    await this.ensureConnected();

    const parsedAmount = BigInt(
      Math.round(parseFloat(amount) * 10 ** this.config.tokenDecimals)
    );
    const params = [
      { type: 'address', value: toAddress },
      { type: 'uint256', value: parsedAmount.toString() },
    ];

    const transaction =
      await this.tronWeb.transactionBuilder.triggerSmartContract(
        this.config.tokenContractAddress,
        'transfer(address,uint256)',
        {},
        params,
        this.config.controlledAddress
      );

    const signedTx = await this.tronWeb.trx.sign(transaction.transaction);
    const result = await this.tronWeb.trx.sendRawTransaction(signedTx);

    const txId: string =
      result.transaction?.txID ?? result.txid ?? result.transaction?.txId ?? '';
    if (!txId) {
      throw new Error(
        'TronDispersionProvider: sendToken failed - no txID returned'
      );
    }
    return txId;
  }

  private parsePriceFromCsv(csvString: string): number {
    const entries = csvString.split(',');
    const lastEntry = entries[entries.length - 1];
    const parts = lastEntry.split(':');
    return parseInt(parts[parts.length - 1], 10) || 0;
  }

  private calculateTotalTrx(
    energyRequired: number,
    availableEnergy: number,
    energyPriceSun: number,
    bandwidthAvailable: number,
    bandwidthPriceSun: number
  ): string {
    const energyToBurn = Math.max(0, energyRequired - availableEnergy);
    const energyCostSun = energyToBurn * energyPriceSun;

    const bandwidthToBurn = Math.max(0, 345 - bandwidthAvailable);
    const bandwidthCostSun = bandwidthToBurn * bandwidthPriceSun;

    const totalTrx = (energyCostSun + bandwidthCostSun) / 1_000_000;
    return totalTrx.toFixed(6);
  }

  private async estimateGasFeeWithEnergyApi(
    params: Array<{ type: string; value: string }>
  ): Promise<string> {
    const energyResult = await this.tronWeb.transactionBuilder.estimateEnergy(
      this.config.tokenContractAddress,
      'transfer(address,uint256)',
      {},
      params,
      this.config.controlledAddress
    );

    const energyRequired: number =
      energyResult.energy_required ?? energyResult.energy_used ?? 65000;

    const [resources, energyPricesStr, bandwidthPricesStr] = await Promise.all([
      this.tronWeb.trx.getAccountResources(this.config.controlledAddress),
      this.tronWeb.trx.getEnergyPrices(),
      this.tronWeb.trx.getBandwidthPrices(),
    ]);

    const availableEnergy =
      (resources.EnergyLimit ?? 0) - (resources.EnergyUsed ?? 0);
    const bandwidthAvailable =
      (resources.freeNetLimit ?? 0) +
      (resources.NetLimit ?? 0) -
      (resources.freeNetUsed ?? 0) -
      (resources.NetUsed ?? 0);

    const energyPriceSun = this.parsePriceFromCsv(energyPricesStr);
    const bandwidthPriceSun = this.parsePriceFromCsv(bandwidthPricesStr);

    return this.calculateTotalTrx(
      energyRequired,
      availableEnergy,
      energyPriceSun,
      bandwidthAvailable,
      bandwidthPriceSun
    );
  }

  private async estimateGasFeeWithConstantContract(
    params: Array<{ type: string; value: string }>
  ): Promise<string> {
    const result =
      await this.tronWeb.transactionBuilder.triggerConstantContract(
        this.config.tokenContractAddress,
        'transfer(address,uint256)',
        {},
        params,
        this.config.controlledAddress
      );

    const energyUsed: number = result.energy_used ?? 65000;
    const energyRequired = Math.ceil(energyUsed * 1.2);

    const [resources, energyPricesStr, bandwidthPricesStr] = await Promise.all([
      this.tronWeb.trx.getAccountResources(this.config.controlledAddress),
      this.tronWeb.trx.getEnergyPrices(),
      this.tronWeb.trx.getBandwidthPrices(),
    ]);

    const availableEnergy =
      (resources.EnergyLimit ?? 0) - (resources.EnergyUsed ?? 0);
    const bandwidthAvailable =
      (resources.freeNetLimit ?? 0) +
      (resources.NetLimit ?? 0) -
      (resources.freeNetUsed ?? 0) -
      (resources.NetUsed ?? 0);

    const energyPriceSun = this.parsePriceFromCsv(energyPricesStr);
    const bandwidthPriceSun = this.parsePriceFromCsv(bandwidthPricesStr);

    return this.calculateTotalTrx(
      energyRequired,
      availableEnergy,
      energyPriceSun,
      bandwidthAvailable,
      bandwidthPriceSun
    );
  }
}
