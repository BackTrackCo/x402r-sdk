import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rArbiter } from "../src/arbiter.js";
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

describe("X402rArbiter - Subscriptions", () => {
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

  describe("watchNewCases", () => {
    it("should return unsubscribe function", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = arbiter.watchNewCases(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should watch RefundRequested events", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      arbiter.watchNewCases(callback);

      expect(publicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          eventName: "RefundRequested",
        }),
      );
    });

    it("should throw if refundRequestAddress not configured", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      expect(() => arbiter.watchNewCases(callback)).toThrow("RefundRequest address required");
    });
  });

  describe("watchDecisions", () => {
    it("should return unsubscribe function", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = arbiter.watchDecisions(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should watch RefundRequestStatusUpdated events", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      arbiter.watchDecisions(callback);

      expect(publicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          eventName: "RefundRequestStatusUpdated",
        }),
      );
    });

    it("should throw if refundRequestAddress not configured", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const callback = vi.fn();
      expect(() => arbiter.watchDecisions(callback)).toThrow("RefundRequest address required");
    });
  });

  describe("watchFreezeEvents", () => {
    it("should return unsubscribe function", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      const { unsubscribe } = arbiter.watchFreezeEvents(escrowRecorderAddress, callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should watch PaymentFrozen and PaymentUnfrozen events", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const callback = vi.fn();
      arbiter.watchFreezeEvents(escrowRecorderAddress, callback);

      expect(publicClient.watchContractEvent).toHaveBeenCalledTimes(2);
    });
  });
});
