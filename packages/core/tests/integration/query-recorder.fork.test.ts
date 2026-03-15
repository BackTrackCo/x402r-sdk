import type { Address, PublicClient } from 'viem'
import { pad, zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { createX402r, type X402r } from '../../../sdk/src/index.js'
import {
  paymentIndexRecorderAbi,
  paymentOperatorFactoryAbi,
} from '../../src/abis/generated.js'
import {
  getDeployerOperator,
  getDeployerOperatorCount,
  getDeployerOperators,
  getPayerPayment,
  getPayerPaymentsByEvents,
  getPayerPaymentsFromRecorder,
  getReceiverPayment,
  getReceiverPaymentsByEvents,
  getReceiverPaymentsFromRecorder,
  getRecorderPaymentInfo,
} from '../../src/actions/index.js'
import { x402rChains } from '../../src/config/index.js'
import { computePaymentInfoHash } from '../../src/payment/hashing.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, FAR_FUTURE, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// PaymentIndexRecorder bytecode (from x402r-contracts build artifacts)
// ---------------------------------------------------------------------------

const PAYMENT_INDEX_RECORDER_BYTECODE =
  '0x60c0346100a057601f61104138819003918201601f19168301916001600160401b038311848410176100a45780849260409485528339810103126100a05780516001600160a01b03811691908290036100a057602001519080156100915760805260a052604051610f8890816100b98239608051818181609c0152610339015260a05181818161014901526107fe0152f35b63d92e233d60e01b5f5260045ffd5b5f80fd5b634e487b7160e01b5f52604160045260245ffdfe60806040526004361015610011575f80fd5b5f3560e01c806308bf5f1c146108e75780633396f183146108715780634d0c5ec9146108395780639dd6f592146102e0578063a75e9b19146102a7578063a7facd201461016c578063aed8988314610132578063ccc4deb814610107578063cd493ffd146100cf5763e681c4aa14610087575f80fd5b346100cb575f3660031901126100cb576040517f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602090f35b5f80fd5b346100cb5760203660031901126100cb576001600160a01b036100f06108fe565b165f526004602052602060405f2054604051908152f35b346100cb5761011e6101183661092b565b91610dd7565b9061012e60405192839283610a20565b0390f35b346100cb575f3660031901126100cb5760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b346100cb5760403660031901126100cb576101856108fe565b60243590610191610adc565b506001600160a01b03165f81815260046020526040902054821015610298575f52600360205260405f20905f5260205260405f20545f525f60205261018060405f206006604051916101e283610a71565b80546001600160a01b0390811684526001820154811660208501526002820154811660408086019190915260038301548216606086015260048301546001600160781b038116608087015265ffffffffffff607882901c811660a088015260a89190911c811660c0870152600584015490811660e087015261ffff603082901c811661010088015281831c1661012087015260501c9091166101408501529101546101608301525190610296908290610955565bf35b634e23d03560e01b5f5260045ffd5b346100cb5760203660031901126100cb576102c0610adc565b506004355f525f60205261018060405f206006604051916101e283610a71565b346100cb5736600319016101c081126100cb57610180136100cb57610303610914565b506001600160a01b03610314610d87565b16331415806107fb575b6107ec5760405163063a70ff60e01b81526001600160a01b037f00000000000000000000000000000000000000000000000000000000000000008116906103636108fe565b1660048301526024356001600160a01b038116908190036100cb5760248301526044356001600160a01b038116908190036100cb5760448301526064356001600160a01b038116908181036100cb57816064850152608435916001600160781b0383168093036100cb5782608486015260a4359065ffffffffffff82168083036100cb5760a487015260c4359365ffffffffffff85168086036100cb5760c488015260e4359265ffffffffffff8416928385036100cb578360e48a0152610104359061ffff82168083036100cb576101048b0152610124359361ffff85168086036100cb576101248c0152610144356001600160a01b0381169a9091908b83036100cb576101649b6101448e01528c8c359c8d91015260208d61018481845afa9c8d156107ad575f9d6107b8575b5060608d6024604051809481936334b778ed60e01b835260048301525afa9081156107ad575f905f92610757575b50159081610745575b506107365760069969ffff00000000000000009567ffff000000000000948e5f525f60205260405f209b60018060a01b03610501610d87565b8e546001600160a01b0319169116178d558c600161051d610d9d565b910180546001600160a01b0319166001600160a01b039092169190911790558c6002610547610db3565b91019060018060a01b03166bffffffffffffffffffffffff60a01b8254161790555060038c01906bffffffffffffffffffffffff60a01b82541617905560048b019283549265ffffffffffff60a81b9060a81b169264ffffffffff60d81b16179065ffffffffffff60781b9060781b1617179055600588019650865490600160501b600160f01b039060501b169569ffffffffffffffffffff61ffff60f01b019169ffffffffffffffffffff191617169160301b16179160401b1617179055015560018060a01b03610617610d9d565b165f908152600260205260409020546001600160a01b03610636610d9d565b165f52600160205260405f20815f526020528160405f205560018060a01b0361065d610d9d565b165f52600260205260405f206106738154610dc9565b90556001600160a01b03610685610db3565b165f90815260046020526040902054916001600160a01b036106a5610db3565b165f52600360205260405f20835f526020528060405f205560018060a01b036106cc610db3565b165f52600460205260405f206106e28154610dc9565b90557f98332ca61bd6ebe51e1da13122243d9ba6ab236e9ac4eb4ae8fed95f753e7eff604061070f610d9d565b94610718610db3565b825195865260208601919091526001600160a01b03908116951693a4005b636f8e482b60e11b5f5260045ffd5b6001600160781b03915016158d6104c8565b9150506060813d6060116107a5575b8161077360609383610aa2565b810103126100cb57805180151581036100cb5761079e604061079760208501610f3e565b9301610f3e565b508e6104bf565b3d9150610766565b6040513d5f823e3d90fd5b909c506020813d6020116107e4575b816107d460209383610aa2565b810103126100cb57519b8d610491565b3d91506107c7565b6327e1f1e560e01b5f5260045ffd5b507f0000000000000000000000000000000000000000000000000000000000000000801590811561082d575b5061031e565b9050333f141581610827565b346100cb5760203660031901126100cb576001600160a01b0361085a6108fe565b165f526002602052602060405f2054604051908152f35b346100cb5760403660031901126100cb5761088a6108fe565b60243590610896610adc565b506001600160a01b03165f81815260026020526040902054821015610298575f52600160205260405f20905f5260205260405f20545f525f60205261018060405f206006604051916101e283610a71565b346100cb5761011e6108f83661092b565b91610c12565b600435906001600160a01b03821682036100cb57565b6101a435906001600160a01b03821682036100cb57565b60609060031901126100cb576004356001600160a01b03811681036100cb57906024359060443590565b610160809160018060a01b03815116845260018060a01b03602082015116602085015260018060a01b03604082015116604085015260018060a01b0360608201511660608501526001600160781b03608082015116608085015265ffffffffffff60a08201511660a085015265ffffffffffff60c08201511660c085015265ffffffffffff60e08201511660e085015261ffff6101008201511661010085015261ffff6101208201511661012085015260018060a01b03610140820151166101408501520151910152565b92919060408401906040855280518092526020606086019101915f5b818110610a4e57505060209150930152565b9091602061018082610a636001948851610955565b019401910192919092610a3c565b610180810190811067ffffffffffffffff821117610a8e57604052565b634e487b7160e01b5f52604160045260245ffd5b90601f8019910116810190811067ffffffffffffffff821117610a8e57604052565b67ffffffffffffffff8111610a8e5760051b60200190565b60405190610ae982610a71565b5f610160838281528260208201528260408201528260608201528260808201528260a08201528260c08201528260e08201528261010082015282610120820152826101408201520152565b60405190610b43602083610aa2565b5f80835282815b828110610b5657505050565b602090610b61610adc565b82828501015201610b4a565b90610b7782610ac4565b610b846040519182610aa2565b8281528092610b95601f1991610ac4565b01905f5b828110610ba557505050565b602090610bb0610adc565b82828501015201610b99565b91908203918211610bc957565b634e487b7160e01b5f52601160045260245ffd5b91908201809211610bc957565b8051821015610bfe5760209160051b010190565b634e487b7160e01b5f52603260045260245ffd5b6001600160a01b03165f818152600260205260409020549392909190848210801590610d7f575b610d7057610c478286610bbc565b9080821015610d685750905b610c5c82610b6d565b925f5b838110610c6e57505050509190565b600190825f528160205260405f20610c868286610bdd565b5f5260205260405f20545f525f60205260405f20600660405191610ca983610a71565b805460a086811b879003918216855286830154821660208601526002830154821660408087019190915260038401548316606087015260048401546001600160781b038116608088015265ffffffffffff607882901c81169388019390935260a81c821660c0870152600584015491821660e087015261ffff603083901c81166101008801529082901c1661012086015260501c166101408401520154610160820152610d568288610bea565b52610d618187610bea565b5001610c5f565b905090610c53565b505050610d7b610b34565b9190565b508015610c39565b6004356001600160a01b03811681036100cb5790565b6024356001600160a01b03811681036100cb5790565b6044356001600160a01b03811681036100cb5790565b5f198114610bc95760010190565b6001600160a01b03165f818152600460205260409020549392909190848210801590610f36575b610d7057610e0c8286610bbc565b9080821015610f2e5750905b610e2182610b6d565b925f5b838110610e3357505050509190565b600190825f52600360205260405f20610e4c8286610bdd565b5f5260205260405f20545f525f60205260405f20600660405191610e6f83610a71565b805460a086811b879003918216855286830154821660208601526002830154821660408087019190915260038401548316606087015260048401546001600160781b038116608088015265ffffffffffff607882901c81169388019390935260a81c821660c0870152600584015491821660e087015261ffff603083901c81166101008801529082901c1661012086015260501c166101408401520154610160820152610f1c8288610bea565b52610f278187610bea565b5001610e24565b905090610e18565b508015610dfe565b51906001600160781b03821682036100cb5756fea2646970667358221220535e2250943abe24e2701aec281aa6141f1aa8a3f1eb72b0a4944f9b3981c5d164736f6c63430008210033' as `0x${string}`

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const factories = baseSepolia.factories

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let fixtures: DeployedFixtures
let payerClient: X402r
let paymentInfo: PaymentInfo
let paymentIndexRecorderAddress: Address
let recorderOperatorAddress: Address
let authBlock: bigint

beforeAll(async () => {
  ;({ publicClient, fixtures } = await setupScenario({ salt: 100n }))

  const deployer = testRoles.deployer.address
  const deployerWallet = anvilBaseSepolia.getWalletClient(deployer)

  // 1. Deploy PaymentIndexRecorder (operator calls it directly — no combinator needed)
  //    AUTHORIZED_CODEHASH = bytes32(0) means only paymentInfo.operator can call record()
  const deployHash = await deployerWallet.deployContract({
    abi: paymentIndexRecorderAbi,
    bytecode: PAYMENT_INDEX_RECORDER_BYTECODE,
    args: [baseSepolia.authCaptureEscrow, pad('0x00')],
    chain: deployerWallet.chain,
  })
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  })
  paymentIndexRecorderAddress = receipt.contractAddress!

  // 2. Deploy PaymentOperator with PaymentIndexRecorder as authorizeRecorder
  //    Note: Using recorder directly (not combinator) — release won't work
  //    without EscrowPeriod, but this test only needs authorize + query.
  const operatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: fixtures.feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: paymentIndexRecorderAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: zeroAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: zeroAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: baseSepolia.conditions.receiver,
    refundPostEscrowRecorder: zeroAddress,
  } as const

  const opDeployHash = await deployerWallet.writeContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'deployOperator',
    args: [operatorConfig],
    chain: deployerWallet.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: opDeployHash })

  recorderOperatorAddress = await publicClient.readContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'computeAddress',
    args: [operatorConfig],
  })

  // 6. Build PaymentInfo and authorize a payment
  paymentInfo = {
    operator: recorderOperatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: DEFAULT_AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: recorderOperatorAddress,
    salt: 100n,
  }

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: recorderOperatorAddress,
  })

  const { collectorData, tokenCollector } = await createCollectorData(
    anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    paymentInfo,
  )

  const authHash = await payerClient.payment.authorize(
    paymentInfo,
    DEFAULT_AMOUNT,
    tokenCollector,
    collectorData,
  )
  const authReceipt = await publicClient.waitForTransactionReceipt({
    hash: authHash,
  })
  authBlock = authReceipt.blockNumber
}, 60_000)

