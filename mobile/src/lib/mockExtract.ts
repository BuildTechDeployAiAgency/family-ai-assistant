import { REFERENCE_DATE, type MemberKey } from '@/data/fixtures';

export interface Extraction {
  name: string;
  number: string;
  category: string;
  owner: MemberKey;
  expiryDate: string;
  confidence: number; // 0-1
}

// Simulated multimodal extraction. No backend yet — the AI proxy (Phase 3)
// replaces this. Rotates through believable templates so repeat scans vary.
const TEMPLATES: Omit<Extraction, 'number' | 'expiryDate'>[] = [
  { name: 'Emirates ID', category: 'Identity', owner: 'Ahmed', confidence: 0.96 },
  { name: 'Tenancy Contract (Ejari)', category: 'Finance', owner: 'Family', confidence: 0.91 },
  { name: 'Vehicle Registration (Mulkiya)', category: 'Driving', owner: 'Family', confidence: 0.94 },
  { name: 'Vaccination Certificate', category: 'Health', owner: 'Layla', confidence: 0.88 },
  { name: 'Residency Visa', category: 'Admin', owner: 'Sara', confidence: 0.93 },
  { name: 'Trade Licence', category: 'Finance', owner: 'Ahmed', confidence: 0.9 },
];

let cursor = 0;

const addMonths = (base: string, months: number): string => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const randNumber = (i: number): string => {
  const prefix = ['EID', 'EJ', 'MLK', 'VAC', 'VISA', 'TL'][i % 6];
  const n = 100000 + ((i * 48271 + 12345) % 899999);
  return `${prefix}-${n}`;
};

// Resolves after a short delay to mimic an AI round-trip.
export function extractFromImage(): Promise<Extraction> {
  const i = cursor;
  cursor += 1;
  const tpl = TEMPLATES[i % TEMPLATES.length];
  // expiry between 1 and 24 months out from the reference "now"
  const months = 1 + ((i * 7) % 24);
  const result: Extraction = {
    ...tpl,
    number: randNumber(i),
    expiryDate: addMonths(REFERENCE_DATE, months),
  };
  return new Promise((resolve) => setTimeout(() => resolve(result), 1600));
}
