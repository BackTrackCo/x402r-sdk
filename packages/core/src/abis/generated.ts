//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AlwaysTrueCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const alwaysTrueConditionAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: '',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AndCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const andConditionAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_CONDITIONS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'conditionCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'conditions',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'NoConditions' },
  { type: 'error', inputs: [], name: 'TooManyConditions' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AndConditionFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const andConditionFactoryAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'MAX_CONDITIONS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'computeAddress',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'conditions',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'deploy',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'getDeployed',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'condition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
        indexed: false,
      },
    ],
    name: 'AndConditionDeployed',
  },
  { type: 'error', inputs: [], name: 'NoConditions' },
  { type: 'error', inputs: [], name: 'TooManyConditions' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ArbiterRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const arbiterRegistryAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'arbiterCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'deregister',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getArbiters',
    outputs: [
      { name: 'arbiters', internalType: 'address[]', type: 'address[]' },
      { name: 'uris', internalType: 'string[]', type: 'string[]' },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'arbiter', internalType: 'address', type: 'address' }],
    name: 'getUri',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'arbiter', internalType: 'address', type: 'address' }],
    name: 'isRegistered',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'uri', internalType: 'string', type: 'string' }],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newUri', internalType: 'string', type: 'string' }],
    name: 'updateUri',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'arbiter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ArbiterDeregistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'arbiter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'uri', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'ArbiterRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'arbiter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'oldUri',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'newUri',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'ArbiterUriUpdated',
  },
  { type: 'error', inputs: [], name: 'AlreadyRegistered' },
  { type: 'error', inputs: [], name: 'EmptyUri' },
  { type: 'error', inputs: [], name: 'NotRegistered' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AuthorizationTimeRecorder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const authorizationTimeRecorderAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'escrow', internalType: 'address', type: 'address' },
      { name: 'authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUTHORIZED_CODEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'authorizationTimes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'getAuthorizationTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'record',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'authorizationTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AuthorizationRecorded',
  },
  { type: 'error', inputs: [], name: 'OnlyOperator' },
  { type: 'error', inputs: [], name: 'PaymentDoesNotExist' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DisputeEvidence
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const disputeEvidenceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'refundRequest', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_REQUEST',
    outputs: [
      {
        name: '',
        internalType: 'contract SignatureRefundRequest',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getEvidence',
    outputs: [
      {
        name: '',
        internalType: 'struct DisputeEvidence.Evidence',
        type: 'tuple',
        components: [
          { name: 'submitter', internalType: 'address', type: 'address' },
          { name: 'role', internalType: 'enum SubmitterRole', type: 'uint8' },
          { name: 'timestamp', internalType: 'uint48', type: 'uint48' },
          { name: 'cid', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getEvidenceBatch',
    outputs: [
      {
        name: 'entries',
        internalType: 'struct DisputeEvidence.Evidence[]',
        type: 'tuple[]',
        components: [
          { name: 'submitter', internalType: 'address', type: 'address' },
          { name: 'role', internalType: 'enum SubmitterRole', type: 'uint8' },
          { name: 'timestamp', internalType: 'uint48', type: 'uint48' },
          { name: 'cid', internalType: 'string', type: 'string' },
        ],
      },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getEvidenceCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'cid', internalType: 'string', type: 'string' },
    ],
    name: 'submitEvidence',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'submitter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'role',
        internalType: 'enum SubmitterRole',
        type: 'uint8',
        indexed: false,
      },
      { name: 'cid', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EvidenceSubmitted',
  },
  { type: 'error', inputs: [], name: 'EmptyCid' },
  { type: 'error', inputs: [], name: 'IndexOutOfBounds' },
  { type: 'error', inputs: [], name: 'InvalidOperator' },
  { type: 'error', inputs: [], name: 'NotPayerReceiverOrArbiter' },
  { type: 'error', inputs: [], name: 'RefundRequestRequired' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EscrowPeriod
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const escrowPeriodAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_escrowPeriod', internalType: 'uint256', type: 'uint256' },
      { name: '_escrow', internalType: 'address', type: 'address' },
      { name: '_authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUTHORIZED_CODEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'authorizationTimes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'getAuthorizationTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'isDuringEscrowPeriod',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'record',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'authorizationTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AuthorizationRecorded',
  },
  { type: 'error', inputs: [], name: 'InvalidEscrowPeriod' },
  { type: 'error', inputs: [], name: 'OnlyOperator' },
  { type: 'error', inputs: [], name: 'PaymentDoesNotExist' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EscrowPeriodFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const escrowPeriodFactoryAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'escrow', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'computeAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'deploy',
    outputs: [
      { name: 'escrowPeriodAddr', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'deployments',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'getDeployed',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowPeriod',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'escrowPeriodDuration',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EscrowPeriodDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Freeze
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const freezeAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_freezeCondition', internalType: 'address', type: 'address' },
      { name: '_unfreezeCondition', internalType: 'address', type: 'address' },
      { name: '_freezeDuration', internalType: 'uint256', type: 'uint256' },
      {
        name: '_escrowPeriodContract',
        internalType: 'address',
        type: 'address',
      },
      { name: '_escrow', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW_PERIOD_CONTRACT',
    outputs: [
      { name: '', internalType: 'contract EscrowPeriod', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FREEZE_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FREEZE_DURATION',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UNFREEZE_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'freeze',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'frozenUntil',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'isFrozen',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'unfreeze',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'PaymentFrozen',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'PaymentUnfrozen',
  },
  { type: 'error', inputs: [], name: 'AlreadyFrozen' },
  { type: 'error', inputs: [], name: 'FreezeWindowExpired' },
  { type: 'error', inputs: [], name: 'NotFrozen' },
  { type: 'error', inputs: [], name: 'UnauthorizedFreeze' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FreezeFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const freezeFactoryAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'escrow', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'freezeCondition', internalType: 'address', type: 'address' },
      { name: 'unfreezeCondition', internalType: 'address', type: 'address' },
      { name: 'freezeDuration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'escrowPeriodContract',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'computeAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'freezeCondition', internalType: 'address', type: 'address' },
      { name: 'unfreezeCondition', internalType: 'address', type: 'address' },
      { name: 'freezeDuration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'escrowPeriodContract',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'deploy',
    outputs: [{ name: 'freezeAddr', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'deployments',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'freezeCondition', internalType: 'address', type: 'address' },
      { name: 'unfreezeCondition', internalType: 'address', type: 'address' },
      { name: 'freezeDuration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'escrowPeriodContract',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'getDeployed',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'freezeCondition', internalType: 'address', type: 'address' },
      { name: 'unfreezeCondition', internalType: 'address', type: 'address' },
      { name: 'freezeDuration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'escrowPeriodContract',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'freeze',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'freezeCondition',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'unfreezeCondition',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'freezeDuration',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'escrowPeriodContract',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'FreezeDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ICondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iConditionAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IFeeCalculator
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iFeeCalculatorAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'calculateFee',
    outputs: [{ name: 'feeBps', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IRecorder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iRecorderAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'record',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NotCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const notConditionAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_condition',
        internalType: 'contract ICondition',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'ZeroCondition' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NotConditionFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const notConditionFactoryAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: '_condition',
        internalType: 'contract ICondition',
        type: 'address',
      },
    ],
    name: 'computeAddress',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'conditions',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_condition',
        internalType: 'contract ICondition',
        type: 'address',
      },
    ],
    name: 'deploy',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_condition',
        internalType: 'contract ICondition',
        type: 'address',
      },
    ],
    name: 'getDeployed',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_condition',
        internalType: 'contract ICondition',
        type: 'address',
      },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'condition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'wrappedCondition',
        internalType: 'contract ICondition',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'NotConditionDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroCondition' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OrCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const orConditionAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_CONDITIONS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'conditionCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'conditions',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'NoConditions' },
  { type: 'error', inputs: [], name: 'TooManyConditions' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OrConditionFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const orConditionFactoryAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'MAX_CONDITIONS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'computeAddress',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'conditions',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'deploy',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'getDeployed',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
      },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'condition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'conditions',
        internalType: 'contract ICondition[]',
        type: 'address[]',
        indexed: false,
      },
    ],
    name: 'OrConditionDeployed',
  },
  { type: 'error', inputs: [], name: 'NoConditions' },
  { type: 'error', inputs: [], name: 'TooManyConditions' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PayerCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const payerConditionAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PaymentIndexRecorder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const paymentIndexRecorderAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'escrow', internalType: 'address', type: 'address' },
      { name: 'authorizedCodehash', internalType: 'bytes32', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUTHORIZED_CODEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'payer', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getPayerPayment',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'payer', internalType: 'address', type: 'address' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getPayerPayments',
    outputs: [
      { name: 'hashes', internalType: 'bytes32[]', type: 'bytes32[]' },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'receiver', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getReceiverPayment',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'receiver', internalType: 'address', type: 'address' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getReceiverPayments',
    outputs: [
      { name: 'hashes', internalType: 'bytes32[]', type: 'bytes32[]' },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'payerPaymentCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'receiverPaymentCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'record',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiver',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'payerIndex',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'receiverIndex',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PaymentIndexed',
  },
  { type: 'error', inputs: [], name: 'IndexOutOfBounds' },
  { type: 'error', inputs: [], name: 'OnlyOperator' },
  { type: 'error', inputs: [], name: 'PaymentDoesNotExist' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PaymentOperator
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const paymentOperatorAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_escrow', internalType: 'address', type: 'address' },
      { name: '_protocolFeeConfig', internalType: 'address', type: 'address' },
      { name: '_feeRecipient', internalType: 'address', type: 'address' },
      { name: '_feeCalculator', internalType: 'address', type: 'address' },
      {
        name: '_conditions',
        internalType: 'struct PaymentOperator.ConditionConfig',
        type: 'tuple',
        components: [
          {
            name: 'authorizeCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'authorizeRecorder',
            internalType: 'address',
            type: 'address',
          },
          { name: 'chargeCondition', internalType: 'address', type: 'address' },
          { name: 'chargeRecorder', internalType: 'address', type: 'address' },
          {
            name: 'releaseCondition',
            internalType: 'address',
            type: 'address',
          },
          { name: 'releaseRecorder', internalType: 'address', type: 'address' },
          {
            name: 'refundInEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundInEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUTHORIZE_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUTHORIZE_RECORDER',
    outputs: [
      { name: '', internalType: 'contract IRecorder', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CHARGE_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CHARGE_RECORDER',
    outputs: [
      { name: '', internalType: 'contract IRecorder', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEE_CALCULATOR',
    outputs: [
      { name: '', internalType: 'contract IFeeCalculator', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEE_RECIPIENT',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROTOCOL_FEE_CONFIG',
    outputs: [
      { name: '', internalType: 'contract ProtocolFeeConfig', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_IN_ESCROW_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_IN_ESCROW_RECORDER',
    outputs: [
      { name: '', internalType: 'contract IRecorder', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_POST_ESCROW_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_POST_ESCROW_RECORDER',
    outputs: [
      { name: '', internalType: 'contract IRecorder', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RELEASE_CONDITION',
    outputs: [
      { name: '', internalType: 'contract ICondition', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RELEASE_RECORDER',
    outputs: [
      { name: '', internalType: 'contract IRecorder', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'accumulatedProtocolFees',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCollector', internalType: 'address', type: 'address' },
      { name: 'collectorData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'authorize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'authorizedFees',
    outputs: [
      { name: 'totalFeeBps', internalType: 'uint16', type: 'uint16' },
      { name: 'protocolFeeBps', internalType: 'uint16', type: 'uint16' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCollector', internalType: 'address', type: 'address' },
      { name: 'collectorData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'charge',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'distributeFees',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint120', type: 'uint120' },
    ],
    name: 'refundInEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCollector', internalType: 'address', type: 'address' },
      { name: 'collectorData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'refundPostEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'release',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfoHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiver',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AuthorizationCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfoHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiver',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ChargeExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'protocolAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'arbiterAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'FeesDistributed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RefundInEscrowExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RefundPostEscrowExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ReleaseExecuted',
  },
  { type: 'error', inputs: [], name: 'ConditionNotMet' },
  {
    type: 'error',
    inputs: [
      { name: 'calculatedFeeBps', internalType: 'uint16', type: 'uint16' },
      { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
      { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
    ],
    name: 'FeeBoundsIncompatible',
  },
  { type: 'error', inputs: [], name: 'FeeTooHigh' },
  { type: 'error', inputs: [], name: 'InvalidFeeReceiver' },
  { type: 'error', inputs: [], name: 'Reentrancy' },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
  { type: 'error', inputs: [], name: 'ZeroEscrow' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PaymentOperatorFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const paymentOperatorFactoryAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_escrow', internalType: 'address', type: 'address' },
      { name: '_protocolFeeConfig', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROTOCOL_FEE_CONFIG',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct PaymentOperatorFactory.OperatorConfig',
        type: 'tuple',
        components: [
          { name: 'feeRecipient', internalType: 'address', type: 'address' },
          { name: 'feeCalculator', internalType: 'address', type: 'address' },
          {
            name: 'authorizeCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'authorizeRecorder',
            internalType: 'address',
            type: 'address',
          },
          { name: 'chargeCondition', internalType: 'address', type: 'address' },
          { name: 'chargeRecorder', internalType: 'address', type: 'address' },
          {
            name: 'releaseCondition',
            internalType: 'address',
            type: 'address',
          },
          { name: 'releaseRecorder', internalType: 'address', type: 'address' },
          {
            name: 'refundInEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundInEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
        ],
      },
    ],
    name: 'computeAddress',
    outputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct PaymentOperatorFactory.OperatorConfig',
        type: 'tuple',
        components: [
          { name: 'feeRecipient', internalType: 'address', type: 'address' },
          { name: 'feeCalculator', internalType: 'address', type: 'address' },
          {
            name: 'authorizeCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'authorizeRecorder',
            internalType: 'address',
            type: 'address',
          },
          { name: 'chargeCondition', internalType: 'address', type: 'address' },
          { name: 'chargeRecorder', internalType: 'address', type: 'address' },
          {
            name: 'releaseCondition',
            internalType: 'address',
            type: 'address',
          },
          { name: 'releaseRecorder', internalType: 'address', type: 'address' },
          {
            name: 'refundInEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundInEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
        ],
      },
    ],
    name: 'deployOperator',
    outputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config',
        internalType: 'struct PaymentOperatorFactory.OperatorConfig',
        type: 'tuple',
        components: [
          { name: 'feeRecipient', internalType: 'address', type: 'address' },
          { name: 'feeCalculator', internalType: 'address', type: 'address' },
          {
            name: 'authorizeCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'authorizeRecorder',
            internalType: 'address',
            type: 'address',
          },
          { name: 'chargeCondition', internalType: 'address', type: 'address' },
          { name: 'chargeRecorder', internalType: 'address', type: 'address' },
          {
            name: 'releaseCondition',
            internalType: 'address',
            type: 'address',
          },
          { name: 'releaseRecorder', internalType: 'address', type: 'address' },
          {
            name: 'refundInEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundInEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowCondition',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'refundPostEscrowRecorder',
            internalType: 'address',
            type: 'address',
          },
        ],
      },
    ],
    name: 'getOperator',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'operators',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'feeRecipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'releaseCondition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OperatorDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ProtocolFeeConfig
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const protocolFeeConfigAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_calculator', internalType: 'address', type: 'address' },
      {
        name: '_protocolFeeRecipient',
        internalType: 'address',
        type: 'address',
      },
      { name: '_owner', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_PROTOCOL_FEE_BPS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TIMELOCK_DELAY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'calculator',
    outputs: [
      { name: '', internalType: 'contract IFeeCalculator', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'cancelCalculator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'cancelOwnershipHandover',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'cancelRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'pendingOwner', internalType: 'address', type: 'address' },
    ],
    name: 'completeOwnershipHandover',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'executeCalculator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'executeRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'getProtocolFeeBps',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getProtocolFeeRecipient',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: 'result', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'pendingOwner', internalType: 'address', type: 'address' },
    ],
    name: 'ownershipHandoverExpiresAt',
    outputs: [{ name: 'result', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pendingCalculator',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pendingCalculatorTimestamp',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pendingRecipient',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pendingRecipientTimestamp',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'protocolFeeRecipient',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_calculator', internalType: 'address', type: 'address' }],
    name: 'queueCalculator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_protocolFeeRecipient',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'queueRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'requestOwnershipHandover',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [],
    name: 'CalculatorChangeCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newCalculator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'CalculatorChangeExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newCalculator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'executeAfter',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CalculatorChangeQueued',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'pendingOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipHandoverCanceled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'pendingOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipHandoverRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [],
    name: 'RecipientChangeCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newRecipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RecipientChangeExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newRecipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'executeAfter',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RecipientChangeQueued',
  },
  { type: 'error', inputs: [], name: 'AlreadyInitialized' },
  { type: 'error', inputs: [], name: 'CalculatorTimelockNotElapsed' },
  { type: 'error', inputs: [], name: 'NewOwnerIsZeroAddress' },
  { type: 'error', inputs: [], name: 'NoHandoverRequest' },
  { type: 'error', inputs: [], name: 'NoPendingCalculatorChange' },
  { type: 'error', inputs: [], name: 'NoPendingRecipientChange' },
  { type: 'error', inputs: [], name: 'RecipientTimelockNotElapsed' },
  { type: 'error', inputs: [], name: 'Unauthorized' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ReceiverCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const receiverConditionAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ReceiverRefundCollector
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const receiverRefundCollectorAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'authCaptureEscrow_', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'authCaptureEscrow',
    outputs: [
      { name: '', internalType: 'contract AuthCaptureEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'tokenStore', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'collectorData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'collectTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'collectorType',
    outputs: [
      {
        name: '',
        internalType: 'enum TokenCollector.CollectorType',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'OnlyAuthCaptureEscrow' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RecorderCombinator
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const recorderCombinatorAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_recorders',
        internalType: 'contract IRecorder[]',
        type: 'address[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_RECORDERS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRecorderCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRecorders',
    outputs: [
      { name: '', internalType: 'contract IRecorder[]', type: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'record',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'recorders',
    outputs: [
      { name: '', internalType: 'contract IRecorder', type: 'address' },
    ],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'EmptyRecorders' },
  { type: 'error', inputs: [], name: 'OnlyOperator' },
  {
    type: 'error',
    inputs: [
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      { name: 'max', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'TooManyRecorders',
  },
  {
    type: 'error',
    inputs: [{ name: 'index', internalType: 'uint256', type: 'uint256' }],
    name: 'ZeroRecorder',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RecorderCombinatorFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const recorderCombinatorFactoryAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'MAX_RECORDERS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'combinators',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_recorders',
        internalType: 'contract IRecorder[]',
        type: 'address[]',
      },
    ],
    name: 'computeAddress',
    outputs: [{ name: 'combinator', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_recorders',
        internalType: 'contract IRecorder[]',
        type: 'address[]',
      },
    ],
    name: 'deploy',
    outputs: [{ name: 'combinator', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_recorders',
        internalType: 'contract IRecorder[]',
        type: 'address[]',
      },
    ],
    name: 'getDeployed',
    outputs: [{ name: 'combinator', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_recorders',
        internalType: 'contract IRecorder[]',
        type: 'address[]',
      },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'combinator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'recorders',
        internalType: 'contract IRecorder[]',
        type: 'address[]',
        indexed: false,
      },
    ],
    name: 'RecorderCombinatorDeployed',
  },
  { type: 'error', inputs: [], name: 'EmptyRecorders' },
  { type: 'error', inputs: [], name: 'TooManyRecorders' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RefundRequestEvidence
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const refundRequestEvidenceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'refundRequest', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REFUND_REQUEST',
    outputs: [
      {
        name: '',
        internalType: 'contract SignatureRefundRequest',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getEvidence',
    outputs: [
      {
        name: '',
        internalType: 'struct RefundRequestEvidence.Evidence',
        type: 'tuple',
        components: [
          { name: 'submitter', internalType: 'address', type: 'address' },
          { name: 'role', internalType: 'enum SubmitterRole', type: 'uint8' },
          { name: 'timestamp', internalType: 'uint48', type: 'uint48' },
          { name: 'cid', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getEvidenceBatch',
    outputs: [
      {
        name: 'entries',
        internalType: 'struct RefundRequestEvidence.Evidence[]',
        type: 'tuple[]',
        components: [
          { name: 'submitter', internalType: 'address', type: 'address' },
          { name: 'role', internalType: 'enum SubmitterRole', type: 'uint8' },
          { name: 'timestamp', internalType: 'uint48', type: 'uint48' },
          { name: 'cid', internalType: 'string', type: 'string' },
        ],
      },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getEvidenceCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'cid', internalType: 'string', type: 'string' },
    ],
    name: 'submitEvidence',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'submitter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'role',
        internalType: 'enum SubmitterRole',
        type: 'uint8',
        indexed: false,
      },
      { name: 'cid', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'index',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EvidenceSubmitted',
  },
  { type: 'error', inputs: [], name: 'EmptyCid' },
  { type: 'error', inputs: [], name: 'IndexOutOfBounds' },
  { type: 'error', inputs: [], name: 'InvalidOperator' },
  { type: 'error', inputs: [], name: 'NotPayerReceiverOrArbiter' },
  { type: 'error', inputs: [], name: 'RefundRequestRequired' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SignatureCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const signatureConditionAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_signer', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'APPROVAL_TYPEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SIGNER',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'approvalNonces',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'approvals',
    outputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint48', type: 'uint48' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint48', type: 'uint48' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'submitApproval',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfoHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'expiry',
        internalType: 'uint48',
        type: 'uint48',
        indexed: false,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ApprovalSubmitted',
  },
  { type: 'error', inputs: [], name: 'InvalidNonce' },
  { type: 'error', inputs: [], name: 'InvalidSignature' },
  { type: 'error', inputs: [], name: 'ZeroSigner' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SignatureConditionFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const signatureConditionFactoryAbi = [
  {
    type: 'function',
    inputs: [{ name: 'signer', internalType: 'address', type: 'address' }],
    name: 'computeAddress',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'conditions',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'signer', internalType: 'address', type: 'address' }],
    name: 'deploy',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'signer', internalType: 'address', type: 'address' }],
    name: 'getDeployed',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'signer', internalType: 'address', type: 'address' }],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'condition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'signer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SignatureConditionDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroSigner' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SignatureRefundRequest
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const signatureRefundRequestAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_signatureCondition', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SIGNATURE_CONDITION',
    outputs: [
      {
        name: '',
        internalType: 'contract SignatureCondition',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint48', type: 'uint48' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'approveWithSignature',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'cancelCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'cancelRefundRequest',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deny',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getCancelCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'cancelIndex', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getCancelledAmount',
    outputs: [{ name: '', internalType: 'uint120', type: 'uint120' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'op', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getOperatorRefundRequest',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'op', internalType: 'address', type: 'address' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getOperatorRefundRequests',
    outputs: [
      { name: 'keys', internalType: 'bytes32[]', type: 'bytes32[]' },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'payer', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getPayerRefundRequest',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'payer', internalType: 'address', type: 'address' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getPayerRefundRequests',
    outputs: [
      { name: 'keys', internalType: 'bytes32[]', type: 'bytes32[]' },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'getPaymentInfo',
    outputs: [
      {
        name: '',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'receiver', internalType: 'address', type: 'address' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getReceiverRefundRequest',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'receiver', internalType: 'address', type: 'address' },
      { name: 'offset', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getReceiverRefundRequests',
    outputs: [
      { name: 'keys', internalType: 'bytes32[]', type: 'bytes32[]' },
      { name: 'total', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getRefundRequest',
    outputs: [
      {
        name: '',
        internalType: 'struct SignatureRefundRequest.RefundRequestData',
        type: 'tuple',
        components: [
          { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'amount', internalType: 'uint120', type: 'uint120' },
          { name: 'status', internalType: 'enum RequestStatus', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'compositeKey', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'getRefundRequestByKey',
    outputs: [
      {
        name: '',
        internalType: 'struct SignatureRefundRequest.RefundRequestData',
        type: 'tuple',
        components: [
          { name: 'paymentInfoHash', internalType: 'bytes32', type: 'bytes32' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'amount', internalType: 'uint120', type: 'uint120' },
          { name: 'status', internalType: 'enum RequestStatus', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getRefundRequestStatus',
    outputs: [{ name: '', internalType: 'enum RequestStatus', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'hasRefundRequest',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'operatorRefundRequestCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'payerRefundRequestCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'receiverRefundRequestCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'refuse',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint120', type: 'uint120' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'requestRefund',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RefundRequestCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'oldStatus',
        internalType: 'enum RequestStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'newStatus',
        internalType: 'enum RequestStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'updatedBy',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RefundRequestStatusUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
        indexed: false,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'receiver',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint120',
        type: 'uint120',
        indexed: false,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RefundRequested',
  },
  { type: 'error', inputs: [], name: 'IndexOutOfBounds' },
  { type: 'error', inputs: [], name: 'InvalidOperator' },
  { type: 'error', inputs: [], name: 'NotArbiter' },
  { type: 'error', inputs: [], name: 'NotPayer' },
  { type: 'error', inputs: [], name: 'Reentrancy' },
  { type: 'error', inputs: [], name: 'RequestAlreadyExists' },
  { type: 'error', inputs: [], name: 'RequestDoesNotExist' },
  { type: 'error', inputs: [], name: 'RequestNotPending' },
  { type: 'error', inputs: [], name: 'ZeroCondition' },
  { type: 'error', inputs: [], name: 'ZeroRefundAmount' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SignatureRefundRequestFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const signatureRefundRequestFactoryAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'signatureCondition', internalType: 'address', type: 'address' },
    ],
    name: 'computeAddress',
    outputs: [
      { name: 'refundRequest', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'signatureCondition', internalType: 'address', type: 'address' },
    ],
    name: 'deploy',
    outputs: [
      { name: 'refundRequest', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'signatureCondition', internalType: 'address', type: 'address' },
    ],
    name: 'getDeployed',
    outputs: [
      { name: 'refundRequest', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'signatureCondition', internalType: 'address', type: 'address' },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'refundRequests',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'refundRequest',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'signatureCondition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SignatureRefundRequestDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroCondition' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StaticAddressCondition
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const staticAddressConditionAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_designatedAddress', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DESIGNATED_ADDRESS',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'payment',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StaticAddressConditionFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const staticAddressConditionFactoryAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'designatedAddress', internalType: 'address', type: 'address' },
    ],
    name: 'computeAddress',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'conditions',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'designatedAddress', internalType: 'address', type: 'address' },
    ],
    name: 'deploy',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'designatedAddress', internalType: 'address', type: 'address' },
    ],
    name: 'getDeployed',
    outputs: [{ name: 'condition', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'designatedAddress', internalType: 'address', type: 'address' },
    ],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'condition',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'designatedAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'StaticAddressConditionDeployed',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StaticFeeCalculator
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const staticFeeCalculatorAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_feeBps', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEE_BPS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'calculateFee',
    outputs: [{ name: 'feeBps', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'FeeTooHigh' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StaticFeeCalculatorFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const staticFeeCalculatorFactoryAbi = [
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'calculators',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'feeBps', internalType: 'uint256', type: 'uint256' }],
    name: 'computeAddress',
    outputs: [{ name: 'calculator', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'feeBps', internalType: 'uint256', type: 'uint256' }],
    name: 'deploy',
    outputs: [{ name: 'calculator', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'feeBps', internalType: 'uint256', type: 'uint256' }],
    name: 'getDeployed',
    outputs: [{ name: 'calculator', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'feeBps', internalType: 'uint256', type: 'uint256' }],
    name: 'getKey',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'pure',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'calculator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'feeBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StaticFeeCalculatorDeployed',
  },
  { type: 'error', inputs: [], name: 'FeeTooHigh' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UsdcTvlLimit
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const usdcTvlLimitAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'escrow', internalType: 'address', type: 'address' },
      { name: 'usdc', internalType: 'address', type: 'address' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ESCROW',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'USDC',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        internalType: 'struct AuthCaptureEscrow.PaymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'receiver', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'maxAmount', internalType: 'uint120', type: 'uint120' },
          { name: 'preApprovalExpiry', internalType: 'uint48', type: 'uint48' },
          {
            name: 'authorizationExpiry',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'refundExpiry', internalType: 'uint48', type: 'uint48' },
          { name: 'minFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'maxFeeBps', internalType: 'uint16', type: 'uint16' },
          { name: 'feeReceiver', internalType: 'address', type: 'address' },
          { name: 'salt', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'check',
    outputs: [{ name: 'allowed', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
] as const
