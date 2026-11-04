-- =============================================================================
-- Flowboard — Supabase schema
-- Run this whole file once in the Supabase SQL editor (it is idempotent).
--
-- Security model: every row carries the owning user's id (an anonymous
-- "guest" auth user). Row Level Security is enabled on every table and each
-- policy restricts access to rows where user_id = auth.uid(). Join tables also
-- verify that both sides of the relation belong to the same user.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  color       text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 40),
  color       text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(trim(title)) between 1 and 200),
  description  text check (description is null or char_length(description) <= 10000),
  status       text not null default 'todo'
               check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority     text not null default 'normal'
               check (priority in ('low', 'normal', 'high')),
  due_date     date,
  -- Fractional index used to order cards inside a column.
  position     double precision not null default extract(epoch from now()),
  -- Kept for parity with the brief (single primary assignee); the multi-assignee
  -- feature uses task_assignees below.
  assignee_id  uuid references public.team_members (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  member_id   uuid not null references public.team_members (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, member_id)
);

create table if not exists public.task_labels (
  task_id     uuid not null references public.tasks (id) on delete cascade,
  label_id    uuid not null references public.labels (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, label_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 5000),
  created_at  timestamptz not null default now()
);

create table if not exists public.task_activity (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- created | status_changed | title_changed | description_changed |
  -- priority_changed | due_date_changed | assignee_added | assignee_removed |
  -- label_added | label_removed | commented
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists tasks_user_status_position_idx on public.tasks (user_id, status, position);
create index if not exists team_members_user_idx        on public.team_members (user_id);
create index if not exists labels_user_idx              on public.labels (user_id);
create index if not exists task_assignees_user_idx      on public.task_assignees (user_id);
create index if not exists task_assignees_member_idx    on public.task_assignees (member_id);
create index if not exists task_labels_user_idx         on public.task_labels (user_id);
create index if not exists task_labels_label_idx        on public.task_labels (label_id);
create index if not exists comments_task_idx            on public.comments (task_id, created_at);
create index if not exists task_activity_task_idx       on public.task_activity (task_id, created_at);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.team_members   enable row level security;
alter table public.labels         enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels    enable row level security;
alter table public.comments       enable row level security;
alter table public.task_activity  enable row level security;

-- Simple owner tables: full CRUD on your own rows only.
do $$
declare t text;
begin
  foreach t in array array['team_members', 'labels', 'tasks'] loop
    execute format('drop policy if exists "own rows: select" on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);
    execute format('drop policy if exists "own rows: delete" on public.%I', t);
    execute format($p$create policy "own rows: select" on public.%I for select to authenticated
                      using (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "own rows: insert" on public.%I for insert to authenticated
                      with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "own rows: update" on public.%I for update to authenticated
                      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "own rows: delete" on public.%I for delete to authenticated
                      using (user_id = (select auth.uid()))$p$, t);
  end loop;
end $$;

-- A task's single assignee must be one of your own team members.
drop policy if exists "own rows: insert" on public.tasks;
drop policy if exists "own rows: update" on public.tasks;
create policy "own rows: insert" on public.tasks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (assignee_id is null or exists (
      select 1 from public.team_members m where m.id = assignee_id and m.user_id = (select auth.uid())))
  );
create policy "own rows: update" on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (assignee_id is null or exists (
      select 1 from public.team_members m where m.id = assignee_id and m.user_id = (select auth.uid())))
  );

-- Join tables: you can only link your own task to your own member/label.
drop policy if exists "own rows: select" on public.task_assignees;
drop policy if exists "own rows: insert" on public.task_assignees;
drop policy if exists "own rows: delete" on public.task_assignees;
create policy "own rows: select" on public.task_assignees for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.task_assignees for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.team_members m where m.id = member_id and m.user_id = (select auth.uid()))
  );
create policy "own rows: delete" on public.task_assignees for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own rows: select" on public.task_labels;
drop policy if exists "own rows: insert" on public.task_labels;
drop policy if exists "own rows: delete" on public.task_labels;
create policy "own rows: select" on public.task_labels for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.task_labels for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.labels l where l.id = label_id and l.user_id = (select auth.uid()))
  );
create policy "own rows: delete" on public.task_labels for delete to authenticated
  using (user_id = (select auth.uid()));

