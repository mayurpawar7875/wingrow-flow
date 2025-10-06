import { supabase } from '@/integrations/supabase/client';

// This script creates the admin user if it doesn't exist
async function createAdminUser() {
  try {
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', 'wingrowagritech')
      .maybeSingle();

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user via edge function
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: {
        name: 'Wingrow Admin',
        username: 'wingrowagritech',
        phone_number: '0000000000',
        designation: 'Administrator',
        location: 'Head Office',
        password: 'Wingrow@1234',
        role: 'ADMIN'
      }
    });

    if (error) {
      console.error('Error creating admin:', error);
    } else {
      console.log('Admin user created successfully:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createAdminUser();
