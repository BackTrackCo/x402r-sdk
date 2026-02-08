import { describe, it, expect } from "vitest";
import {
  PaymentState,
  RequestStatus,
  type PaymentInfo,
  type RefundRequestData,
  isValidPaymentInfo,
  isValidAddress,
} from "../src/types/index.js";

describe("PaymentState enum", () => {
  it("should have correct values", () => {
    expect(PaymentState.NonExistent).toBe(0);
    expect(PaymentState.InEscrow).toBe(1);
    expect(PaymentState.Released).toBe(2);
    expect(PaymentState.Settled).toBe(3);
    expect(PaymentState.Expired).toBe(4);
  });

  it("should have 5 states total", () => {
    const states = Object.values(PaymentState).filter(v => typeof v === "number");
    expect(states).toHaveLength(5);
  });
});

describe("RequestStatus enum", () => {
  it("should have correct values", () => {
    expect(RequestStatus.Pending).toBe(0);
    expect(RequestStatus.Approved).toBe(1);
    expect(RequestStatus.Denied).toBe(2);
    expect(RequestStatus.Cancelled).toBe(3);
  });

  it("should have 4 statuses total", () => {
    const statuses = Object.values(RequestStatus).filter(v => typeof v === "number");
    expect(statuses).toHaveLength(4);
  });
});

describe("PaymentInfo type", () => {
  it("should accept valid PaymentInfo", () => {
    const paymentInfo: PaymentInfo = {
      operator: "0x1234567890123456789012345678901234567890",
      payer: "0x2345678901234567890123456789012345678901",
      receiver: "0x3456789012345678901234567890123456789012",
      token: "0x4567890123456789012345678901234567890123",
      maxAmount: BigInt("1000000"),
      preApprovalExpiry: 0n,
      authorizationExpiry: BigInt(4294967295),
      refundExpiry: BigInt(281474976710655),
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: "0x5678901234567890123456789012345678901234",
      salt: BigInt("0x123456"),
    };

    expect(paymentInfo.operator).toBeDefined();
    expect(paymentInfo.payer).toBeDefined();
    expect(paymentInfo.receiver).toBeDefined();
  });
});

describe("RefundRequestData type", () => {
  it("should accept valid RefundRequestData", () => {
    const refundRequest: RefundRequestData = {
      paymentInfoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
      status: RequestStatus.Pending,
    };

    expect(refundRequest.paymentInfoHash).toBeDefined();
    expect(refundRequest.status).toBe(RequestStatus.Pending);
  });
});

describe("isValidAddress", () => {
  it("should return true for valid addresses", () => {
    expect(isValidAddress("0x1234567890123456789012345678901234567890")).toBe(true);
    expect(isValidAddress("0xabCDef1234567890123456789012345678901234")).toBe(true);
  });

  it("should return false for invalid addresses", () => {
    expect(isValidAddress("0x123")).toBe(false);
    expect(isValidAddress("not an address")).toBe(false);
    expect(isValidAddress("")).toBe(false);
    expect(isValidAddress("1234567890123456789012345678901234567890")).toBe(false);
  });
});

describe("isValidPaymentInfo", () => {
  const validPaymentInfo: PaymentInfo = {
    operator: "0x1234567890123456789012345678901234567890",
    payer: "0x2345678901234567890123456789012345678901",
    receiver: "0x3456789012345678901234567890123456789012",
    token: "0x4567890123456789012345678901234567890123",
    maxAmount: BigInt("1000000"),
    preApprovalExpiry: 0n,
    authorizationExpiry: BigInt(4294967295),
    refundExpiry: BigInt(281474976710655),
    minFeeBps: 0,
    maxFeeBps: 0,
    feeReceiver: "0x5678901234567890123456789012345678901234",
    salt: BigInt("0x123456"),
  };

  it("should return true for valid PaymentInfo", () => {
    expect(isValidPaymentInfo(validPaymentInfo)).toBe(true);
  });

  it("should return false for zero payer address", () => {
    expect(
      isValidPaymentInfo({
        ...validPaymentInfo,
        payer: "0x0000000000000000000000000000000000000000",
      }),
    ).toBe(false);
  });

  it("should return false for zero receiver address", () => {
    expect(
      isValidPaymentInfo({
        ...validPaymentInfo,
        receiver: "0x0000000000000000000000000000000000000000",
      }),
    ).toBe(false);
  });

  it("should return false for zero operator address", () => {
    expect(
      isValidPaymentInfo({
        ...validPaymentInfo,
        operator: "0x0000000000000000000000000000000000000000",
      }),
    ).toBe(false);
  });

  it("should return false for invalid maxAmount", () => {
    expect(
      isValidPaymentInfo({
        ...validPaymentInfo,
        maxAmount: BigInt(0),
      }),
    ).toBe(false);
  });
});
