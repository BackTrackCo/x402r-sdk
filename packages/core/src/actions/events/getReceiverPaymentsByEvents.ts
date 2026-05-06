import type { Address, PublicClient } from 'viem'
import { getAbiItem } from 'viem'
import { paymentOperatorAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'

export interface GetReceiverPaymentsByEventsParameters {
  operatorAddress: Address
  receiver: Address
  fromBlock: bigint
  toBlock?: bigint | 'latest'
}

export async function getReceiverPaymentsByEvents(
  publicClient: PublicClient,
  parameters: GetReceiverPaymentsByEventsParameters,
): Promise<PaymentInfo[]> {
  const {
    operatorAddress,
    receiver,
    fromBlock,
    toBlock = 'latest',
  } = parameters

  const logs = await publicClient.getLogs({
    address: operatorAddress,
    event: getAbiItem({
      abi: paymentOperatorAbi,
      name: 'AuthorizeExecuted',
    }),
    args: { receiver },
    fromBlock,
    toBlock,
  })

  return logs.map((log) => {
    const args = log.args as { paymentInfo: PaymentInfo }
    return args.paymentInfo
  })
}
