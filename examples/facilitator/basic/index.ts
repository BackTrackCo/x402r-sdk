import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { x402Facilitator } from '@x402/core/facilitator'
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from '@x402/core/types'
import { toFacilitatorEvmSigner } from '@x402/evm'
import { registerEscrowEvmScheme } from '@x402r/evm/escrow/facilitator'
import dotenv from 'dotenv'
import express from 'express'
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') })

// Configuration
const PORT = process.env.PORT || '4022'

// Validate required environment variables
if (!process.env.PRIVATE_KEY) {
  console.error('PRIVATE_KEY environment variable is required')
  process.exit(1)
}

// Initialize the EVM account from private key
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
console.info(`Facilitator account: ${account.address}`)

// Create a Viem client with both wallet and public capabilities
const viemClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
}).extend(publicActions)

const evmSigner = toFacilitatorEvmSigner({
  getCode: (args: { address: `0x${string}` }) => viemClient.getCode(args),
  address: account.address,
  readContract: (args: {
    address: `0x${string}`
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
  }) =>
    viemClient.readContract({
      ...args,
      args: args.args || [],
    }),
  verifyTypedData: (args: {
    address: `0x${string}`
    domain: Record<string, unknown>
    types: Record<string, unknown>
    primaryType: string
    message: Record<string, unknown>
    signature: `0x${string}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) => viemClient.verifyTypedData(args as any),
  writeContract: (args: {
    address: `0x${string}`
    abi: readonly unknown[]
    functionName: string
    args: readonly unknown[]
  }) =>
    viemClient.writeContract({
      ...args,
      args: args.args || [],
    }),
  sendTransaction: (args: { to: `0x${string}`; data: `0x${string}` }) =>
    viemClient.sendTransaction(args),
  waitForTransactionReceipt: (args: { hash: `0x${string}` }) =>
    viemClient.waitForTransactionReceipt(args),
})

const facilitator = new x402Facilitator()

registerEscrowEvmScheme(facilitator, {
  signer: evmSigner,
  networks: 'eip155:84532', // Base Sepolia
})

// Initialize Express app
const app = express()
app.use(express.json())

/**
 * POST /verify
 * Verify a payment against requirements
 */
app.post('/verify', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload
      paymentRequirements: PaymentRequirements
    }

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        error: 'Missing paymentPayload or paymentRequirements',
      })
    }

    const response: VerifyResponse = await facilitator.verify(
      paymentPayload,
      paymentRequirements,
    )

    res.json(response)
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /settle
 * Settle a payment on-chain
 */
app.post('/settle', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({
        error: 'Missing paymentPayload or paymentRequirements',
      })
    }

    const response: SettleResponse = await facilitator.settle(
      paymentPayload as PaymentPayload,
      paymentRequirements as PaymentRequirements,
    )

    res.json(response)
  } catch (error) {
    console.error('Settle error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /supported
 * Get supported payment kinds and extensions
 */
app.get('/supported', async (_req, res) => {
  try {
    const response = facilitator.getSupported()
    res.json(response)
  } catch (error) {
    console.error('Supported error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Start the server
app.listen(parseInt(PORT, 10), () => {
  console.log(`Facilitator listening on http://localhost:${PORT}`)
})
