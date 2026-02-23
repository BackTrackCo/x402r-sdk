import { describe, it, expect } from "vitest";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { requireAddress } from "../src/shared/require-address.js";
import { assertValidPaymentInfo } from "../src/shared/assert-valid-payment-info.js";
import { wrapContractWrite } from "../src/shared/error-wrapping.js";
import { X402rError, isX402rError, CONTRACT_ERRORS } from "../src/errors/index.js";
import type { PaymentInfo } from "../src/types/index.js";

// --- Test helpers ---

const futureTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600);

function makeValidPaymentInfo(overrides: Partial<PaymentInfo> = {}): PaymentInfo {
  return {
    operator: "0x1234567890123456789012345678901234567890",
    payer: "0x2345678901234567890123456789012345678901",
    receiver: "0x3456789012345678901234567890123456789012",
    token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    maxAmount: 1000000n,
    preApprovalExpiry: futureTimestamp,
    authorizationExpiry: futureTimestamp,
    refundExpiry: futureTimestamp + 86400n,
    minFeeBps: 0,
    maxFeeBps: 1000,
    feeReceiver: "0x1234567890123456789012345678901234567890",
    salt: 12345n,
    ...overrides,
  };
}

const ZERO = "0x0000000000000000000000000000000000000000" as const;

// --- requireAddress ---

describe("requireAddress", () => {
  it("should pass through when address is defined", () => {
    const addr: `0x${string}` | undefined = "0x1234567890123456789012345678901234567890";
    expect(() => requireAddress(addr, "escrow")).not.toThrow();
  });

  it("should throw X402rError with MissingAddress code when address is undefined", () => {
    const addr: `0x${string}` | undefined = undefined;
    try {
      requireAddress(addr, "escrow");
      expect.fail("should have thrown");
    } catch (e) {
      expect(isX402rError(e)).toBe(true);
      const err = e as X402rError;
      expect(err.name).toBe("MissingAddress");
      expect(err.args?.addressName).toBe("escrow");
    }
  });

  it("should include the address name in the error message", () => {
    try {
      requireAddress(undefined, "refundRequest");
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as X402rError;
      expect(err.message).toContain("refundRequest");
      expect(err.message).toContain("resolveAddresses");
    }
  });
});

// --- assertValidPaymentInfo ---

describe("assertValidPaymentInfo", () => {
  it("should not throw for valid PaymentInfo", () => {
    expect(() => assertValidPaymentInfo(makeValidPaymentInfo())).not.toThrow();
  });

  it("should throw X402rError with InvalidPaymentInfo code on errors", () => {
    try {
      assertValidPaymentInfo(makeValidPaymentInfo({ operator: ZERO }));
      expect.fail("should have thrown");
    } catch (e) {
      expect(isX402rError(e)).toBe(true);
      const err = e as X402rError;
      expect(err.name).toBe("InvalidPaymentInfo");
      expect(err.message).toContain("operator");
    }
  });

  it("should aggregate multiple errors in the message", () => {
    try {
      assertValidPaymentInfo(
        makeValidPaymentInfo({ operator: ZERO, receiver: ZERO, maxAmount: 0n }),
      );
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as X402rError;
      expect(err.message).toContain("operator");
      expect(err.message).toContain("receiver");
      expect(err.message).toContain("maxAmount");
    }
  });

  it("should ignore warnings (feeReceiver mismatch passes through)", () => {
    // feeReceiver != operator produces a warning, not an error
    expect(() =>
      assertValidPaymentInfo(
        makeValidPaymentInfo({
          feeReceiver: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      ),
    ).not.toThrow();
  });
});

// --- wrapContractWrite ---

describe("wrapContractWrite", () => {
  it("should return the result on success", async () => {
    const result = await wrapContractWrite("release", async () => "0xabc");
    expect(result).toBe("0xabc");
  });

  it("should re-throw non-viem errors as-is", async () => {
    const typeError = new TypeError("bad argument");
    await expect(
      wrapContractWrite("release", async () => {
        throw typeError;
      }),
    ).rejects.toBe(typeError);
  });

  it("should wrap BaseError without revert as ContractCallFailed", async () => {
    const baseErr = new BaseError("gas estimation failed", { name: "EstimateGasError" });
    try {
      await wrapContractWrite("charge", async () => {
        throw baseErr;
      });
      expect.fail("should have thrown");
    } catch (e) {
      expect(isX402rError(e)).toBe(true);
      const err = e as X402rError;
      expect(err.name).toBe("ContractCallFailed");
      expect(err.message).toContain("charge");
      expect(err.args?.operation).toBe("charge");
    }
  });

  it("should decode known contract revert to specific error code", async () => {
    // Build a ContractFunctionRevertedError with a known selector as raw data
    const selector = CONTRACT_ERRORS.EscrowPeriodExpired.selector;
    const revertErr = new ContractFunctionRevertedError({
      abi: [],
      data: selector,
      functionName: "release",
    });
    const wrapperErr = new BaseError("execution reverted", {
      cause: revertErr,
    });

    try {
      await wrapContractWrite("release", async () => {
        throw wrapperErr;
      });
      expect.fail("should have thrown");
    } catch (e) {
      expect(isX402rError(e)).toBe(true);
      const err = e as X402rError;
      expect(err.name).toBe("EscrowPeriodExpired");
      expect(err.message).toContain("release");
      expect(err.message).toContain("escrow period has expired");
      expect(err.args?.operation).toBe("release");
    }
  });

  it("should wrap unknown revert selector as ContractCallFailed with raw data", async () => {
    // Use a selector that doesn't match any known error
    const revertErr = new ContractFunctionRevertedError({
      abi: [],
      data: "0xdeadbeef",
      functionName: "charge",
    });
    const wrapperErr = new BaseError("execution reverted", {
      cause: revertErr,
    });

    try {
      await wrapContractWrite("charge", async () => {
        throw wrapperErr;
      });
      expect.fail("should have thrown");
    } catch (e) {
      expect(isX402rError(e)).toBe(true);
      const err = e as X402rError;
      expect(err.name).toBe("ContractCallFailed");
      expect(err.message).toContain("unknown error");
      expect(err.args?.raw).toBeDefined();
    }
  });
});
