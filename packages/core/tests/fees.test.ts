import { describe, it, expect } from "vitest";
import {
  validateFeeBounds,
  formatFeeBreakdown,
  type FeeCalculationResult,
} from "../src/fees/index.js";
import type { PaymentInfo } from "../src/types/index.js";

describe("validateFeeBounds", () => {
  const createFees = (totalBps: bigint): FeeCalculationResult => ({
    protocolFeeBps: totalBps / 2n,
    operatorFeeBps: totalBps / 2n,
    totalFeeBps: totalBps,
    protocolFeeAmount: 0n,
    operatorFeeAmount: 0n,
    totalFeeAmount: 0n,
    netAmount: 0n,
  });

  const createPaymentInfo = (minBps: number, maxBps: number): PaymentInfo => ({
    operator: "0x0000000000000000000000000000000000000001",
    payer: "0x0000000000000000000000000000000000000002",
    receiver: "0x0000000000000000000000000000000000000003",
    token: "0x0000000000000000000000000000000000000004",
    maxAmount: 1000000n,
    preApprovalExpiry: 0,
    authorizationExpiry: 0,
    refundExpiry: 0,
    minFeeBps: minBps,
    maxFeeBps: maxBps,
    feeReceiver: "0x0000000000000000000000000000000000000005",
    salt: 0n,
  });

  it("should return true when fees are within bounds", () => {
    const fees = createFees(50n);
    const paymentInfo = createPaymentInfo(0, 100);
    expect(validateFeeBounds(fees, paymentInfo)).toBe(true);
  });

  it("should return true when fees equal min bound", () => {
    const fees = createFees(50n);
    const paymentInfo = createPaymentInfo(50, 100);
    expect(validateFeeBounds(fees, paymentInfo)).toBe(true);
  });

  it("should return true when fees equal max bound", () => {
    const fees = createFees(100n);
    const paymentInfo = createPaymentInfo(0, 100);
    expect(validateFeeBounds(fees, paymentInfo)).toBe(true);
  });

  it("should return false when fees below min bound", () => {
    const fees = createFees(10n);
    const paymentInfo = createPaymentInfo(50, 100);
    expect(validateFeeBounds(fees, paymentInfo)).toBe(false);
  });

  it("should return false when fees above max bound", () => {
    const fees = createFees(150n);
    const paymentInfo = createPaymentInfo(0, 100);
    expect(validateFeeBounds(fees, paymentInfo)).toBe(false);
  });
});

describe("formatFeeBreakdown", () => {
  it("should format fees correctly with default decimals", () => {
    const fees: FeeCalculationResult = {
      protocolFeeBps: 25n,
      operatorFeeBps: 75n,
      totalFeeBps: 100n,
      protocolFeeAmount: 2500n,
      operatorFeeAmount: 7500n,
      totalFeeAmount: 10000n,
      netAmount: 990000n,
    };

    const formatted = formatFeeBreakdown(fees);
    expect(formatted).toContain("Fee Breakdown:");
    expect(formatted).toContain("Protocol Fee: 25 bps");
    expect(formatted).toContain("Operator Fee: 75 bps");
    expect(formatted).toContain("Total Fee:    100 bps");
    expect(formatted).toContain("USDC");
  });

  it("should format fees with custom token symbol", () => {
    const fees: FeeCalculationResult = {
      protocolFeeBps: 50n,
      operatorFeeBps: 50n,
      totalFeeBps: 100n,
      protocolFeeAmount: 5000n,
      operatorFeeAmount: 5000n,
      totalFeeAmount: 10000n,
      netAmount: 990000n,
    };

    const formatted = formatFeeBreakdown(fees, 6, "USDT");
    expect(formatted).toContain("USDT");
    expect(formatted).not.toContain("USDC");
  });

  it("should handle zero fees", () => {
    const fees: FeeCalculationResult = {
      protocolFeeBps: 0n,
      operatorFeeBps: 0n,
      totalFeeBps: 0n,
      protocolFeeAmount: 0n,
      operatorFeeAmount: 0n,
      totalFeeAmount: 0n,
      netAmount: 1000000n,
    };

    const formatted = formatFeeBreakdown(fees);
    expect(formatted).toContain("Protocol Fee: 0 bps (0.00%)");
    expect(formatted).toContain("Operator Fee: 0 bps (0.00%)");
    expect(formatted).toContain("Total Fee:    0 bps (0.00%)");
  });
});

describe("Fee exports", () => {
  it("should export all fee calculation functions", async () => {
    const feesModule = await import("../src/fees/index.js");
    expect(typeof feesModule.getFeeAddresses).toBe("function");
    expect(typeof feesModule.calculateOperatorFeeBps).toBe("function");
    expect(typeof feesModule.calculateProtocolFeeBps).toBe("function");
    expect(typeof feesModule.calculateTotalFees).toBe("function");
    expect(typeof feesModule.validateFeeBounds).toBe("function");
    expect(typeof feesModule.formatFeeBreakdown).toBe("function");
  });
});
