> **Status:** plan (not yet built). Code snippets are illustrative — adapt import paths (`@/constants/theme` named exports `Brand/FontFamily/Radius`; the doc's `theme.Brand.*` is shorthand), the real Vercel handler signature + `withAuth`, and `resolveMember()`'s real return shape (`resolved.member.id`) to the live repo before editing. Verify every `path:line` first.

# Feature 02 — Family calendar + appointments

## Context & why

The family assistant currently lacks temporal awareness of scheduled events. Appointments ("Bella's dentist Thursday," "school play Friday") are core family logistics. This feature adds CRUD endpoints, a `get_appointments` AI tool, and an agenda-view mobile screen. It feeds Feature 01's attention feed (appointments approaching `starts_at`) and unlocks natural-language scheduling queries ("when's Bella's next appointment?").

## Current state

- **DB:** `appointments` table already exists (migration already applied) with `family_id` FK, `member_id` FK, `starts_at`, `ends_at`, `title`, `location`, `category`, and index `appointments_family_starts_idx(family_id, starts_at)`. **RLS already active** via `family_isolation` policy.
- **Backend:** no appointments route exists. `documents.ts` is the clone template.
- **Mobile:** no calendar screen, no appointments store. Tab bar currently 5 tabs. `identify` Map pattern (name→member color/initials) established in `today.tsx`/`actions.tsx`.
- **AI tools:** no appointment-related tool. `profileCard.ts` has no appointment count.

## Schema changes

**None.** Table + index + RLS already applied. Confirm via:
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'appointments';
-- expect relrowsecurity = true
```

## Backend

### `api/_lib/schemas.ts` — add Zod schemas

```ts
export const appointmentCreateSchema = z.object({
  title: z.string().min(1).max(200),
  owner: z.string().min(1).max(100).optional(),
  location: z.string().max(300).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  category: z.string().max(50).optional(),
});

export const appointmentUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  owner: z.string().min(1).max(100).optional(),
  location: z.string().max(300).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  category: z.string().max(50).optional(),
});
```

### `api/appointments.ts` — full route

Pattern mirrors `api/documents.ts`. `family_id` always from `ctx.familyId`, never body.

```ts
import { withAuth, HttpError } from './_lib/http';
import { appointmentCreateSchema, appointmentUpdateSchema } from './_lib/schemas';
import { resolveMember } from './_lib/members';

interface ClientAppointment {
  id: string; title: string; location: string | null;
  startsAt: string | null; endsAt: string | null;
  category: string | null; owner: string | null; memberId: string | null;
}

function toClient(row: any): ClientAppointment {
  return {
    id: row.id, title: row.title, location: row.location,
    startsAt: row.starts_at, endsAt: row.ends_at, category: row.category,
    owner: row.family_members?.name ?? null, memberId: row.member_id,
  };
}