-- Comments: read/write/delete your own, only on your own tasks.
drop policy if exists "own rows: select" on public.comments;
drop policy if exists "own rows: insert" on public.comments;
drop policy if exists "own rows: delete" on public.comments;
create policy "own rows: select" on public.comments for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );
create policy "own rows: delete" on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Activity log is append-only and written by triggers; clients can only read it.
drop policy if exists "own rows: select" on public.task_activity;
create policy "own rows: select" on public.task_activity for select to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Triggers: updated_at + activity log
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Writes one activity row. SECURITY DEFINER so it can bypass the read-only
-- policy on task_activity; it always stamps the row with the task owner's id
-- and silently skips if the task is already gone (cascading deletes).
create or replace function public.log_task_activity(p_task_id uuid, p_type text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.tasks where id = p_task_id;
  if v_owner is null then return; end if;
  insert into public.task_activity (task_id, user_id, type, payload)
  values (p_task_id, v_owner, p_type, coalesce(p_payload, '{}'::jsonb));
exception when foreign_key_violation then
  null;
end $$;
revoke all on function public.log_task_activity(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.tasks_activity_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_task_activity(new.id, 'created', jsonb_build_object('status', new.status));
    return new;
  end if;

  if new.status is distinct from old.status then
    perform public.log_task_activity(new.id, 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.title is distinct from old.title then
    perform public.log_task_activity(new.id, 'title_changed',
      jsonb_build_object('from', old.title, 'to', new.title));
  end if;
  if new.description is distinct from old.description then
    perform public.log_task_activity(new.id, 'description_changed', '{}'::jsonb);
  end if;
  if new.priority is distinct from old.priority then
    perform public.log_task_activity(new.id, 'priority_changed',
      jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  if new.due_date is distinct from old.due_date then
    perform public.log_task_activity(new.id, 'due_date_changed',
      jsonb_build_object('from', old.due_date, 'to', new.due_date));
  end if;
  return new;
end $$;

drop trigger if exists tasks_activity on public.tasks;
create trigger tasks_activity after insert or update on public.tasks
  for each row execute function public.tasks_activity_trigger();

create or replace function public.task_assignees_activity_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if tg_op = 'INSERT' then
    select name into v_name from public.team_members where id = new.member_id;
    perform public.log_task_activity(new.task_id, 'assignee_added',
      jsonb_build_object('member_id', new.member_id, 'name', v_name));
    return new;
  else
    select name into v_name from public.team_members where id = old.member_id;
    perform public.log_task_activity(old.task_id, 'assignee_removed',
      jsonb_build_object('member_id', old.member_id, 'name', v_name));
    return old;
  end if;
end $$;

drop trigger if exists task_assignees_activity on public.task_assignees;
create trigger task_assignees_activity after insert or delete on public.task_assignees
  for each row execute function public.task_assignees_activity_trigger();

create or replace function public.task_labels_activity_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_color text;
begin
  if tg_op = 'INSERT' then
    select name, color into v_name, v_color from public.labels where id = new.label_id;
    perform public.log_task_activity(new.task_id, 'label_added',
      jsonb_build_object('label_id', new.label_id, 'name', v_name, 'color', v_color));
    return new;
  else
    select name, color into v_name, v_color from public.labels where id = old.label_id;
    perform public.log_task_activity(old.task_id, 'label_removed',
      jsonb_build_object('label_id', old.label_id, 'name', v_name, 'color', v_color));
    return old;
  end if;
end $$;

drop trigger if exists task_labels_activity on public.task_labels;
create trigger task_labels_activity after insert or delete on public.task_labels
  for each row execute function public.task_labels_activity_trigger();

create or replace function public.comments_activity_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_task_activity(new.task_id, 'commented',
    jsonb_build_object('comment_id', new.id));
  return new;
end $$;

drop trigger if exists comments_activity on public.comments;
create trigger comments_activity after insert on public.comments
  for each row execute function public.comments_activity_trigger();

-- Trigger functions are only meant to be called by triggers.
revoke all on function public.tasks_activity_trigger()          from public, anon, authenticated;
revoke all on function public.task_assignees_activity_trigger() from public, anon, authenticated;
revoke all on function public.task_labels_activity_trigger()    from public, anon, authenticated;
revoke all on function public.comments_activity_trigger()       from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Grants (anon role gets nothing; guests sign in anonymously and become
-- "authenticated", so RLS above is what scopes their access)
-- -----------------------------------------------------------------------------

revoke all on public.team_members, public.labels, public.tasks, public.task_assignees,
              public.task_labels, public.comments, public.task_activity from anon;
grant select, insert, update, delete on public.team_members, public.labels, public.tasks to authenticated;
grant select, insert, delete on public.task_assignees, public.task_labels, public.comments to authenticated;
grant select on public.task_activity to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: stream row changes (still filtered by RLS) so open tabs stay in sync
-- -----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['tasks', 'task_assignees', 'task_labels', 'team_members',
                           'labels', 'comments', 'task_activity'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- DELETE events need the full old row so the client knows which task changed.
alter table public.task_assignees replica identity full;
alter table public.task_labels    replica identity full;
