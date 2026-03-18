/**
 * StepRunner — structured test step tracking with pass/fail/assert helpers.
 */

import { SCANNER } from './config.js'

interface StepResult {
  name: string
  pass: boolean
  txHash?: string
  error?: string
}

export class StepRunner {
  private results: StepResult[] = []

  log(msg: string): void {
    console.log(`  ${msg}`)
  }

  step(name: string): void {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`STEP: ${name}`)
    console.log('='.repeat(60))
  }

  pass(name: string, txHash?: string): void {
    console.log(`  PASS: ${name}`)
    if (txHash) console.log(`    tx: ${SCANNER}/tx/${txHash}`)
    this.results.push({ name, pass: true, txHash })
  }

  fail(name: string, error: string): never {
    console.log(`  FAIL: ${name}`)
    console.log(`    error: ${error}`)
    this.results.push({ name, pass: false, error })
    throw new Error(`FAIL: ${name} — ${error}`)
  }

  assert(condition: boolean, name: string, errorMsg?: string): void {
    if (condition) {
      this.pass(name)
    } else {
      this.fail(name, errorMsg ?? 'Assertion failed')
    }
  }

  summary(): { passed: number; failed: number; total: number } {
    const passed = this.results.filter((r) => r.pass).length
    const failed = this.results.filter((r) => !r.pass).length
    return { passed, failed, total: passed + failed }
  }

  printSummary(title: string): void {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  ${title}`)
    console.log('='.repeat(60))

    for (const r of this.results) {
      const icon = r.pass ? 'PASS' : 'FAIL'
      console.log(`  ${icon} ${r.name}`)
      if (r.txHash) console.log(`    ${SCANNER}/tx/${r.txHash}`)
      if (r.error) console.log(`    ERROR: ${r.error}`)
    }

    const { passed, failed, total } = this.summary()
    console.log(
      `\n  Result: ${passed} passed, ${failed} failed out of ${total} steps`,
    )
  }

  exitWithResults(passMsg: string, failMsg: string): void {
    const { failed } = this.summary()
    if (failed > 0) {
      console.log(`\n  ${failMsg}`)
      process.exit(1)
    } else {
      console.log(`\n  ${passMsg}`)
    }
  }
}
