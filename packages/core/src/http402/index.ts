/**
 * HTTP 402 bridge utilities
 *
 * Helpers for bridging x402 protocol types with x402r SDK types.
 * Used by E2E tests and examples that run in-process facilitators.
 *
 * @module http402
 */

import type { PaymentInfo } from "../types/index.js";

/**
 * Shape of an EscrowPayload — uses structural typing so we don't depend on @x402r/evm.
 * Matches the EscrowPayload interface from @x402r/evm/escrow/types.
 */
interface EscrowPayloadLike {
  authorization: { from: `0x${string}` };
  paymentInfo: {
    operator: `0x${string}`;
    receiver: `0x${string}`;
    token: `0x${string}`;
    maxAmount: string | bigint;
    preApprovalExpiry: string | number | bigint;
    authorizationExpiry: string | number | bigint;
    refundExpiry: string | number | bigint;
    minFeeBps: number;
    maxFeeBps: number;
    feeReceiver: `0x${string}`;
    salt: string | bigint;
  };
}

/**
 * Convert an EscrowPayload (from verified x402 payment) to a PaymentInfo struct.
 *
 * The EscrowPayload uses string/number types for on-wire JSON compatibility,
 * while PaymentInfo uses bigint for contract interaction. This bridges the two.
 *
 * @param escrowPayload - The EscrowPayload from a verified x402 payment (e.g. `verifiedPayload.payload`)
 * @returns A fully-typed PaymentInfo ready for SDK methods like `requestRefund`, `getPaymentState`, etc.
 *
 * @example
 * ```typescript
 * const escrowPayload = verifiedPayload.payload as EscrowPayload;
 * const paymentInfo = toPaymentInfo(escrowPayload);
 * // paymentInfo is ready for SDK methods like client.requestRefund(paymentInfo, ...)
 * ```
 */
export function toPaymentInfo(escrowPayload: EscrowPayloadLike): PaymentInfo {
  const pi = escrowPayload.paymentInfo;
  return {
    operator: pi.operator,
    payer: escrowPayload.authorization.from,
    receiver: pi.receiver,
    token: pi.token,
    maxAmount: BigInt(pi.maxAmount),
    preApprovalExpiry: BigInt(pi.preApprovalExpiry),
    authorizationExpiry: BigInt(pi.authorizationExpiry),
    refundExpiry: BigInt(pi.refundExpiry),
    minFeeBps: pi.minFeeBps,
    maxFeeBps: pi.maxFeeBps,
    feeReceiver: pi.feeReceiver,
    salt: BigInt(pi.salt),
  };
}

/**
 * Shape of a viem WalletClient extended with publicActions.
 * Uses structural typing so we don't depend on viem's concrete types.
 */
