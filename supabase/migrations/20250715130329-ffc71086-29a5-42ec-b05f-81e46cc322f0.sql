-- Add category and subcategory columns to documents table
ALTER TABLE documents 
ADD COLUMN category TEXT,
ADD COLUMN subcategory TEXT;

-- Create index for better performance on category searches
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_subcategory ON documents(subcategory);