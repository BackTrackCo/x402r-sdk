import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rMerchant } from "../src/merchant.js";
import { NotImplementedError } from "@x402r/core";
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
    it("should throw NotImplementedError", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(merchant.getReceiverPayments()).rejects.toThrow(
        NotImplementedError,
      );
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
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockState,
      );

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

      await expect(
        merchant.getPaymentAmounts(samplePaymentInfo),
      ).rejects.toThrow("Escrow address required");
    });
  });
});
