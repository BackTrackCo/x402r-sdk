/**
 * Factory deployment helpers for X402r SDK
 * @module deploy/factories
 */

import type { WalletClient, PublicClient, Address, Hash } from "viem";
import { getFactoryAddress } from "../config/index.js";
import {
  paymentOperatorFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  staticFeeCalculatorFactoryAbi,
  staticAddressConditionFactoryAbi,
  andConditionFactoryAbi,
  orConditionFactoryAbi,
  notConditionFactoryAbi,
  recorderCombinatorFactoryAbi,
} from "../abis/index.js";
import {
  type PaymentOperatorConfig,
  type EscrowPeriodConfigInput,
  type FreezeConfigInput,
  createEscrowPeriodConfig,
  createFreezeConfig,
  ZERO_ADDRESS,
} from "../factory/index.js";

// ============ Types ============

/**
 * Result from a deployment operation
 */
export interface DeploymentResult {
  /** The deployed contract address */
  address: Address;
  /** Transaction hash (undefined if contract already existed) */
  txHash?: Hash;
  /** Whether this was a new deployment or an existing contract */
  isNewDeployment: boolean;
}

// ============ Helper Functions ============

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with delay between attempts
 * Used to handle RPC caching/propagation delays after deployments
 */
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  validate: (result: T) => boolean,
  options: { maxRetries?: number; delayMs?: number; description?: string } = {},
): Promise<T> {
  const { maxRetries = 3, delayMs = 2000, description = "operation" } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await fn();
    if (validate(result)) {
      return result;
    }

    if (attempt < maxRetries) {
      // Wait before retrying - RPC might have stale cache
      await sleep(delayMs);
    }
  }

  // Final attempt failed
  const finalResult = await fn();
  if (!validate(finalResult)) {
    throw new Error(
      `${description} failed after ${maxRetries} retries. ` +
        `This may be due to RPC caching. Try again in a few seconds.`,
    );
  }
  return finalResult;
}

// ============ Static Fee Calculator ============

/**
 * Compute the deterministic address for a StaticFeeCalculator
 *
 * @param publicClient - Viem public client
 * @param networkId - EIP-155 chain identifier
 * @param feeBps - Fee in basis points (100 = 1%)
 * @returns The deterministic address
 */
export async function computeStaticFeeCalculatorAddress(
  publicClient: PublicClient,
  networkId: string,
  feeBps: bigint,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "staticFeeCalculator");
  return publicClient.readContract({
    address: factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    functionName: "computeAddress",
    args: [feeBps],
  });
}

/**
 * Get the deployed StaticFeeCalculator address (returns zero if not deployed)
 */
export async function getDeployedStaticFeeCalculator(
  publicClient: PublicClient,
  networkId: string,
  feeBps: bigint,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "staticFeeCalculator");
  return publicClient.readContract({
    address: factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    functionName: "getDeployed",
    args: [feeBps],
  });
}

/**
 * Deploy a StaticFeeCalculator via factory
 *
 * @param walletClient - Viem wallet client with account
 * @param publicClient - Viem public client
 * @param networkId - EIP-155 chain identifier
 * @param feeBps - Fee in basis points (100 = 1%)
 * @returns Deployment result with address and transaction info
 */
export async function deployStaticFeeCalculator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  feeBps: bigint,
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "staticFeeCalculator");

  // Check if already deployed
  const existing = await getDeployedStaticFeeCalculator(publicClient, networkId, feeBps);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    functionName: "deploy",
    args: [feeBps],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(`StaticFeeCalculator deployment failed. TX: ${txHash}. Args: feeBps=${feeBps}`);
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedStaticFeeCalculator(publicClient, networkId, feeBps),
    addr => addr !== ZERO_ADDRESS,
    { description: "StaticFeeCalculator getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

// ============ EscrowPeriod ============

/**
 * Compute the deterministic address for an EscrowPeriod
 */
export async function computeEscrowPeriodAddress(
  publicClient: PublicClient,
  networkId: string,
  config: EscrowPeriodConfigInput,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "escrowPeriod");
  const fullConfig = createEscrowPeriodConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: escrowPeriodFactoryAbi,
    functionName: "computeAddress",
    args: [fullConfig.escrowPeriod, fullConfig.authorizedCodehash],
  });
}

/**
 * Get the deployed EscrowPeriod address (returns zero if not deployed)
 */
export async function getDeployedEscrowPeriod(
  publicClient: PublicClient,
  networkId: string,
  config: EscrowPeriodConfigInput,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "escrowPeriod");
  const fullConfig = createEscrowPeriodConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: escrowPeriodFactoryAbi,
    functionName: "getDeployed",
    args: [fullConfig.escrowPeriod, fullConfig.authorizedCodehash],
  });
}

/**
 * Deploy an EscrowPeriod via factory
 */
