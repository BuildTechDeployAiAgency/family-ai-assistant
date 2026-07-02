> **Status:** plan (not yet built). Code is illustrative — align import paths, the real tool return-shape keys (e.g. `get_school_results` returns `results` vs another key), and color literals with `@/constants/theme` tokens before editing. Verify every `path:line` first.

# Feature 03 — Grounded source cards

## Context & why

Every AI answer currently asserts facts with no visible proof. "Your son's passport expires in March" may be grounded, but the user has no way to verify or jump to the source row. This feature turns implicit provenance — rows already read by tools during the ask loop — into tappable "source cards" under the answer. Pure trust/UX win; the data and the RLS guarantees already exist.

Strictly additive. No schema migration, no new tables, no model behavior change. Effort **S–M**.

## Current state

- `api/_lib/tools.ts` — each tool SELECTs row fields but **omits `id`**, so the client can never route to a specific row.
- `api/ai/ask.ts` — loops `MAX_ROUNDS=4`, each `runTool()` result is JSON-stringified into the tool message and **dropped** after; response shape `{answer, toolsUsed}`.
- `mobile/src/app/(tabs)/ask.tsx` — `Turn{role,text}`; renders assistant text via `Markdown.tsx`; no notion of sources.
- `mobile/src/lib/api.ts` — `ask()` typed to `{answer:string;toolsUsed:string[]}`.
- Routes exist: `/document/[id]`, `/action/[id]`, `/email/[id]`, `/calendar` (Feature 02). RLS-enforced server reads on each.
- REFERENCE_DATE = 2026-05-19.

## Schema changes

**None.** `id` is already the PK on every relevant table; we only change SELECT lists. Additive-only, no migration.

## Backend

### `api/_lib/tools.ts`

Add `id` to every tool SELECT (keep ROW_CAP=50). Tools stay pure data — the `Source` mapping lives in `ask.ts`.

```ts
// get_documents — add id
.select('id,title,category,document_number,expiry_date,status,progress,family_members(name)')
// get_tasks — add id
.select('id,title,priority,due_date,completed,family_members(name)')
// get_appointments — add id (Feature 02)
.select('id,title,location,starts_at,ends_at,category,family_members(name)')
// get_school_results — add id
.select('id,subject,term,grade,numeric_score,result_date')
// get_family_member — add id (uniformity; NOT surfaced as a source)
.select('id,name,aliases,...')
```

`id` is additive; existing consumers ignore unknown keys.

### `api/ai/ask.ts`

Accumulate sources as tools run; include in the response.

```ts
type SourceType = 'document' | 'task' | 'appointment' | 'email' | 'school';
type Source = { type: SourceType; id: string; title: string; route: string | null };
const SOURCE_CAP = 12;

function collectSources(toolName: string, output: unknown): Source[] {
  if (!output || typeof output !== 'object') return [];
  const o = output as Record<string, unknown>;
  const listKey =
    toolName === 'get_documents'      ? 'documents' :
    toolName === 'get_tasks'          ? 'tasks' :
    toolName === 'get_appointments'   ? 'appointments' :
    toolName === 'get_school_results' ? 'results' :   // ← confirm actual key in tools.ts
    null;
  if (!listKey || !Array.isArray(o[listKey])) return [];

  return (o[listKey] as any[])
    .filter((r) => r && typeof r === 'object' && typeof r.id === 'string')
    .map((r): Source | null => {
      const id = String(r.id);
      const title = (typeof r.title === 'string' && r.title) ||
                    (typeof r.subject === 'string' && r.subject) ||
                    (typeof r.term === 'string' && r.term) || id;
      switch (toolName) {
        case 'get_documents':      return { type:'document',    id, title, route:`/document/${id}` };
        case 'get_tasks':          return { type:'task',        id, title, route:`/action/${id}` };
        case 'get_appointments':   return { type:'appointment', id, title, route:`/calendar` /* future /appointment/${id} */ };
        case 'get_school_results': return { type:'school',      id, title, route:null };
        default: return null;
      }
    })
    .filter((s): s is Source => s !== null);
}
```

In the loop:

```ts
const acc: Source[] = [];
// for each tool call:
const output = await runTool(ctx.supabase, call.function.name, args);
acc.push(...collectSources(call.function.name, output));
// ...push tool message as today...

// after loop:
const key = (s: Source) => `${s.type}:${s.id}`;
const sources = acc.filter((s, i, a) => a.findIndex(x => key(x) === key(s)) === i).slice(0, SOURCE_CAP);
return res.json({ answer, toolsUsed, sources });
```

