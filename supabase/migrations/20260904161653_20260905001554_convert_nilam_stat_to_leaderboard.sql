-- Convert nilam_stat from class summaries into the school NILAM leaderboard.
-- Keep the former summary columns temporarily for backward compatibility; the
-- public/admin clients will use kedudukan, nama, tingkatan, kelas and
-- jumlah_bacaan as the current leaderboard contract.

alter table public.nilam_stat
  add column if not exists kedudukan integer,
  add column if not exists nama text,
  add column if not exists tingkatan text;

-- Multiple students can belong to the same class in a school leaderboard.
alter table public.nilam_stat
  drop constraint if exists nilam_stat_kelas_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nilam_stat'::regclass
      and conname = 'nilam_stat_kedudukan_check'
  ) then
    alter table public.nilam_stat
      add constraint nilam_stat_kedudukan_check
      check (kedudukan is null or kedudukan >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nilam_stat'::regclass
      and conname = 'nilam_stat_nama_check'
  ) then
    alter table public.nilam_stat
      add constraint nilam_stat_nama_check
      check (nama is null or char_length(trim(nama)) between 3 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nilam_stat'::regclass
      and conname = 'nilam_stat_tingkatan_check'
  ) then
    alter table public.nilam_stat
      add constraint nilam_stat_tingkatan_check
      check (tingkatan is null or char_length(trim(tingkatan)) between 1 and 40);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.nilam_stat'::regclass
      and conname = 'nilam_stat_nama_key'
  ) then
    alter table public.nilam_stat
      add constraint nilam_stat_nama_key unique (nama);
  end if;
end;
$$;

create index if not exists nilam_stat_leaderboard_order_idx
  on public.nilam_stat (kedudukan asc nulls last, jumlah_bacaan desc, id asc);

comment on table public.nilam_stat is
  'Current school NILAM leaderboard; public display is managed by an approved school administrator.';
comment on column public.nilam_stat.kedudukan is
  'Current leaderboard position from the school NILAM source.';
comment on column public.nilam_stat.nama is
  'Full student name approved by the school for public leaderboard display.';
comment on column public.nilam_stat.tingkatan is
  'Student form/year, for example Tingkatan 4.';
comment on column public.nilam_stat.kelas is
  'Student class, for example Imtiyaz.';
comment on column public.nilam_stat.jumlah_bacaan is
  'Number of reading materials recorded in NILAM.';
comment on column public.nilam_stat.murid_aktif is
  'Legacy class-summary field retained temporarily for compatibility.';
