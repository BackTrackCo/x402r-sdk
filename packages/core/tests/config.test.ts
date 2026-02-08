import { describe, it, expect } from "vitest";
import {
  NETWORK_CONFIG,
  getNetworkConfig,
  isSupportedNetwork,
  SupportedNetworks,
} from "../src/config/index.js";

describe("NETWORK_CONFIG", () => {
  it("should have Base Sepolia configuration", () => {
    expect(NETWORK_CONFIG["eip155:84532"]).toBeDefined();
  });

  it("should have required addresses for Base Sepolia", () => {
    const config = NETWORK_CONFIG["eip155:84532"];
    expect(config.authCaptureEscrow).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(config.tokenCollector).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(config.refundRequest).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(config.usdc).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should have correct chain ID for Base Sepolia", () => {
    const config = NETWORK_CONFIG["eip155:84532"];
    expect(config.chainId).toBe(84532);
  });

  it("should have human-readable name", () => {
    const config = NETWORK_CONFIG["eip155:84532"];
    expect(config.name).toBe("Base Sepolia");
  });
});

describe("getNetworkConfig", () => {
  it("should return config for supported network", () => {
    const config = getNetworkConfig("eip155:84532");
    expect(config).toBeDefined();
    expect(config?.name).toBe("Base Sepolia");
  });

  it("should return undefined for unsupported network", () => {
    const config = getNetworkConfig("eip155:99999");
    expect(config).toBeUndefined();
  });
});

describe("isSupportedNetwork", () => {
  it("should return true for supported networks", () => {
    expect(isSupportedNetwork("eip155:84532")).toBe(true);
  });

  it("should return false for unsupported networks", () => {
    expect(isSupportedNetwork("eip155:99999")).toBe(false);
    expect(isSupportedNetwork("invalid")).toBe(false);
    expect(isSupportedNetwork("")).toBe(false);
  });
});

describe("SupportedNetworks", () => {
  it("should include Base Sepolia", () => {
    expect(SupportedNetworks).toContain("eip155:84532");
  });

  it("should be an array of strings", () => {
    expect(Array.isArray(SupportedNetworks)).toBe(true);
    SupportedNetworks.forEach(network => {
      expect(typeof network).toBe("string");
    });
  });
});
