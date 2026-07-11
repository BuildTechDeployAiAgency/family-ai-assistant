// Single source of "now" for expiry/urgency math. The POC previously pinned
// a fake REFERENCE_DATE ('2026-05-19'); all date logic must go through here.

// YYYY-MM-DD for today (local time).
export function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Whole days from today until the given YYYY-MM-DD date (negative if past).
export function daysUntil(date) {
  const target = new Date(date);
  const now = new Date(today());
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Renewal progress heuristic: 100 when more than 90 days out, scaling to 0.
export function progressFromExpiry(expiryDate) {
  const diffDays = daysUntil(expiryDate);
  return diffDays < 0 ? 0 : diffDays <= 90 ? Math.round((diffDays / 90) * 100) : 100;
}

export function statusFromExpiry(expiryDate) {
  const diffDays = daysUntil(expiryDate);
  return diffDays < 0 ? 'Expired' : diffDays <= 90 ? 'Expiring' : 'Valid';
}
