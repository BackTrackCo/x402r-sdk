import { describe, it, expect } from "vitest";
import {
  // ABIs
  IConditionABI,
  PayerConditionABI,
  ReceiverConditionABI,
  AlwaysTrueConditionABI,
  StaticAddressConditionABI,
  AndConditionABI,
  OrConditionABI,
  NotConditionABI,
  // Types
  ConditionAddress,
  AndConditionConfig,
  OrConditionConfig,
  NotConditionConfig,
  StaticAddressConditionConfig,
  // Builder
  createConditionHelpers,
} from "../src/conditions/index.js";
import { NETWORK_CONFIG } from "../src/config/index.js";

describe("Condition ABIs", () => {
  it("should export IConditionABI", () => {
    expect(IConditionABI).toBeDefined();
    expect(Array.isArray(IConditionABI)).toBe(true);
  });

  it("should have check function in IConditionABI with 3 parameters", () => {
    const check = IConditionABI.find(item => item.type === "function" && item.name === "check");
    expect(check).toBeDefined();
    // Critical: check must have 3 parameters - paymentInfo, amount, caller
    expect(check?.inputs).toHaveLength(3);
    const inputNames = check?.inputs?.map(i => i.name);
    expect(inputNames).toContain("paymentInfo");
    expect(inputNames).toContain("amount");
    expect(inputNames).toContain("caller");
  });

  it("should export PayerConditionABI", () => {
    expect(PayerConditionABI).toBeDefined();
    expect(Array.isArray(PayerConditionABI)).toBe(true);
  });

  it("should export ReceiverConditionABI", () => {
    expect(ReceiverConditionABI).toBeDefined();
    expect(Array.isArray(ReceiverConditionABI)).toBe(true);
  });

  it("should export AlwaysTrueConditionABI", () => {
    expect(AlwaysTrueConditionABI).toBeDefined();
    expect(Array.isArray(AlwaysTrueConditionABI)).toBe(true);
  });

  it("should export StaticAddressConditionABI", () => {
    expect(StaticAddressConditionABI).toBeDefined();
    expect(Array.isArray(StaticAddressConditionABI)).toBe(true);
  });

  it("should have DESIGNATED_ADDRESS in StaticAddressConditionABI", () => {
    const getter = StaticAddressConditionABI.find(
      item => item.type === "function" && item.name === "DESIGNATED_ADDRESS",
    );
    expect(getter).toBeDefined();
  });

  it("should export AndConditionABI", () => {
    expect(AndConditionABI).toBeDefined();
    expect(Array.isArray(AndConditionABI)).toBe(true);
  });

  it("should have conditionCount in AndConditionABI", () => {
    const getter = AndConditionABI.find(
      item => item.type === "function" && item.name === "conditionCount",
    );
    expect(getter).toBeDefined();
  });

  it("should export OrConditionABI", () => {
    expect(OrConditionABI).toBeDefined();
    expect(Array.isArray(OrConditionABI)).toBe(true);
  });

  it("should export NotConditionABI", () => {
    expect(NotConditionABI).toBeDefined();
    expect(Array.isArray(NotConditionABI)).toBe(true);
  });
});

describe("ConditionAddress type", () => {
  it("should accept valid addresses", () => {
    const addr: ConditionAddress = "0x1234567890123456789012345678901234567890";
    expect(addr).toBe("0x1234567890123456789012345678901234567890");
  });
});

describe("createConditionHelpers", () => {
  it("should return helpers for Base Sepolia (conditions deployed)", () => {
    const config = NETWORK_CONFIG["eip155:84532"];
    const helpers = createConditionHelpers("eip155:84532");
    expect(helpers).toBeDefined();
    expect(helpers.PAYER).toBe(config.conditions!.payer);
    expect(helpers.RECEIVER).toBe(config.conditions!.receiver);
    expect(helpers.ALWAYS_TRUE).toBe(config.conditions!.alwaysTrue);
  });

  it("should return helpers for Base Mainnet (conditions deployed)", () => {
    const config = NETWORK_CONFIG["eip155:8453"];
    const helpers = createConditionHelpers("eip155:8453");
    expect(helpers).toBeDefined();
    expect(helpers.PAYER).toBe(config.conditions!.payer);
    expect(helpers.RECEIVER).toBe(config.conditions!.receiver);
    expect(helpers.ALWAYS_TRUE).toBe(config.conditions!.alwaysTrue);
  });

  it("should throw for unsupported network", () => {
    expect(() => createConditionHelpers("not-a-network")).toThrow();
  });

  describe("helper factory", () => {
    it("should export createConditionHelpers function", () => {
      expect(createConditionHelpers).toBeDefined();
      expect(typeof createConditionHelpers).toBe("function");
    });
  });
});

describe("Condition config types", () => {
  it("should create valid AndConditionConfig", () => {
    const config: AndConditionConfig = {
      type: "and",
      conditions: [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
    };
    expect(config.type).toBe("and");
    expect(config.conditions).toHaveLength(2);
  });

  it("should create valid OrConditionConfig", () => {
    const config: OrConditionConfig = {
      type: "or",
      conditions: [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
    };
    expect(config.type).toBe("or");
    expect(config.conditions).toHaveLength(2);
  });

  it("should create valid NotConditionConfig", () => {
    const config: NotConditionConfig = {
      type: "not",
      condition: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    expect(config.type).toBe("not");
    expect(config.condition).toBeDefined();
  });

  it("should create valid StaticAddressConditionConfig", () => {
    const config: StaticAddressConditionConfig = {
      type: "staticAddress",
      designatedAddress: "0x1234567890123456789012345678901234567890",
    };
    expect(config.type).toBe("staticAddress");
    expect(config.designatedAddress).toBeDefined();
  });

  it("should support nested conditions", () => {
    const innerAnd: AndConditionConfig = {
      type: "and",
      conditions: [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ],
    };

    const outerOr: OrConditionConfig = {
      type: "or",
      conditions: ["0xcccccccccccccccccccccccccccccccccccccccc", innerAnd],
    };

    expect(outerOr.type).toBe("or");
    expect(outerOr.conditions).toHaveLength(2);
    expect((outerOr.conditions[1] as AndConditionConfig).type).toBe("and");
  });
});
