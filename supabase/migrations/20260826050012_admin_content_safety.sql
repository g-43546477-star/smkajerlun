-- Admin and content safety:
-- 1. Separate school and PSS announcements/calendars.
-- 2. Align PSS status constraints with the admin UI.
-- 3. Complete and restrict the audit trail.
-- The PSS seed and booking-view cutover are intentionally kept in the next
-- migration so production can be released without mixing destinations.

-- ---------------------------------------------------------------------------
-- Explicit content destination
-- ---------------------------------------------------------------------------
alter table public.pengumuman
  add column if not exists portal text;

update public.pengumuman
set portal = 'sekolah'
where portal is null or portal not in ('sekolah', 'pss');

alter table public.pengumuman
  alter column portal set default 'sekolah',
  alter column portal set not null;

alter table public.pengumuman
  drop constraint if exists pengumuman_portal_check;

alter table public.pengumuman
  add constraint pengumuman_portal_check
  check (portal in ('sekolah', 'pss'));

create index if not exists pengumuman_portal_tarikh_idx
  on public.pengumuman (portal, tarikh desc, id desc);

alter table public.takwim
  add column if not exists portal text;

update public.takwim
set portal = 'sekolah'
where portal is null or portal not in ('sekolah', 'pss');

alter table public.takwim
  alter column portal set default 'sekolah',
  alter column portal set not null;

alter table public.takwim
  drop constraint if exists takwim_portal_check;

alter table public.takwim
  add constraint takwim_portal_check
  check (portal in ('sekolah', 'pss'));

create index if not exists takwim_portal_kategori_tarikh_idx
  on public.takwim (portal, kategori, tarikh_mula, susunan);

-- ---------------------------------------------------------------------------
-- Status vocabulary used by Admin PSS
-- ---------------------------------------------------------------------------
update public.pss_book
set status = case lower(trim(coalesce(status, '')))
  when 'dipinjam' then 'Dipinjam'
  when 'rujukan' then 'Rujukan'
  when 'hilang' then 'Hilang'
  when 'rosak' then 'Rosak'
  when 'dipulangkan' then 'Dipulangkan'
  else 'Tersedia'
end
where status is null
   or status not in ('Tersedia', 'Dipinjam', 'Rujukan', 'Hilang', 'Rosak', 'Dipulangkan');

alter table public.pss_book
  drop constraint if exists pss_book_status_check;

alter table public.pss_book
  add constraint pss_book_status_check
  check (status in ('Tersedia', 'Dipinjam', 'Rujukan', 'Hilang', 'Rosak', 'Dipulangkan'));

update public.pss_pinjaman
set status = case lower(trim(coalesce(status, '')))
  when 'dipinjam' then 'Dipinjam'
  when 'dipulangkan' then 'Dipulangkan'
  when 'lewat' then 'Lewat'
  when 'hilang' then 'Hilang'
  when 'dibatalkan' then 'Dibatalkan'
  else 'Direkodkan'
end
where status is null
   or status not in ('Direkodkan', 'Dipinjam', 'Dipulangkan', 'Lewat', 'Hilang', 'Dibatalkan');

alter table public.pss_pinjaman
  drop constraint if exists pss_pinjaman_status_check;

alter table public.pss_pinjaman
  add constraint pss_pinjaman_status_check
  check (status in ('Direkodkan', 'Dipinjam', 'Dipulangkan', 'Lewat', 'Hilang', 'Dibatalkan'));

-- Keep one canonical admin policy per module.
drop policy if exists "Admin manages gallery" on public.gallery_item;
drop policy if exists "Admin manages activity gallery" on public.gallery_item;
create policy "Admin manages activity gallery" on public.gallery_item
  for all to authenticated
  using (exists (
    select 1 from public.admin_pengguna admin
    where admin.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.admin_pengguna admin
    where admin.user_id = (select auth.uid())
  ));

drop policy if exists "Admin manages books" on public.pss_book;
drop policy if exists "Admin PSS manages books" on public.pss_book;
create policy "Admin PSS manages books" on public.pss_book
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
-- Audit trail completion and function hardening
-- ---------------------------------------------------------------------------
drop trigger if exists admin_audit_achievement on public.achievement;
create trigger admin_audit_achievement
  after insert or update or delete on public.achievement
  for each row execute function public.record_admin_audit();

revoke all on function public.record_admin_audit() from public, anon, authenticated;
