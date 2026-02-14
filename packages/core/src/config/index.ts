/**
 * Network configuration for X402r SDK
 * @module config
 */

/**
 * Factory addresses for deploying protocol components
 */
export interface FactoryAddresses {
  /** PaymentOperatorFactory address */
  paymentOperator: `0x${string}`;
  /** EscrowPeriodFactory address */
  escrowPeriod: `0x${string}`;
  /** FreezeFactory address */
  freeze: `0x${string}`;
  /** StaticFeeCalculatorFactory address */
  staticFeeCalculator: `0x${string}`;
  /** StaticAddressConditionFactory address */
  staticAddressCondition: `0x${string}`;
  /** AndConditionFactory address */
  andCondition: `0x${string}`;
  /** OrConditionFactory address */
  orCondition: `0x${string}`;
  /** NotConditionFactory address */
  notCondition: `0x${string}`;
  /** RecorderCombinatorFactory address */
  recorderCombinator: `0x${string}`;
}

/**
 * Condition singleton addresses (deployed once per network)
 */
export interface ConditionSingletonAddresses {
  /** PayerCondition singleton - checks if caller is the payer */
  payer: `0x${string}`;
  /** ReceiverCondition singleton - checks if caller is the receiver */
  receiver: `0x${string}`;
  /** AlwaysTrueCondition singleton - always returns true */
  alwaysTrue: `0x${string}`;
}

/**
 * Network configuration interface containing deployed contract addresses
 */
export interface NetworkConfig {
  /** Human-readable network name */
  name: string;
  /** Numeric chain ID */
  chainId: number;
  /** AuthCaptureEscrow contract address */
  authCaptureEscrow: `0x${string}`;
  /** TokenCollector contract address */
  tokenCollector: `0x${string}`;
  /** RefundRequest contract address */
  refundRequest: `0x${string}`;
  /** ProtocolFeeConfig contract address */
  protocolFeeConfig: `0x${string}`;
  /** UsdcTvlLimit condition contract address */
  usdcTvlLimit: `0x${string}`;
  /** ArbiterRegistry contract address */
  arbiterRegistry: `0x${string}`;
  /** USDC token address */
  usdc: `0x${string}`;
  /** RefundRequestEvidence contract address (optional - may not be deployed on all networks) */
  refundRequestEvidence?: `0x${string}`;
  /** Factory addresses (optional - may not be deployed on all networks) */
  factories?: FactoryAddresses;
  /** Condition singleton addresses (optional - may not be deployed on all networks) */
  conditions?: ConditionSingletonAddresses;
}

