-- Rekod Klinik SMK Agama Jerlun
-- Data murid dan rekod lawatan berada dalam schema private. Kiosk hanya menggunakan
-- fungsi RPC yang menerima nombor IC tepat, bukan akses jadual secara terus.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.murid_klinik (
  no_ic text primary key check (no_ic ~ '^[0-9]{12}$'),
  nama text not null check (char_length(trim(nama)) between 3 and 160),
  kelas text not null check (char_length(trim(kelas)) between 2 and 40),
  created_at timestamptz not null default now()
);

create table if not exists private.rekod_klinik (
  id uuid primary key default gen_random_uuid(),
  no_ic text not null references private.murid_klinik(no_ic) on delete restrict,
  tarikh timestamptz not null default now(),
  sebab text not null check (char_length(trim(sebab)) between 2 and 300)
);

create index if not exists rekod_klinik_no_ic_tarikh_idx
  on private.rekod_klinik (no_ic, tarikh desc);

revoke all on all tables in schema private from anon, authenticated;

create or replace function public.klinik_cari(p_ic text)
returns table (nama text, kelas text, rekod jsonb)
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  normalized_ic text := regexp_replace(coalesce(p_ic, ''), '[^0-9]', '', 'g');
begin
  if normalized_ic !~ '^[0-9]{12}$' then
    raise exception 'Nombor IC mesti mengandungi 12 digit.' using errcode = '22023';
  end if;

  return query
  select
    m.nama,
    m.kelas,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'tarikh', to_char(r.tarikh at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD'),
          'masa', to_char(r.tarikh at time zone 'Asia/Kuala_Lumpur', 'HH24:MI'),
          'sebab', r.sebab
        ) order by r.tarikh desc
      ) filter (where r.id is not null),
      '[]'::jsonb
    )
  from murid_klinik m
  left join rekod_klinik r on r.no_ic = m.no_ic
  where m.no_ic = normalized_ic
  group by m.no_ic, m.nama, m.kelas;
end;
$$;

create or replace function public.klinik_daftar(p_ic text, p_sebab text)
returns table (nama text, kelas text, rekod jsonb)
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  normalized_ic text := regexp_replace(coalesce(p_ic, ''), '[^0-9]', '', 'g');
  cleaned_sebab text := trim(coalesce(p_sebab, ''));
begin
  if normalized_ic !~ '^[0-9]{12}$' then
    raise exception 'Nombor IC mesti mengandungi 12 digit.' using errcode = '22023';
  end if;
  if char_length(cleaned_sebab) not between 2 and 300 then
    raise exception 'Sebab ke klinik mesti antara 2 hingga 300 aksara.' using errcode = '22023';
  end if;
  if not exists (select 1 from murid_klinik where no_ic = normalized_ic) then
    raise exception 'Rekod murid tidak ditemui.' using errcode = 'P0002';
  end if;

  insert into rekod_klinik (no_ic, sebab) values (normalized_ic, cleaned_sebab);
  return query select * from public.klinik_cari(normalized_ic);
end;
$$;

revoke all on function public.klinik_cari(text) from public;
revoke all on function public.klinik_daftar(text, text) from public;
grant execute on function public.klinik_cari(text) to anon, authenticated;
grant execute on function public.klinik_daftar(text, text) to anon, authenticated;
