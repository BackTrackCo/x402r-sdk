import { describe, it, expect, vi, beforeEach } from 'vitest';
import { X402rClient, X402rClientConfig } from '../src/client.js';
import { PaymentState } from '@x402r/core';
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

  describe('getPaymentState', () => {
    it('should call contract with correct parameters', async () => {
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
        preApprovalExpiry: BigInt(0),
        authorizationExpiry: BigInt(1735689600),
        refundExpiry: BigInt(1738368000),
        minFeeBps: 0,
        maxFeeBps: 500,
        feeReceiver: '0x5678901234567890123456789012345678901234' as const,
        salt: BigInt('0x123456'),
      };

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        PaymentState.InEscrow
      );

      const state = await client.getPaymentState(paymentInfo);

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          functionName: 'getPaymentState',
        })
      );
      expect(state).toBe(PaymentState.InEscrow);
    });

    it('should return NonExistent for unknown payment', async () => {
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
        preApprovalExpiry: BigInt(0),
        authorizationExpiry: BigInt(1735689600),
        refundExpiry: BigInt(1738368000),
        minFeeBps: 0,
        maxFeeBps: 500,
        feeReceiver: '0x5678901234567890123456789012345678901234' as const,
        salt: BigInt('0x123456'),
      };

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        PaymentState.NonExistent
      );

      const state = await client.getPaymentState(paymentInfo);
      expect(state).toBe(PaymentState.NonExistent);
    });
  });

  describe('paymentExists', () => {
    it('should return true for existing payment', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const exists = await client.paymentExists(paymentInfoHash);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing payment', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const exists = await client.paymentExists(paymentInfoHash);
      expect(exists).toBe(false);
    });
  });

  describe('isInEscrow', () => {
    it('should return true when payment is in escrow', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const inEscrow = await client.isInEscrow(paymentInfoHash);
      expect(inEscrow).toBe(true);
    });

    it('should return false when payment is not in escrow', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const inEscrow = await client.isInEscrow(paymentInfoHash);
      expect(inEscrow).toBe(false);
    });
  });

  describe('getPaymentDetails', () => {
    it('should return payment info for existing payment', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

      const mockPaymentInfo = {
        operator: operatorAddress,
        payer: '0x2345678901234567890123456789012345678901',
        receiver: '0x3456789012345678901234567890123456789012',
        token: '0x4567890123456789012345678901234567890123',
        maxAmount: BigInt('1000000'),
        preApprovalExpiry: BigInt(0),
        authorizationExpiry: BigInt(1735689600),
        refundExpiry: BigInt(1738368000),
        minFeeBps: 0,
        maxFeeBps: 500,
        feeReceiver: '0x5678901234567890123456789012345678901234',
        salt: BigInt('0x123456'),
      };

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaymentInfo);

      const details = await client.getPaymentDetails(paymentInfoHash);
      expect(details.payer).toBe(mockPaymentInfo.payer);
      expect(details.receiver).toBe(mockPaymentInfo.receiver);
    });
  });

  describe('getMyPayments', () => {
    it('should require walletClient', async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      await expect(client.getMyPayments()).rejects.toThrow('WalletClient required');
    });

    it('should return payment hashes for payer', async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const mockHashes = [
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0xabcdef1234567890123456789012345678901234567890123456789012345678',
      ] as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockHashes);

      const result = await client.getMyPayments();
      expect(result.hashes).toHaveLength(2);
      expect(result.hashes[0]).toBe(mockHashes[0]);
    });
  });
});
