-- Run after supabase_stubs.sql + the migration. Every check raises on failure.
\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'Admin@Example.com', '{"full_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@example.com', '{"name":"Ed Editor"}'),
  ('00000000-0000-0000-0000-00000000000f', 'viewer@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000099', 'stranger@example.com', '{}');

create function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

-- Passes if the statement errors OR changes 0 rows (RLS hides rows instead of erroring).
create function pg_temp.expect_error(stmt text, label text) returns void language plpgsql as $$
declare n int;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when others then
    raise notice 'ok (blocked): %', label;
    return;
  end;
  if n = 0 and stmt !~* '^\s*select' then
    raise notice 'ok (0 rows): %', label;
    return;
  end if;
  raise exception 'EXPECTED FAILURE but succeeded: %', label;
end $$;

create function pg_temp.expect_rows(stmt text, n int, label text) returns void language plpgsql as $$
declare c int;
begin
  execute 'select count(*) from (' || stmt || ') s' into c;
  if c <> n then raise exception '% : expected % rows, got %', label, n, c; end if;
  raise notice 'ok: % (% rows)', label, c;
end $$;

-- 1. First sign-in becomes admin
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ declare m public.members; begin
  m := public.ensure_member();
  if m.role <> 'admin' or m.email <> 'admin@example.com' or m.full_name <> 'Ada Admin' then
    raise exception 'first user should be admin, got % %', m.role, m.email; end if;
  -- calling again is a no-op
  m := public.ensure_member();
  if m.role <> 'admin' then raise exception 'second call changed role'; end if;
  raise notice 'ok: first user is admin';
end $$;

-- Admin invites the editor
insert into public.invites (email, role) values ('editor@example.com', 'editor');
select pg_temp.expect_error($$insert into public.invites (email, role) values ('Bad@Example.com', 'viewer')$$, 'invite email must be lowercase');
select pg_temp.expect_error($$insert into public.invites (email, role) values ('x@example.com', 'pending')$$, 'cannot invite as pending');

-- 2. Invited user gets the invited role; invite is consumed
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
do $$ declare m public.members; begin
  m := public.ensure_member();
  if m.role <> 'editor' then raise exception 'invited user should be editor, got %', m.role; end if;
  raise notice 'ok: invited user got editor';
end $$;

-- 3. Uninvited users are pending and see nothing
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
do $$ declare m public.members; begin
  m := public.ensure_member();
  if m.role <> 'pending' then raise exception 'uninvited user should be pending, got %', m.role; end if;
  raise notice 'ok: uninvited user is pending';
end $$;
select pg_temp.expect_rows('select * from public.members', 1, 'pending sees only own member row');
select pg_temp.expect_rows('select * from public.seasons', 0, 'pending sees no seasons');
select pg_temp.expect_rows('select * from public.team_settings', 1, 'pending can read team name/colors');
select pg_temp.expect_error($$insert into public.opportunities (name) values ('x')$$, 'pending cannot create');
select pg_temp.expect_error($$update public.members set role = 'admin' where id = auth.uid()$$, 'pending cannot promote self');

-- 4. Anonymous gets nothing
reset role;
set role anon;
select pg_temp.expect_error('select * from public.opportunities', 'anon cannot read opportunities');
select pg_temp.expect_error('select * from public.team_settings', 'anon cannot read settings');

-- 5. Admin approves the pending user as viewer
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.members set role = 'viewer' where email = 'viewer@example.com';
select pg_temp.expect_rows('select * from public.members', 3, 'admin sees all members');
update public.team_settings set team_name = 'Test Bots', primary_color = '#112233';
select pg_temp.expect_error($$update public.team_settings set primary_color = 'red'$$, 'color must be hex');
select pg_temp.expect_error($$update public.members set role = 'editor' where id = auth.uid()$$, 'last admin cannot demote self');

-- 6. Editor creates an opportunity + application; activity is logged
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
insert into public.opportunities (id, name, funder, tags)
  values ('11111111-1111-1111-1111-111111111111', '3M Grant', '3M', '{FIRST,local}');
insert into public.applications (id, opportunity_id, season_id, deadline_at, deadline_tz)
  select '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', id,
         '2026-10-17 23:59:00-07', 'America/Los_Angeles'
  from public.seasons where is_current;
select pg_temp.expect_error($$insert into public.applications (opportunity_id, season_id)
  select '11111111-1111-1111-1111-111111111111', id from public.seasons where is_current$$, 'one application per opportunity per season');
