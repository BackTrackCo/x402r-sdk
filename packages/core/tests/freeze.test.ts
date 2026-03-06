import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { freezePayment } from '../src/operations/freeze.js'
import { createMockWalletWithoutAccount, makePaymentInfo } from './fixtures.js'

const MOCK_FREEZE = '0x1111111111111111111111111111111111111111' as const

describe('freeze write functions', () => {
  it('freezePayment throws without account', async () => {
    await expect(
      freezePayment(
        createMockWalletWithoutAccount(),
        MOCK_FREEZE,
        makePaymentInfo(),
      ),
    ).rejects.toThrow(ContractCallError)
  })
})
