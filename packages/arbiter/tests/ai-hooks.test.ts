import { describe, it, expect, vi, beforeEach } from "vitest";
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

  describe("CaseEvaluationContext", () => {
    it("should include all required fields", () => {
      const context: CaseEvaluationContext = {
        paymentInfo: samplePaymentInfo,
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      expect(context.paymentInfo).toBe(samplePaymentInfo);
      expect(context.paymentState).toBe(PaymentState.InEscrow);
      expect(context.refundStatus).toBe(RequestStatus.Pending);
      expect(context.paymentInfoHash).toBeDefined();
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
        paymentState: PaymentState.InEscrow,
        refundStatus: RequestStatus.Pending,
        paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      };

      await handler(context);

      expect(walletClient.writeContract).not.toHaveBeenCalled();
    });
  });
});
