-- Each booking day opens at 15:00 Asia/Kuala_Lumpur on the preceding day.
create or replace function public.booking_date_is_open(booking_date date, at_time timestamptz)
returns boolean language sql immutable strict
set search_path = pg_catalog
as $$
  select booking_date >= (at_time at time zone 'Asia/Kuala_Lumpur')::date
    and at_time >= (((booking_date - 1) + time '15:00') at time zone 'Asia/Kuala_Lumpur');
$$;
revoke all on function public.booking_date_is_open(date, timestamptz) from public, anon;
grant execute on function public.booking_date_is_open(date, timestamptz) to authenticated;

create or replace function public.enforce_booking_daily_window()
returns trigger language plpgsql
set search_path = public, pg_catalog
as $$
begin
  -- Retain the existing administrator scheduling exception.
  if exists (select 1 from public.admin_pengguna where user_id = (select auth.uid())) then
    return new;
  end if;
  -- Cancellation and metadata-only edits do not reserve a new slot.
  if tg_op = 'UPDATE' then
    if new.status = 'dibatalkan' then return new; end if;
    if new.tarikh is not distinct from old.tarikh
      and new.bilik is not distinct from old.bilik
      and new.masa_mula is not distinct from old.masa_mula
      and new.masa_tamat is not distinct from old.masa_tamat
      and new.status is not distinct from old.status then return new; end if;
  end if;
  if public.booking_date_is_open(new.tarikh::date, statement_timestamp()) is not true then
    raise exception 'Tempahan setiap tarikh hanya dibuka pada pukul 3:00 petang sehari sebelumnya (waktu Malaysia). Tarikh lampau tidak dibenarkan.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_booking_daily_window() from public, anon, authenticated;
create trigger enforce_booking_daily_window
before insert or update on public.tempahan
for each row execute function public.enforce_booking_daily_window();
