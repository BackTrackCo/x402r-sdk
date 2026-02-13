import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rClient, X402rClientConfig } from "../src/client.js";
import { NotImplementedError, PaymentState } from "@x402r/core";
import type { PublicClient, WalletClient } from "viem";

// Mock viem clients
const createMockPublicClient = (): PublicClient => {
  return {
    readContract: vi.fn(),
    watchContractEvent: vi.fn(),
    getContractEvents: vi.fn().mockResolvedValue([]),
    getChainId: vi.fn().mockResolvedValue(84532),
  } as unknown as PublicClient;
};

const createMockWalletClient = (): WalletClient => {
  return {
    writeContract: vi.fn(),
    account: {
      address: "0x1234567890123456789012345678901234567890",
    },
  } as unknown as WalletClient;
};

describe("X402rClient", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create client with required config", () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client).toBeInstanceOf(X402rClient);
    });

    it("should create client with optional walletClient", () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(client).toBeInstanceOf(X402rClient);
    });

    it("should expose operatorAddress", () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client.operatorAddress).toBe(operatorAddress);
    });

    it("should expose publicClient", () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client.publicClient).toBe(publicClient);
    });

    it("should expose walletClient when provided", () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(client.walletClient).toBe(walletClient);
    });

    it("should have undefined walletClient when not provided", () => {
      const client = new X402rClient({
        publicClient,
        operatorAddress,
      });

      expect(client.walletClient).toBeUndefined();
    });
  });

  describe("X402rClientConfig type", () => {
    it("should accept valid config", () => {
      const config: X402rClientConfig = {
        publicClient,
        operatorAddress,
      };

      expect(config.publicClient).toBeDefined();
      expect(config.operatorAddress).toBeDefined();
    });

    it("should accept config with all optional fields", () => {
      const config: X402rClientConfig = {
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        refundRequestAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
        refundRequestEvidenceAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      };

      expect(config.escrowAddress).toBeDefined();
      expect(config.refundRequestAddress).toBeDefined();
      expect(config.refundRequestEvidenceAddress).toBeDefined();
    });
  });

  // ============ Payment Query Methods ============

  const escrowAddress = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

  const samplePaymentInfo = {
    operator: operatorAddress,
    payer: "0x2345678901234567890123456789012345678901" as const,
    receiver: "0x3456789012345678901234567890123456789012" as const,
    token: "0x4567890123456789012345678901234567890123" as const,
    maxAmount: BigInt("1000000"),
    preApprovalExpiry: 0n,
    authorizationExpiry: BigInt(Math.floor(Date.now() / 1000) + 86400),
    refundExpiry: BigInt(Math.floor(Date.now() / 1000) + 172800),
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: "0x5678901234567890123456789012345678901234" as const,
    salt: BigInt("0x123456"),
  };

  describe("getPaymentState", () => {
    it("should throw if escrowAddress not configured", async () => {
      const client = new X402rClient({ publicClient, operatorAddress });
      await expect(client.getPaymentState(samplePaymentInfo)).rejects.toThrow(
        "Escrow address required",
      );
    });

    it("should return NonExistent when payment not found", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([false, 0n, 0n]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      const state = await client.getPaymentState(samplePaymentInfo);
      expect(state).toBe(PaymentState.NonExistent);
    });

    it("should return InEscrow when capturable > 0", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        true,
        1000000n,
        0n,
      ]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      const state = await client.getPaymentState(samplePaymentInfo);
      expect(state).toBe(PaymentState.InEscrow);
    });

    it("should return Released when refundable > 0 but capturable = 0", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        true,
        0n,
        500000n,
      ]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      const state = await client.getPaymentState(samplePaymentInfo);
      expect(state).toBe(PaymentState.Released);
    });

    it("should return Settled when both amounts are 0", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([true, 0n, 0n]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      const state = await client.getPaymentState(samplePaymentInfo);
      expect(state).toBe(PaymentState.Settled);
    });

    it("should return Expired when authorization expired with capturable > 0", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        true,
        1000000n,
        0n,
      ]);
      const expiredPayment = { ...samplePaymentInfo, authorizationExpiry: BigInt(1000) };
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      const state = await client.getPaymentState(expiredPayment);
      expect(state).toBe(PaymentState.Expired);
    });
  });

  describe("paymentExists", () => {
    it("should throw if escrowAddress not configured", async () => {
      const client = new X402rClient({ publicClient, operatorAddress });
      await expect(
        client.paymentExists("0x1234567890123456789012345678901234567890123456789012345678901234"),
      ).rejects.toThrow("Escrow address required");
    });

    it("should return true when payment exists", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        true,
        1000000n,
        0n,
      ]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      expect(
        await client.paymentExists(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ).toBe(true);
    });

    it("should return false when payment does not exist", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([false, 0n, 0n]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      expect(
        await client.paymentExists(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ).toBe(false);
    });
  });

  describe("isInEscrow", () => {
    it("should throw if escrowAddress not configured", async () => {
      const client = new X402rClient({ publicClient, operatorAddress });
      await expect(
        client.isInEscrow("0x1234567890123456789012345678901234567890123456789012345678901234"),
      ).rejects.toThrow("Escrow address required");
    });

    it("should return true when in escrow", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        true,
        1000000n,
        0n,
      ]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      expect(
        await client.isInEscrow(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ).toBe(true);
    });

    it("should return false when not in escrow", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        true,
        0n,
        500000n,
      ]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      expect(
        await client.isInEscrow(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ).toBe(false);
    });

    it("should return false when payment does not exist", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([false, 0n, 0n]);
      const client = new X402rClient({ publicClient, operatorAddress, escrowAddress });
      expect(
        await client.isInEscrow(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ).toBe(false);
    });
  });

  describe("getPaymentDetails", () => {
    it("should throw NotImplementedError (cannot reverse hash)", async () => {
      const client = new X402rClient({ publicClient, operatorAddress });
      await expect(
        client.getPaymentDetails(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ).rejects.toThrow(NotImplementedError);
    });
  });

  describe("getMyPayments", () => {
    it("should throw if walletClient not configured", async () => {
      const client = new X402rClient({ publicClient, operatorAddress });
      await expect(client.getMyPayments()).rejects.toThrow("WalletClient required");
    });

    it("should return hashes from AuthorizationCreated events", async () => {
      const mockLogs = [
        {
          args: {
            paymentInfoHash: "0xaaa0000000000000000000000000000000000000000000000000000000000001",
          },
        },
        {
          args: {
            paymentInfoHash: "0xbbb0000000000000000000000000000000000000000000000000000000000002",
          },
        },
      ];
      (
        publicClient as unknown as { getContractEvents: ReturnType<typeof vi.fn> }
      ).getContractEvents = vi.fn().mockResolvedValue(mockLogs);
      const client = new X402rClient({ publicClient, walletClient, operatorAddress });
      const result = await client.getMyPayments();
      expect(result.hashes).toHaveLength(2);
    });

    it("should return empty array when no events found", async () => {
      (
        publicClient as unknown as { getContractEvents: ReturnType<typeof vi.fn> }
      ).getContractEvents = vi.fn().mockResolvedValue([]);
      const client = new X402rClient({ publicClient, walletClient, operatorAddress });
      const result = await client.getMyPayments();
      expect(result.hashes).toHaveLength(0);
    });
  });

  // ============ Evidence Operations ============

  describe("evidence operations", () => {
    const evidenceAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

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

    it("should accept refundRequestEvidenceAddress in constructor", () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      expect(client.refundRequestEvidenceAddress).toBe(evidenceAddress);
    });

    it("should throw if evidence address not configured", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(client.getEvidenceCount(samplePaymentInfo, 0n)).rejects.toThrow(
        "RefundRequestEvidence address required",
      );
    });

    it("should delegate submitEvidence to shared ops", async () => {
      (walletClient.writeContract as ReturnType<typeof vi.fn>).mockResolvedValue("0xtxhash");

      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      const result = await client.submitEvidence(samplePaymentInfo, 0n, "QmTestCid");
      expect(result.txHash).toBe("0xtxhash");
    });

    it("should delegate getEvidenceCount to shared ops", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(3n);

      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      const count = await client.getEvidenceCount(samplePaymentInfo, 0n);
      expect(count).toBe(3n);
    });

    it("should delegate getAllEvidence to shared ops", async () => {
      const readContractMock = publicClient.readContract as ReturnType<typeof vi.fn>;
      readContractMock.mockResolvedValueOnce(1n);
      readContractMock.mockResolvedValueOnce([
        [
          {
            submitter: "0x2345678901234567890123456789012345678901",
            role: 0,
            timestamp: BigInt(1700000000),
            cid: "QmCid1",
          },
        ],
        1n,
      ]);

      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      const entries = await client.getAllEvidence(samplePaymentInfo, 0n);
      expect(entries).toHaveLength(1);
      expect(entries[0].cid).toBe("QmCid1");
    });
  });

  // ============ Evidence Operations ============

  describe("evidence operations", () => {
    const evidenceAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

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

    it("should accept refundRequestEvidenceAddress in constructor", () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      expect(client.refundRequestEvidenceAddress).toBe(evidenceAddress);
    });

    it("should throw if evidence address not configured", async () => {
      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(client.getEvidenceCount(samplePaymentInfo, 0n)).rejects.toThrow(
        "RefundRequestEvidence address required",
      );
    });

    it("should delegate submitEvidence to shared ops", async () => {
      (walletClient.writeContract as ReturnType<typeof vi.fn>).mockResolvedValue("0xtxhash");

      const client = new X402rClient({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      const result = await client.submitEvidence(samplePaymentInfo, 0n, "QmTestCid");
      expect(result.txHash).toBe("0xtxhash");
    });

    it("should delegate getEvidenceCount to shared ops", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(3n);

      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      const count = await client.getEvidenceCount(samplePaymentInfo, 0n);
      expect(count).toBe(3n);
    });

    it("should delegate getAllEvidence to shared ops", async () => {
      const readContractMock = publicClient.readContract as ReturnType<typeof vi.fn>;
      readContractMock.mockResolvedValueOnce(1n);
      readContractMock.mockResolvedValueOnce([
        [
          {
            submitter: "0x2345678901234567890123456789012345678901",
            role: 0,
            timestamp: BigInt(1700000000),
            cid: "QmCid1",
          },
        ],
        1n,
      ]);

      const client = new X402rClient({
        publicClient,
        operatorAddress,
        refundRequestEvidenceAddress: evidenceAddress,
      });

      const entries = await client.getAllEvidence(samplePaymentInfo, 0n);
      expect(entries).toHaveLength(1);
      expect(entries[0].cid).toBe("QmCid1");
    });
  });
});
