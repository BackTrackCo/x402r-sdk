import { describe, it, expect, vi } from "vitest";
import { getOperatorDeployment } from "../src/discovery/index.js";

const mockOperatorAddress = "0x1234567890123456789012345678901234567890" as const;
const mockEscrow = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const mockFeeRecipient = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const mockFeeCalculator = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
const mockProtocolFeeConfig = "0xdddddddddddddddddddddddddddddddddddddd" as const;
const mockAuthCondition = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;
const mockReleaseCondition = "0xffffffffffffffffffffffffffffffffffffffff" as const;

function createMockPublicClient(overrides: Record<string, `0x${string}`> = {}) {
  const defaults: Record<string, `0x${string}`> = {
    ESCROW: mockEscrow,
    FEE_RECIPIENT: mockFeeRecipient,
    FEE_CALCULATOR: mockFeeCalculator,
    PROTOCOL_FEE_CONFIG: mockProtocolFeeConfig,
    AUTHORIZE_CONDITION: mockAuthCondition,
    RELEASE_CONDITION: mockReleaseCondition,
  };

  const values = { ...defaults, ...overrides };

  return {
    readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
      return Promise.resolve(values[functionName] ?? "0x0000000000000000000000000000000000000000");
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getOperatorDeployment", () => {
  it("should return operator config combined with network addresses", async () => {
    const publicClient = createMockPublicClient();
    const deployment = await getOperatorDeployment(
      mockOperatorAddress,
      publicClient,
      "eip155:84532",
    );

    expect(deployment.operatorAddress).toBe(mockOperatorAddress);
    expect(deployment.escrowAddress).toBe(mockEscrow);
    expect(deployment.feeRecipient).toBe(mockFeeRecipient);
    expect(deployment.feeCalculator).toBe(mockFeeCalculator);
    expect(deployment.protocolFeeConfig).toBe(mockProtocolFeeConfig);
    expect(deployment.authorizeCondition).toBe(mockAuthCondition);
    expect(deployment.releaseCondition).toBe(mockReleaseCondition);

    // Network addresses should also be populated
    expect(deployment.network.refundRequestAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(deployment.network.arbiterRegistryAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(deployment.network.name).toBe("Base Sepolia");
  });

  it("should throw for unsupported network", async () => {
    const publicClient = createMockPublicClient();
    await expect(
      getOperatorDeployment(mockOperatorAddress, publicClient, "eip155:999999"),
    ).rejects.toThrow("not supported");
  });

  it("should make 6 contract reads", async () => {
    const publicClient = createMockPublicClient();
    await getOperatorDeployment(mockOperatorAddress, publicClient, "eip155:84532");
    expect(publicClient.readContract).toHaveBeenCalledTimes(6);
  });
});
