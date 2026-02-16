import { config } from "dotenv";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerEscrowScheme } from "@x402r/evm/escrow/client";
import { privateKeyToAccount } from "viem/accounts";

config();

const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
  console.error("Error: PRIVATE_KEY environment variable is required");
  process.exit(1);
}

const networkId = process.env.NETWORK_ID || "eip155:84532";
const baseURL = process.env.RESOURCE_SERVER_URL || "http://localhost:4021";
const endpointPath = process.env.ENDPOINT_PATH || "/weather";
const url = `${baseURL}${endpointPath}`;

/**
 * Example demonstrating how to use @x402/fetch with the x402r escrow scheme.
 *
 * The escrow scheme is registered as a standard x402 v2 scheme — any x402-compatible
 * middleware (Express, Hono, etc.) works automatically.
 *
 * Required environment variables:
 * - PRIVATE_KEY: The private key of the EVM signer
 */
async function main(): Promise<void> {
  const signer = privateKeyToAccount(privateKey);

  const client = new x402Client();
  registerEscrowScheme(client, { signer, networks: networkId });

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log(`Making request to: ${url}\n`);
  const response = await fetchWithPayment(url, { method: "GET" });
  const body = await response.json();
  console.log("Response body:", body);

  if (response.ok) {
    const paymentResponse = new x402HTTPClient(client).getPaymentSettleResponse(name =>
      response.headers.get(name),
    );
    console.log("\nPayment response:", JSON.stringify(paymentResponse, null, 2));
  } else {
    console.log(`\nNo payment settled (response status: ${response.status})`);
  }
}

main().catch(error => {
  console.error(error?.response?.data?.error ?? error);
  process.exit(1);
});
