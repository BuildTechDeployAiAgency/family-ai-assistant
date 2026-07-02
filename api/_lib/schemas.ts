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

// Task edit — toggle completion and/or change the due date (snooze to the
// future, or clear it). At least one field required.
export const taskPatchSchema = z
  .object({
    completed: z.boolean().optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD')
      .nullable()
      .optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

// Action step (child of a task) — create requires a title; task_id comes from
// the body and is re-verified against the caller's family server-side.
export const stepCreateSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  detail: z.string().trim().max(2000).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const stepUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    detail: z.string().trim().max(2000).nullable().optional(),
    completed: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
    status: z.enum(['active', 'proposed', 'archived']).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

// New family member — name required; the rest optional with sane defaults.
export const memberCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  memberType: z.enum(['adult', 'child', 'household']).default('child'),
  role: z.string().trim().max(60).nullable().optional(),
  grade: z.string().trim().max(60).nullable().optional(),
  avatar: z.string().min(1).max(16).optional(), // emoji
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be a #RRGGBB hex').optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
    .nullable()
    .optional(),
});

// Family member edit — all fields optional; at least one required.
export const memberUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    role: z.string().trim().max(60).nullable().optional(),
    grade: z.string().trim().max(60).nullable().optional(),
    avatar: z.string().min(1).max(16).optional(), // emoji
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be a #RRGGBB hex').optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
      .nullable()
      .optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

// Per-user assistant preferences — all optional; at least one required.
export const preferencesUpdateSchema = z
  .object({
    tone: z.enum(['concise', 'detailed', 'warm']).optional(),
    assistant_name: z.string().trim().max(40).nullable().optional(),
    ai_model: z.string().trim().max(60).optional(),
    language: z.string().trim().max(10).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

// Family memory fact — what the agent durably knows about a family.
export const memoryCreateSchema = z.object({
  fact: z.string().trim().min(1).max(500),
  kind: z.enum(['fact', 'preference', 'event', 'place', 'relationship', 'other']).default('fact'),
  salience: z.number().int().min(0).max(100).default(50),
});

export const memoryUpdateSchema = z
  .object({
    fact: z.string().trim().min(1).max(500).optional(),
    kind: z.enum(['fact', 'preference', 'event', 'place', 'relationship', 'other']).optional(),
    salience: z.number().int().min(0).max(100).optional(),
    status: z.enum(['active', 'proposed', 'archived']).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

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
