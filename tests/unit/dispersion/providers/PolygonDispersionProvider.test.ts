import { EvmProviderConfig } from '@/types/dispersion.types';

const mockGetBalance = jest.fn();
const mockEstimateGas = jest.fn();
const mockGetFeeData = jest.fn();
const mockBalanceOf = jest.fn();
const mockTransfer = jest.fn();
const mockEncodeFunctionData = jest.fn();

jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getBalance: mockGetBalance,
    estimateGas: mockEstimateGas,
    getFeeData: mockGetFeeData,
  })),
  Wallet: jest.fn().mockImplementation(() => ({})),
  Contract: jest.fn().mockImplementation(() => ({
    balanceOf: mockBalanceOf,
    transfer: mockTransfer,
    interface: { encodeFunctionData: mockEncodeFunctionData },
  })),
  isAddress: jest.fn(),
  formatEther: jest.fn(),
  formatUnits: jest.fn(),
  parseUnits: jest.fn(),
}));

import { PolygonDispersionProvider } from '@/dispersion/providers/PolygonDispersionProvider';
import * as ethers from 'ethers';

const mockEthers = ethers as jest.Mocked<typeof ethers>;

const defaultConfig: EvmProviderConfig = {
  network: 'polygon',
  rpcUrl: 'https://polygon-rpc.com',
  privateKey: '0xPRIVATE_KEY',
  controlledAddress: '0xCONTROLLED',
  tokenContractAddress: '0xTOKEN_CONTRACT',
  tokenDecimals: 6,
};

describe('PolygonDispersionProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect()', () => {
    it('creates provider, wallet, and contract and sets connected=true', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);

      await provider.connect();

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(defaultConfig.rpcUrl);
      expect(ethers.Wallet).toHaveBeenCalledWith(
        defaultConfig.privateKey,
        expect.anything()
      );
      expect(ethers.Contract).toHaveBeenCalledWith(
        defaultConfig.tokenContractAddress,
        expect.any(Array),
        expect.anything()
      );
      expect(provider.isConnected()).toBe(true);
    });
  });

  describe('disconnect()', () => {
    it('sets connected=false after disconnect', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();
      await provider.disconnect();

      expect(provider.isConnected()).toBe(false);
    });
  });

  describe('validateAddress()', () => {
    it('uses ethers.isAddress when connected', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();

      (mockEthers.isAddress as jest.Mock).mockReturnValue(true);
      const isValid = provider.validateAddress('0xABC123');

      expect(mockEthers.isAddress).toHaveBeenCalledWith('0xABC123');
      expect(isValid).toBe(true);
    });

    it('uses regex fallback when not connected (ethers not loaded)', () => {
      const provider = new PolygonDispersionProvider(defaultConfig);

      const validAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const isValid = provider.validateAddress(validAddress);

      expect(isValid).toBe(true);
    });

    it('returns false for invalid address when using regex fallback', () => {
      const provider = new PolygonDispersionProvider(defaultConfig);

      expect(provider.validateAddress('not-an-address')).toBe(false);
      expect(provider.validateAddress('0xshort')).toBe(false);
    });
  });

  describe('getNativeBalance()', () => {
    it('calls getBalance and formats result with formatEther', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();

      mockGetBalance.mockResolvedValue(BigInt('1000000000000000000'));
      (mockEthers.formatEther as jest.Mock).mockReturnValue('1.0');

      const balance = await provider.getNativeBalance('0xADDRESS');

      expect(mockGetBalance).toHaveBeenCalledWith('0xADDRESS');
      expect(mockEthers.formatEther).toHaveBeenCalledWith(
        BigInt('1000000000000000000')
      );
      expect(balance).toBe('1.0');
    });
  });

  describe('getTokenBalance()', () => {
    it('calls balanceOf and formats result with formatUnits', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();

      mockBalanceOf.mockResolvedValue(BigInt('10000000'));
      (mockEthers.formatUnits as jest.Mock).mockReturnValue('10.0');

      const balance = await provider.getTokenBalance('0xADDRESS');

      expect(mockBalanceOf).toHaveBeenCalledWith('0xADDRESS');
      expect(mockEthers.formatUnits).toHaveBeenCalledWith(
        BigInt('10000000'),
        defaultConfig.tokenDecimals
      );
      expect(balance).toBe('10.0');
    });
  });

  describe('estimateGasFee()', () => {
    it('runs estimateGas and getFeeData in parallel and returns calculated fee', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();

      (mockEthers.parseUnits as jest.Mock).mockReturnValue(BigInt('10000000'));
      mockEncodeFunctionData.mockReturnValue('0xDATA');
      mockEstimateGas.mockResolvedValue(BigInt('21000'));
      mockGetFeeData.mockResolvedValue({
        gasPrice: BigInt('100000000000'),
        maxFeePerGas: null,
      });
      (mockEthers.formatEther as jest.Mock).mockReturnValue('0.0021');

      const fee = await provider.estimateGasFee('0xTO', '10.0');

      expect(mockEstimateGas).toHaveBeenCalled();
      expect(mockGetFeeData).toHaveBeenCalled();
      expect(fee).toBe('0.0021');
    });

    it('returns "0.01" as fallback when estimation fails', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();

      (mockEthers.parseUnits as jest.Mock).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const fee = await provider.estimateGasFee('0xTO', '10.0');

      expect(fee).toBe('0.01');
    });
  });

  describe('sendToken()', () => {
    it('calls contract.transfer and returns tx.hash', async () => {
      const provider = new PolygonDispersionProvider(defaultConfig);
      await provider.connect();

      (mockEthers.parseUnits as jest.Mock).mockReturnValue(BigInt('10000000'));
      const mockTx = {
        hash: '0xTX_HASH',
        wait: jest.fn().mockResolvedValue(undefined),
      };
      mockTransfer.mockResolvedValue(mockTx);

      const txHash = await provider.sendToken('0xTO', '10.0');

      expect(mockTransfer).toHaveBeenCalledWith('0xTO', BigInt('10000000'));
      expect(mockTx.wait).toHaveBeenCalled();
      expect(txHash).toBe('0xTX_HASH');
    });
  });
});
