import { TronProviderConfig } from '@/types/dispersion.types';

const mockTronWebInstance = {
  trx: {
    getBalance: jest.fn(),
    sign: jest.fn(),
    sendRawTransaction: jest.fn(),
    getEnergyPrices: jest.fn(),
    getBandwidthPrices: jest.fn(),
    getAccountResources: jest.fn(),
  },
  transactionBuilder: {
    triggerSmartContract: jest.fn(),
    triggerConstantContract: jest.fn(),
    estimateEnergy: jest.fn(),
  },
};

jest.mock('tronweb', () => ({
  default: jest.fn().mockImplementation(() => mockTronWebInstance),
}));

import { TronDispersionProvider } from '@/dispersion/providers/TronDispersionProvider';
import TronWebModule from 'tronweb';

const mockTronWebConstructor = TronWebModule as unknown as jest.Mock;

const defaultConfig: TronProviderConfig = {
  network: 'tron',
  fullNode: 'https://api.trongrid.io',
  privateKey: 'PRIVATE_KEY_HEX',
  controlledAddress: 'TControlledAddress1234567890123',
  tokenContractAddress: 'TTokenContract1234567890123456',
  tokenDecimals: 6,
  apiKey: 'test-api-key',
};

describe('TronDispersionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('connect()', () => {
    it('creates TronWeb with correct config including fullHost, privateKey, and headers', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      expect(mockTronWebConstructor).toHaveBeenCalledWith({
        fullHost: defaultConfig.fullNode,
        privateKey: defaultConfig.privateKey,
        headers: { 'TRON-PRO-API-KEY': defaultConfig.apiKey },
      });
      expect(provider.isConnected()).toBe(true);
    });

    it('creates TronWeb without headers when apiKey is not provided', async () => {
      const configWithoutKey: TronProviderConfig = {
        ...defaultConfig,
        apiKey: undefined,
      };
      const provider = new TronDispersionProvider(configWithoutKey);
      await provider.connect();

      expect(mockTronWebConstructor).toHaveBeenCalledWith({
        fullHost: defaultConfig.fullNode,
        privateKey: defaultConfig.privateKey,
        headers: {},
      });
    });
  });

  describe('disconnect()', () => {
    it('sets connected=false and clears tronweb instance', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();
      await provider.disconnect();

      expect(provider.isConnected()).toBe(false);
    });
  });

  describe('validateAddress()', () => {
    it('returns true for a valid Tron address (T + 33 more chars = 34 total)', () => {
      const provider = new TronDispersionProvider(defaultConfig);
      const validAddress = 'T' + 'A'.repeat(33);

      expect(provider.validateAddress(validAddress)).toBe(true);
    });

    it('returns false for address not starting with T', () => {
      const provider = new TronDispersionProvider(defaultConfig);
      const invalidAddress = '0x' + 'A'.repeat(32);

      expect(provider.validateAddress(invalidAddress)).toBe(false);
    });

    it('returns false for address that starts with T but is too short', () => {
      const provider = new TronDispersionProvider(defaultConfig);
      expect(provider.validateAddress('TShort')).toBe(false);
    });

    it('returns false for address that starts with T but is too long', () => {
      const provider = new TronDispersionProvider(defaultConfig);
      expect(provider.validateAddress('T' + 'A'.repeat(34))).toBe(false);
    });
  });

  describe('getNativeBalance()', () => {
    it('divides balance by 1_000_000 and returns 6 decimal string', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      mockTronWebInstance.trx.getBalance.mockResolvedValue(5_500_000);

      const balance = await provider.getNativeBalance('TAddress');

      expect(mockTronWebInstance.trx.getBalance).toHaveBeenCalledWith(
        'TAddress'
      );
      expect(balance).toBe('5.500000');
    });
  });

  describe('sendToken()', () => {
    it('calls triggerSmartContract, sign, sendRawTransaction and returns txid', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      const mockTransaction = { txID: 'tx-id-raw' };
      const mockSignedTx = { txID: 'tx-id-signed' };
      const mockSendResult = { transaction: { txID: 'FINAL_TX_ID' } };

      mockTronWebInstance.transactionBuilder.triggerSmartContract.mockResolvedValue(
        {
          transaction: mockTransaction,
        }
      );
      mockTronWebInstance.trx.sign.mockResolvedValue(mockSignedTx);
      mockTronWebInstance.trx.sendRawTransaction.mockResolvedValue(
        mockSendResult
      );

      const txId = await provider.sendToken(
        'TRecipient1234567890123456789012',
        '10.0'
      );

      expect(
        mockTronWebInstance.transactionBuilder.triggerSmartContract
      ).toHaveBeenCalledWith(
        defaultConfig.tokenContractAddress,
        'transfer(address,uint256)',
        {},
        expect.any(Array),
        defaultConfig.controlledAddress
      );
      expect(mockTronWebInstance.trx.sign).toHaveBeenCalledWith(
        mockTransaction
      );
      expect(mockTronWebInstance.trx.sendRawTransaction).toHaveBeenCalledWith(
        mockSignedTx
      );
      expect(txId).toBe('FINAL_TX_ID');
    });

    it('throws when no txID is returned from sendRawTransaction', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      mockTronWebInstance.transactionBuilder.triggerSmartContract.mockResolvedValue(
        {
          transaction: {},
        }
      );
      mockTronWebInstance.trx.sign.mockResolvedValue({});
      mockTronWebInstance.trx.sendRawTransaction.mockResolvedValue({});

      await expect(
        provider.sendToken('TRecipient1234567890123456789012', '10.0')
      ).rejects.toThrow('sendToken failed - no txID returned');
    });
  });

  describe('estimateGasFee()', () => {
    it('uses estimateEnergy primary path and returns computed TRX value', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      mockTronWebInstance.transactionBuilder.estimateEnergy.mockResolvedValue({
        energy_required: 65000,
      });
      mockTronWebInstance.trx.getAccountResources.mockResolvedValue({
        EnergyLimit: 100000,
        EnergyUsed: 10000,
        freeNetLimit: 600,
        NetLimit: 0,
        freeNetUsed: 200,
        NetUsed: 0,
      });
      mockTronWebInstance.trx.getEnergyPrices.mockResolvedValue(
        '0:420,1000000:1000'
      );
      mockTronWebInstance.trx.getBandwidthPrices.mockResolvedValue('0:1000');

      const fee = await provider.estimateGasFee(
        'TRecipient123456789012345678901',
        '10.0'
      );

      expect(
        mockTronWebInstance.transactionBuilder.estimateEnergy
      ).toHaveBeenCalled();
      expect(typeof fee).toBe('string');
    });

    it('uses triggerConstantContract fallback when estimateEnergy fails', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      mockTronWebInstance.transactionBuilder.estimateEnergy.mockRejectedValue(
        new Error('estimateEnergy not supported')
      );
      mockTronWebInstance.transactionBuilder.triggerConstantContract.mockResolvedValue(
        {
          energy_used: 65000,
        }
      );
      mockTronWebInstance.trx.getAccountResources.mockResolvedValue({
        EnergyLimit: 0,
        EnergyUsed: 0,
        freeNetLimit: 600,
        NetLimit: 0,
        freeNetUsed: 0,
        NetUsed: 0,
      });
      mockTronWebInstance.trx.getEnergyPrices.mockResolvedValue('0:420');
      mockTronWebInstance.trx.getBandwidthPrices.mockResolvedValue('0:1000');

      const fee = await provider.estimateGasFee(
        'TRecipient123456789012345678901',
        '10.0'
      );

      expect(
        mockTronWebInstance.transactionBuilder.triggerConstantContract
      ).toHaveBeenCalled();
      expect(typeof fee).toBe('string');
    });

    it('returns "15" as ultimate fallback when both API paths fail', async () => {
      const provider = new TronDispersionProvider(defaultConfig);
      await provider.connect();

      mockTronWebInstance.transactionBuilder.estimateEnergy.mockRejectedValue(
        new Error('primary failed')
      );
      mockTronWebInstance.transactionBuilder.triggerConstantContract.mockRejectedValue(
        new Error('fallback failed')
      );

      const fee = await provider.estimateGasFee(
        'TRecipient123456789012345678901',
        '10.0'
      );

      expect(fee).toBe('15');
    });
  });
});
