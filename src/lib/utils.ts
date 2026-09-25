import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black — whichever is easier to read on top of `hex`. */
export function readableTextOn(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#ffffff";
  const l = luminance(hex);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithDark = (l + 0.05) / (luminance("#0f172a") + 0.05);
  return contrastWithWhite >= contrastWithDark ? "#ffffff" : "#0f172a";
}

export function initials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

export function formatMoney(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a plain date column ("2026-09-01") without timezone shifting. */
export function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  pending: "Waiting for approval",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Everything, plus members, settings and deleting grants",
  editor: "Add and edit grants, files, budget and outreach",
  viewer: "Read everything and leave comments (good for mentors and parents)",
};
