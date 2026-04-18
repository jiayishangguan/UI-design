import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

import rewardRedemption from "@/Contracts/abis/RewardRedemption.json";
import deployment from "@/Contracts/sepolia.json";

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://rpc.sepolia.org")
});

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const cost = (await client.readContract({
      address: deployment.contracts.RewardRedemption as `0x${string}`,
      abi: rewardRedemption.abi,
      functionName: "getCurrentCost",
      args: [BigInt(id)]
    })) as bigint;

    return NextResponse.json({ cost: cost.toString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch cost" },
      { status: 500 }
    );
  }
}
