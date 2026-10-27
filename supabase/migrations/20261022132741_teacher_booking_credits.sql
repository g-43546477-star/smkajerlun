-- Pending local migration. Existing bookings and public occupancy stay intact.
-- NULL means a legacy row whose charge is derived without rewriting its history.
alter table public.tempahan add column kredit smallint check (kredit between 0 and 14);
create index tempahan_teacher_week on public.tempahan (user_id, tarikh);

create function public.booking_credit_cost(booking_date date, starts text, ends text)
returns integer language sql immutable strict set search_path = pg_catalog as $$
  select case when extract(dow from booking_date) between 0 and 4
    and starts ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    and ends ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  then ceil(greatest(0, extract(epoch from
    (least(ends::time, time '14:40') - greatest(starts::time, time '07:40')))) / 1800)::integer
  else 0 end;
$$;
revoke all on function public.booking_credit_cost(date, text, text) from public, anon;
grant execute on function public.booking_credit_cost(date, text, text) to authenticated;

create function public.enforce_booking_credit()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  week_start date;
  day_used integer;
  week_used integer;
  old_charge integer := 0;
  same_slot boolean := false;
  actor_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Log masuk diperlukan untuk membuat tempahan.' using errcode = '42501';
  end if;
  select exists(select 1 from public.admin_pengguna where user_id = auth.uid()) into actor_is_admin;
  if tg_op <> 'INSERT' then
    old_charge := coalesce(old.kredit, case when old.status = 'aktif'
      then public.booking_credit_cost(old.tarikh, old.masa_mula, old.masa_tamat) else 0 end);
  end if;
  if tg_op = 'DELETE' then
    if old_charge > 0
      and ((old.tarikh + old.masa_mula::time) at time zone 'Asia/Kuala_Lumpur') <= statement_timestamp()
      and old.tarikh - extract(dow from old.tarikh)::integer =
        (statement_timestamp() at time zone 'Asia/Kuala_Lumpur')::date
          - extract(dow from statement_timestamp() at time zone 'Asia/Kuala_Lumpur')::integer then
      raise exception 'Kredit minggu ini telah digunakan. Batalkan tempahan untuk mengekalkan rekod kredit; padam selepas minggu berakhir.' using errcode = '23514';
    end if;
    return old;
  end if;

  -- Serialize all rooms for this teacher; volatile trigger queries see committed writes after the lock.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if tg_op = 'UPDATE' then
    same_slot := new.tarikh = old.tarikh and new.masa_mula = old.masa_mula
      and new.masa_tamat = old.masa_tamat and new.bilik = old.bilik;
    if not same_slot and not actor_is_admin and old_charge > 0
      and ((old.tarikh + old.masa_mula::time) at time zone 'Asia/Kuala_Lumpur') <= statement_timestamp() then
      raise exception 'Slot berkredit yang telah bermula tidak boleh dipindahkan. Kredit kekal dikira jika dibatalkan.' using errcode = '23514';
    end if;
    if new.status = 'dibatalkan' then
      if not same_slot then
        raise exception 'Batalkan tempahan tanpa menukar bilik, tarikh atau masa.' using errcode = '23514';
      end if;
      new.kredit := case when old.status = 'dibatalkan' then old_charge
        when ((old.tarikh + old.masa_mula::time) at time zone 'Asia/Kuala_Lumpur') > statement_timestamp() then 0
        else old_charge end;
      return new;
    end if;
    if same_slot and new.status = old.status then
      new.kredit := old_charge;
      return new;
    end if;
  end if;
  new.kredit := case when new.status = 'aktif'
    then public.booking_credit_cost(new.tarikh, new.masa_mula, new.masa_tamat) else 0 end;
  if new.status <> 'aktif' then return new; end if;
  if exists(select 1 from public.tempahan t where t.user_id = new.user_id and t.tarikh = new.tarikh
    and t.status = 'aktif' and (tg_op = 'INSERT' or t.id <> old.id)
    and t.masa_mula::time < new.masa_tamat::time and t.masa_tamat::time > new.masa_mula::time) then
    raise exception 'Anda sudah mempunyai tempahan pada waktu ini di bilik lain.' using errcode = '23514';
  end if;
  if new.kredit = 0 then return new; end if;
  week_start := new.tarikh - extract(dow from new.tarikh)::integer;
  select coalesce(sum(charge) filter (where tarikh = new.tarikh), 0), coalesce(sum(charge), 0)
  into day_used, week_used from (
    select t.tarikh, coalesce(t.kredit, case when t.status = 'aktif'
      then public.booking_credit_cost(t.tarikh, t.masa_mula, t.masa_tamat) else 0 end) as charge
    from public.tempahan t where t.user_id = new.user_id and t.tarikh >= week_start
      and t.tarikh < week_start + 7 and (tg_op = 'INSERT' or t.id <> old.id)
  ) usage;
  if day_used + new.kredit > 4 then
    raise exception 'Had kredit harian ialah 4 blok (2 jam) untuk sesi pagi Ahad–Khamis.' using errcode = '23514';
  end if;
  if week_used + new.kredit > 16 then
    raise exception 'Had kredit mingguan ialah 16 blok (8 jam) untuk sesi pagi Ahad–Khamis.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_booking_credit() from public, anon, authenticated;
-- Run after the existing identity and room guards so user_id and slot times are verified first.
create trigger enforce_booking_z_credit before insert or update or delete on public.tempahan
  for each row execute function public.enforce_booking_credit();
