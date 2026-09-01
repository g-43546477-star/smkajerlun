-- Security and privacy hardening for the school portal.
--
-- This migration:
-- 1. Keeps existing teacher accounts working, but requires an explicit approved
--    teacher record before a user can create or change a booking.
-- 2. Removes teacher names, classes and purposes from the anonymous timetable.
-- 3. Rate-limits the two public PSS write forms by the gateway-provided IP.
-- 4. Redacts personal fields from the admin audit trail and retains it for one year.

-- ---------------------------------------------------------------------------
-- Approved teacher identities
-- ---------------------------------------------------------------------------
create table if not exists public.guru_pengguna (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nama text not null check (char_length(trim(nama)) between 3 and 160),
  aktif boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Existing accounts pre-date this approval directory. Preserve those accounts
-- as the reviewed baseline; new sign-ups are not inserted automatically.
insert into public.guru_pengguna (user_id, nama, aktif, approved_at, created_at)
select
  user_record.id,
  coalesce(
    nullif(trim(user_record.raw_user_meta_data ->> 'username'), ''),
    nullif(trim(user_record.email), ''),
    user_record.id::text
  ),
  true,
  now(),
  coalesce(user_record.created_at, now())
from auth.users user_record
on conflict (user_id) do nothing;

alter table public.guru_pengguna enable row level security;
revoke all on public.guru_pengguna from anon, authenticated;
grant select, insert, update, delete on public.guru_pengguna to authenticated;

drop policy if exists "Teachers read own approval" on public.guru_pengguna;
create policy "Teachers read own approval" on public.guru_pengguna
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins manage approved teachers" on public.guru_pengguna;
create policy "Admins manage approved teachers" on public.guru_pengguna
  for all to authenticated
  using (exists (
    select 1 from public.admin_pengguna admin
    where admin.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.admin_pengguna admin
    where admin.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Booking ownership and verified display names
-- ---------------------------------------------------------------------------
drop policy if exists "guru buat tempahan" on public.tempahan;
drop policy if exists "author atau admin kemaskini" on public.tempahan;
drop policy if exists "admin padam" on public.tempahan;
drop policy if exists "Users and admins read bookings" on public.tempahan;

create policy "Approved teachers create bookings" on public.tempahan
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'aktif'
    and exists (
      select 1 from public.guru_pengguna teacher
      where teacher.user_id = (select auth.uid()) and teacher.aktif
    )
  );

create policy "Teachers and admins read bookings" on public.tempahan
  for select to authenticated
  using (
    (
      user_id = (select auth.uid())
      and exists (
        select 1 from public.guru_pengguna teacher
        where teacher.user_id = (select auth.uid()) and teacher.aktif
      )
    )
    or exists (
      select 1 from public.admin_pengguna admin
      where admin.user_id = (select auth.uid())
    )
  );

create policy "Teachers and admins update bookings" on public.tempahan
  for update to authenticated
  using (
    (
      user_id = (select auth.uid())
      and exists (
        select 1 from public.guru_pengguna teacher
        where teacher.user_id = (select auth.uid()) and teacher.aktif
      )
    )
    or exists (
      select 1 from public.admin_pengguna admin
      where admin.user_id = (select auth.uid())
    )
  )
  with check (
    (
      user_id = (select auth.uid())
      and exists (
        select 1 from public.guru_pengguna teacher
        where teacher.user_id = (select auth.uid()) and teacher.aktif
      )
    )
    or exists (
      select 1 from public.admin_pengguna admin
      where admin.user_id = (select auth.uid())
    )
  );

create policy "Admins delete bookings" on public.tempahan
  for delete to authenticated
  using (exists (
    select 1 from public.admin_pengguna admin
    where admin.user_id = (select auth.uid())
  ));

create or replace function public.enforce_booking_identity()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  actor uuid := auth.uid();
  verified_name text;
  actor_is_admin boolean := false;
begin
  if actor is null then
    raise exception 'Log masuk diperlukan untuk membuat tempahan.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.admin_pengguna admin where admin.user_id = actor
  ) into actor_is_admin;

  if tg_op = 'UPDATE' and actor_is_admin then
    -- An administrator may change another teacher's booking details, but may
    -- never take ownership of that booking or replace its verified name.
    new.user_id := old.user_id;
    new.nama_pemohon := old.nama_pemohon;
    return new;
  end if;

  select teacher.nama into verified_name
  from public.guru_pengguna teacher
  where teacher.user_id = actor and teacher.aktif;

  if verified_name is null then
    raise exception 'Akaun guru belum diluluskan oleh pentadbir.' using errcode = '42501';
  end if;

  new.user_id := actor;
  new.nama_pemohon := verified_name;
  return new;
end;
$$;

revoke all on function public.enforce_booking_identity() from public, anon, authenticated;
drop trigger if exists enforce_booking_identity on public.tempahan;
create trigger enforce_booking_identity
  before insert or update on public.tempahan
  for each row execute function public.enforce_booking_identity();

-- Anonymous users only need occupancy information. Keep the base-table column
-- grant narrow because the security-invoker view checks the caller's grants.
drop policy if exists "Public reads active booking fields" on public.tempahan;
create policy "Public reads active booking slots" on public.tempahan
  for select to anon
  using (status = 'aktif');

revoke all on public.tempahan from anon;
grant select (
  id, bilik, tarikh, masa_mula, masa_tamat, label, kumpulan, status
) on public.tempahan to anon;

drop view if exists public.tempahan_awam;
create view public.tempahan_awam
with (security_invoker = true, security_barrier = true)
as
select id, bilik, tarikh, masa_mula, masa_tamat, label, kumpulan, status
from public.tempahan
where status = 'aktif';

revoke all on public.tempahan_awam from public, anon, authenticated;
grant select on public.tempahan_awam to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public PSS form rate limiting
-- ---------------------------------------------------------------------------
create table if not exists private.public_submission_rate_limits (
  kind text not null check (kind in ('cadangan_buku', 'pss_pinjaman')),
  request_ip inet not null,
  requested_at timestamptz not null default now()
);

create index if not exists public_submission_rate_limits_lookup_idx
  on private.public_submission_rate_limits (kind, request_ip, requested_at desc);

revoke all on private.public_submission_rate_limits from public, anon, authenticated;

create or replace function public.check_public_submission_rate(
  p_kind text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  request_headers jsonb;
  request_ip_text text;
  client_ip inet;
  recent_requests integer;
begin
  if p_kind not in ('cadangan_buku', 'pss_pinjaman')
     or p_limit not between 1 and 20
     or p_window < interval '1 minute'
     or p_window > interval '1 day' then
    raise exception 'Konfigurasi had permintaan tidak sah.' using errcode = '22023';
  end if;

  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    request_ip_text := trim(split_part(request_headers ->> 'x-forwarded-for', ',', 1));
    client_ip := request_ip_text::inet;
  exception when others then
    raise exception 'Permintaan tidak dapat disahkan.' using errcode = '42501';
  end;

  if client_ip is null then
    raise exception 'Permintaan tidak dapat disahkan.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_kind || ':' || host(client_ip), 0));

  delete from private.public_submission_rate_limits
  where requested_at < now() - interval '1 day';

  select count(*) into recent_requests
  from private.public_submission_rate_limits
  where kind = p_kind
    and request_ip = client_ip
    and requested_at >= now() - p_window;

  if recent_requests >= p_limit then
    raise exception 'Terlalu banyak permintaan. Sila cuba semula kemudian.' using errcode = 'P0001';
  end if;

  insert into private.public_submission_rate_limits (kind, request_ip)
  values (p_kind, client_ip);

  return true;
end;
$$;

revoke all on function public.check_public_submission_rate(text, integer, interval)
  from public, anon, authenticated;
grant execute on function public.check_public_submission_rate(text, integer, interval)
  to anon, authenticated;

drop policy if exists "Pelajar boleh menghantar cadangan buku" on public.cadangan_buku;
create policy "Rate limited public book suggestions" on public.cadangan_buku
  for insert to anon, authenticated
  with check (
    char_length(trim(nama)) between 3 and 120
    and char_length(trim(kelas)) between 2 and 40
    and char_length(trim(tajuk)) between 2 and 200
    and (pengarang is null or char_length(trim(pengarang)) between 2 and 160)
    and (sebab is null or char_length(trim(sebab)) <= 700)
    and kategori in ('Buku', 'Majalah', 'Bahan Digital', 'Komik Ilmiah')
    and sumber = 'Pelajar'
    and status = 'Baru'
    and susunan = 0
    and public.check_public_submission_rate('cadangan_buku', 5, interval '15 minutes')
  );

drop policy if exists "Murid boleh menghantar pinjaman PSS" on public.pss_pinjaman;
create policy "Rate limited public PSS loans" on public.pss_pinjaman
  for insert to anon, authenticated
  with check (
    char_length(trim(nama)) between 3 and 120
    and char_length(trim(kelas)) between 2 and 40
    and peranan in ('Murid', 'Pengawas PSS')
    and char_length(trim(bahan)) between 2 and 200
    and (kod_bahan is null or char_length(trim(kod_bahan)) <= 60)
    and (catatan is null or char_length(trim(catatan)) <= 500)
    and tarikh_pulang >= tarikh_pinjam
    and tarikh_pulang <= tarikh_pinjam + 90
    and status = 'Direkodkan'
    and public.check_public_submission_rate('pss_pinjaman', 3, interval '15 minutes')
  );

-- ---------------------------------------------------------------------------
-- Privacy-aware audit retention
-- ---------------------------------------------------------------------------
create or replace function public.record_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor uuid := auth.uid();
  old_record jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_record jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_key text := coalesce(new_record ->> 'id', old_record ->> 'id');
  sensitive_fields text[] := array[]::text[];
begin
  if actor is null or not exists (
    select 1 from public.admin_pengguna admin where admin.user_id = actor
  ) then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'tempahan' then
    sensitive_fields := array['user_id', 'nama_pemohon', 'kelas', 'tujuan'];
  elsif tg_table_name = 'pss_pinjaman' then
    sensitive_fields := array['nama', 'kelas', 'catatan'];
  elsif tg_table_name = 'cadangan_buku' then
    sensitive_fields := array['nama', 'kelas', 'sebab'];
  end if;

  if old_record is not null then old_record := old_record - sensitive_fields; end if;
  if new_record is not null then new_record := new_record - sensitive_fields; end if;

  delete from public.admin_audit_log
  where created_at < now() - interval '1 year';

  insert into public.admin_audit_log (actor_id, action, table_name, record_id, metadata)
  values (actor, tg_op, tg_table_name, record_key, jsonb_build_object('old', old_record, 'new', new_record));
  return coalesce(new, old);
end;
$$;

revoke all on function public.record_admin_audit() from public, anon, authenticated;

-- Redact existing audit snapshots without deleting useful non-sensitive history.
update public.admin_audit_log
set metadata = jsonb_build_object(
  'old', case table_name
    when 'tempahan' then (metadata -> 'old') - array['user_id', 'nama_pemohon', 'kelas', 'tujuan']
    when 'pss_pinjaman' then (metadata -> 'old') - array['nama', 'kelas', 'catatan']
    when 'cadangan_buku' then (metadata -> 'old') - array['nama', 'kelas', 'sebab']
    else metadata -> 'old'
  end,
  'new', case table_name
    when 'tempahan' then (metadata -> 'new') - array['user_id', 'nama_pemohon', 'kelas', 'tujuan']
    when 'pss_pinjaman' then (metadata -> 'new') - array['nama', 'kelas', 'catatan']
    when 'cadangan_buku' then (metadata -> 'new') - array['nama', 'kelas', 'sebab']
    else metadata -> 'new'
  end
)
where table_name in ('tempahan', 'pss_pinjaman', 'cadangan_buku');

delete from public.admin_audit_log
where created_at < now() - interval '1 year';
