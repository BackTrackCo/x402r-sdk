import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { X402rArbiter } from "../src/arbiter.js";
import {
  createWebhookHandler,
  type CaseEvaluationContext,
  type DecisionResult,
} from "../src/ai-hooks.js";
import { PaymentState, RequestStatus } from "@x402r/core";
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
    chain: { id: 84532 },
  } as unknown as WalletClient;
};

describe("AI Integration", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const refundRequestAddress = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
  const refundRequestEvidenceAddress = "0xdddddddddddddddddddddddddddddddddddddd" as const;

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("CaseEvaluationContext", () => {
    it("should include all required fields", () => {
      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      expect(context.paymentInfo).toBe(samplePaymentInfo);
      expect(context.paymentState).toBe(PaymentState.InEscrow);
      expect(context.refundStatus).toBe(RequestStatus.Pending);
      expect(context.paymentInfoHash).toBeDefined();
      expect(context.nonce).toBe(0n);
    });
  });

  describe("DecisionResult", () => {
    it("should support approve decision", () => {
      const result: DecisionResult = {
        decision: "approve",
        reasoning: "Clear evidence of service not provided",
        confidence: 0.95,
      };

      expect(result.decision).toBe("approve");
      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should support deny decision", () => {
      const result: DecisionResult = {
        decision: "deny",
        reasoning: "Service was delivered as described",
        confidence: 0.88,
      };

      expect(result.decision).toBe("deny");
    });

    it("should support partial refund amount", () => {
      const result: DecisionResult = {
        decision: "approve",
        refundAmount: BigInt("500000"),
      };

      expect(result.refundAmount).toBe(BigInt("500000"));
    });
  });

  describe("createWebhookHandler", () => {
    it("should create a handler that evaluates cases", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.9,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      const result = await handler(context);

      expect(evaluationHook).toHaveBeenCalledWith(context);
      expect(result.decision).toBe("approve");
    });

    it("should auto-execute when enabled", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.95,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: true,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      await handler(context);

      expect(walletClient.writeContract).toHaveBeenCalled();
    });

    it("should not auto-execute when disabled", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.95,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: false,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      await handler(context);

      expect(walletClient.writeContract).not.toHaveBeenCalled();
    });

    // ============ Evidence Fetching Tests ============

    it("should fetch evidence and pass to hook when fetchEvidence is true", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
        refundRequestEvidenceAddress,
      });

      // Mock readContract for getEvidenceCount and getEvidenceBatch
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ functionName }: { functionName: string }) => {
          if (functionName === "getEvidenceCount") return 2n;
          if (functionName === "getEvidenceBatch") {
            return [
              [
                {
                  submitter: "0x2345678901234567890123456789012345678901",
                  role: 0,
                  timestamp: 1700000000n,
                  cid: "QmTest1",
                },
                {
                  submitter: "0x3456789012345678901234567890123456789012",
                  role: 1,
                  timestamp: 1700000001n,
                  cid: "QmTest2",
                },
              ],
              2n,
            ];
          }
          return undefined;
        },
      );

      // Mock fetch for IPFS
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify({ description: "evidence content" }),
        }),
      );

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.9,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        fetchEvidence: true,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      await handler(context);

      // The hook should have been called with evidence populated on context
      const hookCall = evaluationHook.mock.calls[0][0] as CaseEvaluationContext;
      expect(hookCall.evidence).toHaveLength(2);
      expect(hookCall.evidence![0].cid).toBe("QmTest1");
      expect(hookCall.evidence![1].cid).toBe("QmTest2");
      expect(hookCall.evidenceContent).toHaveLength(2);
      expect(hookCall.evidenceContent![0]).toEqual({ description: "evidence content" });
      expect(hookCall.evidenceContent![1]).toEqual({ description: "evidence content" });
    });

    it("should return null for IPFS content when fetch fails", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
        refundRequestEvidenceAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ functionName }: { functionName: string }) => {
          if (functionName === "getEvidenceCount") return 2n;
          if (functionName === "getEvidenceBatch") {
            return [
              [
                {
                  submitter: "0x2345678901234567890123456789012345678901",
                  role: 0,
                  timestamp: 1700000000n,
                  cid: "QmTest1",
                },
                {
                  submitter: "0x3456789012345678901234567890123456789012",
                  role: 1,
                  timestamp: 1700000001n,
                  cid: "QmTest2",
                },
              ],
              2n,
            ];
          }
          return undefined;
        },
      );

      // First fetch succeeds, second throws
      let fetchCallCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => {
          fetchCallCount++;
          if (fetchCallCount === 1) {
            return {
              ok: true,
              text: async () => JSON.stringify({ description: "first evidence" }),
            };
          }
          throw new Error("IPFS fetch failed");
        }),
      );

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.9,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        fetchEvidence: true,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      await handler(context);

      const hookCall = evaluationHook.mock.calls[0][0] as CaseEvaluationContext;
      expect(hookCall.evidenceContent![0]).toEqual({ description: "first evidence" });
      expect(hookCall.evidenceContent![1]).toBeNull();
    });

    it("should not fetch evidence when address is undefined", async () => {
      // Arbiter WITHOUT refundRequestEvidenceAddress
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.9,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        fetchEvidence: true,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      await handler(context);

      // readContract should NOT have been called (no evidence address)
      expect(publicClient.readContract).not.toHaveBeenCalled();
      // Hook should still be called, but without evidence
      const hookCall = evaluationHook.mock.calls[0][0] as CaseEvaluationContext;
      expect(hookCall.evidence).toBeUndefined();
      expect(hookCall.evidenceContent).toBeUndefined();
    });

    // ============ Confidence Thresholding Tests ============

    it("should not execute when confidence is below threshold", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.7,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: true,
        confidenceThreshold: 0.9,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      const result = await handler(context);

      expect(walletClient.writeContract).not.toHaveBeenCalled();
      expect(result.executed).toBe(false);
      expect(result.decision).toBe("approve");
    });

    it("should execute when confidence equals threshold", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.8,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: true,
        confidenceThreshold: 0.8,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      const result = await handler(context);

      expect(walletClient.writeContract).toHaveBeenCalled();
      expect(result.executed).toBe(true);
    });

    it("should default confidence to 1.0 when not provided", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      // Hook returns decision without confidence field
      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: true,
        confidenceThreshold: 0.8,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      const result = await handler(context);

      // Default confidence of 1.0 >= 0.8 threshold → should execute
      expect(walletClient.writeContract).toHaveBeenCalled();
      expect(result.executed).toBe(true);
    });

    // ============ Deny + Error Path Tests ============

    it("should auto-execute deny decision", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "deny" as const,
        reasoning: "Service delivered as described",
        confidence: 0.95,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: true,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      const result = await handler(context);

      expect(walletClient.writeContract).toHaveBeenCalled();
      expect(result.decision).toBe("deny");
      expect(result.executed).toBe(true);
    });

    it("should return executed: false when tx reverts", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        refundRequestAddress,
      });

      // Make writeContract throw (simulating tx revert)
      (walletClient.writeContract as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Transaction reverted"),
      );

      const evaluationHook = vi.fn().mockResolvedValue({
        decision: "approve" as const,
        confidence: 0.95,
      });

      const handler = createWebhookHandler({
        arbiter,
        evaluationHook,
        autoSubmitDecision: true,
      });

      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        nonce: 0n,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      const result = await handler(context);

      expect(result.executed).toBe(false);
      expect(result.decision).toBe("approve");
    });
  });
});
