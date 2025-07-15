-- Update RLS policy to allow all authenticated users to view documents
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view assigned documents" ON public.documents;

-- Create a new policy that allows all authenticated users to view documents
CREATE POLICY "Authenticated users can view all documents" 
ON public.documents 
FOR SELECT 
TO authenticated 
USING (true);

-- Keep the admin policy for all operations
-- The "Admins can manage all documents" policy should already exist and cover INSERT, UPDATE, DELETE