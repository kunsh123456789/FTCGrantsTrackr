-- =============================================================================
-- FTC Grants Tracker — initial schema
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It creates every table the app will need (all 5 phases), the security
-- rules (Row Level Security), the activity-log triggers and the file bucket.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums (fixed lists of choices)
-- -----------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'editor', 'viewer', 'pending');
create type public.opportunity_type as enum (
  'grant', 'corporate_sponsorship', 'in_kind_donation', 'foundation',
  'government', 'first_specific', 'local_business'
);
create type public.funding_form as enum ('cash', 'in_kind', 'both');
create type public.recurrence as enum ('one_time', 'annual', 'rolling');
create type public.team_experience as enum ('any', 'rookie_only', 'veteran_only');
create type public.geo_scope as enum (
  'international', 'national', 'california', 'bay_area', 'santa_clara_county', 'other'
);
create type public.team_affiliation as enum ('any', 'school_only', 'community_only');
create type public.team_kind as enum ('school', 'community');
create type public.tri_state as enum ('yes', 'no', 'unknown');
create type public.local_advantage as enum ('positive', 'neutral', 'negative', 'unknown');
create type public.application_status as enum (
  'researching', 'eligible', 'planning', 'drafting',
  'submitted', 'awarded', 'rejected', 'skipped'
);
create type public.dates_confidence as enum ('unknown', 'estimated', 'confirmed');
create type public.requirement_kind as enum (
  'essay', 'budget', 'recommendation_letter', 'photos', 'video',
  'outreach_metrics', 'financials', 'other'
);
create type public.obligation_kind as enum (
  'thank_you', 'logo_placement', 'report', 'photo_update', 'other'
);
create type public.logo_placement as enum ('robot', 'shirts', 'website', 'banner', 'pit', 'other');
create type public.attachment_category as enum (
  'draft', 'submitted', 'award_letter', 'receipt', 'logo', 'photo', 'other'
);
create type public.answer_category as enum (
  'team_history', 'mission', 'outreach_impact', 'budget_justification', 'awards', 'other'
);
create type public.budget_category as enum (
  'registration', 'parts', 'travel', 'tools', 'outreach', 'other'
);
create type public.outreach_type as enum (
  'demo', 'workshop', 'mentoring', 'competition_volunteer',
  'community_event', 'presentation', 'other'
);

