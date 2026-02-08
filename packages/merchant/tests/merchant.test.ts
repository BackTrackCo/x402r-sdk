import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rMerchant, X402rMerchantConfig } from "../src/merchant.js";
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

describe("X402rMerchant", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create merchant with required config", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(merchant).toBeInstanceOf(X402rMerchant);
    });

    it("should expose operatorAddress", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(merchant.operatorAddress).toBe(operatorAddress);
    });

    it("should expose publicClient", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(merchant.publicClient).toBe(publicClient);
    });

    it("should expose walletClient", () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      expect(merchant.walletClient).toBe(walletClient);
    });
  });

  describe("X402rMerchantConfig type", () => {
    it("should accept valid config", () => {
      const config: X402rMerchantConfig = {
        publicClient,
        walletClient,
        operatorAddress,
      };

      expect(config.publicClient).toBeDefined();
      expect(config.walletClient).toBeDefined();
      expect(config.operatorAddress).toBeDefined();
    });

    it("should accept config with all optional fields", () => {
      const config: X402rMerchantConfig = {
        publicClient,
        walletClient,
        operatorAddress,
        escrowAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        refundRequestAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
      };

      expect(config.escrowAddress).toBeDefined();
      expect(config.refundRequestAddress).toBeDefined();
    });
  });

  describe("getPaymentState", () => {
    it("should throw NotImplementedError", async () => {
      const merchant = new X402rMerchant({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const paymentInfo = {
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

      await expect(merchant.getPaymentState(paymentInfo)).rejects.toThrow(NotImplementedError);
    });
  });
});
