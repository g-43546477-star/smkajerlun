-- Server-only analytics. Raw IP addresses and browser identifiers are not stored.
create table public.pss_visitor_tokens (
  day date not null,
  token text not null check (token ~ '^[0-9a-f]{64}$'),
  primary key (day, token)
);
create table public.pss_visitor_daily (
  day date not null,
  country text not null check (country ~ '^[A-Z]{2}$'),
  visitors bigint not null default 0 check (visitors >= 0),
  primary key (day, country)
);
alter table public.pss_visitor_tokens enable row level security;
alter table public.pss_visitor_daily enable row level security;
revoke all on public.pss_visitor_tokens, public.pss_visitor_daily from public, anon, authenticated;
grant select, insert, update, delete on public.pss_visitor_tokens, public.pss_visitor_daily to service_role;

create function public.pss_record_visitor(p_token text, p_country text)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  d date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  inserted integer;
begin
  insert into public.pss_visitor_tokens(day, token) values (d, p_token) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    insert into public.pss_visitor_daily(day, country, visitors) values(d, p_country, 1)
    on conflict(day, country) do update set visitors = public.pss_visitor_daily.visitors + 1;
  end if;
  delete from public.pss_visitor_tokens where day < d;
end;
$$;

create function public.pss_visitor_stats()
returns jsonb language sql stable security invoker set search_path = ''
as $$
with dates as (
  select (now() at time zone 'Asia/Kuala_Lumpur')::date as today
), daily as (
  select d::date as day, coalesce(sum(v.visitors), 0) as visitors
  from dates cross join lateral generate_series(today - 6, today, interval '1 day') d
  left join public.pss_visitor_daily v on v.day = d::date
  group by d
), countries as (
  select country, sum(visitors) as visitors from public.pss_visitor_daily, dates
  where day between today - 6 and today group by country
)
select jsonb_build_object(
  'today', (select visitors from daily, dates where day = today),
  'total', (select coalesce(sum(visitors), 0) from public.pss_visitor_daily),
  'daily', (select jsonb_agg(to_jsonb(daily) order by day) from daily),
  'countries', coalesce((select jsonb_agg(to_jsonb(countries) order by visitors desc, country) from countries), '[]'::jsonb)
);
$$;
revoke all on function public.pss_record_visitor(text, text), public.pss_visitor_stats() from public, anon, authenticated;
grant execute on function public.pss_record_visitor(text, text), public.pss_visitor_stats() to service_role;
