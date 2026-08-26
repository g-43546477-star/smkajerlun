-- Allow authenticated school admins to manage the activity gallery while
-- retaining public read-only access for the website.
drop policy if exists "Admin manages activity gallery" on public.gallery_item;
create policy "Admin manages activity gallery" on public.gallery_item
  for all to authenticated
  using (exists (select 1 from public.admin_pengguna a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_pengguna a where a.user_id = (select auth.uid())));
