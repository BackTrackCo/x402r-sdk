import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "packages/core/src/abis/generated.ts",
  plugins: [
    foundry({
      project: "../x402r-contracts",
      include: [
        // Core (11)
        "PaymentOperator.sol/PaymentOperator.json",
        "RefundRequest.sol/RefundRequest.json",
        "IRecorder.sol/IRecorder.json",
        "IFeeCalculator.sol/IFeeCalculator.json",
        "EscrowPeriod.sol/EscrowPeriod.json",
        "AuthCaptureEscrow.sol/AuthCaptureEscrow.json",
        "StaticAddressCondition.sol/StaticAddressCondition.json",
        "Freeze.sol/Freeze.json",
        "ProtocolFeeConfig.sol/ProtocolFeeConfig.json",
        "ArbiterRegistry.sol/ArbiterRegistry.json",
        "RefundRequestEvidence.sol/RefundRequestEvidence.json",
        // Conditions (7)
        "ICondition.sol/ICondition.json",
        "PayerCondition.sol/PayerCondition.json",
        "ReceiverCondition.sol/ReceiverCondition.json",
        "AlwaysTrueCondition.sol/AlwaysTrueCondition.json",
        "AndCondition.sol/AndCondition.json",
        "OrCondition.sol/OrCondition.json",
        "NotCondition.sol/NotCondition.json",
        // Factories (9)
        "PaymentOperatorFactory.sol/PaymentOperatorFactory.json",
        "EscrowPeriodFactory.sol/EscrowPeriodFactory.json",
        "FreezeFactory.sol/FreezeFactory.json",
        "StaticFeeCalculatorFactory.sol/StaticFeeCalculatorFactory.json",
        "StaticAddressConditionFactory.sol/StaticAddressConditionFactory.json",
        "AndConditionFactory.sol/AndConditionFactory.json",
        "OrConditionFactory.sol/OrConditionFactory.json",
        "NotConditionFactory.sol/NotConditionFactory.json",
        "RecorderCombinatorFactory.sol/RecorderCombinatorFactory.json",
      ],
    }),
  ],
});
