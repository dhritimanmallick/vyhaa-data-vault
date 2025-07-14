-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for document access
CREATE POLICY "Admin users can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND 
  is_admin()
);

CREATE POLICY "Admin users can update documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND 
  is_admin()
);

CREATE POLICY "Admin users can delete documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND 
  is_admin()
);

CREATE POLICY "Users can view assigned documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND 
  (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM document_access da 
      JOIN documents d ON d.id = da.document_id 
      WHERE d.file_path = name AND da.user_id = auth.uid()
    )
  )
);