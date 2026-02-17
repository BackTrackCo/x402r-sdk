import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rClient } from "../src/client.js";
import type { PublicClient, WalletClient } from "viem";

// Mock viem clients
const createMockPublicClient = (): PublicClient => {
  return {
    chain: { id: 84532 },
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
  } as unknown as WalletClient;
};

describe("X402rClient - Escrow Operations", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const escrowRecorderAddress = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

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

  describe("freezePayment", () => {
    it("should require walletClient", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      await expect(client.freezePayment(samplePaymentInfo, escrowRecorderAddress)).rejects.toThrow(
        "WalletClient required",
      );
    });

    it("should submit freeze transaction", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const result = await client.freezePayment(samplePaymentInfo, escrowRecorderAddress);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: escrowRecorderAddress,
          functionName: "freeze",
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });
  });

  describe("unfreezePayment", () => {
    it("should require walletClient", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      await expect(
        client.unfreezePayment(samplePaymentInfo, escrowRecorderAddress),
      ).rejects.toThrow("WalletClient required");
    });

    it("should submit unfreeze transaction", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const result = await client.unfreezePayment(samplePaymentInfo, escrowRecorderAddress);

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
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const frozen = await client.isFrozen(samplePaymentInfo, escrowRecorderAddress);
      expect(frozen).toBe(true);
    });

    it("should return false when payment is not frozen", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const frozen = await client.isFrozen(samplePaymentInfo, escrowRecorderAddress);
      expect(frozen).toBe(false);
    });
  });

  describe("getAuthorizationTime", () => {
    it("should return authorization timestamp", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      const timestamp = BigInt(1735689600);
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(timestamp);

      const authTime = await client.getAuthorizationTime(samplePaymentInfo, escrowRecorderAddress);
      expect(authTime).toBe(timestamp);
    });

    it("should return 0 for non-existent payment", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(BigInt(0));

      const authTime = await client.getAuthorizationTime(samplePaymentInfo, escrowRecorderAddress);
      expect(authTime).toBe(BigInt(0));
    });
  });

  describe("isDuringEscrowPeriod", () => {
    it("should return true when still in escrow period", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await client.isDuringEscrowPeriod(samplePaymentInfo, escrowRecorderAddress);
      expect(result).toBe(true);
    });

    it("should return false when escrow period has passed", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await client.isDuringEscrowPeriod(samplePaymentInfo, escrowRecorderAddress);
      expect(result).toBe(false);
    });
  });
});
