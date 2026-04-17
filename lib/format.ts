export function formatAddress(address?: string | null, size = 4) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-size)}`;
}

export function formatToken(value?: bigint | number | null) {
  if (value === undefined || value === null) return "0";
  return typeof value === "bigint" ? value.toString() : String(value);
}

export function formatDateTime(value?: string | number | bigint | null) {
  if (!value) return "—";
  const date = new Date(typeof value === "string" ? value : Number(value));
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatRelativeCountdown(targetSeconds?: number | bigint) {
  if (!targetSeconds) return "—";
  const delta = Number(targetSeconds) * 1000 - Date.now();
  if (delta <= 0) return "Ready";
  const hours = Math.floor(delta / 1000 / 3600);
  const minutes = Math.floor((delta / 1000 % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function lowerCaseAddress(address?: string | null) {
  return address ? address.toLowerCase() : "";
}

export function buildRedemptionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "CS-";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