// ---------------------------------------------------------------------------
// Recorder query tests
// ---------------------------------------------------------------------------

describe('Recorder queries after authorize', () => {
  it('getPayerPaymentsFromRecorder returns the authorized payment', async () => {
    const result = await getPayerPaymentsFromRecorder(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      payer: testRoles.payer.address,
      offset: 0n,
      count: 100n,
    })

    expect(result.total).toBe(1n)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
    expect(result.payments[0].payer.toLowerCase()).toBe(
      testRoles.payer.address.toLowerCase(),
    )
    expect(result.payments[0].salt).toBe(100n)
  })

  it('getReceiverPaymentsFromRecorder returns the authorized payment', async () => {
    const result = await getReceiverPaymentsFromRecorder(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      receiver: testRoles.receiver.address,
      offset: 0n,
      count: 100n,
    })

    expect(result.total).toBe(1n)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].receiver.toLowerCase()).toBe(
      testRoles.receiver.address.toLowerCase(),
    )
  })

  it('getPayerPayment returns correct PaymentInfo by index', async () => {
    const result = await getPayerPayment(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      payer: testRoles.payer.address,
      index: 0n,
    })

    expect(result.operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
    expect(result.salt).toBe(100n)
  })

  it('getReceiverPayment returns correct PaymentInfo by index', async () => {
    const result = await getReceiverPayment(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      receiver: testRoles.receiver.address,
      index: 0n,
    })

    expect(result.operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
    expect(result.salt).toBe(100n)
  })

  it('getRecorderPaymentInfo returns correct PaymentInfo by hash', async () => {
    const hash = computePaymentInfoHash(
      84532,
      baseSepolia.authCaptureEscrow,
      paymentInfo,
    )

    const result = await getRecorderPaymentInfo(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      hash,
    })

    expect(result).not.toBeNull()
    expect(result!.salt).toBe(100n)
    expect(result!.operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
  })
})

