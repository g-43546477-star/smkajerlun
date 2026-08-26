-- Reconcile the admin editor with the public content model.
-- Program sekolah now owns achievement articles; the old activity gallery is retired.

begin;

-- The three existing achievement rows are school-program articles. Keep the
-- original records and make their new destination explicit.
alter table public.achievement
  drop constraint if exists achievement_kategori_check;

alter table public.achievement
  add constraint achievement_kategori_check
  check (kategori in ('akademik', 'kokurikulum', 'sukan', 'sahsiah', 'sekolah'));

update public.achievement
set kategori = 'sekolah'
where kategori = 'kokurikulum';

-- Preserve the two legacy gallery thumbnails as article covers before removing
-- the retired table. Existing article images always take precedence.
update public.achievement as article
set image_url = gallery.image_url
from public.gallery_item as gallery
where article.image_url is null
  and gallery.image_url is not null
  and lower(trim(article.tajuk)) = lower(trim(gallery.tajuk));

-- These destinations are already exposed by the admin editor and are now
-- accepted by the database constraint as well.
alter table public.content_block
  drop constraint if exists content_block_laman_check;

alter table public.content_block
  add constraint content_block_laman_check
  check (laman in ('akademik', 'kokurikulum', 'asrama', 'hem', 'rujukan_akademik', 'profil'));

-- Gallery content is no longer displayed or edited anywhere. Do not use
-- CASCADE: the migration must fail rather than silently remove an unknown
-- dependency.
drop table if exists public.gallery_item;

commit;
