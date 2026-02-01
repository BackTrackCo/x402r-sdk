/**
 * Factory deployment helpers for X402r SDK
 * @module deploy/factories
 */

import type { WalletClient, PublicClient, Address, Hash } from 'viem';
import { getFactoryAddress, getNetworkConfig } from '../config/index.js';
import {
  PaymentOperatorFactoryABI,
  EscrowPeriodFactoryABI,
  FreezePolicyFactoryABI,
  FreezeFactoryABI,
  StaticFeeCalculatorFactoryABI,
  StaticAddressConditionFactoryABI,
  AndConditionFactoryABI,
  OrConditionFactoryABI,
  NotConditionFactoryABI,
  RecorderCombinatorFactoryABI,
  type PaymentOperatorConfig,
  type EscrowPeriodConfigInput,
  type FreezePolicyConfigInput,
  createEscrowPeriodConfig,
  createFreezePolicyConfig,
  ZERO_ADDRESS,
} from '../factory/index.js';

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
 * Wait for a transaction and return the deployed address
 */
async function waitForDeployment(
  publicClient: PublicClient,
  txHash: Hash
): Promise<Address> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    throw new Error(`Deployment transaction failed: ${txHash}`);
  }
  // The deployed address is typically in the logs, but factories return it directly
  // We need to decode from transaction receipt or use getDeployed after
  return receipt.contractAddress ?? ZERO_ADDRESS;
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
  feeBps: bigint
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'staticFeeCalculator');
  return publicClient.readContract({
    address: factoryAddress,
    abi: StaticFeeCalculatorFactoryABI,
    functionName: 'computeAddress',
    args: [feeBps],
  });
}

/**
 * Get the deployed StaticFeeCalculator address (returns zero if not deployed)
 */
export async function getDeployedStaticFeeCalculator(
  publicClient: PublicClient,
  networkId: string,
  feeBps: bigint
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'staticFeeCalculator');
  return publicClient.readContract({
    address: factoryAddress,
    abi: StaticFeeCalculatorFactoryABI,
    functionName: 'getDeployed',
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
  feeBps: bigint
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'staticFeeCalculator');

  // Check if already deployed
  const existing = await getDeployedStaticFeeCalculator(publicClient, networkId, feeBps);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: StaticFeeCalculatorFactoryABI,
    functionName: 'deploy',
    args: [feeBps],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Get the deployed address
  const address = await getDeployedStaticFeeCalculator(publicClient, networkId, feeBps);

  return { address, txHash, isNewDeployment: true };
}

// ============ EscrowPeriod ============

/**
 * Compute the deterministic address for an EscrowPeriod
 */
export async function computeEscrowPeriodAddress(
  publicClient: PublicClient,
  networkId: string,
  config: EscrowPeriodConfigInput
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'escrowPeriod');
  const fullConfig = createEscrowPeriodConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: EscrowPeriodFactoryABI,
    functionName: 'computeAddress',
    args: [fullConfig.escrowPeriod, fullConfig.authorizedCodehash],
  });
}

/**
 * Get the deployed EscrowPeriod address (returns zero if not deployed)
 */
export async function getDeployedEscrowPeriod(
  publicClient: PublicClient,
  networkId: string,
  config: EscrowPeriodConfigInput
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'escrowPeriod');
  const fullConfig = createEscrowPeriodConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: EscrowPeriodFactoryABI,
    functionName: 'getDeployed',
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
  config: EscrowPeriodConfigInput
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'escrowPeriod');
  const fullConfig = createEscrowPeriodConfig(config);

  // Check if already deployed
  const existing = await getDeployedEscrowPeriod(publicClient, networkId, config);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: EscrowPeriodFactoryABI,
    functionName: 'deploy',
    args: [fullConfig.escrowPeriod, fullConfig.authorizedCodehash],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedEscrowPeriod(publicClient, networkId, config);

  return { address, txHash, isNewDeployment: true };
}

// ============ FreezePolicy ============

/**
 * Compute the deterministic address for a FreezePolicy
 */
export async function computeFreezePolicyAddress(
  publicClient: PublicClient,
  networkId: string,
  config: FreezePolicyConfigInput
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'freezePolicy');
  const fullConfig = createFreezePolicyConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: FreezePolicyFactoryABI,
    functionName: 'computeAddress',
    args: [fullConfig.freezeCondition, fullConfig.unfreezeCondition, fullConfig.freezeDuration],
  });
}

/**
 * Get the deployed FreezePolicy address (returns zero if not deployed)
 */