export default withAuth(['GET', 'POST', 'PATCH', 'DELETE'], async (req, res, ctx) => {
  const { supabase, familyId } = ctx;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('appointments')
      .select('id,title,location,starts_at,ends_at,category,member_id,family_members(name)')
      .order('starts_at', { ascending: true })
      .limit(200);
    if (error) throw new HttpError(500, error.message);
    return res.status(200).json({ appointments: data.map(toClient) });
  }

  if (req.method === 'POST') {
    const body = appointmentCreateSchema.parse(req.body);
    let memberId: string | null = null;
    if (body.owner) {
      const resolved = await resolveMember(supabase, body.owner);
      memberId = resolved.status === 'ok' ? resolved.member.id : null;
    }
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        family_id: familyId,           // ← ALWAYS ctx, never body
        member_id: memberId,
        title: body.title,
        location: body.location ?? null,
        starts_at: body.startsAt ?? null,
        ends_at: body.endsAt ?? null,
        category: body.category ?? null,
      })
      .select('id,title,location,starts_at,ends_at,category,member_id,family_members(name)')
      .single();
    if (error) throw new HttpError(500, error.message);
    return res.status(201).json(toClient(data));
  }

  if (req.method === 'PATCH') {
    const id = req.query.id as string;
    if (!id) throw new HttpError(400, 'Missing ?id=');
    const body = appointmentUpdateSchema.parse(req.body);
    let memberId: string | null | undefined = undefined;
    if (body.owner !== undefined) {
      if (body.owner === '') memberId = null;
      else {
        const resolved = await resolveMember(supabase, body.owner);
        memberId = resolved.status === 'ok' ? resolved.member.id : null;
      }
    }
    const patch: Record<string, unknown> = {};
    if (body.title !== undefined)    patch.title = body.title;
    if (body.location !== undefined) patch.location = body.location;
    if (body.startsAt !== undefined) patch.starts_at = body.startsAt;
    if (body.endsAt !== undefined)   patch.ends_at = body.endsAt;
    if (body.category !== undefined) patch.category = body.category;
    if (memberId !== undefined)      patch.member_id = memberId;

    const { data, error } = await supabase
      .from('appointments')
      .update(patch)
      .eq('id', id)
      .eq('family_id', familyId)     // ← defensive double-scope
      .select('id,title,location,starts_at,ends_at,category,member_id,family_members(name)')
      .single();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'Appointment not found');
    return res.status(200).json(toClient(data));
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    if (!id) throw new HttpError(400, 'Missing ?id=');
    const { error } = await supabase
      .from('appointments').delete()
      .eq('id', id).eq('family_id', familyId);   // ← defensive double-scope
    if (error) throw new HttpError(500, error.message);
    return res.status(204).end();
  }

  throw new HttpError(405, 'Method not allowed');
});
```

### `api/_lib/profileCard.ts` — extend live counts

Add 7-day appointment count alongside existing member/activity counts.

```ts
const sevenDaysAhead = new Date(env.REFERENCE_DATE);
sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

const { count: upcomingAppts } = await supabase
  .from('appointments')
  .select('id', { count: 'exact', head: true })
  .gte('starts_at', env.REFERENCE_DATE)
  .lt('starts_at', sevenDaysAhead.toISOString());

// Append to profile card text:
`${upcomingAppts ?? 0} appointments in next 7 days`
```

## Mobile

### `mobile/src/lib/api.ts` — add methods + `Appointment` type

```ts
export interface Appointment {
  id: string; title: string; location: string | null;
  startsAt: string | null; endsAt: string | null;
  category: string | null; owner: string | null; memberId: string | null;
}

