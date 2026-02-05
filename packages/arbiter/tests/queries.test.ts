import { describe, it, expect, vi, beforeEach } from 'vitest';
import { X402rArbiter } from '../src/arbiter.js';
import { RequestStatus } from '@x402r/core';
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

describe('X402rArbiter - Case Queries', () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
  const refundRequestAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as const;

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

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe('getPendingRefundRequests', () => {
    it('should return paginated pending refund request keys for arbiter', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const mockKeys = [
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0xabcdef1234567890123456789012345678901234567890123456789012345678',
      ] as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([mockKeys, 2n]);

      const result = await arbiter.getPendingRefundRequests(0n, 10n);
      expect(result.keys).toHaveLength(2);
      expect(result.total).toBe(2n);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.getPendingRefundRequests(0n, 10n)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('getRefundStatus', () => {
    it('should return refund request status with nonce', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        RequestStatus.Pending
      );

      const status = await arbiter.getRefundStatus(samplePaymentInfo, 0n);
      expect(status).toBe(RequestStatus.Pending);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.getRefundStatus(samplePaymentInfo, 0n)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('getRefundRequestCount', () => {
    it('should return total count of refund requests for a receiver', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(5n);

      const count = await arbiter.getRefundRequestCount();
      expect(count).toBe(5n);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.getRefundRequestCount()).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('getRefundRequestByKey', () => {
    it('should return refund request data by composite key', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const mockRequest = {
        amount: 1000000n,
        status: RequestStatus.Pending,
        payer: '0x1234567890123456789012345678901234567890',
        receiver: '0xabcdef1234567890123456789012345678901234',
      };

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockRequest);

      const compositeKey = '0x1111111111111111111111111111111111111111111111111111111111111111' as const;
      const result = await arbiter.getRefundRequestByKey(compositeKey);
      expect(result.amount).toBe(1000000n);
      expect(result.status).toBe(RequestStatus.Pending);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const compositeKey = '0x1111111111111111111111111111111111111111111111111111111111111111' as const;
      await expect(arbiter.getRefundRequestByKey(compositeKey)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });
});
