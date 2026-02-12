import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PublicClient, WalletClient } from "viem";
import {
  submitEvidence,
  getEvidence,
  getEvidenceCount,
  getEvidenceBatch,
  getAllEvidence,
  watchEvidenceSubmissions,
  type EvidenceReadContext,
  type EvidenceWriteContext,
} from "../src/shared/evidence-operations.js";
import type { PaymentInfo } from "../src/types/index.js";

const mockPublicClient = {
  readContract: vi.fn(),
  watchContractEvent: vi.fn(),
} as unknown as PublicClient;

const mockWalletClient = {
  writeContract: vi.fn(),
  account: {
    address: "0x1234567890123456789012345678901234567890",
  },
  chain: { id: 84532 },
} as unknown as WalletClient;

const evidenceAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

const samplePaymentInfo: PaymentInfo = {
  operator: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  payer: "0x2345678901234567890123456789012345678901",
  receiver: "0x3456789012345678901234567890123456789012",
  token: "0x4567890123456789012345678901234567890123",
  maxAmount: BigInt("1000000"),
  preApprovalExpiry: 0n,
  authorizationExpiry: BigInt(1735689600),
  refundExpiry: BigInt(1738368000),
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: "0x5678901234567890123456789012345678901234",
  salt: BigInt("0x123456"),
};

describe("evidence-operations", () => {
  let readCtx: EvidenceReadContext;
  let writeCtx: EvidenceWriteContext;

  beforeEach(() => {
    vi.clearAllMocks();
    readCtx = {
      publicClient: mockPublicClient,
      refundRequestEvidenceAddress: evidenceAddress,
    };
    writeCtx = {
      publicClient: mockPublicClient,
      walletClient: mockWalletClient,
      refundRequestEvidenceAddress: evidenceAddress,
    };
  });

  describe("submitEvidence", () => {
    it("should call writeContract with correct args", async () => {
      const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      (mockWalletClient.writeContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockTxHash);

      const result = await submitEvidence(writeCtx, samplePaymentInfo, 0n, "QmTestCid123");

      expect(result.txHash).toBe(mockTxHash);
      expect(mockWalletClient.writeContract).toHaveBeenCalledOnce();
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: evidenceAddress,
          functionName: "submitEvidence",
        }),
      );
    });

    it("should throw if walletClient has no account", async () => {
      const noAccountWallet = {
        writeContract: vi.fn(),
        chain: { id: 84532 },
      } as unknown as WalletClient;

      const ctx: EvidenceWriteContext = {
        ...writeCtx,
        walletClient: noAccountWallet,
      };

      await expect(submitEvidence(ctx, samplePaymentInfo, 0n, "QmTestCid")).rejects.toThrow(
        "WalletClient must have an account",
      );
    });
  });

  describe("getEvidence", () => {
    it("should call readContract and return typed Evidence", async () => {
      const mockResult = [
        "0x2345678901234567890123456789012345678901",
        0, // Payer role
        BigInt(1700000000),
        "QmTestCid123",
      ];
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

      const evidence = await getEvidence(readCtx, samplePaymentInfo, 0n, 0n);

      expect(evidence.submitter).toBe("0x2345678901234567890123456789012345678901");
      expect(evidence.role).toBe(0);
      expect(evidence.timestamp).toBe(BigInt(1700000000));
      expect(evidence.cid).toBe("QmTestCid123");
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: evidenceAddress,
          functionName: "getEvidence",
        }),
      );
    });
  });

  describe("getEvidenceCount", () => {
    it("should return bigint count", async () => {
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(3n);

      const count = await getEvidenceCount(readCtx, samplePaymentInfo, 0n);

      expect(count).toBe(3n);
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: evidenceAddress,
          functionName: "getEvidenceCount",
        }),
      );
    });
  });

  describe("getEvidenceBatch", () => {
    it("should return entries and total", async () => {
      const mockEntries = [
        {
          submitter: "0x2345678901234567890123456789012345678901",
          role: 0,
          timestamp: BigInt(1700000000),
          cid: "QmCid1",
        },
        {
          submitter: "0x3456789012345678901234567890123456789012",
          role: 1,
          timestamp: BigInt(1700000100),
          cid: "QmCid2",
        },
      ];
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockEntries,
        2n,
      ]);

      const result = await getEvidenceBatch(readCtx, samplePaymentInfo, 0n, 0n, 10n);

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(2n);
      expect(result.entries[0].cid).toBe("QmCid1");
      expect(result.entries[1].role).toBe(1);
    });

    it("should handle empty batch", async () => {
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([[], 0n]);

      const result = await getEvidenceBatch(readCtx, samplePaymentInfo, 0n, 0n, 10n);

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0n);
    });
  });

  describe("getAllEvidence", () => {
    it("should call count then batch and return full array", async () => {
      const mockEntries = [
        {
          submitter: "0x2345678901234567890123456789012345678901",
          role: 0,
          timestamp: BigInt(1700000000),
          cid: "QmCid1",
        },
      ];

      const readContractMock = mockPublicClient.readContract as ReturnType<typeof vi.fn>;
      // First call: getEvidenceCount returns 1
      readContractMock.mockResolvedValueOnce(1n);
      // Second call: getEvidenceBatch returns entries
      readContractMock.mockResolvedValueOnce([mockEntries, 1n]);

      const entries = await getAllEvidence(readCtx, samplePaymentInfo, 0n);

      expect(entries).toHaveLength(1);
      expect(entries[0].cid).toBe("QmCid1");
      expect(readContractMock).toHaveBeenCalledTimes(2);
    });

    it("should return empty array when count is 0", async () => {
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0n);

      const entries = await getAllEvidence(readCtx, samplePaymentInfo, 0n);

      expect(entries).toHaveLength(0);
      // Should only call count, not batch
      expect(mockPublicClient.readContract).toHaveBeenCalledOnce();
    });
  });

  describe("watchEvidenceSubmissions", () => {
    it("should set up watchContractEvent", () => {
      const mockUnsubscribe = vi.fn();
      (mockPublicClient.watchContractEvent as ReturnType<typeof vi.fn>).mockReturnValue(
        mockUnsubscribe,
      );

      const callback = vi.fn();
      const { unsubscribe } = watchEvidenceSubmissions(readCtx, callback);

      expect(mockPublicClient.watchContractEvent).toHaveBeenCalledOnce();
      expect(mockPublicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: evidenceAddress,
          eventName: "EvidenceSubmitted",
        }),
      );

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledOnce();
    });
  });
});
