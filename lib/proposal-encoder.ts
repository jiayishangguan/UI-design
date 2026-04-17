import { encodeAbiParameters } from "viem";

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
    default:
      throw new Error(`Unsupported action type ${actionType}`);
  }
}
