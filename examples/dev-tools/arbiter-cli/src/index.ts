#!/usr/bin/env node

/**
 * x402r Arbiter CLI
 *
 * A command-line tool for arbiter operations: reviewing and deciding refund requests.
 *
 * Usage:
 *   pnpm start list                              # List pending refund requests
 *   pnpm start show <key>                        # Show request details
 *   pnpm start approve <key>                     # Approve a refund request (EIP-712 signature)
 *   pnpm start deny <key>                        # Deny a refund request
 *   pnpm start execute --payment-json '...'      # Execute approved refund (or use saved state)
 *   pnpm start watch                             # Watch for new refund requests
 *   pnpm start info                              # Show arbiter wallet info
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  computePaymentInfoHash,
  distributeFees,
  RefundRequestStatus,
  signatureConditionAbi,
} from '@x402r/core'
import { createX402r } from '@x402r/sdk'
import { Command } from 'commander'
import { config as dotenvConfig } from 'dotenv'
import { initCli } from '../../shared/cli-setup.js'
import { getPaymentInfoFromState } from '../../shared/state.js'
import {
  formatEvidenceList,
  formatUSDC,
  shortAddress,
} from '../../shared/utils.js'
import { showEvidence, submitArbiterEvidence } from './commands/evidence.js'

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenvConfig({ path: join(__dirname, '..', '.env') })

// Status name mapping
const STATUS_NAMES = [
  'Pending',
  'Approved',
  'Denied',
  'Cancelled',
  'Refused',
] as const

// Create x402r SDK from shared setup
function createArbiter() {
  const {
    account,
    publicClient,
    walletClient,
    networkId,
    chainId,
    chainConfig,
    operatorAddress,
  } = initCli({ requireOperator: true })

  const refundRequestAddress = process.env.REFUND_REQUEST_ADDRESS as
    | `0x${string}`
    | undefined
  const freezeAddress = process.env.FREEZE_ADDRESS as `0x${string}` | undefined
  const signatureConditionAddress = process.env.SIGNATURE_CONDITION_ADDRESS as
    | `0x${string}`
    | undefined

  // Use createX402r (not a preset) so arbiter has full access including payment writes
  const x402r = createX402r({
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    chainId,
    refundRequestAddress,
    refundRequestEvidenceAddress: chainConfig.refundRequestEvidence,
    freezeAddress,
  })

  const receiverAddress =
    (process.env.RECEIVER_ADDRESS as `0x${string}`) || account.address

  return {
    x402r,
    account,
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    networkId,
    chainId,
    chainConfig,
    receiverAddress,
    freezeAddress,
    signatureConditionAddress,
  }
}

// Create CLI
const program = new Command()

program
  .name('x402r-arbiter')
  .description('CLI tool for x402r arbiter operations')
  .version('0.0.1')

// Info command
program
  .command('info')
  .description('Show arbiter configuration info')
  .action(() => {
    const {
      account,
      operatorAddress,
      networkId,
      chainConfig,
      receiverAddress,
      freezeAddress,
      signatureConditionAddress,
    } = createArbiter()

    console.log('\n=== Arbiter Info ===')
    console.log('  Address:', account.address)
    console.log('  Network:', networkId)
    console.log('  RPC:', process.env.RPC_URL || 'https://sepolia.base.org')

    console.log('\n=== Operator ===')
    console.log('  Operator:', operatorAddress)
    console.log('  Receiver:', receiverAddress)
    if (freezeAddress) {
      console.log('  Freeze:', freezeAddress)
    }
    if (signatureConditionAddress) {
      console.log('  SignatureCondition:', signatureConditionAddress)
    }

    console.log('\n=== Protocol Addresses ===')
    console.log('  Escrow:', chainConfig.authCaptureEscrow)
    console.log('  USDC:', chainConfig.usdc)
  })

// List pending refund requests
program
  .command('list')
  .description('List pending refund requests')
  .option('-o, --offset <offset>', 'Starting offset', '0')
  .option('-c, --count <count>', 'Number of requests to fetch', '10')
  .action(async (options) => {
    const { x402r, operatorAddress } = createArbiter()
    const offset = BigInt(options.offset)
    const count = BigInt(options.count)

    console.log('\nFetching refund requests...')
    console.log('  Operator:', operatorAddress)

    try {
      const { keys, total } = await x402r.refund!.getOperatorRequests(
        operatorAddress,
        offset,
        count,
      )
      console.log(`\nFound ${total} total refund requests`)

      if (keys.length === 0) {
        console.log('No refund requests found')
        return
      }

      console.log(`\nShowing ${keys.length} requests (offset: ${offset}):\n`)

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        try {
          const request = await x402r.refund!.getByKey(key)
          const statusName =
            STATUS_NAMES[request.status] || String(request.status)
          const isPending = request.status === RefundRequestStatus.Pending

          console.log(`${Number(offset) + i + 1}. ${key}`)
          console.log(`   Amount: ${formatUSDC(request.amount)}`)
          console.log(
            `   Status: ${statusName}${isPending ? ' (pending)' : ''}`,
          )
          console.log('')
        } catch {
          console.log(`${Number(offset) + i + 1}. ${key}`)
          console.log('   Error: Could not fetch request details')
          console.log('')
        }
      }
    } catch (error) {
      console.error(
        '\nFailed to fetch requests:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Show request details
program
  .command('show <key>')
  .description('Show details of a specific refund request')
  .action(async (key: string) => {
    const { x402r } = createArbiter()

    console.log('\nFetching refund request...')
    console.log('  Key:', key)

    try {
      const request = await x402r.refund!.getByKey(key as `0x${string}`)
      const statusName = STATUS_NAMES[request.status] || String(request.status)

      console.log('\n=== Refund Request Details ===')
      console.log('  Key:', key)
      console.log('  Amount:', formatUSDC(request.amount))
      console.log('  Status:', statusName)
      console.log('  Payment Hash:', request.paymentInfoHash)
      console.log('  Nonce:', request.nonce.toString())

      // Show evidence count if evidence contract is configured
      try {
        // We need paymentInfo to query evidence — this is a limitation
        // when only the key is provided. Show a hint instead.
        console.log(
          "\n  Use 'show-evidence' with --payment-json to view dispute evidence",
        )
      } catch {
        // Ignore
      }

      if (request.status === RefundRequestStatus.Pending) {
        console.log('\nThis request is pending. You can approve or deny it:')
        console.log(`   pnpm start approve ${key}`)
        console.log(`   pnpm start deny ${key}`)
      } else if (request.status === RefundRequestStatus.Approved) {
        console.log(
          '\nThis request is approved. It can be executed by the payer.',
        )
      }
    } catch (error) {
      console.error(
        '\nFailed to fetch request:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Approve a refund request by key (EIP-712 signature flow)
program
  .command('approve <key>')
  .description('Approve a refund request via EIP-712 signature')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .option(
    '-a, --amount <amount>',
    'Amount to approve (defaults to requested amount)',
  )
  .action(async (key: string, options) => {
    const {
      x402r,
      walletClient,
      publicClient,
      chainId,
      chainConfig,
      signatureConditionAddress,
    } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    if (!signatureConditionAddress) {
      console.error(
        'Error: SIGNATURE_CONDITION_ADDRESS environment variable is required for approval',
      )
      process.exit(1)
    }

    // The key parameter is for display/audit trail only.
    // The actual on-chain operation uses paymentInfo + nonce to identify the request.
    console.log('\nApproving refund request via EIP-712 signature...')
    console.log('  Key:', key)
    console.log('  Payer:', paymentInfo.payer)
    console.log('  Nonce:', nonce.toString())

    // Show evidence summary before decision
    try {
      const evidenceCount = await x402r.evidence.count(paymentInfo, nonce)
      if (evidenceCount > 0n) {
        const { entries } = await x402r.evidence.getBatch(
          paymentInfo,
          nonce,
          0n,
          evidenceCount,
        )
        console.log(`\n=== Evidence (${evidenceCount} entries) ===`)
        console.log(formatEvidenceList(entries))
      } else {
        console.log('\n  No evidence submitted')
      }
    } catch {
      // Evidence contract may not be configured — proceed without
    }

    try {
      // Get the requested amount if not specified
      let amount: bigint
      if (options.amount) {
        amount = BigInt(options.amount)
      } else {
        const request = await x402r.refund!.get(paymentInfo, nonce)
        amount = request.amount
      }
      console.log('  Amount:', amount.toString())

      // Step 1: Compute paymentInfoHash
      const escrowAddress = chainConfig.authCaptureEscrow
      const paymentInfoHash = computePaymentInfoHash(
        chainId,
        escrowAddress,
        paymentInfo,
      )
      console.log('  PaymentInfoHash:', paymentInfoHash)

      // Step 2: Read approval nonce from SignatureCondition contract
      const approvalNonce = await publicClient.readContract({
        address: signatureConditionAddress,
        abi: signatureConditionAbi,
        functionName: 'approvalNonces',
        args: [paymentInfoHash],
      })
      console.log('  Approval Nonce:', approvalNonce.toString())

      // Step 3: Sign EIP-712 typed data
      const expiry = 0 // No expiry
      const signature = await walletClient.signTypedData({
        domain: {
          name: 'SignatureCondition',
          version: '1',
          chainId: BigInt(chainId),
          verifyingContract: signatureConditionAddress,
        },
        types: {
          Approval: [
            { name: 'paymentInfoHash', type: 'bytes32' },
            { name: 'amount', type: 'uint256' },
            { name: 'expiry', type: 'uint48' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        primaryType: 'Approval',
        message: {
          paymentInfoHash,
          amount,
          expiry,
          nonce: approvalNonce,
        },
      })
      console.log('  Signature:', `${signature.slice(0, 20)}...`)

      // Step 4: Submit approval with signature on-chain
      const txHash = await x402r.refund!.approveWithSignature(
        paymentInfo,
        nonce,
        amount,
        0,
        signature,
      )
      console.log('\nRefund request approved!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nApproval failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Deny a refund request by key
program
  .command('deny <key>')
  .description('Deny a refund request (requires payment JSON)')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (key: string, options) => {
    const { x402r } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    // The key parameter is for display/audit trail only.
    // The actual on-chain operation uses paymentInfo + nonce to identify the request.
    console.log('\nDenying refund request...')
    console.log('  Key:', key)
    console.log('  Payer:', paymentInfo.payer)
    console.log('  Nonce:', nonce.toString())

    // Show evidence summary before decision
    try {
      const evidenceCount = await x402r.evidence.count(paymentInfo, nonce)
      if (evidenceCount > 0n) {
        const { entries } = await x402r.evidence.getBatch(
          paymentInfo,
          nonce,
          0n,
          evidenceCount,
        )
        console.log(`\n=== Evidence (${evidenceCount} entries) ===`)
        console.log(formatEvidenceList(entries))
      } else {
        console.log('\n  No evidence submitted')
      }
    } catch {
      // Evidence contract may not be configured — proceed without
    }

    try {
      const txHash = await x402r.refund!.deny(paymentInfo, nonce)
      console.log('\nRefund request denied!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nDenial failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Execute a refund (after approval)
program
  .command('execute')
  .description('Execute a refund for an approved request')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-a, --amount <amount>', 'Amount to refund (defaults to maxAmount)')
  .action(async (options) => {
    const { x402r } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)
    const amount = options.amount ? BigInt(options.amount) : undefined

    console.log('\nExecuting refund...')
    console.log('  Payer:', paymentInfo.payer)
    console.log('  Amount:', amount ? formatUSDC(amount) : 'maxAmount')

    try {
      const txHash = await x402r.payment.refundInEscrow(
        paymentInfo,
        amount ?? paymentInfo.maxAmount,
      )
      console.log('\nRefund executed!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nExecution failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Check refund status
program
  .command('status')
  .description('Check the status of a refund request')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    try {
      const hasRequest = await x402r.refund!.has(paymentInfo, nonce)
      if (!hasRequest) {
        console.log('\nNo refund request found for this payment')
        return
      }

      const status = await x402r.refund!.getStatus(paymentInfo, nonce)
      const statusName = STATUS_NAMES[status] || String(status)
      console.log(`\nRefund status: ${statusName}`)

      const request = await x402r.refund!.get(paymentInfo, nonce)
      console.log('  Amount requested:', formatUSDC(request.amount))
    } catch (error) {
      console.error(
        '\nFailed to get status:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Check if payment is frozen
program
  .command('is-frozen')
  .description('Check if a payment is frozen')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .action(async (options) => {
    const { x402r } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)

    if (!x402r.freeze) {
      console.error(
        'Error: Freeze address not configured (set FREEZE_ADDRESS env var)',
      )
      process.exit(1)
    }

    try {
      const isFrozen = await x402r.freeze.isFrozen(paymentInfo)
      console.log(`\nPayment is ${isFrozen ? 'FROZEN' : 'NOT FROZEN'}`)
    } catch (error) {
      console.error(
        '\nFailed to check freeze status:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Watch for new refund requests
program
  .command('watch')
  .description('Watch for new refund requests (Ctrl+C to stop)')
  .action(() => {
    const { x402r } = createArbiter()

    console.log('\nWatching for new refund requests...')
    console.log('  Press Ctrl+C to stop\n')

    const unsubscribe = x402r.watch.onRefundRequest((event) => {
      const log = event as {
        args?: {
          payer?: string
          receiver?: string
          amount?: bigint
          status?: number
        }
      }
      const timestamp = new Date().toLocaleTimeString()
      console.log(`[${timestamp}] Refund request event`)
      if (log.args) {
        if (log.args.payer)
          console.log(`    Payer: ${shortAddress(log.args.payer)}`)
        if (log.args.receiver)
          console.log(`    Receiver: ${shortAddress(log.args.receiver)}`)
        if (log.args.amount)
          console.log(`    Amount: ${formatUSDC(log.args.amount)}`)
        if (log.args.status !== undefined) {
          const statusName =
            STATUS_NAMES[log.args.status] || String(log.args.status)
          console.log(`    Status: ${statusName}`)
        }
      }
      console.log('')
    })

    // Handle graceful shutdown
    const cleanup = () => {
      console.log('\n\nStopping watch...')
      unsubscribe()
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  })

// Get request count
program
  .command('count')
  .description('Get total number of refund requests')
  .action(async () => {
    const { x402r, receiverAddress } = createArbiter()

    try {
      const { total } = await x402r.refund!.getReceiverRequests(
        receiverAddress,
        0n,
        0n,
      )
      console.log(`\nTotal refund requests: ${total}`)
    } catch (error) {
      console.error(
        '\nFailed to get count:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// ============ Evidence Commands ============

// Show evidence command
program
  .command('show-evidence')
  .description('Show all evidence for a dispute case')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    try {
      await showEvidence(x402r, paymentInfo, nonce)
    } catch (error) {
      console.error(
        '\nFailed to show evidence:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Submit evidence command
program
  .command('submit-evidence')
  .description('Submit evidence as arbiter')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .requiredOption('-c, --cid <cid>', 'IPFS CID of the evidence')
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createArbiter()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    try {
      const txHash = await submitArbiterEvidence(
        x402r,
        paymentInfo,
        nonce,
        options.cid,
      )
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nSubmit evidence failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// NOTE: Registry commands (register, update-uri, deregister, registry-list, registry-check)
// were removed because arbiter registry is not part of the new @x402r/sdk API.
// If registry functionality is needed, interact with the ArbiterRegistry contract directly.

// Distribute fees command
program
  .command('distribute-fees')
  .description('Distribute accumulated protocol and operator fees')
  .option('-t, --token <address>', 'Token address (defaults to USDC)')
  .action(async (options) => {
    const { walletClient, operatorAddress, chainConfig } = createArbiter()
    const token =
      (options.token as `0x${string}`) || (chainConfig.usdc as `0x${string}`)

    console.log('\nDistributing fees...')
    console.log('  Operator:', operatorAddress)
    console.log('  Token:', token)

    try {
      const txHash = await distributeFees(walletClient, {
        operatorAddress,
        token,
      })
      console.log('\nFees distributed!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nFee distribution failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

program.parse()
