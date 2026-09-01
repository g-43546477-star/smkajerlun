-- Keep privileged helpers out of the exposed API schema and run clinic RPCs
-- with the caller's rights. The private tables remain protected by RLS.

grant usage on schema private to anon, authenticated;

alter function public.check_public_submission_rate(text, integer, interval)
  set schema private;

revoke all on function private.check_public_submission_rate(text, integer, interval)
  from public, anon, authenticated;
grant execute on function private.check_public_submission_rate(text, integer, interval)
  to anon, authenticated;

drop policy if exists "Rate limited public book suggestions" on public.cadangan_buku;
create policy "Rate limited public book suggestions" on public.cadangan_buku
  for insert to anon, authenticated
  with check (
    char_length(trim(nama)) between 3 and 120
    and char_length(trim(kelas)) between 2 and 40
    and char_length(trim(tajuk)) between 2 and 200
    and (pengarang is null or char_length(trim(pengarang)) between 2 and 160)
    and (sebab is null or char_length(trim(sebab)) <= 700)
    and kategori in ('Buku', 'Majalah', 'Bahan Digital', 'Komik Ilmiah')
    and sumber = 'Pelajar'
    and status = 'Baru'
    and susunan = 0
    and private.check_public_submission_rate('cadangan_buku', 5, interval '15 minutes')
  );

drop policy if exists "Rate limited public PSS loans" on public.pss_pinjaman;
create policy "Rate limited public PSS loans" on public.pss_pinjaman
  for insert to anon, authenticated
  with check (
    char_length(trim(nama)) between 3 and 120
    and char_length(trim(kelas)) between 2 and 40
    and peranan in ('Murid', 'Pengawas PSS')
    and char_length(trim(bahan)) between 2 and 200
    and (kod_bahan is null or char_length(trim(kod_bahan)) <= 60)
    and (catatan is null or char_length(trim(catatan)) <= 500)
    and tarikh_pulang >= tarikh_pinjam
    and tarikh_pulang <= tarikh_pinjam + 90
    and status = 'Direkodkan'
    and private.check_public_submission_rate('pss_pinjaman', 3, interval '15 minutes')
  );

revoke all on all tables in schema private from anon, authenticated;
grant select on private.murid_klinik, private.rekod_klinik to authenticated;
grant insert on private.rekod_klinik to authenticated;

alter function public.klinik_cari(text) security invoker;
alter function public.klinik_daftar(text, text) security invoker;

revoke all on function public.klinik_cari(text) from public, anon, authenticated;
revoke all on function public.klinik_daftar(text, text) from public, anon, authenticated;
grant execute on function public.klinik_cari(text) to authenticated;
grant execute on function public.klinik_daftar(text, text) to authenticated;