interface ViemExtendedClient {
  account: { address: `0x${string}` };
  getCode: (args: { address: `0x${string}` }) => Promise<`0x${string}` | undefined>;
  readContract: (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
  verifyTypedData: (args: {
    address: `0x${string}`;
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
    signature: `0x${string}`;
  }) => Promise<boolean>;
  writeContract: (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) => Promise<`0x${string}`>;
  sendTransaction: (args: { to: `0x${string}`; data: `0x${string}` }) => Promise<`0x${string}`>;
  waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<{ status: string }>;
}

/**
 * FacilitatorEvmSigner shape from @x402/evm — structural typing to avoid hard dep.
 */
export interface FacilitatorEvmSignerLike {
  getAddresses(): readonly `0x${string}`[];
  readContract(args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
  verifyTypedData(args: {
    address: `0x${string}`;
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
    signature: `0x${string}`;
  }): Promise<boolean>;
  writeContract(args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }): Promise<`0x${string}`>;
  sendTransaction(args: { to: `0x${string}`; data: `0x${string}` }): Promise<`0x${string}`>;
  waitForTransactionReceipt(args: { hash: `0x${string}` }): Promise<{ status: string }>;
  getCode(args: { address: `0x${string}` }): Promise<`0x${string}` | undefined>;
}

/**
 * Wrap a viem WalletClient (extended with publicActions) into a FacilitatorEvmSigner.
 *
 * This eliminates the 35-line boilerplate needed to adapt viem's strict types
 * to x402's loose FacilitatorEvmSigner interface. The `as never` cast is done
 * once at this boundary so application code stays clean.
 *
 * @param client - A viem WalletClient extended with `publicActions` (must have `.account.address`)
 * @returns A FacilitatorEvmSignerLike compatible with `registerEscrowFacilitatorScheme()`
 *
 * @example
 * ```typescript
 * const viemClient = createWalletClient({ ... }).extend(publicActions);
 * const signer = toFacilitatorEvmSigner(viemClient);
 * registerEscrowFacilitatorScheme(facilitator, { signer, networks: "eip155:84532" });
 * ```
 */
export function toFacilitatorEvmSigner(client: ViemExtendedClient): FacilitatorEvmSignerLike {
  return {
    getAddresses: () => [client.account.address],
    getCode: (args: { address: `0x${string}` }) => client.getCode(args),
    readContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }) => client.readContract({ ...args, args: args.args || [] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verifyTypedData: (args: any) => client.verifyTypedData(args),
    writeContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
    }) => client.writeContract({ ...args, args: args.args || [] }),
    sendTransaction: (args: { to: `0x${string}`; data: `0x${string}` }) =>
      client.sendTransaction(args),
    waitForTransactionReceipt: (args: { hash: `0x${string}` }) =>
      client.waitForTransactionReceipt(args),
  };
}

/** @deprecated Use toFacilitatorEvmSigner instead */
export const createFacilitatorSignerFromViem = toFacilitatorEvmSigner;

/**
 * FacilitatorClient shape from @x402/core — structural typing to avoid hard dep.
 */
export interface FacilitatorClientLike {
  verify(paymentPayload: unknown, paymentRequirements: unknown): Promise<unknown>;
  settle(paymentPayload: unknown, paymentRequirements: unknown): Promise<unknown>;
  getSupported(): Promise<unknown>;
}

/**
 * Shape of an x402 Facilitator instance.
 */
interface FacilitatorLike {
  verify(paymentPayload: unknown, paymentRequirements: unknown): Promise<unknown>;
  settle(paymentPayload: unknown, paymentRequirements: unknown): Promise<unknown>;
  getSupported(): unknown;
}

/**
 * Create an in-process facilitator (no HTTP server needed).
 *
 * Returns both the facilitator instance (for scheme registration) and a
 * FacilitatorClient wrapper (for passing to x402ResourceServer).
 *
 * Uses a callback for scheme registration to avoid @x402r/core depending on @x402r/evm.
 *
 * @param facilitator - An x402 Facilitator instance (e.g. `new x402Facilitator()`)
 * @param registerSchemes - Callback to register payment schemes on the facilitator
 * @returns Object with `facilitator` (original instance) and `client` (FacilitatorClientLike for resource servers)
 *
 * @example
 * ```typescript
 * const signer = toFacilitatorEvmSigner(viemClient);
 * const { facilitator, client } = createInProcessFacilitator(
 *   new x402Facilitator(),
 *   (fac) => registerEscrowFacilitatorScheme(fac, { signer, networks: "eip155:84532" }),
 * );
 * const server = new x402ResourceServer(client);
 * ```
 */
export function createInProcessFacilitator<T extends FacilitatorLike>(
  facilitator: T,
  registerSchemes: (fac: T) => void,
): { facilitator: T; client: FacilitatorClientLike } {
  registerSchemes(facilitator);
  const client: FacilitatorClientLike = {
    verify: (p: unknown, r: unknown) => facilitator.verify(p, r),
    settle: (p: unknown, r: unknown) => facilitator.settle(p, r),
    getSupported: () => Promise.resolve(facilitator.getSupported()),
  };
  return { facilitator, client };
}
