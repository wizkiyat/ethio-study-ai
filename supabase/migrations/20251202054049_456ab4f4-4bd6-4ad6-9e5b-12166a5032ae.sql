-- Allow authenticated users to upload files to uploads bucket
CREATE POLICY "Authenticated users can upload to uploads bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);