-- -----------------------------------------------------------------------------
-- Team & access
-- -----------------------------------------------------------------------------
create table public.members (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        public.member_role not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Emails the admin has pre-approved. Used the first time that person signs in.
create table public.invites (
  email       text primary key check (email = lower(trim(email)) and email like '%@%'),
  role        public.member_role not null check (role <> 'pending'),
  invited_by  uuid references public.members (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Exactly one row (id is always true).
create table public.team_settings (
  id              boolean primary key default true check (id),
  team_name       text not null default 'Our FTC Team' check (length(trim(team_name)) > 0),
  team_number     text,
  primary_color   text not null default '#2563eb' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color    text not null default '#f59e0b' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_path       text,
  timezone        text not null default 'America/Los_Angeles',
  -- Team facts, used later to flag grants you're probably not eligible for.
  team_kind       public.team_kind,
  has_501c3       public.tri_state not null default 'unknown',
  rookie_year     integer check (rookie_year between 2004 and 2100),
  city            text,
  county          text,
  updated_at      timestamptz not null default now()
);
insert into public.team_settings default values;

create table public.seasons (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique check (length(trim(name)) > 0),
  starts_on         date not null,
  ends_on           date not null,
  fundraising_goal  numeric(12, 2) check (fundraising_goal >= 0),
  is_current        boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  check (ends_on > starts_on)
);
create unique index seasons_one_current on public.seasons (is_current) where is_current;
insert into public.seasons (name, starts_on, ends_on, is_current)
values ('2026–2027', '2026-09-01', '2027-08-31', true);

-- -----------------------------------------------------------------------------
-- Grants: opportunities (permanent) and applications (one per season)
-- -----------------------------------------------------------------------------
create table public.opportunities (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (length(trim(name)) > 0),
  funder                 text,
  website_url            text,
  portal_url             text,
  type                   public.opportunity_type not null default 'grant',
  funding_form           public.funding_form not null default 'cash',
  in_kind_description    text,
  amount_min             numeric(12, 2) check (amount_min >= 0),
  amount_max             numeric(12, 2) check (amount_max >= 0),
  amount_notes           text,
  recurrence             public.recurrence not null default 'annual',
  typical_open_month     smallint check (typical_open_month between 1 and 12),
  typical_deadline_month smallint check (typical_deadline_month between 1 and 12),
  -- Eligibility
  experience             public.team_experience not null default 'any',
  geo_scope              public.geo_scope,
  geo_notes              text,
  affiliation            public.team_affiliation not null default 'any',
  requires_501c3         public.tri_state not null default 'unknown',
  age_requirement        text,
  eligibility_notes      text,
  -- Local relevance & priority
  bay_area_relevant      boolean not null default false,
  local_advantage        public.local_advantage not null default 'unknown',
  local_advantage_notes  text,
  priority               smallint not null default 3 check (priority between 1 and 5),
  tags                   text[] not null default '{}',
  -- Contact & notes
  contact_name           text,
  contact_email          text,
  contact_phone          text,
  relationship_notes     text,
  notes                  text,
  -- Data quality
  verified               boolean not null default false,
  verified_at            timestamptz,
  is_sample              boolean not null default false,
  link_check             jsonb,
  archived               boolean not null default false,
  created_by             uuid references public.members (id) on delete set null default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (amount_min is null or amount_max is null or amount_max >= amount_min)
);
create index opportunities_tags_idx on public.opportunities using gin (tags);

create table public.applications (
  id                   uuid primary key default gen_random_uuid(),
  opportunity_id       uuid not null references public.opportunities (id) on delete cascade,
  season_id            uuid not null references public.seasons (id) on delete restrict,
  status               public.application_status not null default 'researching',
  opens_on             date,
  deadline_at          timestamptz,
  deadline_tz          text not null default 'America/Los_Angeles',
  deadline_time_known  boolean not null default true,
  deadline_notes       text,
  decision_on          date,
  payout_on            date,
  report_due_on        date,
  dates_confidence     public.dates_confidence not null default 'unknown',
  amount_requested     numeric(12, 2) check (amount_requested >= 0),
  amount_awarded       numeric(12, 2) check (amount_awarded >= 0),
  in_kind_value        numeric(12, 2) check (in_kind_value >= 0),
  estimated_hours      numeric(6, 1) check (estimated_hours >= 0),
  submitted_at         timestamptz,
  outcome_notes        text,
  notes                text,
  sort_order           double precision not null default 0,
  created_by           uuid references public.members (id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (opportunity_id, season_id)
);
create index applications_season_status_idx on public.applications (season_id, status);
create index applications_deadline_idx on public.applications (deadline_at);

create table public.application_assignees (
  application_id  uuid not null references public.applications (id) on delete cascade,
  member_id       uuid not null references public.members (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (application_id, member_id)
);

-- -----------------------------------------------------------------------------
-- Answer library (defined before requirements, which can link to it)
-- -----------------------------------------------------------------------------
create table public.answer_blocks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) > 0),
  category      public.answer_category not null default 'other',
  body          text not null default '',
  tags          text[] not null default '{}',
  season_id     uuid references public.seasons (id) on delete set null,
  last_used_at  timestamptz,
  created_by    uuid references public.members (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Checklist of what an application needs.
create table public.requirements (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.applications (id) on delete cascade,
  kind             public.requirement_kind not null default 'other',
  title            text not null check (length(trim(title)) > 0),
  prompt           text,
  word_limit       integer check (word_limit > 0),
  due_on           date,
  done             boolean not null default false,
  done_by          uuid references public.members (id) on delete set null,
  done_at          timestamptz,
  answer_block_id  uuid references public.answer_blocks (id) on delete set null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index requirements_application_idx on public.requirements (application_id);

-- Post-award obligations; logo_placement rows power the sponsor recognition tracker.
create table public.obligations (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications (id) on delete cascade,
  kind            public.obligation_kind not null,
  placement       public.logo_placement,
  title           text,
  due_on          date,
  done            boolean not null default false,
  done_by         uuid references public.members (id) on delete set null,
  done_at         timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index obligations_application_idx on public.obligations (application_id);

create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications (id) on delete cascade,
  author_id       uuid not null references public.members (id) on delete cascade default auth.uid(),
  body            text not null check (length(trim(body)) > 0),
  created_at      timestamptz not null default now(),
  edited_at       timestamptz
);
create index comments_application_idx on public.comments (application_id, created_at);

-- -----------------------------------------------------------------------------
-- Budget & outreach
-- -----------------------------------------------------------------------------
create table public.budget_items (
  id              uuid primary key default gen_random_uuid(),
  season_id       uuid not null references public.seasons (id) on delete restrict,
  category        public.budget_category not null default 'other',
  description     text not null check (length(trim(description)) > 0),
  vendor          text,
  planned_amount  numeric(12, 2) check (planned_amount >= 0),
  actual_amount   numeric(12, 2) check (actual_amount >= 0),
  spent_on        date,
  notes           text,
  created_by      uuid references public.members (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Which grant paid for which budget line (and how much).
create table public.budget_funding (
  id              uuid primary key default gen_random_uuid(),
  budget_item_id  uuid not null references public.budget_items (id) on delete cascade,
  application_id  uuid not null references public.applications (id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (budget_item_id, application_id)
);

create table public.outreach_events (
  id                 uuid primary key default gen_random_uuid(),
  season_id          uuid not null references public.seasons (id) on delete restrict,
  event_on           date not null,
  title              text not null check (length(trim(title)) > 0),
  event_type         public.outreach_type not null default 'other',
  location           text,
  volunteer_hours    numeric(8, 1) not null default 0 check (volunteer_hours >= 0),
  students_involved  integer check (students_involved >= 0),
  people_reached     integer check (people_reached >= 0),
  description        text,
  created_by         uuid references public.members (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Files (metadata; the files themselves live in the "grant-files" bucket)
-- -----------------------------------------------------------------------------
create table public.attachments (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid references public.applications (id) on delete cascade,
  opportunity_id     uuid references public.opportunities (id) on delete cascade,
  budget_item_id     uuid references public.budget_items (id) on delete cascade,
  outreach_event_id  uuid references public.outreach_events (id) on delete cascade,
  storage_path       text not null unique,
  file_name          text not null,
  mime_type          text,
  size_bytes         bigint check (size_bytes >= 0),
  category           public.attachment_category not null default 'other',
  uploaded_by        uuid references public.members (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Saved filters, calendar feed tokens, activity log
-- -----------------------------------------------------------------------------
create table public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.members (id) on delete cascade default auth.uid(),
  name        text not null check (length(trim(name)) > 0),
  view        text not null default 'table' check (view in ('table', 'kanban', 'calendar')),
  shared      boolean not null default false,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- Secret token for each member's private .ics calendar feed (phase 3).
create table public.calendar_feeds (
  member_id   uuid primary key references public.members (id) on delete cascade default auth.uid(),
  token       uuid not null unique default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

create table public.activity_log (
  id              bigint generated always as identity primary key,
  table_name      text not null,
  record_id       uuid,
  application_id  uuid,
  opportunity_id  uuid,
  actor_id        uuid references public.members (id) on delete set null,
  action          text not null check (action in ('created', 'updated', 'status_changed', 'deleted')),
  label           text,
  changes         jsonb,
  created_at      timestamptz not null default now()
);
create index activity_log_application_idx on public.activity_log (application_id, created_at desc);
create index activity_log_opportunity_idx on public.activity_log (opportunity_id, created_at desc);
create index activity_log_created_idx on public.activity_log (created_at desc);

-- =============================================================================
-- Helper functions
-- =============================================================================

-- Role of the signed-in user (null if they have no member row).
create function public.my_role()
returns public.member_role
language sql stable security definer set search_path = ''
as $$ select role from public.members where id = auth.uid() $$;

create function public.is_member()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.my_role() in ('admin', 'editor', 'viewer'), false) $$;

create function public.can_edit()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.my_role() in ('admin', 'editor'), false) $$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.my_role() = 'admin', false) $$;

-- Called by the app right after sign-in. Creates the member row if missing:
--   * email was invited  -> gets the invited role
--   * nobody exists yet  -> becomes admin (that's you, the first person to sign in)
--   * anyone else        -> 'pending' (no access until an admin approves)
create function public.ensure_member()
returns public.members
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  u auth.users%rowtype;
  new_role public.member_role;
  result public.members;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into result from public.members where id = uid;
  if found then
    return result;
  end if;

  select * into u from auth.users where id = uid;
  if not found or u.email is null then
    raise exception 'No email on this account';
  end if;

  -- Serialize so two people signing in at the same moment can't both become admin.
  lock table public.members in share row exclusive mode;

  select role into new_role from public.invites where email = lower(u.email);
  if new_role is not null then
    delete from public.invites where email = lower(u.email);
  elsif not exists (select 1 from public.members) then
    new_role := 'admin';
  else
    new_role := 'pending';
  end if;

  insert into public.members (id, email, full_name, avatar_url, role)
  values (
    uid,
    lower(u.email),
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
    new_role
  )
  returning * into result;
  return result;
end;
$$;

-- Admin-only: make one season the current one (atomically).
create function public.set_current_season(season uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change the current season';
  end if;
  if not exists (select 1 from public.seasons where id = season) then
    raise exception 'Season not found';
  end if;
  update public.seasons set is_current = false where is_current and id <> season;
  update public.seasons set is_current = true where id = season;
end;
$$;

-- =============================================================================
-- Triggers
-- =============================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'members', 'team_settings', 'opportunities', 'applications', 'answer_blocks',
    'requirements', 'obligations', 'budget_items', 'outreach_events'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- The team must always keep at least one admin.
create function public.protect_last_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.members where role = 'admin' and id <> old.id)
  then
    raise exception 'The team must keep at least one admin.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_last_admin
  before update of role or delete on public.members
  for each row execute function public.protect_last_admin();

-- Keep a member's email in sync and stop anyone changing their own id/email.
create function public.guard_member_update()
returns trigger
language plpgsql
as $$
begin
  new.id := old.id;
  new.email := old.email;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger guard_member_update
  before update on public.members
  for each row execute function public.guard_member_update();

-- Activity log: records who changed what, automatically, for every write
-- (drag-and-drop, bulk edit, import, detail page — all the same).
create function public.log_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  old_j jsonb;
  new_j jsonb;
  rec jsonb;
  diff jsonb := '{}'::jsonb;
  k text;
  act text;
  rid uuid;
  app_id uuid;
  opp_id uuid;
  ignored text[] := array['updated_at', 'created_at', 'sort_order', 'link_check'];
begin
  if tg_op = 'INSERT' then
    new_j := to_jsonb(new);
    rec := new_j;
    act := 'created';
  elsif tg_op = 'UPDATE' then
    old_j := to_jsonb(old);
    new_j := to_jsonb(new);
    rec := new_j;
    act := 'updated';
    for k in select jsonb_object_keys(new_j) loop
      if not (k = any (ignored)) and (old_j -> k) is distinct from (new_j -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(old_j -> k, new_j -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return new;
    end if;
    if tg_table_name = 'applications' and diff ? 'status' then
      act := 'status_changed';
    end if;
  else
    old_j := to_jsonb(old);
    rec := old_j;
    act := 'deleted';
  end if;

  rid := (rec ->> 'id')::uuid;
  if tg_table_name = 'applications' then
    app_id := rid;
    opp_id := (rec ->> 'opportunity_id')::uuid;
  elsif tg_table_name = 'opportunities' then
    opp_id := rid;
  else
    app_id := (rec ->> 'application_id')::uuid;
    opp_id := (rec ->> 'opportunity_id')::uuid;
  end if;
  if app_id is not null and opp_id is null then
    select a.opportunity_id into opp_id from public.applications a where a.id = app_id;
  end if;

  insert into public.activity_log
    (table_name, record_id, application_id, opportunity_id, actor_id, action, label, changes)
  values (
    tg_table_name,
    rid,
    app_id,
    opp_id,
    (select m.id from public.members m where m.id = auth.uid()),
    act,
    coalesce(rec ->> 'name', rec ->> 'title', rec ->> 'file_name', rec ->> 'kind', rec ->> 'member_id'),
    case when tg_op = 'UPDATE' then diff else null end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'opportunities', 'applications', 'application_assignees',
    'requirements', 'obligations', 'attachments'
  ] loop
    execute format(
      'create trigger log_activity after insert or update or delete on public.%I
         for each row execute function public.log_activity()', t);
  end loop;
end $$;

-- =============================================================================
-- Row Level Security
--   not signed in / pending : nothing (except team name & colors)
--   viewer                  : read everything, write comments
--   editor                  : + create and edit
--   admin                   : + delete grants/seasons, manage members & settings
-- =============================================================================

-- Explicit grants (RLS below decides which rows each person actually gets).
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_role(), public.is_member(), public.can_edit(), public.is_admin(),
  public.ensure_member(), public.set_current_season(uuid)
  to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'members', 'invites', 'team_settings', 'seasons', 'opportunities', 'applications',
    'application_assignees', 'answer_blocks', 'requirements', 'obligations', 'comments',
    'budget_items', 'budget_funding', 'outreach_events', 'attachments', 'saved_views',
    'calendar_feeds', 'activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Members: you can always see your own row (so the app knows you're pending);
-- team members see everyone; only admins change roles or remove people.
create policy "members: read" on public.members for select to authenticated
  using (id = (select auth.uid()) or (select public.is_member()));
create policy "members: admin update" on public.members for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "members: admin delete" on public.members for delete to authenticated
  using ((select public.is_admin()));

create policy "invites: admin all" on public.invites for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Team name/colors are readable by anyone signed in (the "pending" screen uses them).
create policy "team_settings: read" on public.team_settings for select to authenticated
  using (true);
create policy "team_settings: admin update" on public.team_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "seasons: read" on public.seasons for select to authenticated
  using ((select public.is_member()));
create policy "seasons: admin insert" on public.seasons for insert to authenticated
  with check ((select public.is_admin()));
create policy "seasons: admin update" on public.seasons for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "seasons: admin delete" on public.seasons for delete to authenticated
  using ((select public.is_admin()));

-- Grants and applications: editors create/edit, only admins delete.
do $$
declare t text;
begin
  foreach t in array array['opportunities', 'applications'] loop
    execute format($f$
      create policy "%1$s: read" on public.%1$I for select to authenticated
        using ((select public.is_member()));
      create policy "%1$s: edit insert" on public.%1$I for insert to authenticated
        with check ((select public.can_edit()));
      create policy "%1$s: edit update" on public.%1$I for update to authenticated
        using ((select public.can_edit())) with check ((select public.can_edit()));
      create policy "%1$s: admin delete" on public.%1$I for delete to authenticated
        using ((select public.is_admin()));
    $f$, t);
  end loop;
end $$;

-- Sub-items: editors can add, edit and remove them.
do $$
declare t text;
begin
  foreach t in array array[
    'application_assignees', 'answer_blocks', 'requirements', 'obligations',
    'budget_items', 'budget_funding', 'outreach_events', 'attachments'
  ] loop
    execute format($f$
      create policy "%1$s: read" on public.%1$I for select to authenticated
        using ((select public.is_member()));
      create policy "%1$s: edit insert" on public.%1$I for insert to authenticated
        with check ((select public.can_edit()));
      create policy "%1$s: edit update" on public.%1$I for update to authenticated
        using ((select public.can_edit())) with check ((select public.can_edit()));
      create policy "%1$s: edit delete" on public.%1$I for delete to authenticated
        using ((select public.can_edit()));
    $f$, t);
  end loop;
end $$;

-- Comments: every team member (viewers too) can comment; you edit your own.
create policy "comments: read" on public.comments for select to authenticated
  using ((select public.is_member()));
create policy "comments: insert own" on public.comments for insert to authenticated
  with check ((select public.is_member()) and author_id = (select auth.uid()));
create policy "comments: update own" on public.comments for update to authenticated
  using (author_id = (select auth.uid()) and (select public.is_member()))
  with check (author_id = (select auth.uid()));
create policy "comments: delete own or admin" on public.comments for delete to authenticated
  using ((author_id = (select auth.uid()) and (select public.is_member())) or (select public.is_admin()));

-- Saved filters: yours, plus any a teammate shared.
create policy "saved_views: read" on public.saved_views for select to authenticated
  using ((select public.is_member()) and (owner_id = (select auth.uid()) or shared));
create policy "saved_views: insert own" on public.saved_views for insert to authenticated
  with check ((select public.is_member()) and owner_id = (select auth.uid()));
create policy "saved_views: update own" on public.saved_views for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "saved_views: delete own or admin" on public.saved_views for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- Calendar feed tokens are private to each member.
create policy "calendar_feeds: own" on public.calendar_feeds for all to authenticated
  using (member_id = (select auth.uid()) and (select public.is_member()))
  with check (member_id = (select auth.uid()) and (select public.is_member()));

-- Activity log: read-only for members. Only the trigger writes to it.
create policy "activity_log: read" on public.activity_log for select to authenticated
  using ((select public.is_member()));

-- =============================================================================
-- File storage: private bucket, same roles as above. 50 MB per file (free tier max).
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('grant-files', 'grant-files', false, 52428800)
on conflict (id) do nothing;

create policy "grant-files: read" on storage.objects for select to authenticated
  using (bucket_id = 'grant-files' and (select public.is_member()));
create policy "grant-files: edit insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'grant-files' and (select public.can_edit()));
create policy "grant-files: edit update" on storage.objects for update to authenticated
  using (bucket_id = 'grant-files' and (select public.can_edit()))
  with check (bucket_id = 'grant-files' and (select public.can_edit()));
create policy "grant-files: edit delete" on storage.objects for delete to authenticated
  using (bucket_id = 'grant-files' and (select public.can_edit()));
