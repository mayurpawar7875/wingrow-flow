// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { name, username, phone_number, designation, location, password, role } = body ?? {};

    // Basic validation
    if (!name || !username || !phone_number || !designation || !location || !password || !role) {
      return new Response(JSON.stringify({ success: false, message: 'Missing required fields' }), { status: 400 });
    }
    if (!['Pune', 'Mumbai'].includes(location)) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid location' }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    const email = `${username}@wingrow.internal`;

    // 1) Ensure an auth user exists or update existing user's password
    let userId: string | null = null;

    // Try to find existing user via profiles (profiles.id = auth user id)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
      // Update password and metadata for existing user
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { name, username, phone_number, designation, location }
      });
      if (updateErr) {
        return new Response(JSON.stringify({ success: false, message: updateErr.message }), { status: 400 });
      }
    } else {
      // Create auth user (returns user id without affecting client session)
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, username, phone_number, designation, location }
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ success: false, message: createErr?.message || 'Failed to create auth user' }), { status: 400 });
      }
      userId = created.user.id;
    }

    // 2) Ensure profile has all fields and set role
    const { error: profileErr } = await admin.from('profiles').update({
      name,
      email,
      username,
      phone_number,
      designation,
      location,
      role
    }).eq('id', userId);
    if (profileErr) {
      return new Response(JSON.stringify({ success: false, message: profileErr.message }), { status: 400 });
    }

    // 3) Set user_roles (clear existing first for idempotency)
    await admin.from('user_roles').delete().eq('user_id', userId);
    const { error: rolesErr } = await admin.from('user_roles').insert({ user_id: userId, role });
    if (rolesErr) {
      return new Response(JSON.stringify({ success: false, message: rolesErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, userId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e?.message || 'Unexpected error' }), { status: 500 });
  }
});
