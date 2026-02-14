/**
 * Shared CLI setup — extracts the common wallet/chain/operator initialization
 * pattern duplicated across all 3 CLIs.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getNetworkConfig, type NetworkConfig } from "@x402r/core";

export interface CliConfig {
  account: PrivateKeyAccount;
  publicClient: PublicClient;
  walletClient: WalletClient;
  networkId: string;
  networkConfig: NetworkConfig;
  operatorAddress?: `0x${string}`;
}

/**
 * Initialize CLI: validates env vars, creates viem clients.
 * Each CLI still calls dotenvConfig() with its own .env path before calling this.
 */
export function initCli(opts?: { requireOperator?: boolean }): CliConfig {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  const networkId = process.env.NETWORK_ID || "eip155:84532";
  const rpcUrl = process.env.RPC_URL || "https://sepolia.base.org";

  let operatorAddress: `0x${string}` | undefined;
  if (opts?.requireOperator) {
    operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
    if (!operatorAddress) {
      console.error("Error: OPERATOR_ADDRESS environment variable is required");
      process.exit(1);
    }
  } else {
    operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}` | undefined;
  }

  const account = privateKeyToAccount(privateKey);
  const networkConfig = getNetworkConfig(networkId)!;

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  return { account, publicClient, walletClient, networkId, networkConfig, operatorAddress };
}
