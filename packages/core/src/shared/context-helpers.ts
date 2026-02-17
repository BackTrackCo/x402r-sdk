/**
 * Shared context factory functions for creating operation contexts from class instances
 * @module shared/context-helpers
 */

import type { PublicClient, WalletClient } from "viem";
import type { RefundReadContext, RefundWriteContext } from "./refund-operations.js";
import type { EvidenceReadContext, EvidenceWriteContext } from "./evidence-operations.js";

/** Common shape of SDK class instances that have refund-related fields */
interface RefundHost {
  publicClient: PublicClient;
  refundRequestAddress?: `0x${string}`;
  walletClient?: WalletClient;
}

/** Common shape of SDK class instances that have evidence-related fields */
interface EvidenceHost {
  publicClient: PublicClient;
  refundRequestEvidenceAddress?: `0x${string}`;
  walletClient?: WalletClient;
}

/**
 * Create a RefundReadContext from a host instance, throwing if refundRequestAddress is missing.
 */
export function createRefundReadCtx(host: RefundHost): RefundReadContext {
  if (!host.refundRequestAddress) {
    throw new Error(
      "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
    );
  }
  return {
    publicClient: host.publicClient,
    refundRequestAddress: host.refundRequestAddress,
  };
}

/**
 * Create a RefundWriteContext from a host instance, throwing if refundRequestAddress or walletClient is missing.
 */
export function createRefundWriteCtx(host: RefundHost): RefundWriteContext {
  if (!host.refundRequestAddress) {
    throw new Error(
      "RefundRequest address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
    );
  }
  if (!host.walletClient) {
    throw new Error("WalletClient required");
  }
  return {
    publicClient: host.publicClient,
    walletClient: host.walletClient,
    refundRequestAddress: host.refundRequestAddress,
  };
}

/**
 * Create an EvidenceReadContext from a host instance, throwing if refundRequestEvidenceAddress is missing.
 */
export function createEvidenceReadCtx(host: EvidenceHost): EvidenceReadContext {
  if (!host.refundRequestEvidenceAddress) {
    throw new Error(
      "RefundRequestEvidence address required. Use resolveAddresses(networkId) from @x402r/core to get the evidence address for your network.",
    );
  }
  return {
    publicClient: host.publicClient,
    refundRequestEvidenceAddress: host.refundRequestEvidenceAddress,
  };
}

/**
 * Create an EvidenceWriteContext from a host instance, throwing if refundRequestEvidenceAddress or walletClient is missing.
 */
export function createEvidenceWriteCtx(host: EvidenceHost): EvidenceWriteContext {
  if (!host.refundRequestEvidenceAddress) {
    throw new Error(
      "RefundRequestEvidence address required. Use resolveAddresses(networkId) from @x402r/core to get the evidence address for your network.",
    );
  }
  if (!host.walletClient) {
    throw new Error("WalletClient required");
  }
  return {
    publicClient: host.publicClient,
    walletClient: host.walletClient,
    refundRequestEvidenceAddress: host.refundRequestEvidenceAddress,
  };
}
