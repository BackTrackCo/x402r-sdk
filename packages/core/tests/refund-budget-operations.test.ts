import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PublicClient, WalletClient } from "viem";
import {
  getRefundBudget,
  approveRefundBudget,
  refundPostEscrow,
  refundPostEscrowFromBudget,
  type RefundBudgetReadContext,
  type RefundBudgetWriteContext,
  type OperatorWriteContext,
} from "../src/shared/refund-budget-operations.js";
import type { PaymentInfo } from "../src/types/index.js";

const COLLECTOR_ADDRESS = "0xdddddddddddddddddddddddddddddddddddddd" as const;
const TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;
const OPERATOR_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const OWNER_ADDRESS = "0x1234567890123456789012345678901234567890" as const;

const mockPublicClient = {
  readContract: vi.fn(),
} as unknown as PublicClient;

const mockWalletClient = {
  writeContract: vi.fn(),
  account: { address: OWNER_ADDRESS },
  chain: { id: 84532 },
} as unknown as WalletClient;

const samplePaymentInfo: PaymentInfo = {
  operator: OPERATOR_ADDRESS,
  payer: "0x2345678901234567890123456789012345678901",
  receiver: "0x3456789012345678901234567890123456789012",
  token: TOKEN_ADDRESS,
  maxAmount: BigInt("1000000"),
  preApprovalExpiry: 0n,
  authorizationExpiry: BigInt(1735689600),
  refundExpiry: BigInt(1738368000),
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: "0x5678901234567890123456789012345678901234",
  salt: BigInt("0x123456"),
};

describe("refund-budget-operations", () => {
  let readCtx: RefundBudgetReadContext;
  let writeCtx: RefundBudgetWriteContext;
  let operatorCtx: OperatorWriteContext;

  beforeEach(() => {
    vi.clearAllMocks();
    readCtx = {
      publicClient: mockPublicClient,
      receiverRefundCollectorAddress: COLLECTOR_ADDRESS,
    };
    writeCtx = {
      publicClient: mockPublicClient,
      walletClient: mockWalletClient,
      receiverRefundCollectorAddress: COLLECTOR_ADDRESS,
    };
    operatorCtx = {
      publicClient: mockPublicClient,
      walletClient: mockWalletClient,
      operatorAddress: OPERATOR_ADDRESS,
    };
  });

  describe("getRefundBudget", () => {
    it("should call readContract with correct allowance args", async () => {
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        BigInt("5000000"),
      );

      const budget = await getRefundBudget(readCtx, TOKEN_ADDRESS, OWNER_ADDRESS);

      expect(budget).toBe(BigInt("5000000"));
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: TOKEN_ADDRESS,
          functionName: "allowance",
          args: [OWNER_ADDRESS, COLLECTOR_ADDRESS],
        }),
      );
    });

    it("should support checking any owner address", async () => {
      const otherOwner = "0x9999999999999999999999999999999999999999" as const;
      (mockPublicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(0n);

      await getRefundBudget(readCtx, TOKEN_ADDRESS, otherOwner);

      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [otherOwner, COLLECTOR_ADDRESS],
        }),
      );
    });
  });

  describe("approveRefundBudget", () => {
    it("should call writeContract with correct approve args", async () => {
      const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      (mockWalletClient.writeContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockTxHash);

      const amount = BigInt("1000000000");
      const result = await approveRefundBudget(writeCtx, TOKEN_ADDRESS, amount);

      expect(result.txHash).toBe(mockTxHash);
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: TOKEN_ADDRESS,
          functionName: "approve",
          args: [COLLECTOR_ADDRESS, amount],
        }),
      );
    });

    it("should throw if walletClient has no account", async () => {
      const noAccountWallet = {
        writeContract: vi.fn(),
        chain: { id: 84532 },
      } as unknown as WalletClient;

      const ctx: RefundBudgetWriteContext = {
        ...writeCtx,
        walletClient: noAccountWallet,
      };

      await expect(approveRefundBudget(ctx, TOKEN_ADDRESS, BigInt("1000"))).rejects.toThrow(
        "WalletClient must have an account",
      );
    });
  });

  describe("refundPostEscrow", () => {
    it("should call writeContract with correct operator args", async () => {
      const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      (mockWalletClient.writeContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockTxHash);

      const amount = BigInt("500000");
      const tokenCollector = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
      const result = await refundPostEscrow(
        operatorCtx,
        samplePaymentInfo,
        amount,
        tokenCollector,
        "0x1234",
      );

      expect(result.txHash).toBe(mockTxHash);
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: OPERATOR_ADDRESS,
          functionName: "refundPostEscrow",
          args: [expect.anything(), amount, tokenCollector, "0x1234"],
        }),
      );
    });

    it("should throw if walletClient has no account", async () => {
      const noAccountWallet = {
        writeContract: vi.fn(),
        chain: { id: 84532 },
      } as unknown as WalletClient;

      const ctx: OperatorWriteContext = {
        ...operatorCtx,
        walletClient: noAccountWallet,
      };

      await expect(
        refundPostEscrow(
          ctx,
          samplePaymentInfo,
          BigInt("500000"),
          "0xcccccccccccccccccccccccccccccccccccccccc",
          "0x",
        ),
      ).rejects.toThrow("WalletClient must have an account");
    });
  });

  describe("refundPostEscrowFromBudget", () => {
    it("should call refundPostEscrow with collector address and empty data", async () => {
      const mockTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      (mockWalletClient.writeContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockTxHash);

      const amount = BigInt("500000");
      const ctx = {
        ...operatorCtx,
        receiverRefundCollectorAddress: COLLECTOR_ADDRESS,
      };

      const result = await refundPostEscrowFromBudget(ctx, samplePaymentInfo, amount);

      expect(result.txHash).toBe(mockTxHash);
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: OPERATOR_ADDRESS,
          functionName: "refundPostEscrow",
          args: [expect.anything(), amount, COLLECTOR_ADDRESS, "0x"],
        }),
      );
    });
  });
});
