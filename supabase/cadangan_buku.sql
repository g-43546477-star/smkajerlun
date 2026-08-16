-- Cadangan buku Portal PSS SMKAJ
-- Laksanakan melalui Supabase migration. Polisi membenarkan murid menghantar
-- cadangan tanpa log masuk, manakala pentadbir mengurus semua status.

create table public.cadangan_buku (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(trim(nama)) between 3 and 120),
  kelas text not null check (char_length(trim(kelas)) between 2 and 40),
  tajuk text not null check (char_length(trim(tajuk)) between 2 and 200),
  pengarang text,
  kategori text not null default 'Buku' check (kategori in ('Buku', 'Majalah', 'Bahan Digital', 'Komik Ilmiah')),
  sebab text,
  status text not null default 'Baru' check (status in ('Baru', 'Dalam Semakan', 'Pilihan Mingguan', 'Dipilih', 'Tidak Diteruskan')),
  sumber text not null default 'Pelajar' check (sumber in ('Pelajar', 'PSS')),
  susunan integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cadangan_buku enable row level security;

create policy "Pelajar boleh menghantar cadangan buku"
  on public.cadangan_buku for insert to anon, authenticated
  with check (char_length(trim(nama)) between 3 and 120 and char_length(trim(kelas)) between 2 and 40 and char_length(trim(tajuk)) between 2 and 200 and sumber = 'Pelajar' and status = 'Baru');

create policy "Public read curated book suggestions"
  on public.cadangan_buku for select to anon, authenticated
  using (sumber = 'PSS');

create policy "Admin manages book suggestions"
  on public.cadangan_buku for all to authenticated
  using (exists (select 1 from public.admin_pengguna a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_pengguna a where a.user_id = auth.uid()));
