import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rClient } from "../src/client.js";
import { RequestStatus } from "@x402r/core";
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

describe("X402rClient - Refund Operations", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const refundRequestAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

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

  describe("hasRefundRequest", () => {
    it("should return true when refund request exists", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const exists = await client.hasRefundRequest(samplePaymentInfo, 0n);
      expect(exists).toBe(true);
    });

    it("should return false when no refund request exists", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const exists = await client.hasRefundRequest(samplePaymentInfo, 0n);
      expect(exists).toBe(false);
    });

    it("should throw if refundRequestAddress not configured", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      await expect(client.hasRefundRequest(samplePaymentInfo, 0n)).rejects.toThrow(
        "RefundRequest address required",
      );
    });
  });

  describe("getRefundStatus", () => {
    it("should return refund request status", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        RequestStatus.Pending,
      );

      const status = await client.getRefundStatus(samplePaymentInfo, 0n);
      expect(status).toBe(RequestStatus.Pending);
    });

    it("should return Approved status", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        RequestStatus.Approved,
      );

      const status = await client.getRefundStatus(samplePaymentInfo, 0n);
      expect(status).toBe(RequestStatus.Approved);
    });
  });

  describe("requestRefund", () => {
    it("should require walletClient", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      await expect(client.requestRefund(samplePaymentInfo, BigInt("500000"), 0n)).rejects.toThrow(
        "WalletClient required",
      );
    });

    it("should submit refund request transaction with amount and nonce", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await client.requestRefund(samplePaymentInfo, BigInt("500000"), 0n);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          functionName: "requestRefund",
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });
  });

  describe("cancelRefundRequest", () => {
    it("should require walletClient", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      await expect(client.cancelRefundRequest(samplePaymentInfo, 0n)).rejects.toThrow(
        "WalletClient required",
      );
    });

    it("should submit cancel request transaction with nonce", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const result = await client.cancelRefundRequest(samplePaymentInfo, 0n);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          functionName: "cancelRefundRequest",
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });
  });

  describe("getMyRefundRequests", () => {
    it("should require walletClient", async () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestAddress,
      });

      await expect(client.getMyRefundRequests(0n, 10n)).rejects.toThrow("WalletClient required");
    });

    it("should return paginated refund request keys for payer", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const mockKeys = [
        "0x1234567890123456789012345678901234567890123456789012345678901234",
        "0xabcdef1234567890123456789012345678901234567890123456789012345678",
      ] as const;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([mockKeys, 2n]);

      const result = await client.getMyRefundRequests(0n, 10n);
      expect(result.keys).toHaveLength(2);
      expect(result.total).toBe(2n);
    });
  });
});
