-- Family AI Assistant — initial schema (multi-tenant-ready, single-family POC)
-- Every domain row carries family_id NOT NULL. RLS isolates per family via a
-- membership lookup helper (auth_family_id), never auth.uid() directly.
-- See .planning/SPEC-ai-context-architecture.md "Data Model".

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector;

-- ── Tenancy ───────────────────────────────────────────────────────────────--
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text not null default 'Asia/Dubai',
  locale      text not null default 'en',
  quiet_hours jsonb,
  created_at  timestamptz not null default now()
);

-- App-level user, 1:1 with auth.users. Carries the family binding + intra-family role.
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  family_id  uuid not null references public.families (id) on delete cascade,
  email      text,
  role       text not null default 'owner' check (role in ('owner', 'adult', 'viewer')),
  created_at timestamptz not null default now()
);
create index if not exists users_family_id_idx on public.users (family_id);

-- People in the family, incl. children (children have user_id = null).
create table if not exists public.family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  user_id       uuid references public.users (id) on delete set null,
  name          text not null,
  member_type   text not null default 'adult' check (member_type in ('adult', 'child', 'household')),
  role          text,
  date_of_birth date,           -- age is derived, never stored stale
  grade         text,
  avatar        text,
  color         text,
  aliases       text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists family_members_family_id_idx on public.family_members (family_id);
create index if not exists family_members_aliases_gin on public.family_members using gin (aliases);

-- ── Domain (all family_id-scoped) ────────────────────────────────────────────
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  member_id       uuid references public.family_members (id) on delete set null,
  title           text not null,
  category        text,
  document_number text,
  expiry_date     date,
  status          text,
  source_channel  text,
  storage_path    text,
  extracted_raw   jsonb,
  confidence      numeric,
  progress        integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists documents_family_expiry_idx on public.documents (family_id, expiry_date);

create table if not exists public.communications (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  member_id   uuid references public.family_members (id) on delete set null,
  channel     text not null default 'email',
  sender      text,
  subject     text,
  body        text,
  category    text,
  icon        text,
  received_at timestamptz not null default now(),
  source_ref  text,
  read        boolean not null default false,
  processed   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists communications_family_received_idx on public.communications (family_id, received_at desc);

create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  member_id      uuid references public.family_members (id) on delete set null,
  source_comm_id uuid references public.communications (id) on delete set null,
  title          text not null,
  priority       text check (priority in ('high', 'medium', 'low')),
  due_date       date,
  completed      boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists tasks_family_due_open_idx on public.tasks (family_id, due_date) where not completed;

create table if not exists public.school_results (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  member_id     uuid not null references public.family_members (id) on delete cascade,
  subject       text not null,
  term          text,
  grade         text,
  numeric_score numeric,
  result_date   date,
  created_at    timestamptz not null default now()
);
create index if not exists school_results_member_date_idx on public.school_results (family_id, member_id, result_date desc);

create table if not exists public.appointments (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  member_id  uuid references public.family_members (id) on delete set null,
  title      text not null,
  location   text,
  starts_at  timestamptz,
  ends_at    timestamptz,
  category   text,
  created_at timestamptz not null default now()
);
create index if not exists appointments_family_starts_idx on public.appointments (family_id, starts_at);

-- Append-only; powers weekend suggestions later (post-MVP).
create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  member_id  uuid references public.family_members (id) on delete set null,
  kind       text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_family_created_idx on public.activity_log (family_id, created_at desc);

-- ── Ops ──────────────────────────────────────────────────────────────────────
create table if not exists public.llm_audit_log (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families (id) on delete cascade,
  user_id           uuid references public.users (id) on delete set null,
  endpoint          text not null,
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  total_tokens      integer,
  cost_usd          numeric,
  tools             jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists llm_audit_family_created_idx on public.llm_audit_log (family_id, created_at desc);

-- ── Post-MVP stubs (created now so schema/RLS template is uniform; unused this MVP) ──
create table if not exists public.embeddings (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  source_type text not null,
  source_id   uuid not null,
  chunk_index integer not null default 0,
  content     text,
  metadata    jsonb,
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  unique (source_type, source_id, chunk_index)
);
create index if not exists embeddings_hnsw_cosine
  on public.embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists embeddings_family_idx on public.embeddings (family_id);

create table if not exists public.telegram_links (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  chat_id    text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_events (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references public.families (id) on delete cascade,
  source      text not null,
  external_id text not null,
  status      text not null default 'pending',
  payload     jsonb,
  created_at  timestamptz not null default now(),
  unique (source, external_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────--
-- One helper, security definer (bypasses RLS internally → no recursion on users).
create or replace function public.auth_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select family_id from public.users where id = auth.uid() $$;

alter table public.families        enable row level security;
alter table public.users           enable row level security;
alter table public.family_members  enable row level security;
alter table public.documents       enable row level security;
alter table public.communications  enable row level security;
alter table public.tasks           enable row level security;
alter table public.school_results  enable row level security;
alter table public.appointments    enable row level security;
alter table public.activity_log    enable row level security;
alter table public.llm_audit_log   enable row level security;
alter table public.embeddings      enable row level security;
alter table public.telegram_links  enable row level security;
alter table public.ingestion_events enable row level security;

-- families keyed by own id; everything else keyed by family_id.
create policy family_isolation on public.families
  using (id = public.auth_family_id()) with check (id = public.auth_family_id());

create policy family_isolation on public.users
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.family_members
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.documents
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.communications
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.tasks
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.school_results
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.appointments
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.activity_log
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.llm_audit_log
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.embeddings
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.telegram_links
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
create policy family_isolation on public.ingestion_events
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
