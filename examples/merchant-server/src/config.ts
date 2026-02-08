import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const NETWORK_ID = "eip155:84532" as const; // Base Sepolia
export const RPC_URL = "https://sepolia.base.org";

export interface ServerConfig {
  privateKey: `0x${string}`;
  operatorAddress: `0x${string}`;
  facilitatorUrl: string;
  port: number;
}

/**
 * Loads server configuration from environment variables.
 *
 * @returns - the validated server config
 */
export function loadConfig(): ServerConfig {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  const operatorAddress = process.env.OPERATOR_ADDRESS as `0x${string}`;
  if (!operatorAddress) {
    console.error("OPERATOR_ADDRESS environment variable is required");
    process.exit(1);
  }

  return {
    privateKey,
    operatorAddress,
    facilitatorUrl: process.env.FACILITATOR_URL || "http://localhost:4022",
    port: parseInt(process.env.PORT || "3000", 10),
  };
}

/**
 * Creates viem clients for blockchain interaction.
 *
 * @param config - the server configuration
 * @returns - public client, wallet client, and account
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
