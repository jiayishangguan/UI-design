import { createClient } from "@supabase/supabase-js";

function readSupabaseServerEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || url.includes("example.supabase.co") || url.includes("your-project.supabase.co")) {
    throw new Error(
      "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL in .env.local and restart the dev server."
    );
  }

  const key = serviceKey || anonKey;
  if (!key || key === "public-anon-key" || key === "your-anon-key" || key === "your-service-role-key") {
    throw new Error(
      "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY in .env.local and restart the dev server."
    );
  }

  return { url, key };
}

export function createServerSupabaseClient() {
  const { url, key } = readSupabaseServerEnv();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
