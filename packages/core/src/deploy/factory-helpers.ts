import type { Abi, Address, Hash, PublicClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import { wrapContractCall } from '../actions/_internal/error-wrapping.js'
import { ContractCallError } from '../errors/index.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeployResult {
  address: Address
  hash: Hash | null // null = already existed
  isNew: boolean
}

export interface FactoryFunctionNames {
  deployFn?: string
  computeAddressFn?: string
  getDeployedFn?: string
}

// ---------------------------------------------------------------------------
// computeViaFactory — read-only address computation
// ---------------------------------------------------------------------------

export async function computeViaFactory(
  publicClient: PublicClient,
  options: {
    factoryAddress: Address
    abi: Abi
    args: readonly unknown[]
    computeAddressFn?: string
  },
): Promise<Address> {
  const functionName = options.computeAddressFn ?? 'computeAddress'
  return publicClient.readContract({
    address: options.factoryAddress,
    abi: options.abi,
    functionName,
    args: options.args,
  }) as Promise<Address>
}

// ---------------------------------------------------------------------------
// deployViaFactory — idempotent CREATE2 deployment
// ---------------------------------------------------------------------------

export async function deployViaFactory(
  walletClient: WalletClient,
  publicClient: PublicClient,
  options: {
    factoryAddress: Address
    abi: Abi
    args: readonly unknown[]
    opName: string
    functionNames?: FactoryFunctionNames
  },
): Promise<DeployResult> {
  const {
    factoryAddress,
    abi,
    args,
    opName,
    functionNames: {
      deployFn = 'deploy',
      computeAddressFn = 'computeAddress',
      getDeployedFn = 'getDeployed',
    } = {},
  } = options

  // 1. Validate wallet account
  if (!walletClient.account) {
    throw new ContractCallError(opName, {
      details: 'walletClient.account is required for deployment',
    })
  }

  // 2. Check if already deployed (idempotency)
  const existing = (await publicClient.readContract({
    address: factoryAddress,
    abi,
    functionName: getDeployedFn,
    args,
  })) as Address

  if (existing !== zeroAddress) {
    return { address: existing, hash: null, isNew: false }
  }

  // 3. Compute deterministic address (pure view function, independent of deployment)
  const address = (await publicClient.readContract({
    address: factoryAddress,
    abi,
    functionName: computeAddressFn,
    args,
  })) as Address

  // 4. Deploy via factory
  const hash = await wrapContractCall(opName, () =>
    walletClient.writeContract({
      address: factoryAddress,
      abi,
      functionName: deployFn,
      args,
      account: walletClient.account!,
      chain: walletClient.chain,
    }),
  )

  // 5. Wait for transaction receipt
  await publicClient.waitForTransactionReceipt({ hash })

  return { address, hash, isNew: true }
}
