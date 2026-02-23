import { describe, it, expect } from "vitest";
import { toPaymentInfo, type EscrowPayloadLike } from "../src/index.js";

describe("toPaymentInfo", () => {
  const basePayload: EscrowPayloadLike = {
    authorization: { from: "0xPayerAddress0000000000000000000000000001" },
    paymentInfo: {
      operator: "0xOperatorAddr000000000000000000000000001",
      receiver: "0xReceiverAddr000000000000000000000000001",
      token: "0xTokenAddress00000000000000000000000000001",
      maxAmount: "1000000",
      preApprovalExpiry: "1700000000",
      authorizationExpiry: "1700001000",
      refundExpiry: "1700002000",
      minFeeBps: 50,
      maxFeeBps: 500,
      feeReceiver: "0xFeeReceiverA000000000000000000000000001",
      salt: "12345",
    },
  };

  it("converts string fields to bigint", () => {
    const result = toPaymentInfo(basePayload);

    expect(result.maxAmount).toBe(1000000n);
    expect(result.preApprovalExpiry).toBe(1700000000n);
    expect(result.authorizationExpiry).toBe(1700001000n);
    expect(result.refundExpiry).toBe(1700002000n);
    expect(result.salt).toBe(12345n);
  });

  it("extracts payer from authorization.from", () => {
    const result = toPaymentInfo(basePayload);
    expect(result.payer).toBe("0xPayerAddress0000000000000000000000000001");
  });

  it("passes through address fields unchanged", () => {
    const result = toPaymentInfo(basePayload);

    expect(result.operator).toBe("0xOperatorAddr000000000000000000000000001");
    expect(result.receiver).toBe("0xReceiverAddr000000000000000000000000001");
    expect(result.token).toBe("0xTokenAddress00000000000000000000000000001");
    expect(result.feeReceiver).toBe("0xFeeReceiverA000000000000000000000000001");
    expect(result.minFeeBps).toBe(50);
    expect(result.maxFeeBps).toBe(500);
  });

  it("handles bigint inputs (already bigint stays bigint)", () => {
    const payload: EscrowPayloadLike = {
      authorization: { from: "0xPayerAddress0000000000000000000000000001" },
      paymentInfo: {
        ...basePayload.paymentInfo,
        maxAmount: 2000000n,
        preApprovalExpiry: 1800000000n,
        authorizationExpiry: 1800001000n,
        refundExpiry: 1800002000n,
        salt: 99999n,
      },
    };

    const result = toPaymentInfo(payload);

    expect(result.maxAmount).toBe(2000000n);
    expect(result.preApprovalExpiry).toBe(1800000000n);
    expect(result.authorizationExpiry).toBe(1800001000n);
    expect(result.refundExpiry).toBe(1800002000n);
    expect(result.salt).toBe(99999n);
  });
});
