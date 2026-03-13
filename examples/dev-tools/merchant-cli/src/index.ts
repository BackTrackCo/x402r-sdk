#!/usr/bin/env node

/**
 * x402r Merchant CLI
 *
 * A command-line tool for merchant operations: releasing funds, managing refunds, etc.
 *
 * Usage:
 *   pnpm start release --payment-json '{"operator":...}' --amount 10000  (or use saved state)
 *   pnpm start refuse-refund                                              (reads from saved state)
 *   pnpm start payment-amounts                                            (reads from saved state)
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  calculateTotalFees,
  distributeFees,
  formatFeeBreakdown,
  type PaymentInfo,
  validateFeeBounds,
} from '@x402r/core'
import { createX402r } from '@x402r/sdk'
import { Command } from 'commander'
import { config as dotenvConfig } from 'dotenv'
import { initCli } from '../../shared/cli-setup.js'
import { getPaymentInfoFromState } from '../../shared/state.js'
import { formatEvidenceList, parsePaymentInfo } from '../../shared/utils.js'
import { showEvidence, submitMerchantEvidence } from './commands/evidence.js'

// Load environment from the example directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenvConfig({ path: join(__dirname, '..', '.env') })

// Create x402r SDK from shared setup
function createMerchant() {
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

  const x402r = createX402r({
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    chainId,
    refundRequestAddress,
    refundRequestEvidenceAddress: chainConfig.refundRequestEvidence,
    freezeAddress,
  })

  return {
    x402r,
    account,
    publicClient,
    walletClient,
    operatorAddress: operatorAddress!,
    networkId,
    chainId,
    chainConfig,
  }
}

// Create CLI
const program = new Command()

program
  .name('x402r-merchant')
  .description('CLI tool for x402r merchant operations')
  .version('0.0.1')

// Info command
program
  .command('info')
  .description('Show merchant configuration info')
  .action(() => {
    const { account, operatorAddress, networkId, chainConfig } =
      createMerchant()

    console.log('\n=== Merchant Info ===')
    console.log('  Address:', account.address)
    console.log('  Network:', networkId)
    console.log('  RPC:', process.env.RPC_URL || 'https://sepolia.base.org')

    console.log('\n=== Operator ===')
    console.log('  Operator:', operatorAddress)

    console.log('\n=== Protocol Addresses ===')
    console.log('  Escrow:', chainConfig.authCaptureEscrow)
    console.log('  USDC:', chainConfig.usdc)
  })

// Release command
program
  .command('release')
  .description('Release funds from escrow to the merchant')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-a, --amount <amount>', 'Amount to release (defaults to maxAmount)')
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)
    const amount = options.amount
      ? BigInt(options.amount)
      : paymentInfo.maxAmount

    console.log('\nReleasing funds from escrow...')
    console.log('  Payer:', paymentInfo.payer)
    console.log('  Receiver:', paymentInfo.receiver)
    console.log('  Amount:', amount.toString())

    try {
      const txHash = await x402r.payment.release(paymentInfo, amount)
      console.log('\nRelease successful!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nRelease failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Payment amounts command
program
  .command('payment-amounts')
  .description('Get capturable and refundable amounts for a payment')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)

    console.log('\nFetching payment amounts...')

    try {
      const amounts = await x402r.payment.getAmounts(paymentInfo)
      console.log('\n=== Payment Amounts ===')
      console.log(
        '  Capturable:',
        amounts.capturableAmount.toString(),
        '(can be released)',
      )
      console.log(
        '  Refundable:',
        amounts.refundableAmount.toString(),
        '(post-escrow refund window)',
      )
    } catch (error) {
      console.error(
        '\nFailed to get amounts:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Refund in escrow command
program
  .command('refund-in-escrow')
  .description('Refund funds that are still in escrow back to the payer')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .requiredOption('-a, --amount <amount>', 'Amount to refund')
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)
    const amount = BigInt(options.amount)

    console.log('\nRefunding funds from escrow...')
    console.log('  Payer:', paymentInfo.payer)
    console.log('  Amount:', amount.toString())

    try {
      const txHash = await x402r.payment.refundInEscrow(paymentInfo, amount)
      console.log('\nRefund successful!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nRefund failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Refuse refund command (replaces old "approve-refund" — merchants can only refuse in the new design)
program
  .command('refuse-refund')
  .description(
    'Refuse a pending refund request (merchant can only refuse, not approve)',
  )
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    console.log('\nRefusing refund request...')
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
      const txHash = await x402r.refund!.refuse(paymentInfo, nonce)
      console.log('\nRefund request refused!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nRefusal failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Deny refund command (alias for refuse — kept for backward compatibility)
program
  .command('deny-refund')
  .description('Deny a pending refund request (alias for refuse-refund)')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    console.log('\nDenying refund request...')
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
      const txHash = await x402r.refund!.refuse(paymentInfo, nonce)
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

// Check refund status command
program
  .command('refund-status')
  .description('Check the status of a refund request')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    try {
      const hasRequest = await x402r.refund!.has(paymentInfo, nonce)
      if (!hasRequest) {
        console.log('\nNo refund request found for this payment')
        return
      }

      const status = await x402r.refund!.getStatus(paymentInfo, nonce)
      const statusNames = [
        'Pending',
        'Approved',
        'Denied',
        'Cancelled',
        'Refused',
      ]
      console.log(`\nRefund status: ${statusNames[status] || status}`)

      const request = await x402r.refund!.get(paymentInfo, nonce)
      console.log('  Amount requested:', request.amount.toString())
    } catch (error) {
      console.error(
        '\nFailed to get status:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Pending refunds command
program
  .command('pending-refunds')
  .description('List pending refund requests for this merchant')
  .option('-o, --offset <offset>', 'Starting offset', '0')
  .option('-c, --count <count>', 'Number of requests to fetch', '10')
  .action(async (options) => {
    const { x402r, account } = createMerchant()
    const offset = BigInt(options.offset)
    const count = BigInt(options.count)

    console.log('\nFetching pending refund requests...')

    try {
      const { keys, total } = await x402r.refund!.getReceiverRequests(
        account.address,
        offset,
        count,
      )
      console.log(`\nFound ${total} total refund requests`)

      if (keys.length === 0) {
        console.log('No pending refund requests')
        return
      }

      console.log(`\nShowing ${keys.length} requests (offset: ${offset}):`)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const request = await x402r.refund!.getByKey(key)
        const statusNames = [
          'Pending',
          'Approved',
          'Denied',
          'Cancelled',
          'Refused',
        ]
        console.log(`\n${Number(offset) + i + 1}. Key: ${key.slice(0, 18)}...`)
        console.log(`   Amount: ${request.amount.toString()}`)
        console.log(
          `   Status: ${statusNames[request.status] || request.status}`,
        )
      }
    } catch (error) {
      console.error(
        '\nFailed to fetch requests:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Unfreeze command
program
  .command('unfreeze')
  .description('Unfreeze a frozen payment')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)

    if (!x402r.freeze) {
      console.error(
        'Error: Freeze address not configured (set FREEZE_ADDRESS env var)',
      )
      process.exit(1)
    }

    console.log('\nUnfreezing payment...')
    console.log('  Payer:', paymentInfo.payer)

    try {
      const txHash = await x402r.freeze.unfreeze(paymentInfo)
      console.log('\nPayment unfrozen!')
      console.log('  Transaction:', txHash)
      console.log(`\nhttps://sepolia.basescan.org/tx/${txHash}`)
    } catch (error) {
      console.error(
        '\nUnfreeze failed:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Check frozen status command
program
  .command('is-frozen')
  .description('Check if a payment is frozen')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .action(async (options) => {
    const { x402r } = createMerchant()
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
        '\nFailed to check status:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// ============ Evidence Commands ============

// Show evidence command
program
  .command('show-evidence')
  .description('Show all evidence for a dispute')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createMerchant()
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
  .description('Submit evidence as merchant (receiver role)')
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (reads from saved state if omitted)',
  )
  .requiredOption('-c, --cid <cid>', 'IPFS CID of the evidence')
  .option('-n, --nonce <nonce>', 'Nonce (record index)', '0')
  .action(async (options) => {
    const { x402r } = createMerchant()
    const paymentInfo = getPaymentInfoFromState(options)
    const nonce = BigInt(options.nonce)

    try {
      const txHash = await submitMerchantEvidence(
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

// Operator config command
program
  .command('operator-config')
  .description('Get the full operator configuration')
  .action(async () => {
    const { x402r } = createMerchant()

    console.log('\nFetching operator configuration...')

    try {
      const config = await x402r.operator.getConfig()
      console.log('\n=== Operator Configuration ===')
      console.log('  Escrow:', config.escrow)
      console.log('  Fee Recipient:', config.feeRecipient)
      console.log('  Fee Calculator:', config.feeCalculator)
      console.log('  Protocol Fee Config:', config.protocolFeeConfig)
      console.log('\n=== Conditions ===')
      console.log('  Authorize:', config.authorizeCondition)
      console.log('  Charge:', config.chargeCondition)
      console.log('  Release:', config.releaseCondition)
      console.log('  Refund In Escrow:', config.refundInEscrowCondition)
      console.log('  Refund Post Escrow:', config.refundPostEscrowCondition)
      console.log('\n=== Recorders ===')
      console.log('  Authorize:', config.authorizeRecorder)
      console.log('  Charge:', config.chargeRecorder)
      console.log('  Release:', config.releaseRecorder)
      console.log('  Refund In Escrow:', config.refundInEscrowRecorder)
      console.log('  Refund Post Escrow:', config.refundPostEscrowRecorder)
    } catch (error) {
      console.error(
        '\nFailed to get config:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Calculate fee command
program
  .command('calculate-fee')
  .description('Calculate fees for a payment amount')
  .requiredOption(
    '-a, --amount <amount>',
    'Amount to calculate fees for (in token units)',
  )
  .option(
    '-p, --payment-json <json>',
    'Payment info JSON (optional, for bounds validation)',
  )
  .option(
    '-c, --caller <address>',
    'Caller address (defaults to merchant address)',
  )
  .action(async (options) => {
    const { publicClient, account, operatorAddress } = createMerchant()
    const amount = BigInt(options.amount)
    const caller = (options.caller as `0x${string}`) || account.address

    // Create a minimal payment info for fee calculation if not provided
    const paymentInfo: PaymentInfo = options.paymentJson
      ? parsePaymentInfo(options.paymentJson)
      : {
          operator: operatorAddress,
          payer: '0x0000000000000000000000000000000000000001',
          receiver: account.address,
          token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
          maxAmount: amount,
          preApprovalExpiry: 0,
          authorizationExpiry: 0,
          refundExpiry: 0,
          minFeeBps: 0,
          maxFeeBps: 10000, // 100%
          feeReceiver: account.address,
          salt: 0n,
        }

    console.log('\nCalculating fees...')
    console.log('  Amount:', amount.toString())
    console.log('  Operator:', operatorAddress)
    console.log('  Caller:', caller)

    try {
      const fees = await calculateTotalFees(publicClient, {
        operatorAddress,
        paymentInfo,
        amount,
        caller,
      })

      console.log(`\n${formatFeeBreakdown(fees)}`)

      // Validate bounds if payment info was provided
      if (options.paymentJson) {
        const isValid = validateFeeBounds(fees, paymentInfo)
        console.log(
          `\nFee Bounds: ${isValid ? 'VALID' : 'INVALID'} (min: ${paymentInfo.minFeeBps} bps, max: ${paymentInfo.maxFeeBps} bps)`,
        )
      }
    } catch (error) {
      console.error(
        '\nFailed to calculate fees:',
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
  })

// Distribute fees command
program
  .command('distribute-fees')
  .description('Distribute accumulated protocol and operator fees')
  .option('-t, --token <address>', 'Token address (defaults to USDC)')
  .action(async (options) => {
    const { walletClient, operatorAddress, chainConfig } = createMerchant()
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
