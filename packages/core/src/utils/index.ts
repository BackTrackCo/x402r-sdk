/**
 * Shared utilities for X402r SDK
 * @module utils
 */

import type { PublicClient, WalletClient } from "viem";
import type { PaymentInfo } from "../types/index.js";
import { AuthCaptureEscrowABI } from "../abis/index.js";

/**
 * Convert a PaymentInfo object to ABI-compatible tuple format for viem contract calls.
 *
 * viem's strict ABI typing cannot infer our PaymentInfo interface as the expected
 * tuple type (the interface uses `bigint` and `number` which don't match viem's
 * inferred `uint120`/`uint48`/`uint16` types). This helper centralizes the cast
 * so callers don't need `as never` at every call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAbiPaymentInfo(paymentInfo: PaymentInfo): any {
  return paymentInfo;
}

/**
 * Compute the payer-agnostic escrow nonce for ERC-3009 authorization.
 *
 * Calls the escrow contract's `getHash` pure function with `payer = address(0)`.
 *
 * @param publicClient - viem PublicClient for reading contract state
 * @param paymentInfo - PaymentInfo (payer field is ignored — replaced with address(0))
 * @param escrowAddress - The escrow contract address
 * @returns The bytes32 nonce for ERC-3009 signing
 */
export async function computeEscrowNonce(
  publicClient: PublicClient,
  paymentInfo: PaymentInfo,
  escrowAddress: `0x${string}`,
): Promise<`0x${string}`> {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
  const payerAgnostic: PaymentInfo = { ...paymentInfo, payer: ZERO_ADDRESS };
  const hash = await publicClient.readContract({
    address: escrowAddress,
    abi: AuthCaptureEscrowABI,
    functionName: "getHash",
    args: [toAbiPaymentInfo(payerAgnostic)],
  });
  return hash as `0x${string}`;
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
 * const nonce = await computeEscrowNonce(publicClient, paymentInfo, addrs.escrowAddress);
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
