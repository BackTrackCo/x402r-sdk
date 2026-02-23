import { describe, it, expect } from "vitest";
import {
  paymentOperatorFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  staticFeeCalculatorFactoryAbi,
  staticAddressConditionFactoryAbi,
} from "../src/abis/index.js";
import {
  type PaymentOperatorConfig,
  type EscrowPeriodConfig,
  type FreezeConfig,
  createPaymentOperatorConfig,
  createEscrowPeriodConfig,
  createFreezeConfig,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from "../src/factory/index.js";

describe("PaymentOperatorConfig", () => {
  it("should create a minimal config with feeRecipient", () => {
    const config = createPaymentOperatorConfig({
      feeRecipient: "0x1234567890123456789012345678901234567890",
    });

    expect(config.feeRecipient).toBe("0x1234567890123456789012345678901234567890");
    expect(config.feeCalculator).toBe(ZERO_ADDRESS);
    expect(config.authorizeCondition).toBe(ZERO_ADDRESS);
    expect(config.authorizeRecorder).toBe(ZERO_ADDRESS);
    expect(config.releaseCondition).toBe(ZERO_ADDRESS);
    expect(config.releaseRecorder).toBe(ZERO_ADDRESS);
  });

  it("should create a config with all conditions", () => {
    const config = createPaymentOperatorConfig({
      feeRecipient: "0x1234567890123456789012345678901234567890",
      feeCalculator: "0x1111111111111111111111111111111111111111",
      authorizeCondition: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      authorizeRecorder: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      releaseCondition: "0xcccccccccccccccccccccccccccccccccccccccc",
      releaseRecorder: "0xdddddddddddddddddddddddddddddddddddddddd",
      refundInEscrowCondition: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      refundInEscrowRecorder: "0xffffffffffffffffffffffffffffffffffffffff",
    });

    expect(config.feeRecipient).toBe("0x1234567890123456789012345678901234567890");
    expect(config.feeCalculator).toBe("0x1111111111111111111111111111111111111111");
    expect(config.authorizeCondition).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(config.releaseCondition).toBe("0xcccccccccccccccccccccccccccccccccccccccc");
    expect(config.refundInEscrowCondition).toBe("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
  });

  it("should have correct type structure with 12 fields", () => {
    const config: PaymentOperatorConfig = {
      feeRecipient: "0x1234567890123456789012345678901234567890",
      feeCalculator: "0x0000000000000000000000000000000000000000",
      authorizeCondition: "0x0000000000000000000000000000000000000000",
      authorizeRecorder: "0x0000000000000000000000000000000000000000",
      chargeCondition: "0x0000000000000000000000000000000000000000",
      chargeRecorder: "0x0000000000000000000000000000000000000000",
      releaseCondition: "0x0000000000000000000000000000000000000000",
      releaseRecorder: "0x0000000000000000000000000000000000000000",
      refundInEscrowCondition: "0x0000000000000000000000000000000000000000",
      refundInEscrowRecorder: "0x0000000000000000000000000000000000000000",
      refundPostEscrowCondition: "0x0000000000000000000000000000000000000000",
      refundPostEscrowRecorder: "0x0000000000000000000000000000000000000000",
    };

    expect(Object.keys(config)).toHaveLength(12);
  });
});

describe("EscrowPeriodConfig", () => {
  it("should create config with default authorizedCodehash", () => {
    const config = createEscrowPeriodConfig({
      escrowPeriod: 86400n, // 1 day in seconds
    });

    expect(config.escrowPeriod).toBe(86400n);
    expect(config.authorizedCodehash).toBe(ZERO_BYTES32);
  });

  it("should create config with custom authorizedCodehash", () => {
    const customCodehash = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const config = createEscrowPeriodConfig({
      escrowPeriod: 604800n, // 7 days
      authorizedCodehash: customCodehash,
    });

    expect(config.escrowPeriod).toBe(604800n);
    expect(config.authorizedCodehash).toBe(customCodehash);
  });

  it("should have correct type structure", () => {
    const config: EscrowPeriodConfig = {
      escrowPeriod: 86400n,
      authorizedCodehash: ZERO_BYTES32,
    };

    expect(config.escrowPeriod).toBeDefined();
    expect(config.authorizedCodehash).toBeDefined();
  });
});

describe("FreezeConfig", () => {
  it("should create config with permanent freeze", () => {
    const config = createFreezeConfig({
      freezeCondition: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      unfreezeCondition: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(config.freezeCondition).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(config.unfreezeCondition).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(config.freezeDuration).toBe(0n); // permanent
    expect(config.escrowPeriodContract).toBe(ZERO_ADDRESS);
  });

  it("should create config with timed freeze and escrow period", () => {
    const config = createFreezeConfig({
      freezeCondition: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      unfreezeCondition: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      freezeDuration: 259200n, // 3 days
      escrowPeriodContract: "0xcccccccccccccccccccccccccccccccccccccccc",
    });

    expect(config.freezeDuration).toBe(259200n);
    expect(config.escrowPeriodContract).toBe("0xcccccccccccccccccccccccccccccccccccccccc");
  });

  it("should have correct type structure with 4 fields", () => {
    const config: FreezeConfig = {
      freezeCondition: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      unfreezeCondition: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      freezeDuration: 0n,
      escrowPeriodContract: "0x0000000000000000000000000000000000000000",
    };

    expect(config.freezeCondition).toBeDefined();
    expect(config.unfreezeCondition).toBeDefined();
    expect(config.freezeDuration).toBeDefined();
    expect(config.escrowPeriodContract).toBeDefined();
    expect(Object.keys(config)).toHaveLength(4);
  });
});

describe("Factory ABIs", () => {
  describe("paymentOperatorFactoryAbi", () => {
    it("should be defined and be an array", () => {
      expect(paymentOperatorFactoryAbi).toBeDefined();
      expect(Array.isArray(paymentOperatorFactoryAbi)).toBe(true);
    });

    it("should have computeAddress function", () => {
      const computeAddress = paymentOperatorFactoryAbi.find(
        item => item.type === "function" && item.name === "computeAddress",
      );
      expect(computeAddress).toBeDefined();
    });

    it("should have deployOperator function", () => {
      const deployOperator = paymentOperatorFactoryAbi.find(
        item => item.type === "function" && item.name === "deployOperator",
      );
      expect(deployOperator).toBeDefined();
    });

    it("should have getOperator function", () => {
      const getOperator = paymentOperatorFactoryAbi.find(
        item => item.type === "function" && item.name === "getOperator",
      );
      expect(getOperator).toBeDefined();
    });
  });

  describe("escrowPeriodFactoryAbi", () => {
    it("should be defined and be an array", () => {
      expect(escrowPeriodFactoryAbi).toBeDefined();
      expect(Array.isArray(escrowPeriodFactoryAbi)).toBe(true);
    });

    it("should have deploy function", () => {
      const deploy = escrowPeriodFactoryAbi.find(
        item => item.type === "function" && item.name === "deploy",
      );
      expect(deploy).toBeDefined();
    });

    it("should have computeAddress function (not computeAddresses)", () => {
      const computeAddress = escrowPeriodFactoryAbi.find(
        item => item.type === "function" && item.name === "computeAddress",
      );
      expect(computeAddress).toBeDefined();

      const computeAddresses = escrowPeriodFactoryAbi.find(
        item => item.type === "function" && item.name === "computeAddresses",
      );
      expect(computeAddresses).toBeUndefined(); // Should NOT exist
    });

    it("should have getDeployed function", () => {
      const getDeployed = escrowPeriodFactoryAbi.find(
        item => item.type === "function" && item.name === "getDeployed",
      );
      expect(getDeployed).toBeDefined();
    });
  });

  describe("freezeFactoryAbi", () => {
    it("should be defined and be an array", () => {
      expect(freezeFactoryAbi).toBeDefined();
      expect(Array.isArray(freezeFactoryAbi)).toBe(true);
    });

    it("should have deploy function with 4 params", () => {
      const deploy = freezeFactoryAbi.find(
        item => item.type === "function" && item.name === "deploy",
      );
      expect(deploy).toBeDefined();
      if (deploy && "inputs" in deploy) {
        expect(deploy.inputs).toHaveLength(4);
        expect(deploy.inputs[0].name).toBe("freezeCondition");
        expect(deploy.inputs[1].name).toBe("unfreezeCondition");
        expect(deploy.inputs[2].name).toBe("freezeDuration");
        expect(deploy.inputs[3].name).toBe("escrowPeriodContract");
      }
    });

    it("should have computeAddress function with 4 params", () => {
      const computeAddress = freezeFactoryAbi.find(
        item => item.type === "function" && item.name === "computeAddress",
      );
      expect(computeAddress).toBeDefined();
      if (computeAddress && "inputs" in computeAddress) {
        expect(computeAddress.inputs).toHaveLength(4);
      }
    });
  });

  describe("staticFeeCalculatorFactoryAbi", () => {
    it("should be defined and be an array", () => {
      expect(staticFeeCalculatorFactoryAbi).toBeDefined();
      expect(Array.isArray(staticFeeCalculatorFactoryAbi)).toBe(true);
    });

    it("should have deploy function", () => {
      const deploy = staticFeeCalculatorFactoryAbi.find(
        item => item.type === "function" && item.name === "deploy",
      );
      expect(deploy).toBeDefined();
    });

    it("should have computeAddress function", () => {
      const computeAddress = staticFeeCalculatorFactoryAbi.find(
        item => item.type === "function" && item.name === "computeAddress",
      );
      expect(computeAddress).toBeDefined();
    });
  });

  describe("staticAddressConditionFactoryAbi", () => {
    it("should be defined and be an array", () => {
      expect(staticAddressConditionFactoryAbi).toBeDefined();
      expect(Array.isArray(staticAddressConditionFactoryAbi)).toBe(true);
    });

    it("should have deploy function", () => {
      const deploy = staticAddressConditionFactoryAbi.find(
        item => item.type === "function" && item.name === "deploy",
      );
      expect(deploy).toBeDefined();
    });

    it("should have computeAddress function", () => {
      const computeAddress = staticAddressConditionFactoryAbi.find(
        item => item.type === "function" && item.name === "computeAddress",
      );
      expect(computeAddress).toBeDefined();
    });
  });
});

describe("Constants", () => {
  it("ZERO_ADDRESS should be a valid zero address", () => {
    expect(ZERO_ADDRESS).toBe("0x0000000000000000000000000000000000000000");
  });

  it("ZERO_BYTES32 should be a valid zero bytes32", () => {
    expect(ZERO_BYTES32).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");
  });
});
