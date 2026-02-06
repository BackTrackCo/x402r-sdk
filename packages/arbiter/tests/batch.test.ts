import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rArbiter } from "../src/arbiter.js";
import type { PublicClient, WalletClient } from "viem";

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
    writeContract: vi.fn().mockResolvedValue("0xtxhash"),
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
    chain: { id: 84532 },
  } as unknown as WalletClient;
};

describe("X402rArbiter - Batch Operations", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const refundRequestAddress =
    "0xcccccccccccccccccccccccccccccccccccccccc" as const;

  const createPaymentInfo = (salt: bigint) => ({
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
    salt,
  });

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("batchApprove", () => {
    it("should approve multiple refund requests", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const paymentInfos = [
        createPaymentInfo(BigInt("0x111")),
        createPaymentInfo(BigInt("0x222")),
        createPaymentInfo(BigInt("0x333")),
      ];

      const results = await arbiter.batchApprove(paymentInfos);

      expect(results).toHaveLength(3);
      expect(walletClient.writeContract).toHaveBeenCalledTimes(3);
      for (const result of results) {
        expect(result.txHash).toBe("0xtxhash");
      }
    });

    it("should return empty array for empty input", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const results = await arbiter.batchApprove([]);

      expect(results).toHaveLength(0);
      expect(walletClient.writeContract).not.toHaveBeenCalled();
    });

    it("should throw if refundRequestAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const paymentInfos = [createPaymentInfo(BigInt("0x111"))];

      await expect(arbiter.batchApprove(paymentInfos)).rejects.toThrow(
        "RefundRequest address required",
      );
    });
  });

  describe("batchDeny", () => {
    it("should deny multiple refund requests", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const paymentInfos = [
        createPaymentInfo(BigInt("0x111")),
        createPaymentInfo(BigInt("0x222")),
      ];

      const results = await arbiter.batchDeny(paymentInfos);

      expect(results).toHaveLength(2);
      expect(walletClient.writeContract).toHaveBeenCalledTimes(2);
      for (const result of results) {
        expect(result.txHash).toBe("0xtxhash");
      }
    });

    it("should return empty array for empty input", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const results = await arbiter.batchDeny([]);

      expect(results).toHaveLength(0);
      expect(walletClient.writeContract).not.toHaveBeenCalled();
    });

    it("should throw if refundRequestAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const paymentInfos = [createPaymentInfo(BigInt("0x111"))];

      await expect(arbiter.batchDeny(paymentInfos)).rejects.toThrow(
        "RefundRequest address required",
      );
    });
  });
});
