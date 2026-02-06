import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PublicClient, WalletClient } from "viem";
import {
  hasRefundRequest,
  getRefundRequest,
  getRefundStatus,
  getRefundRequestByKey,
  approveRefundRequest,
  denyRefundRequest,
  isFrozen,
  watchFreezeEvents,
  RequestStatus,
  type RefundReadContext,
  type RefundWriteContext,
  type FreezeReadContext,
} from "../src/index.js";

const createMockPublicClient = () => {
  return {
    readContract: vi.fn(),
    watchContractEvent: vi.fn().mockReturnValue(vi.fn()),
  } as unknown as PublicClient;
};

const createMockWalletClient = (withAccount = true) => {
  return {
    writeContract: vi.fn().mockResolvedValue("0xtxhash"),
    account: withAccount
      ? { address: "0x1234567890123456789012345678901234567890" }
      : undefined,
    chain: { id: 84532 },
  } as unknown as WalletClient;
};

const refundRequestAddress =
  "0xcccccccccccccccccccccccccccccccccccccccc" as const;
const freezeAddress = "0xdddddddddddddddddddddddddddddddddddddd" as const;

const samplePaymentInfo = {
  operator: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
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

describe("Shared Refund Operations", () => {
  let publicClient: PublicClient;
  let ctx: RefundReadContext;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    ctx = { publicClient, refundRequestAddress };
    vi.clearAllMocks();
  });

  describe("hasRefundRequest", () => {
    it("should return true when request exists", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      const result = await hasRefundRequest(ctx, samplePaymentInfo, 0n);
      expect(result).toBe(true);
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: refundRequestAddress,
          functionName: "hasRefundRequest",
        }),
      );
    });

    it("should return false when request does not exist", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      const result = await hasRefundRequest(ctx, samplePaymentInfo, 0n);
      expect(result).toBe(false);
    });
  });

  describe("getRefundRequest", () => {
    it("should return refund request data", async () => {
      const mockData = {
        paymentInfoHash: "0x1234" as `0x${string}`,
        nonce: 0n,
        amount: BigInt("500000"),
        status: RequestStatus.Pending,
      };
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockData,
      );
      const result = await getRefundRequest(ctx, samplePaymentInfo, 0n);
      expect(result.amount).toBe(BigInt("500000"));
    });
  });

  describe("getRefundStatus", () => {
    it("should return the status", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        RequestStatus.Approved,
      );
      const result = await getRefundStatus(ctx, samplePaymentInfo, 0n);
      expect(result).toBe(RequestStatus.Approved);
    });
  });

  describe("getRefundRequestByKey", () => {
    it("should return refund request by composite key", async () => {
      const compositeKey =
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`;
      const mockData = {
        paymentInfoHash: "0x1234" as `0x${string}`,
        nonce: 0n,
        amount: BigInt("750000"),
        status: RequestStatus.Denied,
      };
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockData,
      );
      const result = await getRefundRequestByKey(ctx, compositeKey);
      expect(result.amount).toBe(BigInt("750000"));
      expect(result.status).toBe(RequestStatus.Denied);
    });
  });
});

describe("Shared Refund Write Operations", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  let writeCtx: RefundWriteContext;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    writeCtx = { publicClient, walletClient, refundRequestAddress };
    vi.clearAllMocks();
  });

  describe("approveRefundRequest", () => {
    it("should submit approve transaction", async () => {
      const result = await approveRefundRequest(
        writeCtx,
        samplePaymentInfo,
        0n,
      );
      expect(result.txHash).toBe("0xtxhash");
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "updateStatus",
        }),
      );
    });

    it("should throw on missing account", async () => {
      const noAccountClient = createMockWalletClient(false);
      const ctx: RefundWriteContext = {
        publicClient,
        walletClient: noAccountClient,
        refundRequestAddress,
      };
      await expect(
        approveRefundRequest(ctx, samplePaymentInfo, 0n),
      ).rejects.toThrow("WalletClient must have an account");
    });
  });

  describe("denyRefundRequest", () => {
    it("should submit deny transaction", async () => {
      const result = await denyRefundRequest(writeCtx, samplePaymentInfo, 0n);
      expect(result.txHash).toBe("0xtxhash");
    });

    it("should throw on missing account", async () => {
      const noAccountClient = createMockWalletClient(false);
      const ctx: RefundWriteContext = {
        publicClient,
        walletClient: noAccountClient,
        refundRequestAddress,
      };
      await expect(
        denyRefundRequest(ctx, samplePaymentInfo, 0n),
      ).rejects.toThrow("WalletClient must have an account");
    });
  });
});

describe("Shared Freeze Operations", () => {
  let publicClient: PublicClient;
  let ctx: FreezeReadContext;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    ctx = { publicClient };
    vi.clearAllMocks();
  });

  describe("isFrozen", () => {
    it("should return true when frozen", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      const result = await isFrozen(ctx, samplePaymentInfo, freezeAddress);
      expect(result).toBe(true);
    });

    it("should return false when not frozen", async () => {
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      const result = await isFrozen(ctx, samplePaymentInfo, freezeAddress);
      expect(result).toBe(false);
    });
  });

  describe("watchFreezeEvents", () => {
    it("should subscribe to both frozen and unfrozen events", () => {
      const callback = vi.fn();
      const { unsubscribe } = watchFreezeEvents(ctx, freezeAddress, callback);

      // Should have called watchContractEvent twice (frozen + unfrozen)
      expect(publicClient.watchContractEvent).toHaveBeenCalledTimes(2);
      expect(publicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "PaymentFrozen" }),
      );
      expect(publicClient.watchContractEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: "PaymentUnfrozen" }),
      );

      // unsubscribe should be callable
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });
  });
});
