import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  MemoryPaymentStore,
  FilePaymentStore,
  serializePaymentInfo,
  deserializePaymentInfo,
} from "../src/storage/index.js";
import type { PaymentInfo } from "../src/types/index.js";

const samplePaymentInfo: PaymentInfo = {
  operator: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  payer: "0x1111111111111111111111111111111111111111",
  receiver: "0x2222222222222222222222222222222222222222",
  token: "0x3333333333333333333333333333333333333333",
  maxAmount: 1000000n,
  preApprovalExpiry: 0n,
  authorizationExpiry: 1735689600n,
  refundExpiry: 1738368000n,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: "0x4444444444444444444444444444444444444444",
  salt: 0x123456n,
};

const samplePaymentInfo2: PaymentInfo = {
  ...samplePaymentInfo,
  payer: "0x5555555555555555555555555555555555555555",
  salt: 0x789abcn,
};

const hash1 = "0xaaa0000000000000000000000000000000000000000000000000000000000001" as const;
const hash2 = "0xbbb0000000000000000000000000000000000000000000000000000000000002" as const;

describe("serializePaymentInfo / deserializePaymentInfo", () => {
  it("should round-trip PaymentInfo through JSON serialization", () => {
    const serialized = serializePaymentInfo(samplePaymentInfo);
    const deserialized = deserializePaymentInfo(serialized);

    expect(deserialized.operator).toBe(samplePaymentInfo.operator);
    expect(deserialized.payer).toBe(samplePaymentInfo.payer);
    expect(deserialized.receiver).toBe(samplePaymentInfo.receiver);
    expect(deserialized.token).toBe(samplePaymentInfo.token);
    expect(deserialized.maxAmount).toBe(samplePaymentInfo.maxAmount);
    expect(deserialized.preApprovalExpiry).toBe(samplePaymentInfo.preApprovalExpiry);
    expect(deserialized.authorizationExpiry).toBe(samplePaymentInfo.authorizationExpiry);
    expect(deserialized.refundExpiry).toBe(samplePaymentInfo.refundExpiry);
    expect(deserialized.minFeeBps).toBe(samplePaymentInfo.minFeeBps);
    expect(deserialized.maxFeeBps).toBe(samplePaymentInfo.maxFeeBps);
    expect(deserialized.feeReceiver).toBe(samplePaymentInfo.feeReceiver);
    expect(deserialized.salt).toBe(samplePaymentInfo.salt);
  });

  it("should serialize bigint fields as strings", () => {
    const serialized = serializePaymentInfo(samplePaymentInfo);
    expect(typeof serialized.maxAmount).toBe("string");
    expect(typeof serialized.salt).toBe("string");
    expect(serialized.maxAmount).toBe("1000000");
    expect(serialized.salt).toBe("1193046"); // 0x123456
  });

  it("should survive JSON.stringify/parse round-trip", () => {
    const serialized = serializePaymentInfo(samplePaymentInfo);
    const jsonStr = JSON.stringify(serialized);
    const parsed = JSON.parse(jsonStr);
    const deserialized = deserializePaymentInfo(parsed);
    expect(deserialized.maxAmount).toBe(1000000n);
    expect(deserialized.salt).toBe(0x123456n);
  });
});

describe("MemoryPaymentStore", () => {
  let store: MemoryPaymentStore;

  beforeEach(() => {
    store = new MemoryPaymentStore();
  });

  it("should return null for unknown hash", async () => {
    const result = await store.load(hash1);
    expect(result).toBeNull();
  });

  it("should save and load PaymentInfo", async () => {
    await store.save(hash1, samplePaymentInfo);
    const loaded = await store.load(hash1);
    expect(loaded).not.toBeNull();
    expect(loaded!.operator).toBe(samplePaymentInfo.operator);
    expect(loaded!.maxAmount).toBe(samplePaymentInfo.maxAmount);
  });

  it("should overwrite on duplicate save", async () => {
    await store.save(hash1, samplePaymentInfo);
    const updated = { ...samplePaymentInfo, maxAmount: 2000000n };
    await store.save(hash1, updated);
    const loaded = await store.load(hash1);
    expect(loaded!.maxAmount).toBe(2000000n);
  });

  it("should list payments by payer", async () => {
    await store.save(hash1, samplePaymentInfo);
    await store.save(hash2, samplePaymentInfo2);

    const payer1Payments = await store.listByPayer(samplePaymentInfo.payer);
    expect(payer1Payments).toHaveLength(1);
    expect(payer1Payments[0].hash).toBe(hash1);

    const payer2Payments = await store.listByPayer(samplePaymentInfo2.payer);
    expect(payer2Payments).toHaveLength(1);
    expect(payer2Payments[0].hash).toBe(hash2);
  });

  it("should return empty array for unknown payer", async () => {
    const result = await store.listByPayer("0x9999999999999999999999999999999999999999");
    expect(result).toHaveLength(0);
  });

  it("should match payer case-insensitively", async () => {
    await store.save(hash1, samplePaymentInfo);
    const upper = samplePaymentInfo.payer.toUpperCase() as `0x${string}`;
    const result = await store.listByPayer(upper);
    expect(result).toHaveLength(1);
  });
});

describe("FilePaymentStore", () => {
  let tmpDir: string;
  let store: FilePaymentStore;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "x402r-test-"));
    store = new FilePaymentStore(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should return null for unknown hash", async () => {
    const result = await store.load(hash1);
    expect(result).toBeNull();
  });

  it("should save and load PaymentInfo", async () => {
    await store.save(hash1, samplePaymentInfo);
    const loaded = await store.load(hash1);
    expect(loaded).not.toBeNull();
    expect(loaded!.operator).toBe(samplePaymentInfo.operator);
    expect(loaded!.maxAmount).toBe(samplePaymentInfo.maxAmount);
    expect(loaded!.salt).toBe(samplePaymentInfo.salt);
  });

  it("should persist across store instances", async () => {
    await store.save(hash1, samplePaymentInfo);

    // Create a new store pointing to the same directory
    const store2 = new FilePaymentStore(tmpDir);
    const loaded = await store2.load(hash1);
    expect(loaded).not.toBeNull();
    expect(loaded!.maxAmount).toBe(samplePaymentInfo.maxAmount);
  });

  it("should list payments by payer", async () => {
    await store.save(hash1, samplePaymentInfo);
    await store.save(hash2, samplePaymentInfo2);

    const payer1Payments = await store.listByPayer(samplePaymentInfo.payer);
    expect(payer1Payments).toHaveLength(1);
    expect(payer1Payments[0].hash).toBe(hash1);
  });

  it("should return empty array for unknown payer", async () => {
    const result = await store.listByPayer("0x9999999999999999999999999999999999999999");
    expect(result).toHaveLength(0);
  });

  it("should create directory if it does not exist", () => {
    const nestedDir = join(tmpDir, "nested", "dir");
    const nestedStore = new FilePaymentStore(nestedDir);
    // Should not throw — directory created in constructor
    expect(nestedStore).toBeDefined();
  });
});