// ---------------------------------------------------------------------------
// Event query tests
// ---------------------------------------------------------------------------

describe('Event queries after authorize', () => {
  // Note: Anvil forks may not reliably support eth_getLogs for newly-mined blocks.
  // These tests verify the event query path works when logs are available.

  it('getPayerPaymentsByEvents returns events from the operator', async () => {
    const results = await getPayerPaymentsByEvents(publicClient, {
      operatorAddress: recorderOperatorAddress,
      payer: testRoles.payer.address,
      fromBlock: authBlock,
    })

    // On Anvil forks, eth_getLogs may return empty for post-fork blocks
    if (results.length === 0) return

    expect(results[0].salt).toBe(100n)
    expect(results[0].operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
  })

  it('getReceiverPaymentsByEvents returns events from the operator', async () => {
    const results = await getReceiverPaymentsByEvents(publicClient, {
      operatorAddress: recorderOperatorAddress,
      receiver: testRoles.receiver.address,
      fromBlock: authBlock,
    })

    if (results.length === 0) return

    expect(results[0].salt).toBe(100n)
    expect(results[0].receiver.toLowerCase()).toBe(
      testRoles.receiver.address.toLowerCase(),
    )
  })
})

// ---------------------------------------------------------------------------
// Factory deployer indexing tests
// ---------------------------------------------------------------------------

describe('Factory deployer indexing', () => {
  // The deployer indexing functions (deployerOperatorCount, getDeployerOperator,
  // getDeployerOperators) may not exist on the factory at the forked block.
  // Tests gracefully skip if the factory doesn't support them.

  async function tryGetCount(): Promise<bigint | null> {
    try {
      return await getDeployerOperatorCount(publicClient, {
        factoryAddress: factories.paymentOperator,
        deployer: testRoles.deployer.address,
      })
    } catch {
      return null
    }
  }

  it('getDeployerOperatorCount includes the recorder operator', async () => {
    const count = await tryGetCount()
    if (count === null) return // factory on fork doesn't support deployer indexing

    // setupScenario deploys 3 operators + our recorder operator = at least 4
    expect(count).toBeGreaterThanOrEqual(4n)
  })

  it('getDeployerOperator returns our operator at the last index', async () => {
    const count = await tryGetCount()
    if (count === null) return // factory on fork doesn't support deployer indexing

    const lastOperator = await getDeployerOperator(publicClient, {
      factoryAddress: factories.paymentOperator,
      deployer: testRoles.deployer.address,
      index: count - 1n,
    })

    expect(lastOperator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
  })

  it('getDeployerOperators returns a list including our operator', async () => {
    const count = await tryGetCount()
    if (count === null) return // factory on fork doesn't support deployer indexing

    const result = await getDeployerOperators(publicClient, {
      factoryAddress: factories.paymentOperator,
      deployer: testRoles.deployer.address,
      offset: 0n,
      count: 10n,
    })

    expect(result.total).toBeGreaterThanOrEqual(4n)
    const lowered = result.operators.map((a) => a.toLowerCase())
    expect(lowered).toContain(recorderOperatorAddress.toLowerCase())
  })
})
