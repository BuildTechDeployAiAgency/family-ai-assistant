import { REFERENCE_DATE } from '@/data/fixtures';

export type Urgency = 'high' | 'medium' | 'low';

export interface DocStatus {
  label: string;
  color: string;
  bg: string;
  icon: string;
  urgency: number; // 0 expired, 1 soon, 2 valid
}

export const getDaysDifference = (futureStr: string, baseStr: string): number => {
  const d1 = new Date(futureStr).getTime();
  const d2 = new Date(baseStr).getTime();
  return Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24));
};

export const getDocumentStatus = (expiryDate: string): DocStatus => {
  // No / invalid expiry (e.g. birth certificate) — neutral, never a green "Valid".
  if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
    return { label: 'No expiry', color: '#615D56', bg: 'rgba(97,93,86,0.10)', icon: '⚪', urgency: 3 };
  }
  const diff = getDaysDifference(expiryDate, REFERENCE_DATE);
  if (diff < 0) return { label: 'Expired', color: '#B23A48', bg: 'rgba(178,58,72,0.10)', icon: '🔴', urgency: 0 };
  if (diff <= 90) return { label: `Soon · ${diff}d`, color: '#C79A3A', bg: 'rgba(199,154,58,0.13)', icon: '🟡', urgency: 1 };
  return { label: 'Valid', color: '#5B8A7A', bg: 'rgba(91,138,122,0.12)', icon: '🟢', urgency: 2 };
};

export const URGENCY_COLOR: Record<Urgency, string> = {
  high: '#B23A48',
  medium: '#C79A3A',
  low: '#5B8A7A',
};

export const formatDate = (str: string): string => {
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CATEGORY_COLORS: Record<string, string> = {
  Identity: '#6366f1',
  Driving: '#0ea5e9',
  Education: '#a855f7',
  Health: '#ef4444',
  Finance: '#10b981',
  Insurance: '#f59e0b',
  Sports: '#14b8a6',
  Travel: '#3b82f6',
  Admin: '#8b5cf6',
  Activities: '#ec4899',
};

export const categoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? '#8fa3c0';
