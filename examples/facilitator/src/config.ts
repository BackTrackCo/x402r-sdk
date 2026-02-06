/**
 * Facilitator Configuration
 * Loads environment variables and creates viem clients
 */

import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const RPC_URLS: Record<string, string> = {
  "eip155:84532": "https://sepolia.base.org",
  "eip155:8453": "https://mainnet.base.org",
};

const CHAINS: Record<string, typeof baseSepolia> = {
  "eip155:84532": baseSepolia,
  "eip155:8453": base,
};

export interface FacilitatorConfig {
  privateKey: `0x${string}`;
  operatorAddress: `0x${string}`;
  network: string;
  port: number;
}

export function loadConfig(): FacilitatorConfig {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
  if (!operatorAddress) {
    console.error("Error: OPERATOR_ADDRESS environment variable is required");
    process.exit(1);
  }

  const network = process.env.NETWORK || "eip155:84532";

  return {
    privateKey,
    operatorAddress,
    network,
    port: parseInt(process.env.PORT || "4022", 10),
  };
}

export function createClients(config: FacilitatorConfig) {
  const account = privateKeyToAccount(config.privateKey);
  const chain = CHAINS[config.network] ?? baseSepolia;
  const rpcUrl = RPC_URLS[config.network] ?? "https://sepolia.base.org";

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient, account };
}
