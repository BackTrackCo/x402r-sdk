import { describe, it, expect, vi, beforeEach } from 'vitest';
import { X402rArbiter } from '../src/arbiter.js';
import { PaymentState, NotImplementedError } from '@x402r/core';
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
    writeContract: vi.fn().mockResolvedValue('0xtxhash'),
    account: {
      address: '0x1234567890123456789012345678901234567890',
    },
    chain: { id: 84532 },
  } as unknown as WalletClient;
};

describe('X402rArbiter', () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
  const refundRequestAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an arbiter instance with required config', () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(arbiter).toBeInstanceOf(X402rArbiter);
      expect(arbiter.publicClient).toBe(publicClient);
      expect(arbiter.walletClient).toBe(walletClient);
      expect(arbiter.operatorAddress).toBe(operatorAddress);
    });

    it('should create an arbiter instance with optional config', () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
        chainId: 84532,
      });

      expect(arbiter.refundRequestAddress).toBe(refundRequestAddress);
      expect(arbiter.chainId).toBe(84532);
    });

    it('should default chainId to 84532 (Base Sepolia)', () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(arbiter.chainId).toBe(84532);
    });
  });

  describe('getPaymentState', () => {
    it('should throw NotImplementedError', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const samplePaymentInfo = {
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

      await expect(arbiter.getPaymentState(samplePaymentInfo)).rejects.toThrow(NotImplementedError);
    });
  });

  describe('hasRefundRequest', () => {
    it('should check if refund request exists with nonce', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const samplePaymentInfo = {
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

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const exists = await arbiter.hasRefundRequest(samplePaymentInfo, 0n);
      expect(exists).toBe(true);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const samplePaymentInfo = {
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

      await expect(arbiter.hasRefundRequest(samplePaymentInfo, 0n)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });
});