export async function deployEscrowPeriod(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  config: EscrowPeriodConfigInput,
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "escrowPeriod");
  const fullConfig = createEscrowPeriodConfig(config);

  // Check if already deployed
  const existing = await getDeployedEscrowPeriod(publicClient, networkId, config);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: escrowPeriodFactoryAbi,
    functionName: "deploy",
    args: [fullConfig.escrowPeriod, fullConfig.authorizedCodehash],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `EscrowPeriod deployment failed. TX: ${txHash}. ` +
        `Args: escrowPeriod=${fullConfig.escrowPeriod}, authorizedCodehash=${fullConfig.authorizedCodehash}`,
    );
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedEscrowPeriod(publicClient, networkId, config),
    addr => addr !== ZERO_ADDRESS,
    { description: "EscrowPeriod getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

// ============ Freeze ============

/**
 * Compute the deterministic address for a Freeze contract
 */
export async function computeFreezeAddress(
  publicClient: PublicClient,
  networkId: string,
  config: FreezeConfigInput,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "freeze");
  const fullConfig = createFreezeConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: freezeFactoryAbi,
    functionName: "computeAddress",
    args: [
      fullConfig.freezeCondition,
      fullConfig.unfreezeCondition,
      fullConfig.freezeDuration,
      fullConfig.escrowPeriodContract,
    ],
  });
}

/**
 * Get the deployed Freeze address (returns zero if not deployed)
 */
export async function getDeployedFreeze(
  publicClient: PublicClient,
  networkId: string,
  config: FreezeConfigInput,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "freeze");
  const fullConfig = createFreezeConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: freezeFactoryAbi,
    functionName: "getDeployed",
    args: [
      fullConfig.freezeCondition,
      fullConfig.unfreezeCondition,
      fullConfig.freezeDuration,
      fullConfig.escrowPeriodContract,
    ],
  });
}

/**
 * Deploy a Freeze contract via factory
 */
export async function deployFreeze(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  config: FreezeConfigInput,
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "freeze");
  const fullConfig = createFreezeConfig(config);

  // Check if already deployed
  const existing = await getDeployedFreeze(publicClient, networkId, config);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: freezeFactoryAbi,
    functionName: "deploy",
    args: [
      fullConfig.freezeCondition,
      fullConfig.unfreezeCondition,
      fullConfig.freezeDuration,
      fullConfig.escrowPeriodContract,
    ],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `Freeze deployment failed. TX: ${txHash}. ` +
        `Args: freezeCondition=${fullConfig.freezeCondition}, ` +
        `unfreezeCondition=${fullConfig.unfreezeCondition}, ` +
        `freezeDuration=${fullConfig.freezeDuration}, ` +
        `escrowPeriodContract=${fullConfig.escrowPeriodContract}`,
    );
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedFreeze(publicClient, networkId, config),
    addr => addr !== ZERO_ADDRESS,
    { description: "Freeze getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

// ============ StaticAddressCondition ============

/**
 * Compute the deterministic address for a StaticAddressCondition
 */
export async function computeStaticAddressConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  designatedAddress: Address,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "staticAddressCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    functionName: "computeAddress",
    args: [designatedAddress],
  });
}

/**
 * Get the deployed StaticAddressCondition address (returns zero if not deployed)
 */
export async function getDeployedStaticAddressCondition(
  publicClient: PublicClient,
  networkId: string,
  designatedAddress: Address,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "staticAddressCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    functionName: "getDeployed",
    args: [designatedAddress],
  });
}

/**
 * Deploy a StaticAddressCondition via factory
 */
export async function deployStaticAddressCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  designatedAddress: Address,
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "staticAddressCondition");

  // Check if already deployed
  const existing = await getDeployedStaticAddressCondition(
    publicClient,
    networkId,
    designatedAddress,
  );
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    functionName: "deploy",
    args: [designatedAddress],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `StaticAddressCondition deployment failed. TX: ${txHash}. Args: designatedAddress=${designatedAddress}`,
    );
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedStaticAddressCondition(publicClient, networkId, designatedAddress),
    addr => addr !== ZERO_ADDRESS,
    { description: "StaticAddressCondition getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

// ============ And/Or/Not Conditions ============

/**
 * Compute the deterministic address for an AndCondition
 */
export async function computeAndConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[],
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "andCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: andConditionFactoryAbi,
    functionName: "computeAddress",
    args: [conditions],
  });
}

/**
 * Get the deployed AndCondition address (returns zero if not deployed)
 */
export async function getDeployedAndCondition(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[],
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "andCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: andConditionFactoryAbi,
    functionName: "getDeployed",
    args: [conditions],
  });
}

/**
 * Deploy an AndCondition via factory
 */
export async function deployAndCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[],
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "andCondition");

  // Check if already deployed
  const existing = await getDeployedAndCondition(publicClient, networkId, conditions);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: andConditionFactoryAbi,
    functionName: "deploy",
    args: [conditions],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `AndCondition deployment failed. TX: ${txHash}. Args: conditions=${conditions.join(",")}`,
    );
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedAndCondition(publicClient, networkId, conditions),
    addr => addr !== ZERO_ADDRESS,
    { description: "AndCondition getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

/**
 * Compute the deterministic address for an OrCondition
 */
export async function computeOrConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[],
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "orCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: orConditionFactoryAbi,
    functionName: "computeAddress",
    args: [conditions],
  });
}

