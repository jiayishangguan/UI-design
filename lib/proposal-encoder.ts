import { decodeAbiParameters, encodeAbiParameters, formatUnits, parseUnits } from "viem";

import { contractAddresses } from "@/lib/contracts/addresses";
import { ACTION_TYPE_OPTIONS, GOVERNANCE_ACTION_DETAILS } from "@/lib/constants";
import { TOKEN_DECIMALS } from "@/lib/format";

function shortenHex(value: string, left = 10, right = 8) {
  if (value.length <= left + right) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function parseGovernanceTokenAmount(value: unknown) {
  return parseUnits(String(value ?? "0"), TOKEN_DECIMALS);
}

function formatGovernanceTokenAmount(value: bigint) {
  return formatUnits(value, TOKEN_DECIMALS);
}

function quote(value: string) {
  return `"${value}"`;
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
        [parseGovernanceTokenAmount(params.gtAmount), parseGovernanceTokenAmount(params.rtAmount)]
      );
    case 3:
      return encodeAbiParameters([{ type: "uint256" }], [parseGovernanceTokenAmount(params.amount)]);
    case 6:
    case 10:
      return encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [params.to as `0x${string}`, parseGovernanceTokenAmount(params.amount)]
      );
    case 7:
      return encodeAbiParameters(
        [{ type: "string" }, { type: "uint256" }],
        [String(params.name ?? ""), parseGovernanceTokenAmount(params.baseCost)]
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
      return { gtAmount: formatGovernanceTokenAmount(gtAmount), rtAmount: formatGovernanceTokenAmount(rtAmount) };
    }
    case 3: {
      const [amount] = decodeAbiParameters([{ type: "uint256" }], data);
      return { amount: formatGovernanceTokenAmount(amount) };
    }
    case 6:
    case 10: {
      const [to, amount] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }], data);
      return { to, amount: formatGovernanceTokenAmount(amount) };
    }
    case 7: {
      const [name, baseCost] = decodeAbiParameters([{ type: "string" }, { type: "uint256" }], data);
      return { name, baseCost: formatGovernanceTokenAmount(baseCost) };
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

export function getProposalDetailText(
  actionType: number,
  params: Record<string, unknown>,
  targetContract?: string
) {
  switch (actionType) {
    case 0:
      return `Add new member ${quote(String(params.address ?? ""))} to committee member list.`;
    case 1:
      return `Remove member ${quote(String(params.address ?? ""))} from committee member list.`;
    case 2:
      return `Initialize the AMM pool with ${String(params.gtAmount ?? "0")} GT and ${String(params.rtAmount ?? "0")} RT.`;
    case 3:
      return `Inject ${String(params.amount ?? "0")} RT into the AMM buffer reserve.`;
    case 4:
      return `Set GreenToken minter to wallet ${quote(String(params.address ?? ""))}.`;
    case 5:
      return `Set RewardToken minter to wallet ${quote(String(params.address ?? ""))}.`;
    case 6:
      return `Mint ${String(params.amount ?? "0")} RT to wallet ${quote(String(params.to ?? ""))}.`;
    case 7:
      return `Add new reward ${quote(String(params.name ?? ""))}. The base cost is ${String(params.baseCost ?? "0")} RT.`;
    case 8:
      return `Remove reward with reward ID ${String(params.rewardId ?? "0")} from the reward catalogue.`;
    case 9:
      return `Apply the following change to target contract ${quote(targetContract ?? String(params.targetContract ?? ""))}: ${String(params.callData ?? "0x")}.`;
    case 10:
      return `Mint ${String(params.amount ?? "0")} GT to wallet ${quote(String(params.to ?? ""))}.`;
    case 11:
      return "Lock the governance start configuration so setup-only actions can no longer be executed.";
    default:
      return "";
  }
}

export function getFallbackProposalSummary(actionType: number) {
  return getProposalDisplayName(actionType);
}

export function getFallbackProposalDetails(actionType: number, params?: Record<string, unknown>) {
  if (!params) return [];
  return getProposalDisplayFields(actionType, params);
}
