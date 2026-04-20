// The EnvBanner component is responsible for checking the presence and validity of critical environment variables required for the application to function properly. It verifies if the necessary environment variables are set and not left as placeholders, which could indicate a misconfiguration. If any required environment variables are missing or still set to their placeholder values, the component renders a warning banner at the top of the application, informing the developer about the specific variables that need to be updated in the `.env.local` file. This proactive check helps ensure that developers are aware of any configuration issues early on, preventing potential runtime errors and improving the overall development experience.
function isMissing(value: string | undefined, placeholders: string[] = []) {
  if (!value) return true;
  return placeholders.includes(value);
}

export function EnvBanner() {
  const missing: string[] = [];

  if (isMissing(process.env.NEXT_PUBLIC_SUPABASE_URL, ["https://your-project.supabase.co"])) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (isMissing(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, ["your-anon-key", "public-anon-key"])) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (isMissing(process.env.NEXT_PUBLIC_SEPOLIA_RPC, ["https://eth-sepolia.g.alchemy.com/v2/your-key"])) {
    missing.push("NEXT_PUBLIC_SEPOLIA_RPC");
  }

  if (!missing.length) return null;

  return (
    <div className="border-b border-amber-300/20 bg-amber-400/10 px-6 py-3 text-sm text-amber-100">
      Missing or placeholder environment values detected: {missing.join(", ")}. Update `.env.local` and restart the
      dev server.
    </div>
  );
}
