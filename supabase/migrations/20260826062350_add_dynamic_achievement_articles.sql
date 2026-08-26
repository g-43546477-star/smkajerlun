begin;

alter table public.achievement
  add column if not exists slug text,
  add column if not exists kandungan text,
  add column if not exists image_url text,
  add column if not exists galeri jsonb not null default '[]'::jsonb;

alter table public.achievement
  drop constraint if exists achievement_slug_format;
alter table public.achievement
  add constraint achievement_slug_format
  check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index if not exists achievement_slug_unique
  on public.achievement (slug)
  where slug is not null;

commit;
