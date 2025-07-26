-- Check and create storage policies for document downloads
-- First, check if policies exist (this will be shown in the result)

-- Policy to allow authenticated users to download documents
CREATE POLICY "Authenticated users can download documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND auth.uid() IS NOT NULL
);