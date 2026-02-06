import { describe, it, expect, vi, beforeEach } from 'vitest';
import { X402rClient, X402rClientConfig } from '../src/client.js';
import { NotImplementedError } from '@x402r/core';
import type { PublicClient, WalletClient } from 'viem';

// Mock viem clients
const createMockPublicClient = (): PublicClient => {
  return {
    readContract: vi.fn(),
    watchContractEvent: vi.fn(),
    getChainId: vi.fn().mockResolvedValue(84532),
  } as unknown as PublicClient;
};

const createMockWalletClient = (): WalletClient => {
  return {
    writeContract: vi.fn(),
    account: {
      address: '0x1234567890123456789012345678901234567890',
    },
  } as unknown as WalletClient;
};

describe('X402rClient', () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with required config', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client).toBeInstanceOf(X402rClient);
    });

    it('should create client with optional walletClient', () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(client).toBeInstanceOf(X402rClient);
    });

    it('should expose operatorAddress', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client.operatorAddress).toBe(operatorAddress);
    });

    it('should expose publicClient', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client.publicClient).toBe(publicClient);
    });

    it('should expose walletClient when provided', () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(client.walletClient).toBe(walletClient);
    });

    it('should have undefined walletClient when not provided', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client.walletClient).toBeUndefined();
    });
  });

  describe('X402rClientConfig type', () => {
    it('should accept valid config', () => {
      const config: X402rClientConfig = {
        publicClient,
        operatorAddress,
      };

      expect(config.publicClient).toBeDefined();
      expect(config.operatorAddress).toBeDefined();
    });

    it('should accept config with all optional fields', () => {
      const config: X402rClientConfig = {
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        refundRequestAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      };

      expect(config.escrowAddress).toBeDefined();
      expect(config.refundRequestAddress).toBeDefined();
    });
  });

  // ============ Stubbed Payment Query Methods ============
  // These methods throw NotImplementedError as they require subgraph integration

  describe('getPaymentState', () => {
    it('should throw NotImplementedError', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfo = {
        operator: operatorAddress,
        payer: '0x2345678901234567890123456789012345678901' as const,
        receiver: '0x3456789012345678901234567890123456789012' as const,
        token: '0x4567890123456789012345678901234567890123' as const,
        maxAmount: BigInt('1000000'),
        preApprovalExpiry: 0n,
        authorizationExpiry: BigInt(1735689600),
        refundExpiry: BigInt(1738368000),
        minFeeBps: 0,
        maxFeeBps: 500,
        feeReceiver: '0x5678901234567890123456789012345678901234' as const,
        salt: BigInt('0x123456'),
      };

      await expect(client.getPaymentState(paymentInfo)).rejects.toThrow(NotImplementedError);
    });
  });

  describe('paymentExists', () => {
    it('should throw NotImplementedError', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      await expect(client.paymentExists(paymentInfoHash)).rejects.toThrow(NotImplementedError);
    });
  });

  describe('isInEscrow', () => {
    it('should throw NotImplementedError', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      await expect(client.isInEscrow(paymentInfoHash)).rejects.toThrow(NotImplementedError);
    });
  });

  describe('getPaymentDetails', () => {
    it('should throw NotImplementedError', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      await expect(client.getPaymentDetails(paymentInfoHash)).rejects.toThrow(NotImplementedError);
    });
  });

  describe('getMyPayments', () => {
    it('should throw NotImplementedError', async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(client.getMyPayments()).rejects.toThrow(NotImplementedError);
    });
  });
});
