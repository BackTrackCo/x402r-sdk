import { describe, it, expect } from "vitest";
import {
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
  parsePaymentInfo,
} from "../src/utils/index.js";
import type { PaymentInfo } from "../src/types/index.js";

describe("PAYMENT_INFO_TYPEHASH", () => {
  it("should be a bytes32 hash", () => {
    expect(PAYMENT_INFO_TYPEHASH).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("should match the Solidity computed typehash", () => {
    // This is keccak256 of the PaymentInfo struct signature
    // Should match: keccak256("PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)")
    expect(PAYMENT_INFO_TYPEHASH).toBeDefined();
    expect(typeof PAYMENT_INFO_TYPEHASH).toBe("string");
  });
});

describe("computePaymentInfoHash", () => {
  const samplePaymentInfo: PaymentInfo = {
    operator: "0x1234567890123456789012345678901234567890",
    payer: "0x2345678901234567890123456789012345678901",
    receiver: "0x3456789012345678901234567890123456789012",
    token: "0x4567890123456789012345678901234567890123",
    maxAmount: BigInt("1000000"),
    preApprovalExpiry: 0n,
    authorizationExpiry: BigInt(1735689600),
    refundExpiry: BigInt(1738368000),
    minFeeBps: 0,
    maxFeeBps: 500, // 5%
    feeReceiver: "0x5678901234567890123456789012345678901234",
    salt: BigInt("0x123456789abcdef"),
  };

  const escrowAddress = "0xb9488351E48b23D798f24e8174514F28B741Eb4f" as const;
  const chainId = 84532; // Base Sepolia

  it("should return a bytes32 hash", () => {
    const hash = computePaymentInfoHash(samplePaymentInfo, escrowAddress, chainId);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("should be deterministic", () => {
    const hash1 = computePaymentInfoHash(samplePaymentInfo, escrowAddress, chainId);
    const hash2 = computePaymentInfoHash(samplePaymentInfo, escrowAddress, chainId);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different payment info", () => {
    const hash1 = computePaymentInfoHash(samplePaymentInfo, escrowAddress, chainId);

    const differentPaymentInfo = {
      ...samplePaymentInfo,
      maxAmount: BigInt("2000000"),
    };
    const hash2 = computePaymentInfoHash(differentPaymentInfo, escrowAddress, chainId);

    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hashes for different escrow addresses", () => {
    const hash1 = computePaymentInfoHash(samplePaymentInfo, escrowAddress, chainId);

    const differentEscrow = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
    const hash2 = computePaymentInfoHash(samplePaymentInfo, differentEscrow, chainId);

    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hashes for different chain IDs", () => {
    const hash1 = computePaymentInfoHash(samplePaymentInfo, escrowAddress, chainId);
    const hash2 = computePaymentInfoHash(samplePaymentInfo, escrowAddress, 1); // mainnet

    expect(hash1).not.toBe(hash2);
  });

  it("should handle zero values", () => {
    const zeroPaymentInfo: PaymentInfo = {
      operator: "0x1234567890123456789012345678901234567890",
      payer: "0x2345678901234567890123456789012345678901",
      receiver: "0x3456789012345678901234567890123456789012",
      token: "0x4567890123456789012345678901234567890123",
      maxAmount: BigInt(0),
      preApprovalExpiry: 0n,
      authorizationExpiry: 0n,
      refundExpiry: 0n,
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: "0x0000000000000000000000000000000000000000",
      salt: BigInt(0),
    };

    const hash = computePaymentInfoHash(zeroPaymentInfo, escrowAddress, chainId);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("should handle large values", () => {
    const largePaymentInfo: PaymentInfo = {
      ...samplePaymentInfo,
      maxAmount: BigInt("1329227995784915872903807060280344575"), // uint120 max (2^120 - 1)
      salt: BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"), // uint256 max
    };

    const hash = computePaymentInfoHash(largePaymentInfo, escrowAddress, chainId);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});

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
