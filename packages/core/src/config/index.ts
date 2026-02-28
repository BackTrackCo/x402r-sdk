import { type Address, zeroAddress } from 'viem'
import { ConfigError } from '../errors/index.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactoryAddresses {
  paymentOperator: Address
  escrowPeriod: Address
  freeze: Address
  staticFeeCalculator: Address
  staticAddressCondition: Address
  andCondition: Address
  orCondition: Address
  notCondition: Address
  recorderCombinator: Address
}

export interface ConditionSingletonAddresses {
  payer: Address
  receiver: Address
  alwaysTrue: Address
}

export interface X402rChainConfig {
  name: string
  chainId: number
  authCaptureEscrow: Address
  tokenCollector: Address
  refundRequest: Address
  protocolFeeConfig: Address
  usdcTvlLimit: Address
  arbiterRegistry: Address
  receiverRefundCollector: Address
  usdc: Address
  refundRequestEvidence?: Address
  factories?: FactoryAddresses
  conditions?: ConditionSingletonAddresses
}

// ---------------------------------------------------------------------------
// Chain registry
// ---------------------------------------------------------------------------

export const x402rChains = {
  84532: {
    name: 'Base Sepolia',
    chainId: 84532,
    authCaptureEscrow: '0x29025c0E9D4239d438e169570818dB9FE0A80873',
    tokenCollector: '0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0',
    refundRequest: '0x1C2Ab244aC8bDdDB74d43389FF34B118aF2E90F4',
    protocolFeeConfig: '0x8F96C493bAC365E41f0315cf45830069EBbDCaCe',
    usdcTvlLimit: '0x5425f265811dBE7cCa8002585D19Ba1241B42793',
    arbiterRegistry: '0x762d562a5ff10EcbFD2Bc4fea663433b84226F35',
    receiverRefundCollector: '0x36a03071bA0D3F09a50381fCA6C9906B69Ba8c0E',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    refundRequestEvidence: '0x917317BBBBe1b9b53BD0ceD4C7b7386Dbd1727ea',
    factories: {
      paymentOperator: '0x97d53e63A9CB97556c00BeFd325AF810c9b267B2',
      escrowPeriod: '0x34A5AAF8C19e04d0193466bdF80D155EC934c980',
      freeze: '0x45B0d8ca06e0367ef99E3535d32abb0074e06bD3',
      staticFeeCalculator: '0xD9989E2F2Ac0494119bd1C0f3CABC47D26758659',
      staticAddressCondition: '0xA7C944301a4CdB3f9d6776eB742E0fe24368AF90',
      andCondition: '0x46F5aF23960F4300e7Fb1ded3742cA5509F6F596',
      orCondition: '0xd5adb393a541D1611AdfAf5400cD5AC12941D1dB',
      notCondition: '0x18BC108e8CB28a68B521e72DA1DA07d507199698',
      recorderCombinator: '0xa1C0ECD30f2780f617DF88e21664E0ce971fEbB0',
    },
    conditions: {
      payer: '0xBda4593E6133036ef9754c9AfC974C761230249D',
      receiver: '0x00DCe240b6DDD335F2327c3F6d0E1d3732f5C97b',
      alwaysTrue: '0x0A427c66C3eC3BF7c3e69238c2D4779a1Bc12c3A',
    },
  },

  8453: {
    name: 'Base Mainnet',
    chainId: 8453,
    authCaptureEscrow: '0xb9488351E48b23D798f24e8174514F28B741Eb4f',
    tokenCollector: '0x48ADf6E37F9b31dC2AAD0462C5862B5422C736B8',
    refundRequest: '0x35fb2EFEfAc3Ee9f6E52A9AAE5C9655bC08dEc00',
    protocolFeeConfig: '0x59314674BAbb1a24Eb2704468a9cCdD50668a1C6',
    usdcTvlLimit: '0xC80cd08d609673061597DE7fe54Af3978f10A825',
    arbiterRegistry: '0xB68C023365EB08021E12f7f7f11a03282443863A',
    receiverRefundCollector: '0x4bDb9ccC91CA63cfedb6CB0dbf21BC6dD562bb04',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    refundRequestEvidence: '0x2176D0edfeC9e2B8d3FDbB37f09535BEe4BAFB34',
    factories: {
      paymentOperator: '0x3D0837fF8Ea36F417261577b9BA568400A840260',
      escrowPeriod: '0x12EDefd4549c53497689067f165c0f101796Eb6D',
      freeze: '0x64b5071C7e1eDA582849DF392a1EBdf78690a90C',
      staticFeeCalculator: '0x9D4146EF898c8E60B3e865AE254ef438E7cEd2A0',
      staticAddressCondition: '0x206D4DbB6E7b876e4B5EFAAD2a04e7d7813FB6ba',
      andCondition: '0x5b3e33791C1764cF7e2573Bf8116F1D361FD97Cd',
      orCondition: '0x1e52a74cE6b69F04a506eF815743E1052A1BD28F',
      notCondition: '0xFa8C4Cb156053b867Ae7489220A29b5939E3Df70',
      recorderCombinator: '0xEb0C15bE3F77193324844340899C20c44771d53C',
    },
    conditions: {
      payer: '0x7254b68D1AaAbd118C8A8b15756b4654c10a16d2',
      receiver: '0x6926c05193c714ED4bA3867Ee93d6816Fdc14128',
      alwaysTrue: '0xBAF68176FF94CAdD403EF7FbB776bbca548AC09D',
    },
  },

  11155111: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    authCaptureEscrow: '0x320a3c35F131E5D2Fb36af56345726B298936037',
    tokenCollector: '0x230fd3A171750FA45db2976121376b7F47Cba308',
    refundRequest: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    protocolFeeConfig: '0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838',
    usdcTvlLimit: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    arbiterRegistry: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    receiverRefundCollector: '0x19a798c7F66E6401f6004b732dA604196952e843',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    refundRequestEvidence: '0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a',
    factories: {
      paymentOperator: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
      escrowPeriod: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      freeze: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
      staticFeeCalculator: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
      staticAddressCondition: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      andCondition: '0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a',
      orCondition: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      notCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      recorderCombinator: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
    },
    conditions: {
      payer: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
      receiver: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
      alwaysTrue: '0x46C44071BDf9753482400B76d88A5850318b776F',
    },
  },

  1: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    authCaptureEscrow: '0x9D4146EF898c8E60B3e865AE254ef438E7cEd2A0',
    tokenCollector: '0x206D4DbB6E7b876e4B5EFAAD2a04e7d7813FB6ba',
    refundRequest: '0xFa8C4Cb156053b867Ae7489220A29b5939E3Df70',
    protocolFeeConfig: '0x5b3e33791C1764cF7e2573Bf8116F1D361FD97Cd',
    usdcTvlLimit: '0x68684ff8CD38483B8023a1443Af97C58eD29Cb06',
    arbiterRegistry: '0xEb0C15bE3F77193324844340899C20c44771d53C',
    receiverRefundCollector: '0xEb2615951d0F0781B1D94e028120414f237BD74c',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    refundRequestEvidence: '0x31E6E25bc97187A102E1a64D2A495a287F95Cdd6',
    factories: {
      paymentOperator: '0x1e52a74cE6b69F04a506eF815743E1052A1BD28F',
      escrowPeriod: '0x2176D0edfeC9e2B8d3FDbB37f09535BEe4BAFB34',
      freeze: '0xC80cd08d609673061597DE7fe54Af3978f10A825',
      staticFeeCalculator: '0xcb9F7C34C6DecFB010385e1454ae1BF3182D78E7',
      staticAddressCondition: '0xE55a88ffE86E35Ec76D6B75CFA42F912FEBAdd9f',
      andCondition: '0xfDd617a882a89C91c225f7d04E5d5F414Fe12e44',
      orCondition: '0x9E00E54684f70fc698EB0718336719FaCAC3DcFd',
      notCondition: '0xF8989eA1ECc5be2d369860cec23Ee0B9e1558714',
      recorderCombinator: '0x6293Ab0503411392f7f46671595D97C8CAfe321c',
    },
    conditions: {
      payer: '0x4bDb9ccC91CA63cfedb6CB0dbf21BC6dD562bb04',
      receiver: '0xbD26B1C938E5b95Ebc2a12eCB8995Bc7E68C0d11',
      alwaysTrue: '0x64b5071C7e1eDA582849DF392a1EBdf78690a90C',
    },
  },

  137: {
    name: 'Polygon PoS',
    chainId: 137,
    authCaptureEscrow: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
    tokenCollector: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    refundRequest: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
    protocolFeeConfig: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    usdcTvlLimit: '0xdc0D800007ceAcfF1299b926CE22b4D4EDce6ce7',
    arbiterRegistry: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
    receiverRefundCollector: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    refundRequestEvidence: '0xe4f1840171E31DaD221C6b25FED91bcB1A431A8C',
    factories: {
      paymentOperator: '0xb33D6502EdBbC47201cd1E53C49d703EC0a660b8',
      escrowPeriod: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      freeze: '0xCAEd9474c06bf9139AC36C874dED838e1Bcb9310',
      staticFeeCalculator: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      staticAddressCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      andCondition: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
      orCondition: '0x19a798c7F66E6401f6004b732dA604196952e843',
      notCondition: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
      recorderCombinator: '0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a',
    },
    conditions: {
      payer: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      receiver: '0x26A3d27139b442Be5ECc10c8608c494627B660BF',
      alwaysTrue: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
    },
  },

  42161: {
    name: 'Arbitrum One',
    chainId: 42161,
    authCaptureEscrow: '0x320a3c35F131E5D2Fb36af56345726B298936037',
    tokenCollector: '0x230fd3A171750FA45db2976121376b7F47Cba308',
    refundRequest: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    protocolFeeConfig: '0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838',
    usdcTvlLimit: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    arbiterRegistry: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    receiverRefundCollector: '0x19a798c7F66E6401f6004b732dA604196952e843',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    refundRequestEvidence: '0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a',
    factories: {
      paymentOperator: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
      escrowPeriod: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      freeze: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
      staticFeeCalculator: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
      staticAddressCondition: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      andCondition: '0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a',
      orCondition: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      notCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      recorderCombinator: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
    },
    conditions: {
      payer: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
      receiver: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
      alwaysTrue: '0x46C44071BDf9753482400B76d88A5850318b776F',
    },
  },

  42220: {
    name: 'Celo',
    chainId: 42220,
    authCaptureEscrow: '0x320a3c35F131E5D2Fb36af56345726B298936037',
    tokenCollector: '0x230fd3A171750FA45db2976121376b7F47Cba308',
    refundRequest: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    protocolFeeConfig: '0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838',
    usdcTvlLimit: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    arbiterRegistry: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    receiverRefundCollector: '0x19a798c7F66E6401f6004b732dA604196952e843',
    usdc: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    refundRequestEvidence: '0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a',
    factories: {
      paymentOperator: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
      escrowPeriod: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      freeze: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
      staticFeeCalculator: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
      staticAddressCondition: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      andCondition: '0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a',
      orCondition: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      notCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      recorderCombinator: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
    },
    conditions: {
      payer: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
      receiver: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
      alwaysTrue: '0x46C44071BDf9753482400B76d88A5850318b776F',
    },
  },

  143: {
    name: 'Monad',
    chainId: 143,
    authCaptureEscrow: '0x320a3c35F131E5D2Fb36af56345726B298936037',
    tokenCollector: '0x230fd3A171750FA45db2976121376b7F47Cba308',
    refundRequest: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    protocolFeeConfig: '0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838',
    usdcTvlLimit: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
    arbiterRegistry: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    receiverRefundCollector: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    usdc: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    refundRequestEvidence: '0x19a798c7F66E6401f6004b732dA604196952e843',
    factories: {
      paymentOperator: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
      escrowPeriod: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      freeze: '0x26A3d27139b442Be5ECc10c8608c494627B660BF',
      staticFeeCalculator: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
      staticAddressCondition: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      andCondition: '0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a',
      orCondition: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      notCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      recorderCombinator: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
    },
    conditions: {
      payer: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
      receiver: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
      alwaysTrue: '0x46C44071BDf9753482400B76d88A5850318b776F',
    },
  },

  10: {
    name: 'Optimism',
    chainId: 10,
    authCaptureEscrow: '0x320a3c35F131E5D2Fb36af56345726B298936037',
    tokenCollector: '0x230fd3A171750FA45db2976121376b7F47Cba308',
    refundRequest: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    protocolFeeConfig: '0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838',
    usdcTvlLimit: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    arbiterRegistry: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    receiverRefundCollector: '0x19a798c7F66E6401f6004b732dA604196952e843',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    refundRequestEvidence: '0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a',
    factories: {
      paymentOperator: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
      escrowPeriod: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      freeze: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
      staticFeeCalculator: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
      staticAddressCondition: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      andCondition: '0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a',
      orCondition: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      notCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      recorderCombinator: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
    },
    conditions: {
      payer: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
      receiver: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
      alwaysTrue: '0x46C44071BDf9753482400B76d88A5850318b776F',
    },
  },

  43114: {
    name: 'Avalanche C-Chain',
    chainId: 43114,
    authCaptureEscrow: '0x320a3c35F131E5D2Fb36af56345726B298936037',
    tokenCollector: '0x230fd3A171750FA45db2976121376b7F47Cba308',
    refundRequest: '0xc1256Bb30bd0cdDa07D8C8Cf67a59105f2EA1b98',
    protocolFeeConfig: '0xD979dBfBdA5f4b16AAF60Eaab32A44f352076838',
    usdcTvlLimit: '0x9B16ff5bcF5C0B2c31Cd17032a306E91CA67F546',
    arbiterRegistry: '0xE78648e7af7B1BaDE717FF6E410B922F92adE80f',
    receiverRefundCollector: '0x19a798c7F66E6401f6004b732dA604196952e843',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    refundRequestEvidence: '0xd709e87DF198eF3C15C5eaE81E3EbD8Fd7AC908a',
    factories: {
      paymentOperator: '0x32d6AC59BCe8DFB3026F10BcaDB8D00AB218f5b6',
      escrowPeriod: '0x2714EA3e839Ac50F52B2e2a5788F614cACeE5316',
      freeze: '0xA50F51254E8B08899EdB76Bd24b4DC6A61ba7dE7',
      staticFeeCalculator: '0x89257cA1114139C3332bb73655BC2e4C924aC678',
      staticAddressCondition: '0x0DdF51E62DDD41B5f67BEaF2DCE9F2E99E2C5aF5',
      andCondition: '0xAfdEEa8f37AC2cfaE6732c31FEde0A014BfD693a',
      orCondition: '0xe968AA7530b9C3336FED14FD5D5D4dD3Cf82655D',
      notCondition: '0xc5a96DaBd3F0E485CEEA7Bf912fC5834A6DE2267',
      recorderCombinator: '0x6a7E26c3A78a7B1eFF9Dd28d51B2a15df3208B84',
    },
    conditions: {
      payer: '0xed02d3E5167BCc9582D851885A89b050AB816a56',
      receiver: '0xc9BbA6A2CF9838e7Dd8c19BC8B3BAC620B9D8178',
      alwaysTrue: '0x46C44071BDf9753482400B76d88A5850318b776F',
    },
  },
} as const satisfies Record<number, X402rChainConfig>

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type SupportedChainId = keyof typeof x402rChains

