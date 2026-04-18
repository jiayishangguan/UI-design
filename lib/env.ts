import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().default(11155111),
  NEXT_PUBLIC_SEPOLIA_RPC: z.string().min(1).default("https://rpc.sepolia.org"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).default("https://example.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("public-anon-key")
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_SEPOLIA_RPC: process.env.NEXT_PUBLIC_SEPOLIA_RPC,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});
