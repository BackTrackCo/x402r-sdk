// Inline ABI — escrow is from x402 base protocol, not in generated.ts
export const escrowStateAbi = [
  {
    type: 'function',
    name: 'paymentState',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [
      { name: 'hasCollectedPayment', type: 'bool' },
      { name: 'capturableAmount', type: 'uint120' },
      { name: 'refundableAmount', type: 'uint120' },
    ],
    stateMutability: 'view',
  },
] as const
