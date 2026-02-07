/**
 * Merchant Server Configuration
 * Loads environment variables and creates viem clients
 */

import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const NETWORK_ID = "eip155:84532"; // Base Sepolia
export const RPC_URL = "https://sepolia.base.org";

export interface ServerConfig {
  privateKey: `0x${string}`;
  operatorAddress: `0x${string}`;
  facilitatorUrl: string;
  port: number;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    console.error("\nFirst, deploy an operator:");
    console.error(
      "  PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts",
    );
    console.error("\nThen copy the addresses to .env file");
    process.exit(1);
  }

  const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
  if (!operatorAddress) {
    console.error("Error: OPERATOR_ADDRESS environment variable is required");
    console.error("\nRun deploy-operator first to get the operator address");
    process.exit(1);
  }

  return {
    privateKey,
    operatorAddress,
    facilitatorUrl: process.env.FACILITATOR_URL || "http://localhost:4022",
    port: parseInt(process.env.PORT || "3001", 10),
  };
}

/**
 * Create viem clients for blockchain interaction
 */
export function createClients(config: ServerConfig) {
  const account = privateKeyToAccount(config.privateKey);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  return { publicClient, walletClient, account };
}