export async function getDeployedFreezePolicy(
  publicClient: PublicClient,
  networkId: string,
  config: FreezePolicyConfigInput
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'freezePolicy');
  const fullConfig = createFreezePolicyConfig(config);

  return publicClient.readContract({
    address: factoryAddress,
    abi: FreezePolicyFactoryABI,
    functionName: 'getDeployed',
    args: [fullConfig.freezeCondition, fullConfig.unfreezeCondition, fullConfig.freezeDuration],
  });
}

/**
 * Deploy a FreezePolicy via factory
 */
export async function deployFreezePolicy(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  config: FreezePolicyConfigInput
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'freezePolicy');
  const fullConfig = createFreezePolicyConfig(config);

  // Check if already deployed
  const existing = await getDeployedFreezePolicy(publicClient, networkId, config);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: FreezePolicyFactoryABI,
    functionName: 'deploy',
    args: [fullConfig.freezeCondition, fullConfig.unfreezeCondition, fullConfig.freezeDuration],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedFreezePolicy(publicClient, networkId, config);

  return { address, txHash, isNewDeployment: true };
}

// ============ Freeze ============

/**
 * Compute the deterministic address for a Freeze contract
 */
export async function computeFreezeAddress(
  publicClient: PublicClient,
  networkId: string,
  freezePolicy: Address,
  escrowPeriodContract: Address
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'freeze');

  return publicClient.readContract({
    address: factoryAddress,
    abi: FreezeFactoryABI,
    functionName: 'computeAddress',
    args: [freezePolicy, escrowPeriodContract],
  });
}

/**
 * Get the deployed Freeze address (returns zero if not deployed)
 */
export async function getDeployedFreeze(
  publicClient: PublicClient,
  networkId: string,
  freezePolicy: Address,
  escrowPeriodContract: Address
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'freeze');

  return publicClient.readContract({
    address: factoryAddress,
    abi: FreezeFactoryABI,
    functionName: 'getDeployed',
    args: [freezePolicy, escrowPeriodContract],
  });
}

/**
 * Deploy a Freeze contract via factory
 */
export async function deployFreeze(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  freezePolicy: Address,
  escrowPeriodContract: Address
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'freeze');

  // Check if already deployed
  const existing = await getDeployedFreeze(publicClient, networkId, freezePolicy, escrowPeriodContract);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: FreezeFactoryABI,
    functionName: 'deploy',
    args: [freezePolicy, escrowPeriodContract],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedFreeze(publicClient, networkId, freezePolicy, escrowPeriodContract);

  return { address, txHash, isNewDeployment: true };
}

// ============ StaticAddressCondition ============

/**
 * Compute the deterministic address for a StaticAddressCondition
 */
export async function computeStaticAddressConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  designatedAddress: Address
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'staticAddressCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: StaticAddressConditionFactoryABI,
    functionName: 'computeAddress',
    args: [designatedAddress],
  });
}

/**
 * Get the deployed StaticAddressCondition address (returns zero if not deployed)
 */
export async function getDeployedStaticAddressCondition(
  publicClient: PublicClient,
  networkId: string,
  designatedAddress: Address
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'staticAddressCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: StaticAddressConditionFactoryABI,
    functionName: 'getDeployed',
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
  designatedAddress: Address
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'staticAddressCondition');

  // Check if already deployed
  const existing = await getDeployedStaticAddressCondition(publicClient, networkId, designatedAddress);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: StaticAddressConditionFactoryABI,
    functionName: 'deploy',
    args: [designatedAddress],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedStaticAddressCondition(publicClient, networkId, designatedAddress);

  return { address, txHash, isNewDeployment: true };
}

// ============ And/Or/Not Conditions ============

/**
 * Compute the deterministic address for an AndCondition
 */
export async function computeAndConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[]
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'andCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: AndConditionFactoryABI,
    functionName: 'computeAddress',
    args: [conditions],
  });
}

/**
 * Get the deployed AndCondition address (returns zero if not deployed)
 */
export async function getDeployedAndCondition(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[]
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'andCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: AndConditionFactoryABI,
    functionName: 'getDeployed',
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
  conditions: Address[]
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'andCondition');

  // Check if already deployed
  const existing = await getDeployedAndCondition(publicClient, networkId, conditions);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: AndConditionFactoryABI,
    functionName: 'deploy',
    args: [conditions],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedAndCondition(publicClient, networkId, conditions);

  return { address, txHash, isNewDeployment: true };
}

/**
 * Compute the deterministic address for an OrCondition
 */