export const supportedChainIds = Object.keys(x402rChains).map(
  Number,
) as SupportedChainId[]

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

export function getChainConfig(chainId: number): X402rChainConfig {
  const config = x402rChains[chainId as keyof typeof x402rChains] as
    | X402rChainConfig
    | undefined
  if (!config) {
    throw new ConfigError(`Chain ${chainId} is not supported`, {
      metaMessages: [`Supported chains: ${supportedChainIds.join(', ')}`],
    })
  }
  return config
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId in x402rChains
}

export function getFactoryAddresses(chainId: number): FactoryAddresses {
  const config = getChainConfig(chainId)
  if (!config.factories) {
    throw new ConfigError(`Factories are not deployed on ${config.name}`)
  }
  return config.factories
}

export function getFactoryAddress(
  chainId: number,
  factory: keyof FactoryAddresses,
): Address {
  const config = getChainConfig(chainId)
  if (!config.factories) {
    throw new ConfigError(`Factories are not deployed on ${config.name}`)
  }
  const address = config.factories[factory]
  if (address === zeroAddress) {
    throw new ConfigError(
      `${factory} factory is not deployed on ${config.name}`,
    )
  }
  return address
}

export function getConditionSingletons(
  chainId: number,
): ConditionSingletonAddresses {
  const config = getChainConfig(chainId)
  if (!config.conditions) {
    throw new ConfigError(
      `Condition singletons are not deployed on ${config.name}`,
    )
  }
  const { payer, receiver, alwaysTrue } = config.conditions
  if (
    payer === zeroAddress ||
    receiver === zeroAddress ||
    alwaysTrue === zeroAddress
  ) {
    throw new ConfigError(
      `Condition singletons are not fully deployed on ${config.name}`,
      {
        metaMessages: [
          'This is a protocol-level deployment — contact the x402r team.',
        ],
      },
    )
  }
  return config.conditions
}

export function hasFactories(chainId: number): boolean {
  const config = x402rChains[chainId as keyof typeof x402rChains] as
    | X402rChainConfig
    | undefined
  return !!config?.factories
}

export function hasConditionSingletons(chainId: number): boolean {
  const config = x402rChains[chainId as keyof typeof x402rChains] as
    | X402rChainConfig
    | undefined
  if (!config?.conditions) return false
  const { payer, receiver, alwaysTrue } = config.conditions
  return (
    payer !== zeroAddress &&
    receiver !== zeroAddress &&
    alwaysTrue !== zeroAddress
  )
}

// ---------------------------------------------------------------------------
// CAIP-2 bridge
// ---------------------------------------------------------------------------

export function toNetworkId(chainId: number): string {
  return `eip155:${chainId}`
}

export function fromNetworkId(networkId: string): number {
  const match = networkId.match(/^eip155:(\d+)$/)
  if (!match) {
    throw new ConfigError(`Invalid CAIP-2 network identifier: ${networkId}`, {
      metaMessages: ['Expected format: eip155:<chainId>'],
    })
  }
  return Number(match[1])
}
