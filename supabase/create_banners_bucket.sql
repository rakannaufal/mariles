-- 1. Buat bucket 'banners' jika belum ada
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- 2. Hapus policy lama untuk menghindari duplikat (opsional, aman dilakukan)
drop policy if exists "Banners Public Access" on storage.objects;
drop policy if exists "Banners Upload Access" on storage.objects;
drop policy if exists "Banners Update Access" on storage.objects;
drop policy if exists "Banners Delete Access" on storage.objects;

-- 3. Policy: Semua orang (public) bisa MELIHAT gambar
create policy "Banners Public Access"
  on storage.objects for select
  using ( bucket_id = 'banners' );

-- 4. Policy: User yang login (authenticated) bisa UPLOAD gambar
create policy "Banners Upload Access"
  on storage.objects for insert
  with check ( bucket_id = 'banners' and auth.role() = 'authenticated' );

-- 5. Policy: User yang login bisa UPDATE gambar
create policy "Banners Update Access"
  on storage.objects for update
  using ( bucket_id = 'banners' and auth.role() = 'authenticated' );

-- 6. Policy: User yang login bisa HAPUS gambar
create policy "Banners Delete Access"
  on storage.objects for delete
  using ( bucket_id = 'banners' and auth.role() = 'authenticated' );
