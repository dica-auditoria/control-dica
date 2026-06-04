-- ============================================================
-- CONTROL DICA-MX — Storage bucket + policies
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Bucket privado para documentos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- POLICIES DE STORAGE
-- Estructura de rutas: documentos/{entidad_id}/{uuid}.ext
-- ============================================================

-- DROP previos para idempotencia
drop policy if exists "storage_upload_documentos"   on storage.objects;
drop policy if exists "storage_select_documentos"   on storage.objects;
drop policy if exists "storage_delete_documentos"   on storage.objects;

-- Subida: usuario solo puede subir a su propia carpeta de entidad
create policy "storage_upload_documentos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = (
      select entidad_id::text
      from public.usuarios
      where id = auth.uid()
    )
  );

-- Lectura: admin/superadmin ven todo; cliente solo su carpeta
create policy "storage_select_documentos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and (
      public.get_user_role() in ('admin', 'superadmin')
      or (storage.foldername(name))[1] = public.get_user_entidad()::text
    )
  );

-- Borrado: solo admin/superadmin (paso previo a WORM en Fase 2)
create policy "storage_delete_documentos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documentos'
    and public.get_user_role() in ('admin', 'superadmin')
  );
