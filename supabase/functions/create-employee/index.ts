// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { name, email, phone_number, designation, location, password, role } = body ?? {};

    console.log('Creating employee with email:', email);

    // Basic validation
    if (!name || !email || !phone_number || !designation || !location || !password || !role) {
      return new Response(JSON.stringify({ success: false, message: 'Missing required fields' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!['Pune', 'Mumbai'].includes(location)) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid location' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    let userId: string | null = null;

    // Try to find existing user via email
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
      console.log('Updating existing user:', userId);
      
      // Update password for existing user
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { name, phone_number, designation, location }
      });
      
      if (updateErr) {
        console.error('Error updating auth user:', updateErr);
        return new Response(JSON.stringify({ success: false, message: updateErr.message }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      console.log('Creating new auth user');
      
      // Create auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone_number, designation, location }
      });
      
      if (createErr || !created.user) {
        console.error('Error creating auth user:', createErr);
        return new Response(JSON.stringify({ success: false, message: createErr?.message || 'Failed to create auth user' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = created.user.id;
    }

    console.log('Upserting profile for user:', userId);

    // Upsert profile
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      name,
      email,
      phone_number,
      designation,
      location,
      role,
      is_active: true
    }, { onConflict: 'id' });
    
    if (profileErr) {
      console.error('Error upserting profile:', profileErr);
      return new Response(JSON.stringify({ success: false, message: profileErr.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set user_roles (clear existing first for idempotency)
    await admin.from('user_roles').delete().eq('user_id', userId);
    const { error: rolesErr } = await admin.from('user_roles').insert({ user_id: userId, role });
    
    if (rolesErr) {
      console.error('Error setting user role:', rolesErr);
      return new Response(JSON.stringify({ success: false, message: rolesErr.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Employee created successfully:', userId);
    return new Response(JSON.stringify({ success: true, userId }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(JSON.stringify({ success: false, message: e?.message || 'Unexpected error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
