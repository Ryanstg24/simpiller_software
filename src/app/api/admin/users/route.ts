import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This should be in your .env.local
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
    const { email, password, first_name, last_name, phone, npi, organization_id, role } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      );
    }

    // Insert user data into our users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        first_name,
        last_name,
        phone: phone || null,
        npi: npi || null,
        is_active: true
      });

    if (userError) {
      console.error('Error inserting user data:', userError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      );
    }

    // Assign the role if selected
    if (role) {
      let roleId: string;

      if (role === 'simpiller_admin') {
        // Get the Simpiller Admin role (system-wide)
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('name', 'simpiller_admin')
          .is('organization_id', null)
          .single();

        if (roleError) {
          console.error('Error getting role:', roleError);
          return NextResponse.json(
            { error: 'Failed to assign role' },
            { status: 400 }
          );
        }
        roleId = roleData.id;
      } else {
        // Get the organization-specific role
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('name', role)
          .eq('organization_id', organization_id)
          .single();

        if (roleError) {
          console.error('Error getting role:', roleError);
          return NextResponse.json(
            { error: 'Failed to assign role' },
            { status: 400 }
          );
        }
        roleId = roleData.id;
      }

      // Assign the role to the user
      const { error: assignmentError } = await supabaseAdmin
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId
        });

      if (assignmentError) {
        console.error('Error assigning role:', assignmentError);
        return NextResponse.json(
          { error: 'Failed to assign role' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: true, user: authData.user },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in user creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 