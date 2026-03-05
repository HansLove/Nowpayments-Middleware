import { EvmProviderConfig } from '@/types/dispersion.types';
import { BaseDispersionProvider } from '@/dispersion/BaseDispersionProvider';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

type EthersModule = typeof import('ethers');

export class PolygonDispersionProvider extends BaseDispersionProvider<EvmProviderConfig> {
  private ethersProvider: InstanceType<EthersModule['JsonRpcProvider']> | null =
    null;
  private wallet: InstanceType<EthersModule['Wallet']> | null = null;
  private tokenContract: InstanceType<EthersModule['Contract']> | null = null;
  private ethersLib: EthersModule | null = null;

  async connect(): Promise<void> {
    let ethers: EthersModule;
    try {
      ethers = await import('ethers');
    } catch (_err) {
      throw new Error(
        'PolygonDispersionProvider requires "ethers" ^6.0.0. Install it: npm install ethers@^6'
      );
    }

    this.ethersLib = ethers;
    this.ethersProvider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.wallet = new ethers.Wallet(
      this.config.privateKey,
      this.ethersProvider
    );
    this.tokenContract = new ethers.Contract(
      this.config.tokenContractAddress,
      ERC20_ABI,
      this.wallet
    );
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.ethersProvider = null;
    this.wallet = null;
    this.tokenContract = null;
    this.ethersLib = null;
    this.connected = false;
  }

  validateAddress(address: string): boolean {
    if (this.ethersLib) {
      return this.ethersLib.isAddress(address);
    }
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async getNativeBalance(address: string): Promise<string> {
    await this.ensureConnected();
    const balance = await this.ethersProvider!.getBalance(address);
    return this.ethersLib!.formatEther(balance);
  }

  async getTokenBalance(address: string): Promise<string> {
    await this.ensureConnected();
    const balance = await (this.tokenContract as any).balanceOf(address);
    return this.ethersLib!.formatUnits(balance, this.config.tokenDecimals);
  }

  async estimateGasFee(toAddress: string, amount: string): Promise<string> {
    await this.ensureConnected();
    try {
      const parsedAmount = this.ethersLib!.parseUnits(
        amount,
        this.config.tokenDecimals
      );
      const transferData = this.tokenContract!.interface
        ? (this.tokenContract as any).interface.encodeFunctionData('transfer', [
            toAddress,
            parsedAmount,
          ])
        : '0x';

      const [gasEstimate, feeData] = await Promise.all([
        this.ethersProvider!.estimateGas({
          to: this.config.tokenContractAddress,
          from: this.config.controlledAddress,
          data: transferData,
        }),
        this.ethersProvider!.getFeeData(),
      ]);

      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);
      const totalFeeWei = gasEstimate * gasPrice;
      return this.ethersLib!.formatEther(totalFeeWei);
    } catch (_err) {
      return '0.01';
    }
  }

  async sendToken(toAddress: string, amount: string): Promise<string> {
    await this.ensureConnected();
    const parsedAmount = this.ethersLib!.parseUnits(
      amount,
      this.config.tokenDecimals
    );
    const tx = await (this.tokenContract as any).transfer(
      toAddress,
      parsedAmount
    );
    await tx.wait();
    return tx.hash as string;
  }
}
