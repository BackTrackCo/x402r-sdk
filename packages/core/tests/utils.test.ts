import { describe, it, expect } from "vitest";
import { parsePaymentInfo } from "../src/utils/index.js";

describe("parsePaymentInfo", () => {
  const validPaymentInfoObj = {
    operator: "0x1234567890123456789012345678901234567890",
    payer: "0x2345678901234567890123456789012345678901",
    receiver: "0x3456789012345678901234567890123456789012",
    token: "0x4567890123456789012345678901234567890123",
    maxAmount: "1000000",
    preApprovalExpiry: "1735689600",
    authorizationExpiry: "1735689600",
    refundExpiry: "1738368000",
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: "0x5678901234567890123456789012345678901234",
    salt: "123456789",
  };

  it("should parse a JSON string into PaymentInfo", () => {
    const json = JSON.stringify(validPaymentInfoObj);
    const result = parsePaymentInfo(json);

    expect(result.operator).toBe(validPaymentInfoObj.operator);
    expect(result.payer).toBe(validPaymentInfoObj.payer);
    expect(result.receiver).toBe(validPaymentInfoObj.receiver);
    expect(result.token).toBe(validPaymentInfoObj.token);
    expect(result.maxAmount).toBe(BigInt("1000000"));
    expect(result.preApprovalExpiry).toBe(BigInt("1735689600"));
    expect(result.authorizationExpiry).toBe(BigInt("1735689600"));
    expect(result.refundExpiry).toBe(BigInt("1738368000"));
    expect(result.minFeeBps).toBe(0);
    expect(result.maxFeeBps).toBe(500);
    expect(result.feeReceiver).toBe(validPaymentInfoObj.feeReceiver);
    expect(result.salt).toBe(BigInt("123456789"));
  });

  it("should parse a plain object into PaymentInfo", () => {
    const result = parsePaymentInfo(validPaymentInfoObj);
    expect(result.maxAmount).toBe(BigInt("1000000"));
    expect(result.salt).toBe(BigInt("123456789"));
  });

  it("should convert string amounts to bigints", () => {
    const result = parsePaymentInfo(validPaymentInfoObj);
    expect(typeof result.maxAmount).toBe("bigint");
    expect(typeof result.preApprovalExpiry).toBe("bigint");
    expect(typeof result.authorizationExpiry).toBe("bigint");
    expect(typeof result.refundExpiry).toBe("bigint");
    expect(typeof result.salt).toBe("bigint");
  });

  it("should convert fee fields to numbers", () => {
    const result = parsePaymentInfo(validPaymentInfoObj);
    expect(typeof result.minFeeBps).toBe("number");
    expect(typeof result.maxFeeBps).toBe("number");
  });

  it("should default optional expiry fields to 0n", () => {
    const { preApprovalExpiry, authorizationExpiry, refundExpiry, ...rest } = validPaymentInfoObj;
    const result = parsePaymentInfo(rest);
    expect(result.preApprovalExpiry).toBe(0n);
    expect(result.authorizationExpiry).toBe(0n);
    expect(result.refundExpiry).toBe(0n);
  });

  it("should default optional fee fields to 0", () => {
    const { minFeeBps, maxFeeBps, ...rest } = validPaymentInfoObj;
    const result = parsePaymentInfo(rest);
    expect(result.minFeeBps).toBe(0);
    expect(result.maxFeeBps).toBe(0);
  });

  it("should throw for missing required field: operator", () => {
    const { operator, ...rest } = validPaymentInfoObj;
    expect(() => parsePaymentInfo(rest)).toThrow("Missing required PaymentInfo field: 'operator'");
  });

  it("should throw for missing required field: maxAmount", () => {
    const { maxAmount, ...rest } = validPaymentInfoObj;
    expect(() => parsePaymentInfo(rest)).toThrow("Missing required PaymentInfo field: 'maxAmount'");
  });

  it("should throw for missing required field: salt", () => {
    const { salt, ...rest } = validPaymentInfoObj;
    expect(() => parsePaymentInfo(rest)).toThrow("Missing required PaymentInfo field: 'salt'");
  });

  it("should throw for invalid JSON string", () => {
    expect(() => parsePaymentInfo("not valid json")).toThrow();
  });

  it("should round-trip: serialize then parse matches original", () => {
    const original: PaymentInfo = {
      operator: "0x1234567890123456789012345678901234567890",
      payer: "0x2345678901234567890123456789012345678901",
      receiver: "0x3456789012345678901234567890123456789012",
      token: "0x4567890123456789012345678901234567890123",
      maxAmount: BigInt("1000000"),
      preApprovalExpiry: BigInt("1735689600"),
      authorizationExpiry: BigInt("1735689600"),
      refundExpiry: BigInt("1738368000"),
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: "0x5678901234567890123456789012345678901234",
      salt: BigInt("123456789"),
    };

    // Serialize with bigint-safe replacer
    const json = JSON.stringify(original, (_, v) => (typeof v === "bigint" ? v.toString() : v));
    const parsed = parsePaymentInfo(json);

    expect(parsed.operator).toBe(original.operator);
    expect(parsed.payer).toBe(original.payer);
    expect(parsed.receiver).toBe(original.receiver);
    expect(parsed.token).toBe(original.token);
    expect(parsed.maxAmount).toBe(original.maxAmount);
    expect(parsed.preApprovalExpiry).toBe(original.preApprovalExpiry);
    expect(parsed.authorizationExpiry).toBe(original.authorizationExpiry);
    expect(parsed.refundExpiry).toBe(original.refundExpiry);
    expect(parsed.minFeeBps).toBe(original.minFeeBps);
    expect(parsed.maxFeeBps).toBe(original.maxFeeBps);
    expect(parsed.feeReceiver).toBe(original.feeReceiver);
    expect(parsed.salt).toBe(original.salt);
  });
});
