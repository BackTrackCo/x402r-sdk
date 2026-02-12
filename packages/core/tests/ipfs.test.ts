import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipfsUrl, fetchFromIpfs } from "../src/ipfs/index.js";

describe("ipfs", () => {
  describe("ipfsUrl", () => {
    it("should construct URL with default gateway", () => {
      const url = ipfsUrl("QmTestCid123");
      expect(url).toBe("https://gateway.pinata.cloud/ipfs/QmTestCid123");
    });

    it("should construct URL with custom gateway", () => {
      const url = ipfsUrl("QmTestCid123", "https://ipfs.io/ipfs/");
      expect(url).toBe("https://ipfs.io/ipfs/QmTestCid123");
    });

    it("should handle gateway without trailing slash", () => {
      const url = ipfsUrl("QmTestCid123", "https://ipfs.io/ipfs");
      expect(url).toBe("https://ipfs.io/ipfs/QmTestCid123");
    });

    it("should handle gateway with trailing slash", () => {
      const url = ipfsUrl("QmTestCid123", "https://custom.gateway.com/ipfs/");
      expect(url).toBe("https://custom.gateway.com/ipfs/QmTestCid123");
    });
  });

  describe("fetchFromIpfs", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.useRealTimers();
    });

    it("should parse JSON response", async () => {
      const mockData = { type: "refund_receipt", amount: 1000 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      const result = await fetchFromIpfs("QmTestCid123");

      expect(result).toEqual(mockData);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://gateway.pinata.cloud/ipfs/QmTestCid123",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("should fall back to text when JSON parsing fails", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("plain text evidence"),
      });

      const result = await fetchFromIpfs("QmTestCid123");

      expect(result).toBe("plain text evidence");
    });

    it("should throw on HTTP error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve(""),
      });

      await expect(fetchFromIpfs("QmTestCid123")).rejects.toThrow(
        "IPFS fetch failed: 404 Not Found",
      );
    });

    it("should throw on network error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(fetchFromIpfs("QmTestCid123")).rejects.toThrow("Network error");
    });

    it("should use custom gateway from config", async () => {
      const mockData = { evidence: true };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockData)),
      });

      await fetchFromIpfs("QmTestCid123", {
        gatewayUrl: "https://custom.gateway.io/ipfs/",
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://custom.gateway.io/ipfs/QmTestCid123",
        expect.any(Object),
      );
    });
  });
});
