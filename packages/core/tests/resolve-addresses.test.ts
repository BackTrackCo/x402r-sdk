import { describe, it, expect } from "vitest";
import { resolveAddresses, SupportedNetworks } from "../src/config/index.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("resolveAddresses", () => {
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
      expect(addrs.escrowAddress, `${networkId} escrowAddress`).not.toBe(ZERO_ADDRESS);
      expect(addrs.refundRequestAddress, `${networkId} refundRequestAddress`).not.toBe(
        ZERO_ADDRESS,
      );
      expect(addrs.tokenCollector, `${networkId} tokenCollector`).not.toBe(ZERO_ADDRESS);
      expect(addrs.arbiterRegistryAddress, `${networkId} arbiterRegistryAddress`).not.toBe(
        ZERO_ADDRESS,
      );
      expect(addrs.usdc, `${networkId} usdc`).not.toBe(ZERO_ADDRESS);
      expect(
        addrs.receiverRefundCollectorAddress,
        `${networkId} receiverRefundCollectorAddress`,
      ).toBeDefined();
      expect(
        addrs.receiverRefundCollectorAddress,
        `${networkId} receiverRefundCollectorAddress`,
      ).not.toBe(ZERO_ADDRESS);
      expect(addrs.evidenceAddress, `${networkId} evidenceAddress`).toBeDefined();
      expect(addrs.evidenceAddress, `${networkId} evidenceAddress`).not.toBe(ZERO_ADDRESS);
    }
  });
});
