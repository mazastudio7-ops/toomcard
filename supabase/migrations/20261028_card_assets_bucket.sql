-- 움직이는 로고(GIF·WebP) 등 큰 파일을 카드 데이터 밖에 두는 저장소. 로그인한 본인 폴더에만 올릴 수 있고, 읽기는 누구나.
-- 한 파일 최대 3MB, 이미지 형식만. 여러 번 실행해도 안전하다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-assets', 'card-assets', true, 3145728, array['image/gif', 'image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/gif', 'image/webp', 'image/png', 'image/jpeg'];

drop policy if exists "card assets read" on storage.objects;
create policy "card assets read" on storage.objects for select using (bucket_id = 'card-assets');

drop policy if exists "card assets own insert" on storage.objects;
create policy "card assets own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "card assets own delete" on storage.objects;
create policy "card assets own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text);
