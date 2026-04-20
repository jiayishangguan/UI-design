import { formatUnits, parseUnits } from "viem";

export const TOKEN_DECIMALS = 18;

function addThousandsSeparators(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDecimalString(value: string, fractionDigits: number) {
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [wholeRaw = "0", fractionRaw = ""] = normalized.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";

  if (fractionDigits <= 0) {
    return `${negative ? "-" : ""}${addThousandsSeparators(whole)}`;
  }

  const fraction = `${fractionRaw}${"0".repeat(fractionDigits)}`.slice(0, fractionDigits);
  return `${negative ? "-" : ""}${addThousandsSeparators(whole)}.${fraction}`;
}

export function formatAddress(address?: string | null, size = 4) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-size)}`;
}

export function formatToken(value?: bigint | null, fractionDigits = 3) {
  if (value === undefined || value === null) return "0";
  return formatDecimalString(formatUnits(value, TOKEN_DECIMALS), fractionDigits);
}

export function formatDisplayToken(value?: number | string | null, fractionDigits = 3) {
  if (value === undefined || value === null || value === "") return "0";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return formatDecimalString(numeric.toFixed(fractionDigits), fractionDigits);
}

export function parseTokenInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;

  try {
    return parseUnits(trimmed, TOKEN_DECIMALS);
  } catch {
    return null;
  }
}

export function formatDateTime(value?: string | number | bigint | null) {
  if (!value) return "N/A";
  const date = new Date(typeof value === "string" ? value : Number(value));
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatRelativeCountdown(targetSeconds?: number | bigint) {
  if (!targetSeconds) return "N/A";
  const delta = Number(targetSeconds) * 1000 - Date.now();
  if (delta <= 0) return "Ready";
  const totalSeconds = Math.floor(delta / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(delta / 1000 / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  if (seconds > 0) return `${seconds}s`;
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
