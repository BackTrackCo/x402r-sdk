import { describe, it, expect } from "vitest";
import { refundable } from "../src/index.js";
import { NETWORK_CONFIG } from "@x402r/core/config";

describe("refundable", () => {
  const baseOption = {
    scheme: "escrow",
    network: "eip155:84532",
    payTo: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    price: "$0.01",
  };

  it("populates extra with network config addresses", () => {
    const config = NETWORK_CONFIG["eip155:84532"];
    const result = refundable(
      baseOption,
      "0xABCDEF1234567890123456789012345678901234" as `0x${string}`,
    );

    expect(result.extra.escrowAddress).toBe(config.authCaptureEscrow);
    expect(result.extra.operatorAddress).toBe("0xABCDEF1234567890123456789012345678901234");
    expect(result.extra.tokenCollector).toBe(config.tokenCollector);
  });

  it("preserves existing option properties", () => {
    const result = refundable(
      baseOption,
      "0xABCDEF1234567890123456789012345678901234" as `0x${string}`,
    );

    expect(result.scheme).toBe("escrow");
    expect(result.network).toBe("eip155:84532");
    expect(result.payTo).toBe(baseOption.payTo);
    expect(result.price).toBe("$0.01");
  });

  it("allows address overrides", () => {
    const result = refundable(
      baseOption,
      "0xABCDEF1234567890123456789012345678901234" as `0x${string}`,
      {
        escrowAddress: "0xCustomEscrow12345678901234567890123456" as `0x${string}`,
        tokenCollector: "0xCustomCollector234567890123456789012" as `0x${string}`,
      },
    );

    expect(result.extra.escrowAddress).toBe("0xCustomEscrow12345678901234567890123456");
    expect(result.extra.tokenCollector).toBe("0xCustomCollector234567890123456789012");
  });

  it("throws for unsupported network", () => {
    const badOption = { ...baseOption, network: "not-a-network" };

    expect(() =>
      refundable(badOption, "0xABCDEF1234567890123456789012345678901234" as `0x${string}`),
    ).toThrow("Unsupported network");
  });

  it("merges with existing extra fields", () => {
    const optionWithExtra = {
      ...baseOption,
      extra: { customField: "value" },
    };

    const result = refundable(
      optionWithExtra,
      "0xABCDEF1234567890123456789012345678901234" as `0x${string}`,
    );

    expect(result.extra.customField).toBe("value");
    expect(result.extra.operatorAddress).toBeDefined();
  });

  it("adds fee bounds configuration", () => {
    const result = refundable(
      baseOption,
      "0xABCDEF1234567890123456789012345678901234" as `0x${string}`,
      {
        minFeeBps: 0,
        maxFeeBps: 500, // 5%
      },
    );

    expect(result.extra.minFeeBps).toBe(0);
    expect(result.extra.maxFeeBps).toBe(500);
  });

  it("sets sensible fee defaults when not specified", () => {
    const result = refundable(
      baseOption,
      "0xABCDEF1234567890123456789012345678901234" as `0x${string}`,
    );

    expect(result.extra.minFeeBps).toBe(0); // Accept 0% minimum
    expect(result.extra.maxFeeBps).toBe(1000); // Accept up to 10%
  });
});
