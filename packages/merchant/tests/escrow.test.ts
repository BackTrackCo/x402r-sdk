import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rMerchant } from "../src/merchant.js";
import type { PublicClient, WalletClient } from "viem";

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
    writeContract: vi.fn().mockResolvedValue("0xtxhash"),
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
    chain: { id: 84532 },
  } as unknown as WalletClient;
};

describe("X402rMerchant - Escrow Management", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const escrowRecorderAddress = "0xdddddddddddddddddddddddddddddddddddddddd" as const;

  const samplePaymentInfo = {
    operator: operatorAddress,
    payer: "0x2345678901234567890123456789012345678901" as const,
    receiver: "0x3456789012345678901234567890123456789012" as const,
    token: "0x4567890123456789012345678901234567890123" as const,
    maxAmount: BigInt("1000000"),
    preApprovalExpiry: 0n,
    authorizationExpiry: BigInt(1735689600),
    refundExpiry: BigInt(1738368000),
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: "0x5678901234567890123456789012345678901234" as const,
    salt: BigInt("0x123456"),
  };

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("unfreezePayment", () => {
    it("should submit unfreeze transaction", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const result = await merchant.unfreezePayment(samplePaymentInfo, escrowRecorderAddress);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: escrowRecorderAddress,
          functionName: "unfreeze",
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });
  });

  describe("isFrozen", () => {
    it("should return true when payment is frozen", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const frozen = await merchant.isFrozen(samplePaymentInfo, escrowRecorderAddress);
      expect(frozen).toBe(true);
    });

    it("should return false when payment is not frozen", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const frozen = await merchant.isFrozen(samplePaymentInfo, escrowRecorderAddress);
      expect(frozen).toBe(false);
    });
  });
});

describe("X402rMerchant - Subscriptions", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const refundRequestAddress = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
  const escrowRecorderAddress = "0xdddddddddddddddddddddddddddddddddddddddd" as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("watchRefundRequests", () => {
    it("should return unsubscribe function", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = merchant.watchRefundRequests(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should throw if refundRequestAddress not configured", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      expect(() => merchant.watchRefundRequests(callback)).toThrow(
        "RefundRequest address required",
      );
    });
  });

  describe("watchReleases", () => {
    it("should return unsubscribe function", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = merchant.watchReleases(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should watch ReleaseExecuted events", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      merchant.watchReleases(callback);

      expect(publicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          eventName: "ReleaseExecuted",
        }),
      );
    });
  });

  describe("watchFreezeEvents", () => {
    it("should return unsubscribe function", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = merchant.watchFreezeEvents(escrowRecorderAddress, callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should watch PaymentFrozen and PaymentUnfrozen events", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      merchant.watchFreezeEvents(escrowRecorderAddress, callback);

      expect(publicClient.watchContractEvent).toHaveBeenCalledTimes(2);
    });
  });
});
