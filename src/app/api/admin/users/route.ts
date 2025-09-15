import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      npi, 
      license_number, 
      specialty, 
      is_active,
      organization_id,
      roles 
    } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !organization_id || !roles?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name,
        last_name,
        phone,
        npi,
        license_number,
        specialty,
        is_active
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No user data returned from auth creation' },
        { status: 500 }
      );
    }

    // Create the user record in our users table
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id, // Use the auth user ID
        first_name,
        last_name,
        email,
        phone,
        npi,
        license_number,
        specialty,
        is_active,
        password_change_required: true // Force password change on first login
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      // Try to clean up the auth user if user record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Create user roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .in('name', roles)
      .eq('organization_id', organization_id);

    if (roleError) {
      console.error('Error fetching roles:', roleError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      return NextResponse.json(
        { error: 'Failed to assign roles' },
        { status: 500 }
      );
    }

    // Create user role assignments
    const roleAssignments = roleData.map(role => ({
      user_id: authData.user.id,
      role_id: role.id
    }));

    const { error: assignmentError } = await supabaseAdmin
      .from('user_role_assignments')
      .insert(roleAssignments);

    if (assignmentError) {
      console.error('Error creating role assignments:', assignmentError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      return NextResponse.json(
        { error: 'Failed to assign roles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      password // Return the password so it can be displayed to the admin
    });

  } catch (error) {
    console.error('Error in user creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}