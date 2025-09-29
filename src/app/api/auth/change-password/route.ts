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
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required' },
        { status: 400 }
      );
    }

    // Change password using Supabase Admin API
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (passwordError) {
      console.error('Error changing password:', passwordError);
      return NextResponse.json(
        { error: `Failed to change password: ${passwordError.message}` },
        { status: 500 }
      );
    }

    // Update the user record to remove the password change requirement
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_change_required: false })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user record:', updateError);
      return NextResponse.json(
        { error: 'Password changed but failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error in change password API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
