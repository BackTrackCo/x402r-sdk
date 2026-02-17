import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rMerchant } from "../src/merchant.js";
import type { PublicClient, WalletClient } from "viem";

// Mock viem clients
const createMockPublicClient = (): PublicClient => {
  return {
    chain: { id: 84532 },
    readContract: vi.fn(),
    watchContractEvent: vi.fn(),
    getContractEvents: vi.fn().mockResolvedValue([]),
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

describe("X402rMerchant - Payment Operations", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const escrowAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

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

  describe("release", () => {
    it("should submit release transaction", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const amount = BigInt("500000");

      const result = await merchant.release(samplePaymentInfo, amount);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          functionName: "release",
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });
  });

  describe("refundInEscrow", () => {
    it("should submit refund in escrow transaction", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const amount = BigInt("500000");

      const result = await merchant.refundInEscrow(samplePaymentInfo, amount);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: operatorAddress,
          functionName: "refundInEscrow",
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });
  });

  describe("getReceiverPayments", () => {
    it("should return full PaymentInfo from AuthorizationCreated + escrow events", async () => {
      const hash1 = "0xaaa0000000000000000000000000000000000000000000000000000000000001" as const;

      const getContractEventsMock = vi.fn();
      // First call: AuthorizationCreated from operator
      getContractEventsMock.mockResolvedValueOnce([{ args: { paymentInfoHash: hash1 } }]);
      // Second call: PaymentAuthorized from escrow
      getContractEventsMock.mockResolvedValueOnce([
        { args: { paymentInfoHash: hash1, paymentInfo: samplePaymentInfo } },
      ]);

      (
        publicClient as unknown as { getContractEvents: ReturnType<typeof vi.fn> }
      ).getContractEvents = getContractEventsMock;

      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress,
      });
      const result = await merchant.getReceiverPayments();
      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe(hash1);
      expect(result[0].paymentInfo.operator).toBe(samplePaymentInfo.operator);
    });

    it("should return empty array when no events found", async () => {
      (
        publicClient as unknown as { getContractEvents: ReturnType<typeof vi.fn> }
      ).getContractEvents = vi.fn().mockResolvedValue([]);
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress,
      });
      const result = await merchant.getReceiverPayments();
      expect(result).toHaveLength(0);
    });
  });

  describe("getPaymentDetails", () => {
    const testHash = "0x1234567890123456789012345678901234567890123456789012345678901234" as const;

    it("should throw if escrowAddress not configured and no store", async () => {
      const merchant = new X402rMerchant({ publicClient, walletClient, operatorAddress });
      await expect(merchant.getPaymentDetails(testHash)).rejects.toThrow("Escrow address required");
    });

    it("should resolve PaymentInfo from escrow events", async () => {
      (
        publicClient as unknown as { getContractEvents: ReturnType<typeof vi.fn> }
      ).getContractEvents = vi
        .fn()
        .mockResolvedValue([
          { args: { paymentInfoHash: testHash, paymentInfo: samplePaymentInfo } },
        ]);

      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress,
      });
      const result = await merchant.getPaymentDetails(testHash);
      expect(result.operator).toBe(samplePaymentInfo.operator);
    });

    it("should throw if not found", async () => {
      (
        publicClient as unknown as { getContractEvents: ReturnType<typeof vi.fn> }
      ).getContractEvents = vi.fn().mockResolvedValue([]);

      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress,
      });
      await expect(merchant.getPaymentDetails(testHash)).rejects.toThrow("PaymentInfo not found");
    });
  });

  describe("getPaymentAmounts", () => {
    it("should return capturable and refundable amounts", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress,
      });

      const mockState = [true, BigInt("750000"), BigInt("250000")] as const;
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockState);

      const amounts = await merchant.getPaymentAmounts(samplePaymentInfo);
      expect(amounts.capturableAmount).toBe(BigInt("750000"));
      expect(amounts.refundableAmount).toBe(BigInt("250000"));
    });

    it("should throw if escrowAddress not configured", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(merchant.getPaymentAmounts(samplePaymentInfo)).rejects.toThrow(
        "Escrow address required",
      );
    });

    it("should handle zero amounts", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress,
      });

      const mockState = [true, 0n, 0n] as const;
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockState);

      const amounts = await merchant.getPaymentAmounts(samplePaymentInfo);
      expect(amounts.capturableAmount).toBe(0n);
      expect(amounts.refundableAmount).toBe(0n);
    });
  });
});
