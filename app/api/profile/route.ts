import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("address", address)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }

    if (data) {
      await supabase.from("user_profiles").update({ last_login_at: new Date().toISOString() }).eq("address", address);
    }

    return NextResponse.json({ profile: data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Profile lookup failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const address = String(payload.address ?? "").toLowerCase();
    const fullName = String(payload.full_name ?? "").trim();
    const studentId = String(payload.student_id ?? "").trim();
    const email = payload.email ? String(payload.email).trim() : null;
    const bio = payload.bio ? String(payload.bio) : null;
    const avatarUrl = payload.avatar_url ? String(payload.avatar_url) : null;

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const primaryPayload = {
      address,
      full_name: fullName,
      student_id: studentId,
      email,
      avatar_url: avatarUrl,
      bio,
      last_login_at: new Date().toISOString()
    };

    let result = await supabase.from("user_profiles").upsert(primaryPayload, { onConflict: "address" }).select("*").single();

    if (result.error) {
      const fallbackPayload = {
        address,
        full_name: fullName,
        student_id: studentId,
        email,
        last_login_at: new Date().toISOString()
      };
      result = await supabase.from("user_profiles").upsert(fallbackPayload, { onConflict: "address" }).select("*").single();
    }

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: result.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Profile save failed." },
      { status: 500 }
    );
  }
}
