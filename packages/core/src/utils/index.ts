/**
 * Shared utilities for X402r SDK
 * @module utils
 */

import { keccak256, encodeAbiParameters, toHex, zeroAddress } from "viem";
import type { WalletClient } from "viem";
import type { PaymentInfo } from "../types/index.js";

/**
 * EIP-712 typehash for PaymentInfo struct
 *
 * Computed as: keccak256("PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)")
 */
export const PAYMENT_INFO_TYPEHASH = keccak256(
  toHex(
    "PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)",
  ),
);

/**
 * ABI parameter types for PaymentInfo struct encoding
 */
const paymentInfoAbiParams: readonly { name: string; type: string }[] = [
  { name: "typehash", type: "bytes32" },
  { name: "operator", type: "address" },
  { name: "payer", type: "address" },
  { name: "receiver", type: "address" },
  { name: "token", type: "address" },
  { name: "maxAmount", type: "uint120" },
  { name: "preApprovalExpiry", type: "uint48" },
  { name: "authorizationExpiry", type: "uint48" },
  { name: "refundExpiry", type: "uint48" },
  { name: "minFeeBps", type: "uint16" },
  { name: "maxFeeBps", type: "uint16" },
  { name: "feeReceiver", type: "address" },
  { name: "salt", type: "uint256" },
];

/**
 * ABI parameter types for final hash encoding (chainId, escrow, paymentInfoHash)
 */
const finalHashAbiParams: readonly { name: string; type: string }[] = [
  { name: "chainId", type: "uint256" },
  { name: "escrow", type: "address" },
  { name: "paymentInfoHash", type: "bytes32" },
];

/**
 * Convert a PaymentInfo object to ABI-compatible tuple format for viem contract calls.
 *
 * viem's strict ABI typing cannot infer our PaymentInfo interface as the expected
 * tuple type (the interface uses `bigint` and `number` which don't match viem's
 * inferred `uint120`/`uint48`/`uint16` types). The `never` return type is assignable
 * to any parameter position without leaking `any` to callers, so this centralizes
 * the cast at one boundary.
 */
export function toAbiPaymentInfo(paymentInfo: PaymentInfo): never {
  return paymentInfo as never;
}

/**
 * Compute the payment info hash as used by the escrow contract
 *
 * The hash is computed in two steps:
 * 1. Hash the PaymentInfo struct with its typehash
 * 2. Hash the result with chainId and escrow address
 *
 * This matches the Solidity implementation:
 * ```solidity
 * bytes32 paymentInfoHash = keccak256(abi.encode(PAYMENT_INFO_TYPEHASH, paymentInfo));
 * return keccak256(abi.encode(block.chainid, address(this), paymentInfoHash));
 * ```
 *
 * @param chainId - The chain ID (e.g., 84532 for Base Sepolia)
 * @param escrowAddress - The escrow contract address
 * @param paymentInfo - The payment information struct
 * @returns The bytes32 hash
 *
 * @example
 * ```typescript
 * const hash = computePaymentInfoHash(
 *   84532,
 *   '0xb9488351E48b23D798f24e8174514F28B741Eb4f',
 *   paymentInfo
 * );
 * ```
 */
export function computePaymentInfoHash(
  chainId: number,
  escrowAddress: `0x${string}`,
  paymentInfo: PaymentInfo,
): `0x${string}` {
  // Step 1: Encode and hash the PaymentInfo struct with typehash
  const encodedPaymentInfo = encodeAbiParameters(paymentInfoAbiParams, [
    PAYMENT_INFO_TYPEHASH,
    paymentInfo.operator,
    paymentInfo.payer,
    paymentInfo.receiver,
    paymentInfo.token,
    paymentInfo.maxAmount,
    paymentInfo.preApprovalExpiry,
    paymentInfo.authorizationExpiry,
    paymentInfo.refundExpiry,
    BigInt(paymentInfo.minFeeBps),
    BigInt(paymentInfo.maxFeeBps),
    paymentInfo.feeReceiver,
    paymentInfo.salt,
  ]);

  const paymentInfoHash = keccak256(encodedPaymentInfo);

  // Step 2: Encode and hash with chainId and escrow address
  const encodedFinal = encodeAbiParameters(finalHashAbiParams, [
    BigInt(chainId),
    escrowAddress,
    paymentInfoHash,
  ]);

  return keccak256(encodedFinal);
}

/**
 * Compute the payer-agnostic escrow nonce for ERC-3009 authorization.
 *
 * This is the same as `computePaymentInfoHash` but with `payer = address(0)`.
 * It matches `AuthCaptureEscrow.getHash()` with payer=0x0.
 *
 * @param chainId - The chain ID
 * @param escrowAddress - The escrow contract address
 * @param paymentInfo - PaymentInfo (payer field is ignored — replaced with address(0))
 * @returns The bytes32 nonce for ERC-3009 signing
 */
export function computeEscrowNonce(
  chainId: number,
  escrowAddress: `0x${string}`,
  paymentInfo: PaymentInfo,
): `0x${string}` {
  const payerAgnostic: PaymentInfo = { ...paymentInfo, payer: zeroAddress };
  return computePaymentInfoHash(chainId, escrowAddress, payerAgnostic);
}

