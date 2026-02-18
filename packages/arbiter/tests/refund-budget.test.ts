import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rArbiter } from "../src/arbiter.js";
import type { PublicClient, WalletClient } from "viem";

const RECEIVER_REFUND_COLLECTOR = "0xdddddddddddddddddddddddddddddddddddddd" as const;
const TOKEN_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;
const OPERATOR_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

const createMockPublicClient = (): PublicClient => {
  return {
    readContract: vi.fn(),
    watchContractEvent: vi.fn(),
    getChainId: vi.fn().mockResolvedValue(84532),
    chain: { id: 84532 },
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

const createPaymentInfo = () => ({
  operator: OPERATOR_ADDRESS,
  payer: "0x2345678901234567890123456789012345678901" as const,
  receiver: "0x1234567890123456789012345678901234567890" as const,
  token: TOKEN_ADDRESS,
  maxAmount: BigInt("1000000"),
  preApprovalExpiry: 0n,
  authorizationExpiry: BigInt(1735689600),
  refundExpiry: BigInt(1738368000),
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: "0x5678901234567890123456789012345678901234" as const,
  salt: BigInt("0x123456"),
});

describe("X402rArbiter - Refund Budget", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("config", () => {
    it("should accept receiverRefundCollectorAddress in constructor", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
        receiverRefundCollectorAddress: RECEIVER_REFUND_COLLECTOR,
      });

      expect(arbiter.receiverRefundCollectorAddress).toBe(RECEIVER_REFUND_COLLECTOR);
    });

    it("should default receiverRefundCollectorAddress to undefined", () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
      });

      expect(arbiter.receiverRefundCollectorAddress).toBeUndefined();
    });
  });

  describe("approveRefundBudget", () => {
    it("should call token.approve with collector address and amount", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
        receiverRefundCollectorAddress: RECEIVER_REFUND_COLLECTOR,
      });

      const amount = BigInt("1000000000");
      const result = await arbiter.approveRefundBudget(TOKEN_ADDRESS, amount);

      expect(result.txHash).toBe("0xtxhash");
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: TOKEN_ADDRESS,
          functionName: "approve",
          args: [RECEIVER_REFUND_COLLECTOR, amount],
        }),
      );
    });

    it("should throw if receiverRefundCollectorAddress is not set", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
      });

      await expect(arbiter.approveRefundBudget(TOKEN_ADDRESS, BigInt("1000"))).rejects.toThrow(
        "ReceiverRefundCollector address required",
      );
    });
  });

  describe("getRefundBudget", () => {
    it("should default ownerAddress to own wallet", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(BigInt("5000000"));

      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
        receiverRefundCollectorAddress: RECEIVER_REFUND_COLLECTOR,
      });

      const budget = await arbiter.getRefundBudget(TOKEN_ADDRESS);

      expect(budget).toBe(BigInt("5000000"));
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: TOKEN_ADDRESS,
          functionName: "allowance",
          args: ["0x1234567890123456789012345678901234567890", RECEIVER_REFUND_COLLECTOR],
        }),
      );
    });

    it("should accept explicit ownerAddress", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(BigInt("3000000"));

      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
        receiverRefundCollectorAddress: RECEIVER_REFUND_COLLECTOR,
      });

      const otherOwner = "0x9999999999999999999999999999999999999999" as const;
      const budget = await arbiter.getRefundBudget(TOKEN_ADDRESS, otherOwner);

      expect(budget).toBe(BigInt("3000000"));
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [otherOwner, RECEIVER_REFUND_COLLECTOR],
        }),
      );
    });

    it("should throw if receiverRefundCollectorAddress is not set", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
      });

      await expect(arbiter.getRefundBudget(TOKEN_ADDRESS)).rejects.toThrow(
        "ReceiverRefundCollector address required",
      );
    });
  });

  describe("refundPostEscrow", () => {
    it("should call operator.refundPostEscrow with correct args", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
      });

      const paymentInfo = createPaymentInfo();
      const amount = BigInt("500000");
      const tokenCollector = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

      const result = await arbiter.refundPostEscrow(paymentInfo, amount, tokenCollector, "0x1234");

      expect(result.txHash).toBe("0xtxhash");
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: OPERATOR_ADDRESS,
          functionName: "refundPostEscrow",
          args: [expect.anything(), amount, tokenCollector, "0x1234"],
        }),
      );
    });
  });

  describe("refundPostEscrowFromBudget", () => {
    it("should call refundPostEscrow with collector address and empty data", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
        receiverRefundCollectorAddress: RECEIVER_REFUND_COLLECTOR,
      });

      const paymentInfo = createPaymentInfo();
      const amount = BigInt("500000");
      const result = await arbiter.refundPostEscrowFromBudget(paymentInfo, amount);

      expect(result.txHash).toBe("0xtxhash");
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: OPERATOR_ADDRESS,
          functionName: "refundPostEscrow",
          args: [expect.anything(), amount, RECEIVER_REFUND_COLLECTOR, "0x"],
        }),
      );
    });

    it("should throw if receiverRefundCollectorAddress is not set", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress: OPERATOR_ADDRESS,
      });

      const paymentInfo = createPaymentInfo();
      await expect(
        arbiter.refundPostEscrowFromBudget(paymentInfo, BigInt("500000")),
      ).rejects.toThrow("ReceiverRefundCollector address required");
    });
  });
});
