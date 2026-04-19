import { decodeAbiParameters, encodeAbiParameters } from "viem";

import { contractAddresses } from "@/lib/contracts/addresses";
import { ACTION_TYPE_OPTIONS, GOVERNANCE_ACTION_DETAILS } from "@/lib/constants";

function shortenHex(value: string, left = 10, right = 8) {
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export function getExpectedTargetForAction(actionType: number): `0x${string}` | null {
  switch (actionType) {
    case 0:
    case 1:
    case 11:
      return "0x0000000000000000000000000000000000000000";
    case 2:
    case 3:
      return contractAddresses.AMMPool as `0x${string}`;
    case 4:
    case 10:
      return contractAddresses.GreenToken as `0x${string}`;
    case 5:
    case 6:
      return contractAddresses.RewardToken as `0x${string}`;
    case 7:
    case 8:
      return contractAddresses.RewardRedemption as `0x${string}`;
    case 9:
      return null;
    default:
      return null;
  }
}

export function isActionTargetValid(actionType: number, targetContract: `0x${string}`) {
  if (actionType === 9) return targetContract !== "0x0000000000000000000000000000000000000000";

  const expectedTarget = getExpectedTargetForAction(actionType);
  if (!expectedTarget) return true;

  return expectedTarget.toLowerCase() === targetContract.toLowerCase();
}

export function getGovernanceExecutionHint(actionType: number, targetContract: string) {
  const expectedTarget = getExpectedTargetForAction(actionType);

  if (expectedTarget && expectedTarget.toLowerCase() !== targetContract.toLowerCase()) {
    return `This proposal points to the wrong target contract. Action ${actionType} should use ${expectedTarget}, but this proposal targets ${targetContract}.`;
  }

  switch (actionType) {
    case 2:
      return "INIT_POOL can only execute if the treasury already holds enough GT and RT and has approved the AMMPool contract for both transfers.";
    case 3:
      return "INJECT_BUFFER can fail if the amount is zero, exceeds the buffer cap, or if the source transfer into the AMM buffer fails.";
    case 4:
    case 5:
      return "SET_*_MINTER should target the correct token contract. If the token contract rejects the caller or the address is invalid, execution will fail.";
    case 6:
      return "MINT_RT only works if CommitteeManager is currently the RewardToken minter.";
    case 7:
      return "ADD_REWARD must target RewardRedemption. The reward name and base cost must be encoded correctly.";
    case 8:
      return "REMOVE_REWARD must target RewardRedemption and use a valid reward ID.";
    case 9:
      return "GENERIC_CALL will fail if the target address or calldata does not match a real callable function on the target contract.";
    case 10:
      return "MINT_GT only works if CommitteeManager is currently the GreenToken minter.";
    case 11:
      return "LOCK_START can only be executed once. After start is locked, setup-only actions cannot be executed anymore.";
    default:
      return "The proposal reached execution but the target contract call reverted. Check the target contract, argument encoding, and any on-chain preconditions.";
  }
}

export function encodeProposalData(actionType: number, params: Record<string, unknown>) {
  switch (actionType) {
    case 0:
    case 1:
    case 4:
    case 5:
      return encodeAbiParameters([{ type: "address" }], [params.address as `0x${string}`]);
    case 2:
      return encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [BigInt(params.gtAmount as string), BigInt(params.rtAmount as string)]
      );
    case 3:
      return encodeAbiParameters([{ type: "uint256" }], [BigInt(params.amount as string)]);
    case 6:
    case 10:
      return encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [params.to as `0x${string}`, BigInt(params.amount as string)]
      );
    case 7:
      return encodeAbiParameters(
        [{ type: "string" }, { type: "uint256" }],
        [String(params.name ?? ""), BigInt(params.baseCost as string)]
      );
    case 8:
      return encodeAbiParameters([{ type: "uint256" }], [BigInt(params.rewardId as string)]);
    case 9:
      return encodeAbiParameters([{ type: "bytes" }], [params.callData as `0x${string}`]);
    case 11:
      return "0x";
    default:
      throw new Error(`Unsupported action type ${actionType}`);
  }
}

export function decodeProposalData(actionType: number, data: `0x${string}`) {
  switch (actionType) {
    case 0:
    case 1:
    case 4:
    case 5: {
      const [address] = decodeAbiParameters([{ type: "address" }], data);
      return { address };
    }
    case 2: {
      const [gtAmount, rtAmount] = decodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], data);
      return { gtAmount: gtAmount.toString(), rtAmount: rtAmount.toString() };
    }
    case 3: {
      const [amount] = decodeAbiParameters([{ type: "uint256" }], data);
      return { amount: amount.toString() };
    }
    case 6:
    case 10: {
      const [to, amount] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }], data);
      return { to, amount: amount.toString() };
    }
    case 7: {
      const [name, baseCost] = decodeAbiParameters([{ type: "string" }, { type: "uint256" }], data);
      return { name, baseCost: baseCost.toString() };
    }
    case 8: {
      const [rewardId] = decodeAbiParameters([{ type: "uint256" }], data);
      return { rewardId: rewardId.toString() };
    }
    case 9: {
      const [callData] = decodeAbiParameters([{ type: "bytes" }], data);
      return { callData };
    }
    case 11:
      return {};
    default:
      return {};
  }
}

export function getProposalDisplayName(actionType: number) {
  return (
    GOVERNANCE_ACTION_DETAILS[actionType as keyof typeof GOVERNANCE_ACTION_DETAILS]?.title ??
    ACTION_TYPE_OPTIONS.find((item) => item.value === actionType)?.label ??
    "Governance proposal"
  );
}

export function getProposalDisplayFields(actionType: number, params: Record<string, unknown>) {
  const fieldConfigs = GOVERNANCE_ACTION_DETAILS[actionType as keyof typeof GOVERNANCE_ACTION_DETAILS]?.fields ?? [];

  const fields = fieldConfigs
    .filter((field) => field.key !== "targetContract")
    .map((field) => {
      const rawValue = params[field.key];
      const value =
        typeof rawValue === "string"
          ? rawValue
          : rawValue === undefined || rawValue === null
            ? ""
            : String(rawValue);

      return { label: field.label, value };
    })
    .filter((field) => field.value.trim().length > 0);

  if (fields.length > 0) return fields;

  if (actionType === 9 && params.callData) {
    return [{ label: "Encoded calldata", value: shortenHex(String(params.callData), 14, 12) }];
  }

  return [];
}

export function getFallbackProposalSummary(actionType: number) {
  return getProposalDisplayName(actionType);
}

export function getFallbackProposalDetails(actionType: number, params?: Record<string, unknown>) {
  if (!params) return [];
  return getProposalDisplayFields(actionType, params);
}