/**
 * Network configuration by EIP-155 chain identifier
 *
 * @example
 * ```typescript
 * const baseSepolia = NETWORK_CONFIG['eip155:84532'];
 * console.log(baseSepolia.name); // 'Base Sepolia'
 * ```
 */
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  "eip155:84532": {
    name: "Base Sepolia",
    chainId: 84532,
    authCaptureEscrow: "0x29025c0E9D4239d438e169570818dB9FE0A80873",
    tokenCollector: "0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0",
    refundRequest: "0x1C2Ab244aC8bDdDB74d43389FF34B118aF2E90F4",
    protocolFeeConfig: "0x8F96C493bAC365E41f0315cf45830069EBbDCaCe",
    usdcTvlLimit: "0x5425f265811dBE7cCa8002585D19Ba1241B42793",
    arbiterRegistry: "0x762d562a5ff10EcbFD2Bc4fea663433b84226F35",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    refundRequestEvidence: "0x917317BBBBe1b9b53BD0ceD4C7b7386Dbd1727ea",
    factories: {
      paymentOperator: "0x97d53e63A9CB97556c00BeFd325AF810c9b267B2",
      escrowPeriod: "0x34A5AAF8C19e04d0193466bdF80D155EC934c980",
      freeze: "0x45B0d8ca06e0367ef99E3535d32abb0074e06bD3",
      staticFeeCalculator: "0xD9989E2F2Ac0494119bd1C0f3CABC47D26758659",
      staticAddressCondition: "0xA7C944301a4CdB3f9d6776eB742E0fe24368AF90",
      andCondition: "0x46F5aF23960F4300e7Fb1ded3742cA5509F6F596",
      orCondition: "0xd5adb393a541D1611AdfAf5400cD5AC12941D1dB",
      notCondition: "0x18BC108e8CB28a68B521e72DA1DA07d507199698",
      recorderCombinator: "0xa1C0ECD30f2780f617DF88e21664E0ce971fEbB0",
    },
    conditions: {
      payer: "0xBda4593E6133036ef9754c9AfC974C761230249D",
      receiver: "0x00DCe240b6DDD335F2327c3F6d0E1d3732f5C97b",
      alwaysTrue: "0x0A427c66C3eC3BF7c3e69238c2D4779a1Bc12c3A",
    },
  },
  "eip155:8453": {
    name: "Base Mainnet",
    chainId: 8453,
    authCaptureEscrow: "0xb9488351E48b23D798f24e8174514F28B741Eb4f",
    tokenCollector: "0x48ADf6E37F9b31dC2AAD0462C5862B5422C736B8",
    refundRequest: "0x35fb2EFEfAc3Ee9f6E52A9AAE5C9655bC08dEc00",
    protocolFeeConfig: "0x59314674BAbb1a24Eb2704468a9cCdD50668a1C6",
    usdcTvlLimit: "0xC80cd08d609673061597DE7fe54Af3978f10A825",
    arbiterRegistry: "0xB68C023365EB08021E12f7f7f11a03282443863A",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    refundRequestEvidence: "0x2176D0edfeC9e2B8d3FDbB37f09535BEe4BAFB34",
    factories: {
      paymentOperator: "0x3D0837fF8Ea36F417261577b9BA568400A840260",
      escrowPeriod: "0x12EDefd4549c53497689067f165c0f101796Eb6D",
      freeze: "0x64b5071C7e1eDA582849DF392a1EBdf78690a90C",
      staticFeeCalculator: "0x9D4146EF898c8E60B3e865AE254ef438E7cEd2A0",
      staticAddressCondition: "0x206D4DbB6E7b876e4B5EFAAD2a04e7d7813FB6ba",
      andCondition: "0x5b3e33791C1764cF7e2573Bf8116F1D361FD97Cd",
      orCondition: "0x1e52a74cE6b69F04a506eF815743E1052A1BD28F",
      notCondition: "0xFa8C4Cb156053b867Ae7489220A29b5939E3Df70",
      recorderCombinator: "0xEb0C15bE3F77193324844340899C20c44771d53C",
    },
    conditions: {
      payer: "0x7254b68D1AaAbd118C8A8b15756b4654c10a16d2",
      receiver: "0x6926c05193c714ED4bA3867Ee93d6816Fdc14128",
      alwaysTrue: "0xBAF68176FF94CAdD403EF7FbB776bbca548AC09D",
    },
  },

  // --- Ethereum Sepolia ---
  "eip155:11155111": {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x230fd3A171750FA45db2976121376b7F47Cba308",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838",
    usdcTvlLimit: "0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546",
    arbiterRegistry: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    refundRequestEvidence: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    factories: {
      paymentOperator: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      staticFeeCalculator: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      staticAddressCondition: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      receiver: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
      alwaysTrue: "0x46C44071BDf9753482400B76d88A5850318b776F",
    },
  },

  // --- Ethereum Mainnet ---
  "eip155:1": {
    name: "Ethereum Mainnet",
    chainId: 1,
    authCaptureEscrow: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    tokenCollector: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    refundRequest: "0x59314674BAbb1a24Eb2704468a9cCdD50668a1C6",
    protocolFeeConfig: "0xb33D6502EdBbC47201cd1E53C49d703EC0a660b8",
    usdcTvlLimit: "0x785cC83DEa3d46D5509f3bf7496EAb26D42EE610",
    arbiterRegistry: "0x3D0837fF8Ea36F417261577b9BA568400A840260",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    refundRequestEvidence: "0x12EDefd4549c53497689067f165c0f101796Eb6D",
    factories: {
      paymentOperator: "0x48ADf6E37F9b31dC2AAD0462C5862B5422C736B8",
      escrowPeriod: "0x6926c05193c714ED4bA3867Ee93d6816Fdc14128",
      freeze: "0xBAF68176FF94CAdD403EF7FbB776bbca548AC09D",
      staticFeeCalculator: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      staticAddressCondition: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
      andCondition: "0x19a798c7F66E6401f6004b732dA604196952e843",
      orCondition: "0x32471d31910A009273a812dE0894D9F0AdeF4834",
      notCondition: "0xe2659dc0d716B1226DF6a09A5f47862cd1ff6733",
      recorderCombinator: "0x536439b00002CB3c0141391A92aFBB3e1E3f8604",
    },
    conditions: {
      payer: "0xB68C023365EB08021E12f7f7f11a03282443863A",
      receiver: "0x67B63Af4bcdCD3E4263d9995aB04563fbC229944",
      alwaysTrue: "0x7254b68D1AaAbd118C8A8b15756b4654c10a16d2",
    },
  },

  // --- Polygon ---
  "eip155:137": {
    name: "Polygon PoS",
    chainId: 137,
    authCaptureEscrow: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
    tokenCollector: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    refundRequest: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
    protocolFeeConfig: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdcTvlLimit: "0xdc0D800007ceAcfF1299b926CE22b4D4EDce6ce7",
    arbiterRegistry: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    refundRequestEvidence: "0xe4f1840171E31DaD221C6b25FED91bcB1A431A8C",
    factories: {
      paymentOperator: "0xb33D6502EdBbC47201cd1E53C49d703EC0a660b8",
      escrowPeriod: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      freeze: "0xCAEd9474c06bf9139AC36C874dED838e1Bcb9310",
      staticFeeCalculator: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      staticAddressCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      andCondition: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
      orCondition: "0x19a798c7F66E6401f6004b732dA604196952e843",
      notCondition: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      recorderCombinator: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    },
    conditions: {
      payer: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      receiver: "0x26A3d27139b442Be5ECc10c8608c494627B660BF",
      alwaysTrue: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
    },
  },

  // --- Arbitrum ---
  "eip155:42161": {
    name: "Arbitrum One",
    chainId: 42161,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x230fd3A171750FA45db2976121376b7F47Cba308",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838",
    usdcTvlLimit: "0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546",
    arbiterRegistry: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    refundRequestEvidence: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    factories: {
      paymentOperator: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      staticFeeCalculator: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      staticAddressCondition: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      receiver: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
      alwaysTrue: "0x46C44071BDf9753482400B76d88A5850318b776F",
    },
  },

  // --- Celo ---
  "eip155:42220": {
    name: "Celo",
    chainId: 42220,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x230fd3A171750FA45db2976121376b7F47Cba308",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838",
    usdcTvlLimit: "0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546",
    arbiterRegistry: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    refundRequestEvidence: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    factories: {
      paymentOperator: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      staticFeeCalculator: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      staticAddressCondition: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      receiver: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
      alwaysTrue: "0x46C44071BDf9753482400B76d88A5850318b776F",
    },
  },

  // --- Monad ---
  "eip155:143": {
    name: "Monad",
    chainId: 143,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x230fd3A171750FA45db2976121376b7F47Cba308",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838",
    usdcTvlLimit: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
    arbiterRegistry: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
    refundRequestEvidence: "0x19a798c7F66E6401f6004b732dA604196952e843",
    factories: {
      paymentOperator: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0x26A3d27139b442Be5ECc10c8608c494627B660BF",
      staticFeeCalculator: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      staticAddressCondition: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      receiver: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
      alwaysTrue: "0x46C44071BDf9753482400B76d88A5850318b776F",
    },
  },

  // --- Optimism ---
  "eip155:10": {
    name: "Optimism",
    chainId: 10,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x230fd3A171750FA45db2976121376b7F47Cba308",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838",
    usdcTvlLimit: "0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546",
    arbiterRegistry: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    refundRequestEvidence: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    factories: {
      paymentOperator: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      staticFeeCalculator: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      staticAddressCondition: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      receiver: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
      alwaysTrue: "0x46C44071BDf9753482400B76d88A5850318b776F",
    },
  },

  // --- Avalanche ---
  "eip155:43114": {
    name: "Avalanche C-Chain",
    chainId: 43114,
    authCaptureEscrow: "0x320a3c35F131E5D2Fb36af56345726B298936037",
    tokenCollector: "0x230fd3A171750FA45db2976121376b7F47Cba308",
    refundRequest: "0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98",
    protocolFeeConfig: "0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838",
    usdcTvlLimit: "0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546",
    arbiterRegistry: "0xE78648e7af7B1BaDE717FF6E410B922F92adE80f",
    usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    refundRequestEvidence: "0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a",
    factories: {
      paymentOperator: "0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6",
      escrowPeriod: "0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316",
      freeze: "0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7",
      staticFeeCalculator: "0x89257cA1114139C3332bb73655BC2e4C924aC678",
      staticAddressCondition: "0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5",
      andCondition: "0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a",
      orCondition: "0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D",
      notCondition: "0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267",
      recorderCombinator: "0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84",
    },
    conditions: {
      payer: "0xed02d3E5167BCc9582D851885A89b050AB816a56",
      receiver: "0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178",
      alwaysTrue: "0x46C44071BDf9753482400B76d88A5850318b776F",
    },
  },
};

