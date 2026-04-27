import { NextRequest, NextResponse } from "next/server";

import type { RedemptionRecord } from "@/types/database";

import { getReadableErrorMessage } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as Omit<RedemptionRecord, "id">;
    const address = input.address?.toLowerCase();

    if (!address || !input.reward_name || !input.tx_hash || input.cost === undefined || input.cost === null) {
      return NextResponse.json({ error: "Missing redemption fields." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("redemptions")
      .upsert({
        ...input,
        address,
        tx_hash: input.tx_hash.toLowerCase()
      }, { onConflict: "tx_hash" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: getReadableErrorMessage(error, "Redemption save failed.") },
        { status: 500 }
      );
    }

    return NextResponse.json({ redemption: data as RedemptionRecord });
  } catch (error) {
    return NextResponse.json(
      { error: getReadableErrorMessage(error, "Redemption save failed.") },
      { status: 500 }
    );
  }
}
