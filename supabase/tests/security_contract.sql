-- Read-only security assertions for the deployed schema.
-- Run with psql or the Supabase SQL runner after applying migrations. Any
-- failed assertion raises an exception; no data is retained.
begin;

do $$
declare
  exposed_personal_columns text[];
begin
  select array_agg(column_name order by ordinal_position)
  into exposed_personal_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'tempahan_awam'
    and column_name = any (array['nama_pemohon', 'kelas', 'tujuan', 'guna_lcd', 'created_at']);

  if coalesce(cardinality(exposed_personal_columns), 0) > 0 then
    raise exception 'tempahan_awam exposes personal columns: %', exposed_personal_columns;
  end if;

  if not exists (
    select 1 from pg_class table_record
    join pg_namespace schema_record on schema_record.oid = table_record.relnamespace
    where schema_record.nspname = 'public'
      and table_record.relname = 'guru_pengguna'
      and table_record.relrowsecurity
  ) then
    raise exception 'guru_pengguna must exist with RLS enabled';
  end if;

  if has_table_privilege('anon', 'private.public_submission_rate_limits', 'SELECT')
     or has_table_privilege('anon', 'private.public_submission_rate_limits', 'INSERT') then
    raise exception 'anon has direct access to rate-limit records';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'private.public_submission_rate_limits'::regclass
      and contype = 'p'
  ) then
    raise exception 'rate-limit records need a primary key';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'tempahan'
      and grantee = 'anon'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'anon has a write grant on tempahan';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tempahan'
      and policyname = 'Approved teachers create bookings'
      and cmd = 'INSERT'
  ) then
    raise exception 'approved-teacher booking policy is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cadangan_buku'
      and policyname = 'Rate limited public book suggestions'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pss_pinjaman'
      and policyname = 'Rate limited public PSS loans'
  ) then
    raise exception 'public PSS rate-limit policies are missing';
  end if;

  if has_function_privilege('public', 'public.enforce_booking_identity()', 'EXECUTE') then
    raise exception 'booking identity trigger function is executable by PUBLIC';
  end if;

  if has_function_privilege('anon', 'public.klinik_cari(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.klinik_daftar(text,text)', 'EXECUTE') then
    raise exception 'clinic RPC is executable by anon';
  end if;
end;
$$;

rollback;
