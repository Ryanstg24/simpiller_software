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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email and reset password requirement
    const { data: users, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .limit(1);

    if (findError) {
      console.error('Error finding user:', findError);
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Update the user record to remove the password change requirement
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_change_required: false })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password change requirement reset for user: ${email}`,
      userId: user.id
    });

  } catch (error) {
    console.error('Error in force reset password requirement API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