/**
 * List of supported network identifiers
 *
 * @example
 * ```typescript
 * SupportedNetworks.forEach(network => {
 *   console.log(network); // 'eip155:84532'
 * });
 * ```
 */
export const SupportedNetworks = Object.keys(NETWORK_CONFIG);

/**
 * Get network configuration by EIP-155 chain identifier
 *
 * @param networkId - EIP-155 chain identifier (e.g., 'eip155:84532')
 * @returns Network configuration or undefined if not supported
 *
 * @example
 * ```typescript
 * const config = getNetworkConfig('eip155:84532');
 * if (config) {
 *   console.log(config.authCaptureEscrow);
 * }
 * ```
 */
export function getNetworkConfig(networkId: string): NetworkConfig | undefined {
  return NETWORK_CONFIG[networkId];
}

/**
 * Check if a network is supported
 *
 * @param networkId - EIP-155 chain identifier to check
 * @returns true if the network is supported
 *
 * @example
 * ```typescript
 * if (isSupportedNetwork('eip155:84532')) {
 *   // Safe to use this network
 * }
 * ```
 */
export function isSupportedNetwork(networkId: string): boolean {
  return networkId in NETWORK_CONFIG;
}

/**
 * Zero address constant for checking if addresses are deployed
 */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Check if an address is a valid deployed address (not zero)
 */
