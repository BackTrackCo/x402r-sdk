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

describe('X402rArbiter - Decision Submission', () => {
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

  describe('approveRefund', () => {
    it('should submit approve transaction', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await arbiter.approveRefund(samplePaymentInfo);

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
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.approveRefund(samplePaymentInfo)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('denyRefund', () => {
    it('should submit deny transaction', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await arbiter.denyRefund(samplePaymentInfo);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          functionName: 'updateStatus',
          args: expect.arrayContaining([expect.anything(), RequestStatus.Denied]),
        })
      );
      expect(result.txHash).toBe('0xtxhash');
    });

    it('should throw if refundRequestAddress not configured', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.denyRefund(samplePaymentInfo)).rejects.toThrow(
        'RefundRequest address required'
      );
    });
  });

  describe('executeRefundInEscrow', () => {
    it('should submit refund transaction to operator', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const amount = BigInt('500000');
      const result = await arbiter.executeRefundInEscrow(samplePaymentInfo, amount);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          functionName: 'refundInEscrow',
          args: [expect.anything(), amount],
        })
      );
      expect(result.txHash).toBe('0xtxhash');
    });

    it('should use maxAmount when no amount specified', async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await arbiter.executeRefundInEscrow(samplePaymentInfo);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          functionName: 'refundInEscrow',
          args: [expect.anything(), samplePaymentInfo.maxAmount],
        })
      );
      expect(result.txHash).toBe('0xtxhash');
    });
  });
});
