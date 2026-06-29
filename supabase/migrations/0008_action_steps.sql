-- Steps are child records of a task (an "action"). They let a family break an
-- action into checkable sub-tasks. `status` mirrors the memory pattern so a
-- future AI-research phase can insert 'proposed' steps the user confirms.
-- Family isolation enforced exactly like every other domain table: family_id
-- not null + RLS via auth_family_id(). Never trust family_id from a request body.
create table if not exists public.action_steps (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  task_id    uuid not null references public.tasks (id) on delete cascade,
  title      text not null,
  detail     text,
  position   int  not null default 0,
  completed  boolean not null default false,
  status     text not null default 'active' check (status in ('active', 'proposed', 'archived')),
  created_at timestamptz not null default now()
);
create index if not exists action_steps_task_idx on public.action_steps (task_id, position);

alter table public.action_steps enable row level security;
create policy family_isolation on public.action_steps
  using (family_id = public.auth_family_id()) with check (family_id = public.auth_family_id());