function isDeployedAddress(address: `0x${string}`): boolean {
  return address !== ZERO_ADDRESS;
}

/**
 * Get factory addresses for a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns Factory addresses or throws if not available
 * @throws Error if factories are not deployed on the network
 *
 * @example
 * ```typescript
 * const factories = getFactoryAddresses('eip155:84532');
 * console.log(factories.paymentOperator);
 * ```
 */
export function getFactoryAddresses(networkId: string): FactoryAddresses {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }
  if (!config.factories) {
    throw new Error(`Factories are not deployed on ${config.name}`);
  }
  return config.factories;
}

/**
 * Get a specific factory address, with validation
 *
 * @param networkId - EIP-155 chain identifier
 * @param factory - Factory name to get
 * @returns Factory address
 * @throws Error if factory is not deployed
 *
 * @example
 * ```typescript
 * const operatorFactory = getFactoryAddress('eip155:84532', 'paymentOperator');
 * ```
 */
export function getFactoryAddress(
  networkId: string,
  factory: keyof FactoryAddresses,
): `0x${string}` {
  const factories = getFactoryAddresses(networkId);
  const address = factories[factory];
  if (!isDeployedAddress(address)) {
    const config = getNetworkConfig(networkId);
    throw new Error(`${factory} factory is not deployed on ${config?.name ?? networkId}`);
  }
  return address;
}