update public.applications set status = 'drafting' where id = '22222222-2222-2222-2222-222222222222';
update public.applications set sort_order = 5 where id = '22222222-2222-2222-2222-222222222222';
insert into public.requirements (application_id, kind, title) values ('22222222-2222-2222-2222-222222222222', 'essay', 'Team story');
insert into public.application_assignees values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_rows($$select * from public.activity_log where action = 'status_changed'
  and changes->'status' = '["researching","drafting"]'::jsonb
  and actor_id = '00000000-0000-0000-0000-00000000000e'
  and opportunity_id = '11111111-1111-1111-1111-111111111111'$$, 1, 'status change logged with actor + diff');
select pg_temp.expect_rows($$select * from public.activity_log where changes ? 'sort_order'$$, 0, 'sort_order-only change not logged');
select pg_temp.expect_rows($$select * from public.activity_log where table_name = 'requirements'
  and application_id = '22222222-2222-2222-2222-222222222222' and opportunity_id is not null$$, 1, 'requirement logged against its application');
select pg_temp.expect_error($$delete from public.activity_log$$, 'nobody can delete the log');
select pg_temp.expect_rows($$select * from public.activity_log$$, 5, 'log still intact');
select pg_temp.expect_error($$insert into public.activity_log (table_name, action) values ('x', 'created')$$, 'cannot forge log entries');
select pg_temp.expect_error($$update public.seasons set fundraising_goal = 5000$$, 'editor cannot change seasons');
select pg_temp.expect_error($$select public.set_current_season(id) from public.seasons$$, 'editor cannot set current season');
select pg_temp.expect_error($$insert into public.invites (email, role) values ('z@example.com', 'admin')$$, 'editor cannot invite');
insert into storage.objects (bucket_id, name) values ('grant-files', 'a/b.pdf');

-- Editor delete of opportunity silently affects 0 rows (RLS) — check it survived
delete from public.opportunities where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect_rows('select * from public.opportunities', 1, 'editor cannot delete opportunity');

-- 7. Viewer: read yes, write no, comment yes
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect_rows('select * from public.applications', 1, 'viewer reads applications');
select pg_temp.expect_rows('select * from storage.objects', 1, 'viewer reads files');
select pg_temp.expect_error($$insert into public.opportunities (name) values ('nope')$$, 'viewer cannot create');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('grant-files', 'v.pdf')$$, 'viewer cannot upload');
update public.applications set status = 'awarded';
select pg_temp.expect_rows($$select * from public.applications where status = 'drafting'$$, 1, 'viewer update had no effect');
insert into public.comments (application_id, body) values ('22222222-2222-2222-2222-222222222222', 'Looks good!');
select pg_temp.expect_error($$insert into public.comments (application_id, author_id, body)
  values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000000a', 'fake')$$, 'cannot comment as someone else');
insert into public.saved_views (name, config) values ('My private view', '{}');

-- 8. Private saved views / calendar tokens
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_rows('select * from public.saved_views', 0, 'cannot see others'' private views');
insert into public.calendar_feeds default values;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select pg_temp.expect_rows('select * from public.calendar_feeds', 0, 'cannot see others'' calendar tokens');

-- 9. Admin: current season switch, delete cascades & is logged, last-admin guard on delete
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.seasons (name, starts_on, ends_on) values ('2027–2028', '2027-09-01', '2028-08-31');
select public.set_current_season(id) from public.seasons where name = '2027–2028';
select pg_temp.expect_rows($$select * from public.seasons where is_current and name = '2027–2028'$$, 1, 'current season switched');
delete from public.opportunities where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect_rows('select * from public.requirements', 0, 'delete cascaded');
select pg_temp.expect_rows($$select * from public.activity_log where action = 'deleted' and table_name = 'opportunities'$$, 1, 'deletion logged');
select pg_temp.expect_error($$delete from public.members where id = auth.uid()$$, 'last admin cannot remove self');
update public.members set role = 'admin' where email = 'editor@example.com';
update public.members set role = 'viewer' where id = auth.uid();
select pg_temp.expect_rows($$select * from public.members where role = 'admin'$$, 1, 'admin handed over');

-- 10. Removed member who signs in again comes back as pending, not with old role
reset role;
delete from public.members where email = 'viewer@example.com';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
do $$ declare m public.members; begin
  m := public.ensure_member();
  if m.role <> 'pending' then raise exception 'removed user should come back pending'; end if;
  raise notice 'ok: removed user returns as pending';
end $$;

reset role;
\echo ALL RLS TESTS PASSED