v1 contract: **every row a tool surfaced this turn is a candidate source** (we don't parse prose for "cited" rows). This is grounding provenance — the rows behind the answer. Capped at 12.

### Why this is safe (v1)

Every `id` in `sources` was returned by a tool SELECT that ran through `ctx.supabase` — the request-scoped client built off the JWT's `family_id` in `api/_lib/http.ts authenticate()`. RLS via `auth_family_id()` already filters every row, so a cross-family id can never appear in `output` and therefore never in `sources`. `collectSources` only copies ids that survived RLS — it never re-reads by id.

## Mobile

### `mobile/src/lib/api.ts`

```ts
export type SourceType = 'document'|'task'|'appointment'|'email'|'school';
export type Source = { type: SourceType; id: string; title: string; route: string | null };

export function ask(question: string) {
  return authedFetch<{ answer:string; toolsUsed:string[]; sources?: Source[] }>(
    '/ai/ask', { method:'POST', body: JSON.stringify({ question }) });
}
```

### `mobile/src/app/(tabs)/ask.tsx`

```ts
type Turn = { role:'user'|'assistant'; text:string; sources?: Source[] };
// on response:
append({ role:'assistant', text: answer, sources });
// render — assistant turn only, BELOW the markdown block:
{turn.role === 'assistant' && turn.sources?.length ? <SourceCards sources={turn.sources} /> : null}
```

`Markdown` rendering stays untouched.

### `mobile/src/components/SourceCards.tsx` (new)

Wrapped row of Almanac chips. Tappable via `router.push(route)`; `route===null` → informational only (no press). Icon by `type` via a small `SourceIcon` switch (document→FileText, task→CheckCircle, appointment→CalendarBlank, school→GraduationCap, email→Envelope). Chip uses cobalt `accentWash` bg, `accent` text/icon.

```tsx
import { Pressable, View, Text } from 'react-native';
import { router } from 'expo-router';
import { Brand, FontFamily, Radius } from '@/constants/theme';
import type { Source } from '@/lib/api';
import { SourceIcon } from './SourceIcon';

export function SourceCards({ sources }: { sources: Source[] }) {
  return (
    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
      {sources.map((s) => {
        const inner = (
          <View style={{ paddingVertical:8, paddingHorizontal:10, backgroundColor: Brand.accentWash,
                         borderRadius: Radius.sm, flexDirection:'row', alignItems:'center', gap:8, maxWidth:220 }}>
            <SourceIcon type={s.type} />
            <View style={{ flexShrink:1 }}>
              <Text numberOfLines={1} style={{ fontFamily: FontFamily.semibold, color: Brand.accent }}>{s.title}</Text>
              <Text style={{ color: Brand.faint, fontSize: 11, fontFamily: FontFamily.medium }}>{s.type}</Text>
            </View>
          </View>
        );
        return s.route
          ? <Pressable key={`${s.type}:${s.id}`} onPress={() => router.push(s.route!)}
                       style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{inner}</Pressable>
          : <View key={`${s.type}:${s.id}`}>{inner}</View>;
      })}
    </View>
  );
}
```

Visual reference: `documentation/designs/ui-exploration-almanac/` (03-states family) — source-card row under an answer bubble, cobalt-wash chips with a leading glyph.

## AI agent

No prompt change in v1. The model calls tools as today; the loop harvests whatever rows were touched. We do **not** ask for inline `[1]`/`[2]` citation markers — keeps v1 deterministic, independent of model compliance. Optional later: a `respond_with_citations` instruction to map prose markers → cards.

## Isolation & security review

- **Family isolation**: `sources` ids originate exclusively from `runTool()` outputs run against the JWT-scoped client (`ctx.supabase`) filtered by `auth_family_id()`. No id is read from request body, model args, or free-text lookup. A family-A answer can't contain a family-B id.
- **No new untrusted input**: `collectSources` is a pure transform; `route` is a constant prefix + already-RLS-vetted `id`. No model string reaches the router path verbatim.
- **Defense in depth on client**: `/document/[id]` etc. re-fetch via the authed client → RLS re-applies; a stale/guessed id just 404s.
- **Cost/latency**: O(rows) post-processing, capped 12; no extra LLM call, no extra DB roundtrip.

## Effort, sequencing, dependencies

- Backend ~1.5h (add `id` to 5 SELECTs; `collectSources` + dedupe/cap + response field).
- Mobile ~2h (type widening; `Turn.sources?`; `SourceCards.tsx` + `SourceIcon`; render hook).
- No migration, no env, no model change, no new route. Appointment cards route to `/calendar` until Feature 02's per-appointment route exists.
- Sequencing: backend first (response shape gates mobile type), then mobile. Independent of the other features (ship anytime; recommended first — smallest, highest trust payoff).

## Step-by-step task list

1. `api/_lib/tools.ts`: add `id` to SELECTs in all 5 tools. Keep ROW_CAP=50.
2. `api/ai/ask.ts`: add `SourceType`/`Source`/`SOURCE_CAP`/`collectSources`.
3. In loop, after `runTool`, `acc.push(...collectSources(call.function.name, output))`.
4. After loop, dedupe by `${type}:${id}`, slice 12, return `{answer, toolsUsed, sources}`.
5. `mobile/src/lib/api.ts`: widen `ask` return type; export `Source`/`SourceType`.
6. `mobile/src/components/SourceIcon.tsx`: 5-case Phosphor icon switch.
7. `mobile/src/components/SourceCards.tsx`: wrapped pressable chips, `accentWash`, null-route → non-pressable.
8. `mobile/src/app/(tabs)/ask.tsx`: extend `Turn`; render `<SourceCards/>` under assistant markdown when present.
9. Verify.

## Verification

- `api` tsc clean; `mobile` `./node_modules/.bin/tsc --noEmit` clean; `expo export -p web` clean.
- Ask "Which of our documents expire soon?" → `get_documents` fires → cobalt source cards appear under the answer → tap → lands on `/document/[id]` for that exact doc.
- Ask "What's on our calendar this week?" → `get_appointments` fires → appointment cards route to `/calendar`.
- **Cross-family probe**: two seeded families A/B; ask family A a `get_documents` question; assert every `sources[].id` resolves under A's JWT and 404s under B's (RLS). No cross-family id can surface.
- Confirm `get_family_member` rows produce **no** source cards.