export async function computeOrConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[]
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'orCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: OrConditionFactoryABI,
    functionName: 'computeAddress',
    args: [conditions],
  });
}

/**
 * Get the deployed OrCondition address (returns zero if not deployed)
 */
export async function getDeployedOrCondition(
  publicClient: PublicClient,
  networkId: string,
  conditions: Address[]
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'orCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: OrConditionFactoryABI,
    functionName: 'getDeployed',
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
  conditions: Address[]
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'orCondition');

  // Check if already deployed
  const existing = await getDeployedOrCondition(publicClient, networkId, conditions);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: OrConditionFactoryABI,
    functionName: 'deploy',
    args: [conditions],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedOrCondition(publicClient, networkId, conditions);

  return { address, txHash, isNewDeployment: true };
}

/**
 * Compute the deterministic address for a NotCondition
 */
export async function computeNotConditionAddress(
  publicClient: PublicClient,
  networkId: string,
  condition: Address
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'notCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: NotConditionFactoryABI,
    functionName: 'computeAddress',
    args: [condition],
  });
}

/**
 * Get the deployed NotCondition address (returns zero if not deployed)
 */
export async function getDeployedNotCondition(
  publicClient: PublicClient,
  networkId: string,
  condition: Address
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'notCondition');

  return publicClient.readContract({
    address: factoryAddress,
    abi: NotConditionFactoryABI,
    functionName: 'getDeployed',
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
  condition: Address
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'notCondition');

  // Check if already deployed
  const existing = await getDeployedNotCondition(publicClient, networkId, condition);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: NotConditionFactoryABI,
    functionName: 'deploy',
    args: [condition],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedNotCondition(publicClient, networkId, condition);

  return { address, txHash, isNewDeployment: true };
}

// ============ RecorderCombinator ============

/**
 * Compute the deterministic address for a RecorderCombinator
 */
export async function computeRecorderCombinatorAddress(
  publicClient: PublicClient,
  networkId: string,
  recorders: Address[]
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'recorderCombinator');

  return publicClient.readContract({
    address: factoryAddress,
    abi: RecorderCombinatorFactoryABI,
    functionName: 'computeAddress',
    args: [recorders],
  });
}

/**
 * Get the deployed RecorderCombinator address (returns zero if not deployed)
 */
export async function getDeployedRecorderCombinator(
  publicClient: PublicClient,
  networkId: string,
  recorders: Address[]
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'recorderCombinator');

  return publicClient.readContract({
    address: factoryAddress,
    abi: RecorderCombinatorFactoryABI,
    functionName: 'getDeployed',
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
  recorders: Address[]
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'recorderCombinator');

  // Check if already deployed
  const existing = await getDeployedRecorderCombinator(publicClient, networkId, recorders);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: RecorderCombinatorFactoryABI,
    functionName: 'deploy',
    args: [recorders],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedRecorderCombinator(publicClient, networkId, recorders);

  return { address, txHash, isNewDeployment: true };
}

// ============ PaymentOperator ============

/**
 * Compute the deterministic address for a PaymentOperator
 */
export async function computeOperatorAddress(
  publicClient: PublicClient,
  networkId: string,
  config: PaymentOperatorConfig
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'paymentOperator');

  return publicClient.readContract({
    address: factoryAddress,
    abi: PaymentOperatorFactoryABI,
    functionName: 'computeAddress',
    args: [config],
  });
}

/**
 * Get the deployed PaymentOperator address (returns zero if not deployed)
 */
export async function getDeployedOperator(
  publicClient: PublicClient,
  networkId: string,
  config: PaymentOperatorConfig
): Promise<Address> {
  const factoryAddress = getFactoryAddress(networkId, 'paymentOperator');

  return publicClient.readContract({
    address: factoryAddress,
    abi: PaymentOperatorFactoryABI,
    functionName: 'getOperator',
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
  config: PaymentOperatorConfig
): Promise<DeploymentResult> {
  const factoryAddress = getFactoryAddress(networkId, 'paymentOperator');

  // Check if already deployed
  const existing = await getDeployedOperator(publicClient, networkId, config);
  if (existing !== ZERO_ADDRESS) {
    return { address: existing, isNewDeployment: false };
  }

  // Deploy via factory
  const { request } = await publicClient.simulateContract({
    address: factoryAddress,
    abi: PaymentOperatorFactoryABI,
    functionName: 'deployOperator',
    args: [config],
    account: walletClient.account!,
  });

  const txHash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const address = await getDeployedOperator(publicClient, networkId, config);

  return { address, txHash, isNewDeployment: true };
}
