import { z } from 'zod';

// ── Request schemas (validated at every function entry) ──────────────────────
export const askRequestSchema = z.object({
  question: z.string().min(1).max(2000),
});

export const extractRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default('image/jpeg'),
});

// Document create — mirrors the mobile FamilyDocument shape (minus id).
export const documentCreateSchema = z.object({
  name: z.string().min(1),
  number: z.string().default(''),
  category: z.string().default('Other'),
  owner: z.string().default('Family'), // member name; resolved server-side
  expiryDate: z.string().nullable().optional(), // YYYY-MM-DD
  progress: z.number().int().min(0).max(100).default(0),
});

export const taskPatchSchema = z.object({
  completed: z.boolean(),
});

// ── LLM output schema (validated BEFORE any DB write / response) ──────────────
// Grounded in mobile/src/lib/mockExtract.ts Extraction shape.
export const extractionSchema = z.object({
  name: z.string(),
  number: z.string().default(''),
  category: z.string(),
  owner: z.string(), // member name; mapped to a canonical member after extraction
  expiryDate: z.string().nullable(), // YYYY-MM-DD or null
  confidence: z.number().min(0).max(1),
});

export type Extraction = z.infer<typeof extractionSchema>;