/**
 * ERC-3009 authorization parameters
 */
export interface ERC3009Authorization {
  /** Payer (from) address */
  from: `0x${string}`;
  /** Recipient (to) address — typically the TokenCollector */
  to: `0x${string}`;
  /** Amount in token units */
  value: bigint;
  /** Earliest time the authorization is valid */
  validAfter: bigint;
  /** Latest time the authorization is valid (typically preApprovalExpiry) */
  validBefore: bigint;
  /** Nonce — the payer-agnostic escrow hash */
  nonce: `0x${string}`;
}

/**
 * Sign an ERC-3009 `ReceiveWithAuthorization` using EIP-712 typed data.
 *
 * This is the signing step required to create the `collectorData` parameter
 * for `PaymentOperator.authorize()`. The resulting signature authorizes the
 * TokenCollector to pull tokens from the payer's account.
 *
 * @param walletClient - viem WalletClient (must have an account)
 * @param tokenAddress - The ERC-20 token contract address (e.g., USDC)
 * @param authorization - ERC-3009 authorization parameters
 * @param tokenName - Token's EIP-712 domain name (e.g., "USDC" on Base)
 * @param tokenVersion - Token's EIP-712 domain version (default: "2")
 * @returns The raw signature (0x-prefixed hex string)
 *
 * @example
 * ```typescript
 * import { signERC3009Authorization, computeEscrowNonce, resolveAddresses } from '@x402r/core';
 *
 * const addrs = resolveAddresses('eip155:84532');
 * const nonce = computeEscrowNonce(addrs.chainId, addrs.escrowAddress, paymentInfo);
 *
 * const signature = await signERC3009Authorization(walletClient, addrs.usdc, {
 *   from: payerAddress,
 *   to: addrs.tokenCollector,
 *   value: paymentInfo.maxAmount,
 *   validAfter: 0n,
 *   validBefore: paymentInfo.preApprovalExpiry,
 *   nonce,
 * });
 * ```
 */
export async function signERC3009Authorization(
  walletClient: WalletClient,
  tokenAddress: `0x${string}`,
  authorization: ERC3009Authorization,
  tokenName: string = "USDC",
  tokenVersion: string = "2",
): Promise<`0x${string}`> {
  if (!walletClient.account) {
    throw new Error(
      "WalletClient must have an account. Pass an account when creating the WalletClient.",
    );
  }

  const chainId = await walletClient.getChainId();

  const domain = {
    name: tokenName,
    version: tokenVersion,
    chainId,
    verifyingContract: tokenAddress,
  } as const;

  const types = {
    ReceiveWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  } as const;

  const message = {
    from: authorization.from,
    to: authorization.to,
    value: authorization.value,
    validAfter: authorization.validAfter,
    validBefore: authorization.validBefore,
    nonce: authorization.nonce,
  };

  return walletClient.signTypedData({
    account: walletClient.account,
    domain,
    types,
    primaryType: "ReceiveWithAuthorization",
    message,
  });
}

/**
 * Parse a JSON string (or plain object) into a typed PaymentInfo.
 *
 * Handles BigInt conversion for all numeric fields that are bigint in the type
 * (maxAmount, preApprovalExpiry, authorizationExpiry, refundExpiry, salt).
 * Number fields (minFeeBps, maxFeeBps) are converted via Number().
 *
 * @param input - JSON string or plain object with PaymentInfo fields
 * @returns Typed PaymentInfo
 * @throws Error if required fields are missing or input is not valid JSON
 *
 * @example
 * ```typescript
 * // From JSON string (e.g., from HTTP 402 response body)
 * const paymentInfo = parsePaymentInfo(jsonString);
 *
 * // From object (e.g., already parsed)
 * const paymentInfo = parsePaymentInfo(responseBody);
 * ```
 */
export function parsePaymentInfo(input: string | Record<string, unknown>): PaymentInfo {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;

  const requiredFields = [
    "operator",
    "payer",
    "receiver",
    "token",
    "maxAmount",
    "feeReceiver",
    "salt",
  ];
  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(
        `Missing required PaymentInfo field: '${field}'. ` +
          `Expected fields: operator, payer, receiver, token, maxAmount, preApprovalExpiry, ` +
          `authorizationExpiry, refundExpiry, minFeeBps, maxFeeBps, feeReceiver, salt`,
      );
    }
  }

  return {
    operator: parsed.operator as `0x${string}`,
    payer: parsed.payer as `0x${string}`,
    receiver: parsed.receiver as `0x${string}`,
    token: parsed.token as `0x${string}`,
    maxAmount: BigInt(parsed.maxAmount),
    preApprovalExpiry: BigInt(parsed.preApprovalExpiry ?? 0),
    authorizationExpiry: BigInt(parsed.authorizationExpiry ?? 0),
    refundExpiry: BigInt(parsed.refundExpiry ?? 0),
    minFeeBps: Number(parsed.minFeeBps ?? 0),
    maxFeeBps: Number(parsed.maxFeeBps ?? 0),
    feeReceiver: parsed.feeReceiver as `0x${string}`,
    salt: BigInt(parsed.salt),
  };
}
