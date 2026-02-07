import { describe, it, expect } from "vitest";
import {
  X402rError,
  ContractErrorName,
  decodeContractError,
  isX402rError,
  CONTRACT_ERRORS,
} from "../src/errors/index.js";

describe("CONTRACT_ERRORS", () => {
  it("should have operator errors", () => {
    expect(CONTRACT_ERRORS.InvalidOperator).toBeDefined();
    expect(CONTRACT_ERRORS.ConditionNotMet).toBeDefined();
    expect(CONTRACT_ERRORS.NotReceiver).toBeDefined();
    expect(CONTRACT_ERRORS.NotPayer).toBeDefined();
  });

  it("should have refund request errors", () => {
    expect(CONTRACT_ERRORS.RequestAlreadyExists).toBeDefined();
    expect(CONTRACT_ERRORS.RequestDoesNotExist).toBeDefined();
    expect(CONTRACT_ERRORS.RequestNotPending).toBeDefined();
    expect(CONTRACT_ERRORS.InvalidStatus).toBeDefined();
    expect(CONTRACT_ERRORS.FullyRefunded).toBeDefined();
  });

  it("should have escrow period errors", () => {
    expect(CONTRACT_ERRORS.EscrowPeriodExpired).toBeDefined();
    expect(CONTRACT_ERRORS.AlreadyFrozen).toBeDefined();
    expect(CONTRACT_ERRORS.NotFrozen).toBeDefined();
    expect(CONTRACT_ERRORS.UnauthorizedFreeze).toBeDefined();
  });

  it("should have error signatures", () => {
    // Error signatures are the first 4 bytes of keccak256(error signature)
    expect(CONTRACT_ERRORS.InvalidOperator.selector).toMatch(
      /^0x[a-fA-F0-9]{8}$/,
    );
  });
});

describe("X402rError", () => {
  it("should be constructable with name and message", () => {
    const error = new X402rError("InvalidOperator", "The operator is invalid");
    expect(error.name).toBe("InvalidOperator");
    expect(error.message).toBe("The operator is invalid");
    expect(error instanceof Error).toBe(true);
  });

  it("should support optional args", () => {
    const error = new X402rError("ConditionNotMet", "Condition failed", {
      condition: "0x1234567890123456789012345678901234567890",
    });
    expect(error.args).toEqual({
      condition: "0x1234567890123456789012345678901234567890",
    });
  });
});

describe("isX402rError", () => {
  it("should return true for X402rError instances", () => {
    const error = new X402rError("InvalidOperator", "test");
    expect(isX402rError(error)).toBe(true);
  });

  it("should return false for regular errors", () => {
    const error = new Error("test");
    expect(isX402rError(error)).toBe(false);
  });

  it("should return false for non-errors", () => {
    expect(isX402rError("not an error")).toBe(false);
    expect(isX402rError(null)).toBe(false);
    expect(isX402rError(undefined)).toBe(false);
  });
});

describe("decodeContractError", () => {
  it("should decode error by selector", () => {
    // Create a mock error data with InvalidOperator selector
    const selector = CONTRACT_ERRORS.InvalidOperator.selector;
    const result = decodeContractError(selector);

    expect(result).not.toBeNull();
    expect(result?.name).toBe("InvalidOperator");
    expect(result?.message).toBeDefined();
  });

  it("should return null for unknown selector", () => {
    const result = decodeContractError("0x12345678");
    expect(result).toBeNull();
  });

  it("should handle hex data with 0x prefix", () => {
    const selector = CONTRACT_ERRORS.NotReceiver.selector;
    const result = decodeContractError(selector);

    expect(result).not.toBeNull();
    expect(result?.name).toBe("NotReceiver");
  });

  it("should handle empty input", () => {
    expect(decodeContractError("")).toBeNull();
    expect(decodeContractError("0x")).toBeNull();
  });

  it("should decode error from viem ContractFunctionRevertedError-like structure", () => {
    // Simulate viem error structure
    const viemError = {
      data: CONTRACT_ERRORS.RequestNotPending.selector,
    };
    const result = decodeContractError(viemError.data);

    expect(result?.name).toBe("RequestNotPending");
  });
});

describe("ContractErrorName type", () => {
  it("should include all expected error names", () => {
    const errorNames: ContractErrorName[] = [
      "InvalidOperator",
      "ConditionNotMet",
      "NotReceiver",
      "NotPayer",
      "RequestAlreadyExists",
      "RequestDoesNotExist",
      "RequestNotPending",
      "InvalidStatus",
      "FullyRefunded",
      "EscrowPeriodExpired",
      "AlreadyFrozen",
      "NotFrozen",
      "UnauthorizedFreeze",
    ];

    // Verify each error name is valid
    errorNames.forEach((name) => {
      expect(CONTRACT_ERRORS[name]).toBeDefined();
    });
  });
});
