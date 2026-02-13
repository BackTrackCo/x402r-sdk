import { describe, it, expect } from "vitest";
import { resolveAddresses, SupportedNetworks } from "../src/config/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("resolveAddresses", () => {
  it("should resolve Base Sepolia addresses", () => {
    const addrs = resolveAddresses("eip155:84532");
    expect(addrs.name).toBe("Base Sepolia");
    expect(addrs.chainId).toBe(84532);
    expect(addrs.escrowAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addrs.refundRequestAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addrs.tokenCollector).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addrs.arbiterRegistryAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addrs.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(addrs.protocolFeeConfig).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should resolve Base Mainnet addresses", () => {
    const addrs = resolveAddresses("eip155:8453");
    expect(addrs.name).toBe("Base Mainnet");
    expect(addrs.chainId).toBe(8453);
    expect(addrs.escrowAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should throw for unknown network", () => {
    expect(() => resolveAddresses("eip155:999999")).toThrow(
      "Network 'eip155:999999' is not supported",
    );
  });

  it("should list supported networks in error message", () => {
    try {
      resolveAddresses("unknown");
      expect.fail("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("Supported networks:");
      expect(msg).toContain("eip155:84532");
    }
  });

  it("should return non-zero addresses for all supported networks", () => {
    for (const networkId of SupportedNetworks) {
      const addrs = resolveAddresses(networkId);
      expect(addrs.escrowAddress).not.toBe(ZERO_ADDRESS);
      expect(addrs.refundRequestAddress).not.toBe(ZERO_ADDRESS);
      expect(addrs.tokenCollector).not.toBe(ZERO_ADDRESS);
      expect(addrs.arbiterRegistryAddress).not.toBe(ZERO_ADDRESS);
      expect(addrs.usdc).not.toBe(ZERO_ADDRESS);
    }
  });

  it("should include evidence address for Base Sepolia", () => {
    const addrs = resolveAddresses("eip155:84532");
    expect(addrs.evidenceAddress).toBeDefined();
    expect(addrs.evidenceAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
