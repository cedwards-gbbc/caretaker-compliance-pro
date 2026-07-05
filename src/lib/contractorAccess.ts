import crypto from "crypto";

export function normalisePhone(input: string) {
  return String(input || "").replace(/[^0-9]/g, "");
}

export function phoneMatches(input: string, stored: string) {
  const a = normalisePhone(input);
  const b = normalisePhone(stored);

  if (!a || !b) return false;

  return a === b || a.endsWith(b) || b.endsWith(a);
}

export function makePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function makeAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
