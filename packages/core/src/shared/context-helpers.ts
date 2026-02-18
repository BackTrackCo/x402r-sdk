/**
 * Shared context factory functions for creating operation contexts from class instances
 * @module shared/context-helpers
 */

import type { PublicClient, WalletClient } from "viem";
import { zeroAddress } from "viem";
import type { RefundReadContext, RefundWriteContext } from "./refund-operations.js";
import type { EvidenceReadContext, EvidenceWriteContext } from "./evidence-operations.js";
import type {
  RefundBudgetReadContext,
  RefundBudgetWriteContext,
  OperatorWriteContext,
} from "./refund-budget-operations.js";

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

/** Common shape of SDK class instances that have refund budget fields */
interface RefundBudgetHost {
  publicClient: PublicClient;
  receiverRefundCollectorAddress?: `0x${string}`;
  walletClient?: WalletClient;
}

/** Common shape of SDK class instances that have operator write fields */
interface OperatorHost {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  operatorAddress: `0x${string}`;
}

/**
 * Create a RefundBudgetReadContext from a host instance, throwing if receiverRefundCollectorAddress is missing.
 */
export function createRefundBudgetReadCtx(host: RefundBudgetHost): RefundBudgetReadContext {
  if (!host.receiverRefundCollectorAddress) {
    throw new Error(
      "ReceiverRefundCollector address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
    );
  }
  if (host.receiverRefundCollectorAddress === zeroAddress) {
    throw new Error(
      "ReceiverRefundCollector is not deployed on this network (zero address). " +
        "This feature is not available on the current chain.",
    );
  }
  return {
    publicClient: host.publicClient,
    receiverRefundCollectorAddress: host.receiverRefundCollectorAddress,
  };
}

/**
 * Create a RefundBudgetWriteContext from a host instance, throwing if receiverRefundCollectorAddress or walletClient is missing.
 */
export function createRefundBudgetWriteCtx(host: RefundBudgetHost): RefundBudgetWriteContext {
  if (!host.receiverRefundCollectorAddress) {
    throw new Error(
      "ReceiverRefundCollector address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.",
    );
  }
  if (host.receiverRefundCollectorAddress === zeroAddress) {
    throw new Error(
      "ReceiverRefundCollector is not deployed on this network (zero address). " +
        "This feature is not available on the current chain.",
    );
  }
  if (!host.walletClient) {
    throw new Error("WalletClient required");
  }
  return {
    publicClient: host.publicClient,
    walletClient: host.walletClient,
    receiverRefundCollectorAddress: host.receiverRefundCollectorAddress,
  };
}

/**
 * Create an OperatorWriteContext from a host instance, throwing if walletClient is missing.
 */
export function createOperatorWriteCtx(host: OperatorHost): OperatorWriteContext {
  if (!host.walletClient) {
    throw new Error("WalletClient required");
  }
  return {
    publicClient: host.publicClient,
    walletClient: host.walletClient,
    operatorAddress: host.operatorAddress,
  };
}
