import { encodeAbiParameters } from "viem";

import { contractAddresses } from "@/lib/contracts/addresses";

export function getExpectedTargetForAction(actionType: number): `0x${string}` | null {
  switch (actionType) {
    case 0:
    case 1:
    case 12:
      return "0x0000000000000000000000000000000000000000";
    case 2:
    case 3:
      return contractAddresses.AMMPool as `0x${string}`;
    case 5:
    case 11:
      return contractAddresses.GreenToken as `0x${string}`;
    case 6:
    case 7:
      return contractAddresses.RewardToken as `0x${string}`;
    case 8:
    case 9:
      return contractAddresses.RewardRedemption as `0x${string}`;
    case 10:
      return null;
    case 4:
      return null;
    default:
      return null;
  }
}

export function isActionTargetValid(actionType: number, targetContract: `0x${string}`) {
  if (actionType === 10) return targetContract !== "0x0000000000000000000000000000000000000000";
  if (actionType === 4) return false;

  const expectedTarget = getExpectedTargetForAction(actionType);
  if (!expectedTarget) return true;

  return expectedTarget.toLowerCase() === targetContract.toLowerCase();
}

export function getGovernanceExecutionHint(actionType: number, targetContract: string) {
  const expectedTarget = getExpectedTargetForAction(actionType);

  if (actionType === 4) {
    return "SET_FEE_RECIPIENT is a reserved enum slot and should not be executed from the current UI.";
  }

  if (expectedTarget && expectedTarget.toLowerCase() !== targetContract.toLowerCase()) {
    return `This proposal points to the wrong target contract. Action ${actionType} should use ${expectedTarget}, but this proposal targets ${targetContract}.`;
  }

  switch (actionType) {
    case 2:
      return "INIT_POOL can only execute if the treasury already holds enough GT and RT and has approved the AMMPool contract for both transfers.";
    case 3:
      return "INJECT_BUFFER can fail if the amount is zero, exceeds the buffer cap, or if the source transfer into the AMM buffer fails.";
    case 5:
    case 6:
      return "SET_*_MINTER should target the correct token contract. If the token contract rejects the caller or the address is invalid, execution will fail.";
    case 7:
      return "MINT_RT only works if CommitteeManager is currently the RewardToken minter.";
    case 8:
      return "ADD_REWARD must target RewardRedemption. The reward name and base cost must be encoded correctly.";
    case 9:
      return "REMOVE_REWARD must target RewardRedemption and use a valid reward ID.";
    case 10:
      return "GENERIC_CALL will fail if the target address or calldata does not match a real callable function on the target contract.";
    case 11:
      return "MINT_GT only works if CommitteeManager is currently the GreenToken minter.";
    case 12:
      return "LOCK_START can only be executed once. After start is locked, setup-only actions cannot be executed anymore.";
    default:
      return "The proposal reached execution but the target contract call reverted. Check the target contract, argument encoding, and any on-chain preconditions.";
  }
}

export function encodeProposalData(actionType: number, params: Record<string, unknown>) {
  switch (actionType) {
    case 0:
    case 1:
    case 5:
    case 6:
      return encodeAbiParameters([{ type: "address" }], [params.address as `0x${string}`]);
    case 2:
      return encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        [BigInt(params.gtAmount as string), BigInt(params.rtAmount as string)]
      );
    case 3:
      return encodeAbiParameters([{ type: "uint256" }], [BigInt(params.amount as string)]);
    case 7:
    case 11:
      return encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [params.to as `0x${string}`, BigInt(params.amount as string)]
      );
    case 8:
      return encodeAbiParameters(
        [{ type: "string" }, { type: "uint256" }],
        [String(params.name ?? ""), BigInt(params.baseCost as string)]
      );
    case 9:
      return encodeAbiParameters([{ type: "uint256" }], [BigInt(params.rewardId as string)]);
    case 10:
      return encodeAbiParameters([{ type: "bytes" }], [params.callData as `0x${string}`]);
    case 12:
      return "0x";
    case 4:
      throw new Error("SET_FEE_RECIPIENT is reserved in the current Solidity contract and cannot be proposed from the UI.");
    default:
      throw new Error(`Unsupported action type ${actionType}`);
  }
}
