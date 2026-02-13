import { describe, it, expect } from "vitest";
import { validatePaymentInfo } from "../src/validation/index.js";
import type { PaymentInfo } from "../src/types/index.js";

const futureTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

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
    feeReceiver: "0x1234567890123456789012345678901234567890", // matches operator
    salt: 12345n,
    ...overrides,
  };
}

const ZERO = "0x0000000000000000000000000000000000000000" as const;

describe("validatePaymentInfo", () => {
  it("should return empty array for valid PaymentInfo", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo());
    expect(issues).toEqual([]);
  });

  it("should catch zero operator address", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ operator: ZERO }));
    const opError = issues.find(i => i.field === "operator");
    expect(opError).toBeDefined();
    expect(opError?.severity).toBe("error");
  });

  it("should catch zero receiver address", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ receiver: ZERO }));
    expect(issues.find(i => i.field === "receiver")).toBeDefined();
  });

  it("should catch zero token address", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ token: ZERO }));
    expect(issues.find(i => i.field === "token")).toBeDefined();
  });

  it("should catch zero feeReceiver address", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ operator: ZERO, feeReceiver: ZERO }));
    expect(issues.find(i => i.field === "feeReceiver" && i.severity === "error")).toBeDefined();
  });

  it("should catch zero maxAmount", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ maxAmount: 0n }));
    const amtError = issues.find(i => i.field === "maxAmount");
    expect(amtError).toBeDefined();
    expect(amtError?.severity).toBe("error");
  });

  it("should catch minFeeBps > maxFeeBps", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ minFeeBps: 500, maxFeeBps: 100 }));
    const feeError = issues.find(i => i.field === "minFeeBps");
    expect(feeError).toBeDefined();
    expect(feeError?.severity).toBe("error");
  });

  it("should catch maxFeeBps > 10000", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ maxFeeBps: 15000 }));
    const feeError = issues.find(i => i.field === "maxFeeBps");
    expect(feeError).toBeDefined();
    expect(feeError?.severity).toBe("error");
  });

  it("should catch expired authorizationExpiry", () => {
    const pastTimestamp = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({ authorizationExpiry: pastTimestamp }),
    );
    expect(issues.find(i => i.field === "authorizationExpiry")).toBeDefined();
  });

  it("should catch expired preApprovalExpiry", () => {
    const pastTimestamp = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const issues = validatePaymentInfo(makeValidPaymentInfo({ preApprovalExpiry: pastTimestamp }));
    const issue = issues.find(i => i.field === "preApprovalExpiry");
    expect(issue).toBeDefined();
    expect(issue?.message).toContain("ERC-3009");
  });

  it("should skip preApprovalExpiry check when zero (not used)", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ preApprovalExpiry: 0n }));
    expect(issues.find(i => i.field === "preApprovalExpiry")).toBeUndefined();
  });

  it("should warn when feeReceiver != operator", () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({
        feeReceiver: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    );
    const warning = issues.find(i => i.field === "feeReceiver" && i.severity === "warning");
    expect(warning).toBeDefined();
    expect(warning?.message).toContain("InvalidFeeReceiver");
  });

  it("should allow payer to be zero address (payer-agnostic)", () => {
    const issues = validatePaymentInfo(makeValidPaymentInfo({ payer: ZERO }));
    // Should NOT have a payer error
    expect(issues.find(i => i.field === "payer")).toBeUndefined();
  });

  it("should return multiple errors for multiple issues", () => {
    const issues = validatePaymentInfo(
      makeValidPaymentInfo({
        operator: ZERO,
        receiver: ZERO,
        maxAmount: 0n,
      }),
    );
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});
