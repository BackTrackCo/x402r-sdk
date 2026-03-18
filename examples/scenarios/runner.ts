import type { Hash, PublicClient } from 'viem'
import { SCANNER } from '../shared/constants.js'

// ---------------------------------------------------------------------------
// StepRunner — fail-fast scenario execution
// ---------------------------------------------------------------------------

class StepFailedError extends Error {
  constructor(
    public step: number,
    public stepName: string,
    message: string,
  ) {
    super(`Step ${step} (${stepName}) failed: ${message}`)
    this.name = 'StepFailedError'
  }
}

export class StepRunner {
  private stepCount = 0
  private currentStep = ''
  private startTime = Date.now()
  private publicClient: PublicClient | undefined

  constructor(
    private scenarioName: string,
    publicClient?: PublicClient,
  ) {
    this.publicClient = publicClient
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Scenario: ${scenarioName}`)
    console.log(`${'='.repeat(60)}\n`)
  }

  step(name: string): void {
    this.stepCount++
    this.currentStep = name
    console.log(`\n--- Step ${this.stepCount}: ${name} ---`)
  }

  log(message: string): void {
    console.log(`  ${message}`)
  }

  assert(condition: boolean, message: string): void {
    if (!condition) {
      this.fail(message)
    }
    this.log(`PASS: ${message}`)
  }

  fail(message: string): never {
    throw new StepFailedError(this.stepCount, this.currentStep, message)
  }

  async waitForTx(hash: Hash): Promise<void> {
    if (!this.publicClient) {
      throw new Error('publicClient required for waitForTx')
    }
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
    this.log(`tx: ${SCANNER}/tx/${hash}`)

    if (receipt.status !== 'success') {
      this.fail(`Transaction reverted: ${hash}`)
    }

    // Brief delay for RPC propagation on real networks
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  done(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    console.log(`\n${'='.repeat(60)}`)
    console.log(
      `${this.scenarioName}: PASSED (${this.stepCount} steps, ${elapsed}s)`,
    )
    console.log(`${'='.repeat(60)}\n`)
  }
}
