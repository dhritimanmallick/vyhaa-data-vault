import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Set the auth context
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { documentId } = await req.json()
    if (!documentId) {
      throw new Error('Document ID is required')
    }

    console.log('Downloading document:', { documentId, userId: user.id })

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    // Check user permissions (admin or has access)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    let hasAccess = isAdmin

    if (!isAdmin) {
      // Check if user has specific access to this document
      const { data: access } = await supabase
        .from('document_access')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .single()

      hasAccess = !!access
    }

    if (!hasAccess) {
      throw new Error('Insufficient permissions to download this document')
    }

    console.log('User has access, downloading file:', document.file_path)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    console.log('File downloaded successfully')

    // Log the download in audit trail
    await supabase.from('audit_logs').insert({
      action: 'download',
      document_id: documentId,
      user_id: user.id,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent')
    })

    // Return the file
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': document.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'Content-Length': document.file_size?.toString() || ''
      }
    })

  } catch (error) {
    console.error('Download function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})