export const api = {
  // …existing…
  appointments: () => authedFetch<{ appointments: Appointment[] }>('/appointments'),
  createAppointment: (input: { title: string; owner?: string; location?: string; startsAt?: string; endsAt?: string; category?: string; }) =>
    authedFetch<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(input) }),
  updateAppointment: (id: string, input: Partial<{ title: string; owner: string; location: string; startsAt: string; endsAt: string; category: string; }>) =>
    authedFetch<Appointment>(`/appointments?id=${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAppointment: (id: string) => authedFetch<void>(`/appointments?id=${id}`, { method: 'DELETE' }),
};
```

### `mobile/src/store/appointments.tsx` — provider

Mirrors `documents.tsx` optimistic pattern; keep sorted by `startsAt` asc on every mutation.

```tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api, Appointment } from '../lib/api';

interface AppointmentsCtx {
  appointments: Appointment[];
  loading: boolean;
  refresh: () => Promise<void>;
  addAppointment: (input: Parameters<typeof api.createAppointment>[0]) => Promise<void>;
  updateAppointment: (id: string, input: Parameters<typeof api.updateAppointment>[1]) => Promise<void>;
  removeAppointment: (id: string) => Promise<void>;
}
const Ctx = createContext<AppointmentsCtx | null>(null);

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const sortByStart = (xs: Appointment[]) => [...xs].sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));

  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { appointments } = await api.appointments(); setAppointments(sortByStart(appointments)); }
    finally { setLoading(false); }
  }, []);
  const addAppointment: AppointmentsCtx['addAppointment'] = useCallback(async (input) => {
    const created = await api.createAppointment(input); setAppointments((p) => sortByStart([...p, created]));
  }, []);
  const updateAppointment: AppointmentsCtx['updateAppointment'] = useCallback(async (id, input) => {
    const updated = await api.updateAppointment(id, input); setAppointments((p) => sortByStart(p.map((a) => (a.id === id ? updated : a))));
  }, []);
  const removeAppointment: AppointmentsCtx['removeAppointment'] = useCallback(async (id) => {
    setAppointments((p) => p.filter((a) => a.id !== id)); await api.deleteAppointment(id);
  }, []);

  return <Ctx.Provider value={{ appointments, loading, refresh, addAppointment, updateAppointment, removeAppointment }}>{children}</Ctx.Provider>;
}
export function useAppointments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppointments must be used within AppointmentsProvider');
  return ctx;
}
```

Register in the app providers tree in `mobile/src/app/_layout.tsx`, sibling to `DocumentsProvider`.

### `(tabs)/_layout.tsx` — add calendar tab

Tab bar becomes 6 tabs. Order: `today`, `calendar`, `index` (Documents), `school`, `actions`, `ask` (or trim per owner taste — note 6 tabs is crowded on small screens; consider folding School under Actions later).

```tsx
<Tabs.Screen name="calendar" options={{
  title: 'Calendar',
  tabBarIcon: ({ color }) => <CalendarBlank size={24} color={color} weight="duotone" />,
}} />
```
`CalendarBlank` from `phosphor-react-native`.

### `(tabs)/calendar.tsx` — agenda list screen (v1)

Groups appointments by day (upcoming first); reuses the `identify` Map from the members store for color-coded member chips. Uses `Card`/`SectionLabel` from `components/ui.tsx`, `SkeletonRows`/`EmptyState` from `components/States.tsx`, and `Brand/Radius/FontFamily` from `@/constants/theme`. A FAB → `/appointment/new`. (Full component sketch — adapt tokens/imports.)

```tsx
// grouping + rendering skeleton
const grouped = useMemo(() => {
  const groups: Record<string, Appointment[]> = {};
  appointments.forEach((a) => { const day = (a.startsAt ?? '').slice(0,10) || 'unscheduled'; (groups[day] ??= []).push(a); });
  return Object.entries(groups).sort(([a],[b]) => a.localeCompare(b));
}, [appointments]);

if (loading) return <SkeletonRows rows={5} />;
if (appointments.length === 0)
  return <EmptyState icon={CalendarBlank} title="No appointments yet" body="Add Bella's dentist, school events, and more." actionLabel="Add appointment" onAction={() => router.push('/appointment/new')} />;
// else: map grouped → <SectionLabel>{dayHeader}</SectionLabel> + member-chip rows (time · title · location).
```

### `mobile/src/app/appointment/new.tsx` — create modal

Stack route, `presentation: 'modal'` (register in `app/_layout.tsx` alongside `/scan`). Fields: title, date picker, time picker, member picker (from `useData().members`), location, category. On submit → `addAppointment({ title, owner: member?.name, location, startsAt: combinedISO, category })` → `router.back()`. Reuse form styling from `scan.tsx` review UI.

## AI agent

### `api/_lib/tools.ts` — add `get_appointments`

Tool def (add to `toolDefs`):
```ts
{
  name: 'get_appointments',
  description: 'Retrieve family appointments. Filter by member, date range, or upcoming only. Returns title, location, start/end times, category, and owner name.',
  parameters: { type: 'object', properties: {
    member_name:   { type: 'string',  description: 'Family member name (fuzzy). Omit for all.' },
    from_date:     { type: 'string',  description: 'Range start YYYY-MM-DD (inclusive).' },
    to_date:       { type: 'string',  description: 'Range end YYYY-MM-DD (inclusive).' },
    upcoming_only: { type: 'boolean', description: 'If true, only from today (REFERENCE_DATE) onward.' },
  } },
}
```

Handler (add to `runTool` switch):
```ts
case 'get_appointments': {
  const { memberId, short } = await memberFilter(supabase, args.member_name);
  if (short) return short;
  let q = supabase.from('appointments')
    .select('title,location,starts_at,ends_at,category,family_members(name)')
    .order('starts_at', { ascending: true }).limit(ROW_CAP);   // RLS auto-scopes
  if (memberId) q = q.eq('member_id', memberId);
  if (args.upcoming_only === true) q = q.gte('starts_at', env.REFERENCE_DATE);
  if (args.from_date) q = q.gte('starts_at', args.from_date + 'T00:00:00');
  if (args.to_date)   q = q.lte('starts_at', args.to_date + 'T23:59:59');
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { today: env.REFERENCE_DATE, appointments: (data ?? []).map((a) => ({
    title: a.title, location: a.location, startsAt: a.starts_at, endsAt: a.ends_at,
    category: a.category, owner: a.family_members?.name ?? null,
  })) };
}
```

Unlocks: "When's Bella's dentist?" → `get_appointments({member_name:"Bella"})`; "What's coming up this week?" → `get_appointments({upcoming_only:true, to_date:"2026-05-25"})`.

## Isolation & security review

| Vector | Mitigation |
|---|---|
| Cross-family read | RLS `family_isolation` on `appointments` (already active); `auth_family_id()` from JWT. |
| Cross-family write (POST) | `family_id` set exclusively from `ctx.familyId`; body never trusted for it. |
| Cross-family PATCH/DELETE | `.eq('family_id', ctx.familyId)` added defensively on top of RLS. |
| AI tool leak | `runTool` gets `userClient(token)` — RLS active; no `serviceClient`. |
| `member_id` spoofing | `resolveMember` runs within RLS-scoped `family_members` — can't resolve outside the family. |

**Cross-family probe:** as Family B, `GET /appointments` returns `[]`; `PATCH /appointments?id=<A's id>` → 404 (RLS hides row, `.single()` null).

## Effort, sequencing, dependencies

- Size **M** (~10h). **No migration dependency** — table exists; can start immediately.
- Backend (schemas → route → tool → profileCard) and mobile (api → store → screen → modal) partially parallelize after the schema contract is agreed.
- **Feeds Feature 01** (attention feed reads upcoming appointments) and enriches the agent.
- Fast-follow (out of scope): month-grid view, recurrence, all-day events, timezone refinement.

## Step-by-step task list

1. `schemas.ts` — add `appointmentCreateSchema` + `appointmentUpdateSchema`.
2. `api/appointments.ts` — clone `documents.ts`; GET/POST/PATCH/DELETE with `family_members(name)` join; `ctx.familyId` + defensive `.eq('family_id')`.
3. `tools.ts` — add `get_appointments` to `toolDefs` + `runTool` case (member/date filters, ROW_CAP).
4. `profileCard.ts` — add 7-day appointment count to live counts.
5. `api.ts` — add `Appointment` type + 4 methods.
6. `store/appointments.tsx` — `AppointmentsProvider` + `useAppointments` (optimistic, sorted).
7. `app/_layout.tsx` — wrap provider; register `appointment/new` modal route.
8. `(tabs)/_layout.tsx` — add `calendar` tab (`CalendarBlank`).
9. `(tabs)/calendar.tsx` — agenda grouped by day; member chips via `identify`; `EmptyState`/`SkeletonRows`; FAB.
10. `app/appointment/new.tsx` — modal create form (member picker from `useData().members`).
11. `./node_modules/.bin/tsc --noEmit` (mobile) + `tsc` (api) clean.
12. Deploy backend + PWA; seed a test appointment; verify.

## Verification

- `./node_modules/.bin/tsc --noEmit` (mobile) + api tsc clean; `expo export -p web` clean (no new deps beyond a date/time picker if used).
- `get_advisors` → no new RLS gaps (no schema change, but confirm).
- Backend curl probes (auth as test family): POST create → 201; GET → includes it; as Family B GET → `{appointments:[]}`; PATCH B on A's id → 404. **Cross-family probe must return 0 rows.**
- Agent probe: `POST /api/ai/ask {"question":"When is Bella's dentist appointment?"}` → answer cites the seeded appointment, `toolsUsed` includes `get_appointments`.
- Mobile: demo login `diogo@family.ai` / `familyai123` → Calendar tab renders agenda with seeded appt (day header, member chip color/initials, time, location); empty state when none; FAB opens create modal; optimistic add appears immediately. PWA deploy + SW-bust screenshot.
- Profile card: Ask a question → system prompt includes "N appointments in next 7 days".
