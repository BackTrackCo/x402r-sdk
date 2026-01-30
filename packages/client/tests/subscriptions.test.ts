import { describe, it, expect, vi, beforeEach } from 'vitest';
import { X402rClient } from '../src/client.js';
import type { PublicClient, WalletClient } from 'viem';

// Mock viem clients
const createMockPublicClient = (): PublicClient => {
  const unsubscribeMock = vi.fn();
  return {
    readContract: vi.fn(),
    watchContractEvent: vi.fn().mockReturnValue(unsubscribeMock),
    getChainId: vi.fn().mockResolvedValue(84532),
  } as unknown as PublicClient;
};

const createMockWalletClient = (): WalletClient => {
  return {
    writeContract: vi.fn().mockResolvedValue('0xtxhash'),
    account: {
      address: '0x1234567890123456789012345678901234567890',
    },
  } as unknown as WalletClient;
};

describe('X402rClient - Subscriptions', () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
  const refundRequestAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
  const escrowRecorderAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as const;

  const paymentInfoHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe('watchPaymentState', () => {
    it('should return unsubscribe function', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = client.watchPaymentState(paymentInfoHash, callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should watch ReleaseExecuted, RefundInEscrowExecuted, and RefundPostEscrowExecuted events', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      client.watchPaymentState(paymentInfoHash, callback);

      // Should be called 3 times - ReleaseExecuted, RefundInEscrowExecuted, RefundPostEscrowExecuted
      expect(publicClient.watchContractEvent).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe from all watchers', () => {
      const unsubscribeMock = vi.fn();
      (publicClient.watchContractEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        unsubscribeMock
      );

      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = client.watchPaymentState(paymentInfoHash, callback);
      unsubscribe();

      // Should have been called 3 times (once per event watcher)
      expect(unsubscribeMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('watchRefundRequests', () => {
    it('should return unsubscribe function', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = client.watchRefundRequests(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should throw if refundRequestAddress not configured', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      expect(() => client.watchRefundRequests(callback)).toThrow(
        'RefundRequest address required'
      );
    });

    it('should watch RefundRequested, RefundRequestStatusUpdated, and RefundRequestCancelled events', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      client.watchRefundRequests(callback);

      // Should be called 3 times - once for each event type
      expect(publicClient.watchContractEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('watchMyPayments', () => {
    it('should require walletClient', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      expect(() => client.watchMyPayments(callback)).toThrow('WalletClient required');
    });

    it('should return unsubscribe function', () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = client.watchMyPayments(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should watch AuthorizationCreated events filtered by payer', () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      client.watchMyPayments(callback);

      expect(publicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          eventName: 'AuthorizationCreated',
          args: {
            payer: walletClient.account!.address,
          },
        })
      );
    });
  });

  describe('watchFreezeEvents', () => {
    it('should return unsubscribe function', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = client.watchFreezeEvents(escrowRecorderAddress, callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should watch PaymentFrozen and PaymentUnfrozen events', () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      client.watchFreezeEvents(escrowRecorderAddress, callback);

      // Should be called twice - once for PaymentFrozen, once for PaymentUnfrozen
      expect(publicClient.watchContractEvent).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from all watchers', () => {
      const unsubscribeMock = vi.fn();
      (publicClient.watchContractEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        unsubscribeMock
      );

      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = client.watchFreezeEvents(escrowRecorderAddress, callback);
      unsubscribe();

      // Should have been called twice (once per event watcher)
      expect(unsubscribeMock).toHaveBeenCalledTimes(2);
    });
  });
});