/**
 * Get condition singleton addresses for a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns Condition singleton addresses or throws if not available
 * @throws Error if conditions are not deployed on the network
 *
 * @example
 * ```typescript
 * const conditions = getConditionSingletons('eip155:84532');
 * console.log(conditions.payer);
 * ```
 */
export function getConditionSingletons(networkId: string): ConditionSingletonAddresses {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }
  if (!config.conditions) {
    throw new Error(`Condition singletons are not deployed on ${config.name}`);
  }
  // Validate that addresses are actually deployed
  const { payer, receiver, alwaysTrue } = config.conditions;
  if (!isDeployedAddress(payer) || !isDeployedAddress(receiver) || !isDeployedAddress(alwaysTrue)) {
    throw new Error(
      `Condition singletons are not fully deployed on ${config.name}. ` +
        `This is a protocol-level deployment - contact the x402r team.`,
    );
  }
  return config.conditions;
}

/**
 * Check if factories are available on a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns true if factories are deployed
 */
export function hasFactories(networkId: string): boolean {
  const config = getNetworkConfig(networkId);
  return !!config?.factories;
}

/**
 * Check if condition singletons are available on a network
 *
 * @param networkId - EIP-155 chain identifier
 * @returns true if condition singletons are deployed
 */
export function hasConditionSingletons(networkId: string): boolean {
  const config = getNetworkConfig(networkId);
  if (!config?.conditions) return false;
  const { payer, receiver, alwaysTrue } = config.conditions;
  return isDeployedAddress(payer) && isDeployedAddress(receiver) && isDeployedAddress(alwaysTrue);
}

/**
 * Resolved contract addresses for a network
 */
export interface ResolvedAddresses {
  /** AuthCaptureEscrow contract address */
  escrowAddress: `0x${string}`;
  /** TokenCollector contract address */
  tokenCollector: `0x${string}`;
  /** RefundRequest contract address */
  refundRequestAddress: `0x${string}`;
  /** ArbiterRegistry contract address */
  arbiterRegistryAddress: `0x${string}`;
  /** USDC token address */
  usdc: `0x${string}`;
  /** ProtocolFeeConfig contract address */
  protocolFeeConfig: `0x${string}`;
  /** RefundRequestEvidence contract address (may be undefined) */
  evidenceAddress?: `0x${string}`;
  /** Chain ID */
  chainId: number;
  /** Network name */
  name: string;
}

/**
 * Resolve all contract addresses for a network
 *
 * Convenience function that extracts the most commonly needed addresses
 * from the network config into a flat, descriptive object.
 *
 * @param networkId - EIP-155 chain identifier (e.g., 'eip155:84532')
 * @returns Resolved addresses object
 * @throws Error if the network is not supported
 *
 * @example
 * ```typescript
 * const addrs = resolveAddresses('eip155:84532');
 * const client = new X402rClient({
 *   publicClient,
 *   operatorAddress: '0x...',
 *   escrowAddress: addrs.escrowAddress,
 *   refundRequestAddress: addrs.refundRequestAddress,
 *   refundRequestEvidenceAddress: addrs.evidenceAddress,
 * });
 * ```
 */
export function resolveAddresses(networkId: string): ResolvedAddresses {
  const config = getNetworkConfig(networkId);
  if (!config) {
    const supported = SupportedNetworks.join(", ");
    throw new Error(`Network '${networkId}' is not supported. Supported networks: ${supported}`);
  }

  return {
    escrowAddress: config.authCaptureEscrow,
    tokenCollector: config.tokenCollector,
    refundRequestAddress: config.refundRequest,
    arbiterRegistryAddress: config.arbiterRegistry,
    usdc: config.usdc,
    protocolFeeConfig: config.protocolFeeConfig,
    evidenceAddress: config.refundRequestEvidence,
    chainId: config.chainId,
    name: config.name,
  };
}
