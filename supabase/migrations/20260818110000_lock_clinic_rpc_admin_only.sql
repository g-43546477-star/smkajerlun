-- Lock clinic kiosk RPCs to authenticated school administrators.
-- The explicit check inside each SECURITY DEFINER function is required because
-- table RLS alone cannot protect a definer function from an exposed RPC grant.

create or replace function public.klinik_cari(p_ic text)
returns table (nama text, kelas text, rekod jsonb)
language plpgsql
security definer
set search_path = private, public, pg_catalog
as $$
declare
  normalized_ic text := regexp_replace(coalesce(p_ic, ''), '[^0-9]', '', 'g');
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_pengguna a where a.user_id = (select auth.uid())
  ) then
    raise exception 'Akses tidak dibenarkan.' using errcode = '42501';
  end if;

  if normalized_ic !~ '^[0-9]{12}$' then
    raise exception 'Nombor IC mesti mengandungi 12 digit.' using errcode = '22023';
  end if;

  return query
  select m.nama, m.kelas,
    coalesce(jsonb_agg(jsonb_build_object(
      'tarikh', to_char(r.tarikh at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD'),
      'masa', to_char(r.tarikh at time zone 'Asia/Kuala_Lumpur', 'HH24:MI'),
      'sebab', r.sebab
    ) order by r.tarikh desc) filter (where r.id is not null), '[]'::jsonb)
  from private.murid_klinik m
  left join private.rekod_klinik r on r.no_ic = m.no_ic
  where m.no_ic = normalized_ic
  group by m.no_ic, m.nama, m.kelas;
end;
$$;

create or replace function public.klinik_daftar(p_ic text, p_sebab text)
returns table (nama text, kelas text, rekod jsonb)
language plpgsql
security definer
set search_path = private, public, pg_catalog
as $$
declare
  normalized_ic text := regexp_replace(coalesce(p_ic, ''), '[^0-9]', '', 'g');
  cleaned_sebab text := trim(coalesce(p_sebab, ''));
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_pengguna a where a.user_id = (select auth.uid())
  ) then
    raise exception 'Akses tidak dibenarkan.' using errcode = '42501';
  end if;

  if normalized_ic !~ '^[0-9]{12}$' then
    raise exception 'Nombor IC mesti mengandungi 12 digit.' using errcode = '22023';
  end if;
  if char_length(cleaned_sebab) not between 2 and 300 then
    raise exception 'Sebab ke klinik mesti antara 2 hingga 300 aksara.' using errcode = '22023';
  end if;
  if not exists (select 1 from private.murid_klinik where no_ic = normalized_ic) then
    raise exception 'Rekod murid tidak ditemui.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from private.rekod_klinik
    where no_ic = normalized_ic and sebab = cleaned_sebab and tarikh > now() - interval '2 minutes'
  ) then
    raise exception 'Lawatan yang sama baru sahaja direkodkan.' using errcode = '23505';
  end if;

  insert into private.rekod_klinik (no_ic, sebab) values (normalized_ic, cleaned_sebab);
  return query select * from public.klinik_cari(normalized_ic);
end;
$$;

revoke execute on function public.klinik_cari(text) from public, anon, authenticated;
revoke execute on function public.klinik_daftar(text, text) from public, anon, authenticated;
grant execute on function public.klinik_cari(text) to authenticated;
grant execute on function public.klinik_daftar(text, text) to authenticated;
