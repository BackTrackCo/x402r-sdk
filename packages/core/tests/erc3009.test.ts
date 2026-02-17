import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signERC3009Authorization,
  computeEscrowNonce,
  computePaymentInfoHash,
} from "../src/utils/index.js";
import type { ERC3009Authorization } from "../src/utils/index.js";
import type { PaymentInfo } from "../src/types/index.js";

const samplePaymentInfo: PaymentInfo = {
  operator: "0x1234567890123456789012345678901234567890",
  payer: "0x2345678901234567890123456789012345678901",
  receiver: "0x3456789012345678901234567890123456789012",
  token: "0x4567890123456789012345678901234567890123",
  maxAmount: BigInt("1000000"),
  preApprovalExpiry: BigInt(1735689600),
  authorizationExpiry: BigInt(1735689600),
  refundExpiry: BigInt(1738368000),
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: "0x5678901234567890123456789012345678901234",
  salt: BigInt("0x123456789abcdef"),
};

const escrowAddress = "0xb9488351E48b23D798f24e8174514F28B741Eb4f" as const;
const chainId = 84532;

describe("computeEscrowNonce", () => {
  it("should return a bytes32 hash", () => {
    const nonce = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo);
    expect(nonce).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("should be deterministic", () => {
    const nonce1 = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo);
    const nonce2 = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo);
    expect(nonce1).toBe(nonce2);
  });

  it("should differ from computePaymentInfoHash (payer zeroed)", () => {
    const nonce = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo);
    const hash = computePaymentInfoHash(chainId, escrowAddress, samplePaymentInfo);
    expect(nonce).not.toBe(hash);
  });

  it("should produce the same nonce regardless of payer address", () => {
    const payerA = {
      ...samplePaymentInfo,
      payer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
    };
    const payerB = {
      ...samplePaymentInfo,
      payer: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
    };

    const nonceA = computeEscrowNonce(chainId, escrowAddress, payerA);
    const nonceB = computeEscrowNonce(chainId, escrowAddress, payerB);
    expect(nonceA).toBe(nonceB);
  });

  it("should match computePaymentInfoHash with zero payer", () => {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
    const zeroPayer = { ...samplePaymentInfo, payer: ZERO_ADDRESS };

    const nonce = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo);
    const hash = computePaymentInfoHash(chainId, escrowAddress, zeroPayer);
    expect(nonce).toBe(hash);
  });
});

describe("signERC3009Authorization", () => {
  const mockSignature =
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

  const mockWalletClient = {
    account: {
      address: "0x2345678901234567890123456789012345678901" as `0x${string}`,
    },
    getChainId: vi.fn().mockResolvedValue(84532),
    signTypedData: vi.fn().mockResolvedValue(mockSignature),
  };

  const tokenAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

  beforeEach(() => {
    mockWalletClient.signTypedData.mockClear();
    mockWalletClient.getChainId.mockClear();
  });

  const authorization: ERC3009Authorization = {
    from: "0x2345678901234567890123456789012345678901",
    to: "0x3456789012345678901234567890123456789012",
    value: BigInt("1000000"),
    validAfter: 0n,
    validBefore: BigInt(1735689600),
    nonce: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };

  it("should call signTypedData with ReceiveWithAuthorization primary type", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signERC3009Authorization(mockWalletClient as any, tokenAddress, authorization);

    expect(mockWalletClient.signTypedData).toHaveBeenCalledOnce();
    const call = mockWalletClient.signTypedData.mock.calls[0][0];
    expect(call.primaryType).toBe("ReceiveWithAuthorization");
  });

  it("should use correct EIP-712 domain", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signERC3009Authorization(mockWalletClient as any, tokenAddress, authorization);

    const call = mockWalletClient.signTypedData.mock.calls[0][0];
    expect(call.domain).toEqual({
      name: "USDC",
      version: "2",
      chainId: 84532,
      verifyingContract: tokenAddress,
    });
  });

  it("should pass authorization fields as message", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signERC3009Authorization(mockWalletClient as any, tokenAddress, authorization);

    const call = mockWalletClient.signTypedData.mock.calls[0][0];
    expect(call.message).toEqual({
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    });
  });

  it("should return the signature from signTypedData", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = await signERC3009Authorization(
      mockWalletClient as any,
      tokenAddress,
      authorization,
    );
    expect(sig).toBe(mockSignature);
  });

  it("should accept custom token name and version", async () => {
    await signERC3009Authorization(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockWalletClient as any,
      tokenAddress,
      authorization,
      "CustomToken",
      "1",
    );

    const call = mockWalletClient.signTypedData.mock.calls[0][0];
    expect(call.domain.name).toBe("CustomToken");
    expect(call.domain.version).toBe("1");
  });

  it("should throw if walletClient has no account", async () => {
    const noAccountClient = {
      getChainId: vi.fn().mockResolvedValue(84532),
      signTypedData: vi.fn(),
    };

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signERC3009Authorization(noAccountClient as any, tokenAddress, authorization),
    ).rejects.toThrow("WalletClient must have an account");
  });

  it("should include correct ERC-3009 type fields", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signERC3009Authorization(mockWalletClient as any, tokenAddress, authorization);

    const call = mockWalletClient.signTypedData.mock.calls[0][0];
    const typeFields = call.types.ReceiveWithAuthorization;
    expect(typeFields).toEqual([
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ]);
  });
});
