import { describe, it, expect } from "vitest";
import {
  NETWORK_CONFIG,
  getNetworkConfig,
  isSupportedNetwork,
  SupportedNetworks,
} from "../src/config/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("NETWORK_CONFIG", () => {
  it("should have valid addresses for all networks", () => {
    for (const [networkId, config] of Object.entries(NETWORK_CONFIG)) {
      expect(config.authCaptureEscrow, `${networkId} authCaptureEscrow`).toMatch(
        /^0x[a-fA-F0-9]{40}$/,
      );
      expect(config.tokenCollector, `${networkId} tokenCollector`).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(config.refundRequest, `${networkId} refundRequest`).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(config.usdc, `${networkId} usdc`).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it("should have numeric chain ID for all networks", () => {
    for (const [networkId, config] of Object.entries(NETWORK_CONFIG)) {
      expect(config.chainId, `${networkId} chainId`).toBeTypeOf("number");
      expect(config.chainId, `${networkId} chainId`).toBeGreaterThan(0);
    }
  });

  it("should have human-readable name for all networks", () => {
    for (const [networkId, config] of Object.entries(NETWORK_CONFIG)) {
      expect(config.name, `${networkId} name`).toBeTypeOf("string");
      expect(config.name.length, `${networkId} name length`).toBeGreaterThan(0);
    }
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