/**
 * Get the deployed OrCondition address (returns zero if not deployed)
 */
export async function getDeployedOrCondition(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[],
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "orCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: orConditionFactoryAbi,
    functionName: "getDeployed",
    args: [conditions],
  });
}

/**
 * Deploy an OrCondition via factory
 */
export async function deployOrCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[],
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "orCondition");

  // Check if already deployed
  const existing = await getDeployedOrCondition(publicClient, networkId, conditions);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: orConditionFactoryAbi,
    functionName: "deploy",
    args: [conditions],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `OrCondition deployment failed. TX: ${txHash}. Args: conditions=${conditions.join(",")}`,
    );
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedOrCondition(publicClient, networkId, conditions),
    addr => addr !== ZERO_ADDRESS,
    { description: "OrCondition getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

/**
 * Compute the deterministic address for a NotCondition
 */
export async function computeNotConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  condition: Address,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "notCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: notConditionFactoryAbi,
    functionName: "computeAddress",
    args: [condition],
  });
}

/**
 * Get the deployed NotCondition address (returns zero if not deployed)
 */
export async function getDeployedNotCondition(
  publicClient: PublicClient,
  networkId: string,
  condition: Address,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "notCondition");

  return publicClient.readContract({
    address: factoryAddress,
    abi: notConditionFactoryAbi,
    functionName: "getDeployed",
    args: [condition],
  });
}

/**
 * Deploy a NotCondition via factory
 */
export async function deployNotCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  condition: Address,
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "notCondition");

  // Check if already deployed
  const existing = await getDeployedNotCondition(publicClient, networkId, condition);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: notConditionFactoryAbi,
    functionName: "deploy",
    args: [condition],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(`NotCondition deployment failed. TX: ${txHash}. Args: condition=${condition}`);
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedNotCondition(publicClient, networkId, condition),
    addr => addr !== ZERO_ADDRESS,
    { description: "NotCondition getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

// ============ RecorderCombinator ============

/**
 * Compute the deterministic address for a RecorderCombinator
 */
export async function computeRecorderCombinatorAddress(
  publicClient: PublicClient,
  networkId: string,
  recorders: Address[],
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "recorderCombinator");

  return publicClient.readContract({
    address: factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    functionName: "computeAddress",
    args: [recorders],
  });
}

/**
 * Get the deployed RecorderCombinator address (returns zero if not deployed)
 */
export async function getDeployedRecorderCombinator(
  publicClient: PublicClient,
  networkId: string,
  recorders: Address[],
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "recorderCombinator");

  return publicClient.readContract({
    address: factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    functionName: "getDeployed",
    args: [recorders],
  });
}

/**
 * Deploy a RecorderCombinator via factory
 */
export async function deployRecorderCombinator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  recorders: Address[],
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "recorderCombinator");

  // Check if already deployed
  const existing = await getDeployedRecorderCombinator(publicClient, networkId, recorders);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    functionName: "deploy",
    args: [recorders],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(
      `RecorderCombinator deployment failed. TX: ${txHash}. Args: recorders=${recorders.join(",")}`,
    );
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedRecorderCombinator(publicClient, networkId, recorders),
    addr => addr !== ZERO_ADDRESS,
    { description: "RecorderCombinator getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}

// ============ PaymentOperator ============

/**
 * Compute the deterministic address for a PaymentOperator
 */
export async function computeOperatorAddress(
  publicClient: PublicClient,
  networkId: string,
  config: PaymentOperatorConfig,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "paymentOperator");

  return publicClient.readContract({
    address: factoryAddress,
    abi: paymentOperatorFactoryAbi,
    functionName: "computeAddress",
    args: [config],
  });
}

/**
 * Get the deployed PaymentOperator address (returns zero if not deployed)
 */
export async function getDeployedOperator(
  publicClient: PublicClient,
  networkId: string,
  config: PaymentOperatorConfig,
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, "paymentOperator");

  return publicClient.readContract({
    address: factoryAddress,
    abi: paymentOperatorFactoryAbi,
    functionName: "getOperator",
    args: [config],
  });
}

/**
 * Deploy a PaymentOperator via factory
 */
export async function deployOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  config: PaymentOperatorConfig,
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, "paymentOperator");

  // Check if already deployed
  const existing = await getDeployedOperator(publicClient, networkId, config);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: paymentOperatorFactoryAbi,
    functionName: "deployOperator",
    args: [config],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status !== "success") {
    throw new Error(`PaymentOperator deployment failed. TX: ${txHash}`);
  }

  // Query deployed address with retry (handles RPC caching delays)
  const address = await retryWithDelay(
    () => getDeployedOperator(publicClient, networkId, config),
    addr => addr !== ZERO_ADDRESS,
    { description: "PaymentOperator getDeployed" },
  );

  return { address, txHash, isNewDeployment: true };
}
