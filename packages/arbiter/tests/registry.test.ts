import { describe, it, expect, vi, beforeEach } from "vitest";
import { X402rArbiter } from "../src/arbiter.js";
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

describe("X402rArbiter - Registry Operations", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  const operatorAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const arbiterRegistryAddress = "0xdddddddddddddddddddddddddddddddddddddddd" as const;

  beforeEach(() => {
    publicClient = createMockPublicClient();
    walletClient = createMockWalletClient();
    vi.clearAllMocks();
  });

  describe("registerArbiter", () => {
    it("should submit register transaction", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      const uri = "https://arbiter.example.com/api/disputes";
      const result = await arbiter.registerArbiter(uri);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "register",
          args: [uri],
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.registerArbiter("https://example.com")).rejects.toThrow(
        "ArbiterRegistry address required",
      );
    });
  });

  describe("updateArbiterUri", () => {
    it("should submit updateUri transaction", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      const newUri = "https://new-arbiter.example.com/api";
      const result = await arbiter.updateArbiterUri(newUri);

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "updateUri",
          args: [newUri],
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.updateArbiterUri("https://example.com")).rejects.toThrow(
        "ArbiterRegistry address required",
      );
    });
  });

  describe("deregisterArbiter", () => {
    it("should submit deregister transaction", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      const result = await arbiter.deregisterArbiter();

      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "deregister",
          args: [],
        }),
      );
      expect(result.txHash).toBe("0xtxhash");
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.deregisterArbiter()).rejects.toThrow("ArbiterRegistry address required");
    });
  });

  describe("getArbiterUri", () => {
    it("should return arbiter URI", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      const mockUri = "https://arbiter.example.com/api";
      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(mockUri);

      const arbiterAddress = "0x1111111111111111111111111111111111111111" as const;
      const uri = await arbiter.getArbiterUri(arbiterAddress);

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "getUri",
          args: [arbiterAddress],
        }),
      );
      expect(uri).toBe(mockUri);
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const arbiterAddress = "0x1111111111111111111111111111111111111111" as const;
      await expect(arbiter.getArbiterUri(arbiterAddress)).rejects.toThrow(
        "ArbiterRegistry address required",
      );
    });
  });

  describe("isArbiterRegistered", () => {
    it("should return true for registered arbiter", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const arbiterAddress = "0x1111111111111111111111111111111111111111" as const;
      const isRegistered = await arbiter.isArbiterRegistered(arbiterAddress);

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "isRegistered",
          args: [arbiterAddress],
        }),
      );
      expect(isRegistered).toBe(true);
    });

    it("should return false for unregistered arbiter", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const arbiterAddress = "0x2222222222222222222222222222222222222222" as const;
      const isRegistered = await arbiter.isArbiterRegistered(arbiterAddress);

      expect(isRegistered).toBe(false);
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      const arbiterAddress = "0x1111111111111111111111111111111111111111" as const;
      await expect(arbiter.isArbiterRegistered(arbiterAddress)).rejects.toThrow(
        "ArbiterRegistry address required",
      );
    });
  });

  describe("getArbiterCount", () => {
    it("should return arbiter count", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue(5n);

      const count = await arbiter.getArbiterCount();

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "arbiterCount",
          args: [],
        }),
      );
      expect(count).toBe(5n);
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.getArbiterCount()).rejects.toThrow("ArbiterRegistry address required");
    });
  });

  describe("listArbiters", () => {
    it("should return paginated arbiter list", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
        arbiterRegistryAddress,
      });

      const mockArbiters = [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ] as const;
      const mockUris = ["https://arbiter1.example.com", "https://arbiter2.example.com"] as const;
      const mockTotal = 5n;

      (publicClient.readContract as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockArbiters,
        mockUris,
        mockTotal,
      ]);

      const result = await arbiter.listArbiters(0n, 2n);

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: arbiterRegistryAddress,
          functionName: "getArbiters",
          args: [0n, 2n],
        }),
      );
      expect(result.arbiters).toEqual(mockArbiters);
      expect(result.uris).toEqual(mockUris);
      expect(result.total).toBe(mockTotal);
    });

    it("should throw if arbiterRegistryAddress not configured", async () => {
      const arbiter = new X402rArbiter({
        publicClient,
        walletClient,
        operatorAddress,
      });

      await expect(arbiter.listArbiters(0n, 10n)).rejects.toThrow(
        "ArbiterRegistry address required",
      );
    });
  });
});
