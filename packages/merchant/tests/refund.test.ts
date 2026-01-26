import { describe, it, expect, vi, beforeEach } from 'vitest';
import { X402rMerchant } from '../src/merchant.js';
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

describe('X402rMerchant - Refund Handling', () => {
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

  describe('hasRefundRequest', () => {
    it('should return true when refund request exists', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const exists = await merchant.hasRefundRequest(samplePaymentInfo);
      expect(exists).toBe(true);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(merchant.hasRefundRequest(samplePaymentInfo)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('getRefundStatus', () => {
    it('should return refund request status', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        RequestStatus.Pending
      );

      const status = await merchant.getRefundStatus(samplePaymentInfo);
      expect(status).toBe(RequestStatus.Pending);
    });
  });

  describe('approveRefundRequest', () => {
    it('should submit approve transaction', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await merchant.approveRefundRequest(samplePaymentInfo);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          functionName: 'updateStatus',
          args: expect.arrayContaining([expect.anything(), RequestStatus.Approved]),
        })
      );
      expect(result.txHash).toBe('0xtxhash');
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(merchant.approveRefundRequest(samplePaymentInfo)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('denyRefundRequest', () => {
    it('should submit deny transaction', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await merchant.denyRefundRequest(samplePaymentInfo);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          functionName: 'updateStatus',
          args: expect.arrayContaining([expect.anything(), RequestStatus.Denied]),
        })
      );
      expect(result.txHash).toBe('0xtxhash');
    });
  });

  describe('getPendingRefundRequests', () => {
    it('should return refund request hashes for receiver', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const mockHashes = [
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0xabcdef1234567890123456789012345678901234567890123456789012345678',
      ] as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockHashes);

      const hashes = await merchant.getPendingRefundRequests();
      expect(hashes).toHaveLength(2);
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(merchant.getPendingRefundRequests()).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });
});
