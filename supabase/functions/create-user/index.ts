import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get request body
    const { email, full_name }: CreateUserRequest = await req.json();
    
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email and full name are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create user with admin API
    const defaultPassword = 'Welcome@123';
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      user_metadata: {
        full_name: full_name
      },
      email_confirm: true // Auto-confirm email
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Send welcome email if Resend is configured
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Welcome to Vyuhaa Med Data</h1>
            <p>Hello ${full_name},</p>
            <p>Your account has been created successfully. You can now access the secure dataroom platform using the following credentials:</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${defaultPassword}</p>
            </div>
            
            <p>Please sign in to access your assigned documents. For security reasons, we recommend changing your password after your first login.</p>
            
            <p style="margin-top: 30px;">
              <a href="${supabaseUrl.replace('.supabase.co', '')}.lovable.app/auth" 
                 style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                Sign In Now
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, please contact your administrator.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: 'Vyuhaa Med Data <noreply@resend.dev>',
          to: [email],
          subject: 'Welcome to Vyuhaa Med Data - Your Account Credentials',
          html: emailHtml,
        });

        console.log(`Welcome email sent to ${email}`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the user creation if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully',
        user: {
          id: newUser.user?.id,
          email: newUser.user?.email,
          full_name: full_name
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);