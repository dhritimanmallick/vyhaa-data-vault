import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  fileName: string;
  fileContent: string; // base64 encoded
  fileSize: number;
  mimeType: string;
  category?: string;
  subcategory?: string;
  description?: string;
  tags?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadData: UploadRequest = await req.json();
    const { fileName, fileContent, fileSize, mimeType, category, subcategory, description, tags } = uploadData;

    // Generate unique filename to prevent conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${fileName}`;
    const storagePath = `${category || 'uncategorized'}/${uniqueFileName}`;

    // Decode base64 content
    const fileBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    
    console.log(`Uploading file to storage: ${storagePath}`);
    
    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return new Response(JSON.stringify({ error: 'Failed to upload file to storage: ' + storageError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`File uploaded to storage successfully: ${storagePath}`);

    // Save document metadata to database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: fileName,
        file_path: storagePath, // Store the storage path
        file_size: fileSize,
        mime_type: mimeType,
        category: category || null,
        subcategory: subcategory || null,
        description: description || null,
        tags: tags || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up the uploaded file if database insert fails
      try {
        await supabase.storage
          .from('documents')
          .remove([storagePath]);
        console.log('Cleaned up storage file after database error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file after database error:', cleanupError);
      }
      
      return new Response(JSON.stringify({ error: 'Failed to save document metadata: ' + dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the upload action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'upload',
        document_id: document.id,
        user_id: user.id,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || null,
      });

    return new Response(JSON.stringify({ 
      success: true, 
      document: document,
      message: 'File uploaded successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Upload failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);