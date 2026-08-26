-- Release phase 2. Apply only after the matching website assets are deployed.
-- 1. Move the former hard-coded PSS calendar into the scoped CMS.
-- 2. Make the public booking view respect RLS. The deployed booking scripts
--    use a dedicated anonymous client for this view, including after login.

insert into public.takwim
  (portal, kategori, tarikh_mula, tarikh_tamat, tajuk, keterangan, susunan)
select
  'pss', 'aktiviti', seed.tarikh::date, null, seed.tajuk, seed.keterangan, seed.susunan
from (values
  ('2026-01-14', 'Orientasi PSS dan Lawatan Rak', 'Ruang Bacaan PSS, 8:30 pagi.', 10),
  ('2026-01-28', 'Bengkel Pengawas PSS', 'Ruang Depan PSS, 2:30 petang.', 20),
  ('2026-02-11', 'Jom Baca 10 Minit', 'Ruang Bacaan PSS, 7:25 pagi.', 30),
  ('2026-02-25', 'Asas Carian Maklumat', 'Ruang Depan PSS, 2:30 petang.', 40),
  ('2026-03-11', 'Kuiz Buku dan Bahasa', 'Bilik Tayangan, 2:30 petang.', 50),
  ('2026-03-25', 'Sudut Bacaan Kelas', 'Ruang Depan PSS, 2:30 petang.', 60),
  ('2026-04-08', 'Bedah Buku Ramadan', 'Ruang Bacaan PSS, 10:00 pagi.', 70),
  ('2026-04-22', 'Rakaman Ulasan Buku', 'Bilik Casting, 2:30 petang.', 80),
  ('2026-05-13', 'Minggu Literasi Maklumat', 'Ruang Depan PSS, 8:00 pagi.', 90),
  ('2026-05-27', 'Tayangan Dokumentari Ilmu', 'Bilik Tayangan, 2:30 petang.', 100),
  ('2026-06-10', 'Bengkel Poster Digital NILAM', 'Bilik Casting, 2:30 petang.', 110),
  ('2026-06-24', 'Jom Kongsi Buku', 'Ruang Bacaan PSS, 10:00 pagi.', 120),
  ('2026-07-08', 'Cabaran Bacaan Pertengahan Tahun', 'Ruang Bacaan PSS, 7:25 pagi.', 130),
  ('2026-07-22', 'Klinik Rekod NILAM', 'Ruang Depan PSS, 2:30 petang.', 140),
  ('2026-08-12', 'Jom Baca Bersama', 'Ruang Bacaan PSS, 9:00 pagi.', 150),
  ('2026-08-26', 'Pameran Sejarah dan Kemerdekaan', 'Ruang Depan PSS, 8:00 pagi.', 160),
  ('2026-09-09', 'Kelas Media dan Podcast', 'Bilik Casting, 2:30 petang.', 170),
  ('2026-09-23', 'Tayangan Pendidikan', 'Bilik Tayangan, 2:30 petang.', 180),
  ('2026-10-14', 'Minggu Buku dan Penulis', 'Ruang Depan PSS, 8:00 pagi.', 190),
  ('2026-10-28', 'Jejak Maklumat PSS', 'Ruang Bacaan PSS, 2:30 petang.', 200),
  ('2026-11-11', 'Perkongsian Buku Pilihan Murid', 'Ruang Bacaan PSS, 10:00 pagi.', 210),
  ('2026-11-25', 'Apresiasi Pengawas PSS', 'Bilik Tayangan, 2:30 petang.', 220),
  ('2026-12-09', 'Semakan Koleksi dan Rak', 'Ruang Bacaan PSS, 9:00 pagi.', 230),
  ('2026-12-16', 'Perancangan Program PSS', 'Ruang Depan PSS, 10:00 pagi.', 240)
) as seed(tarikh, tajuk, keterangan, susunan)
where not exists (
  select 1
  from public.takwim existing
  where existing.portal = 'pss'
    and existing.kategori = 'aktiviti'
    and existing.tarikh_mula = seed.tarikh::date
    and existing.tajuk = seed.tajuk
);

alter table public.tempahan enable row level security;

drop policy if exists "Public reads active booking fields" on public.tempahan;
create policy "Public reads active booking fields" on public.tempahan
  for select to anon
  using (status = 'aktif');

revoke all on public.tempahan from anon;
grant select (
  id, bilik, tarikh, masa_mula, masa_tamat, label, kumpulan,
  nama_pemohon, kelas, tujuan, guna_lcd, status, created_at
) on public.tempahan to anon;

create or replace view public.tempahan_awam
with (security_invoker = true, security_barrier = true)
as
select
  id, bilik, tarikh, masa_mula, masa_tamat, label, kumpulan,
  nama_pemohon, kelas, tujuan, guna_lcd, status, created_at
from public.tempahan
where status = 'aktif';

grant select on public.tempahan_awam to anon, authenticated;
