import { describe, it, expect } from "vitest";
import {
  NETWORK_CONFIG,
  getNetworkConfig,
  isSupportedNetwork,
  SupportedNetworks,
  resolveAddresses,
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

describe("receiverRefundCollector", () => {
  it("should have non-zero receiverRefundCollector on all networks", () => {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    for (const [networkId, config] of Object.entries(NETWORK_CONFIG)) {
      expect(
        config.receiverRefundCollector,
        `${networkId} missing receiverRefundCollector`,
      ).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(
        config.receiverRefundCollector,
        `${networkId} has zero-address receiverRefundCollector`,
      ).not.toBe(ZERO_ADDRESS);
    }
  });

  it("should have non-zero refundRequestEvidence on all networks", () => {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    for (const [networkId, config] of Object.entries(NETWORK_CONFIG)) {
      expect(config.refundRequestEvidence, `${networkId} missing refundRequestEvidence`).toMatch(
        /^0x[a-fA-F0-9]{40}$/,
      );
      expect(
        config.refundRequestEvidence,
        `${networkId} has zero-address refundRequestEvidence`,
      ).not.toBe(ZERO_ADDRESS);
    }
  });

  it("should have valid receiverRefundCollector address for Base Sepolia", () => {
    const config = NETWORK_CONFIG["eip155:84532"];
    expect(config.receiverRefundCollector).toBe("0x36a03071bA0D3F09a50381fCA6C9906B69Ba8c0E");
  });

  it("should have valid receiverRefundCollector address for Base Mainnet", () => {
    const config = NETWORK_CONFIG["eip155:8453"];
    expect(config.receiverRefundCollector).toBe("0x4bDb9ccC91CA63cfedb6CB0dbf21BC6dD562bb04");
  });
});

describe("resolveAddresses", () => {
  it("should include receiverRefundCollectorAddress for Base Sepolia", () => {
    const addrs = resolveAddresses("eip155:84532");
    expect(addrs.receiverRefundCollectorAddress).toBe("0x36a03071bA0D3F09a50381fCA6C9906B69Ba8c0E");
  });

  it("should exclude receiverRefundCollectorAddress for Monad (zero address)", () => {
    const addrs = resolveAddresses("eip155:143");
    expect(addrs.receiverRefundCollectorAddress).toBeUndefined();
  });

  it("should include receiverRefundCollectorAddress for all deployed networks", () => {
    const deployedNetworks = ["eip155:84532", "eip155:8453", "eip155:11155111", "eip155:1"];
    for (const networkId of deployedNetworks) {
      const addrs = resolveAddresses(networkId);
      expect(
        addrs.receiverRefundCollectorAddress,
        `${networkId} should have receiverRefundCollectorAddress`,
      ).toBeDefined();
    }
  });

  it("should throw for unsupported network", () => {
    expect(() => resolveAddresses("eip155:99999")).toThrow("not supported");
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
