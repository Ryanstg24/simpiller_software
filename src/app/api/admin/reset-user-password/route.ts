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

// Generate a secure temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate a new temporary password
    const tempPassword = generateTemporaryPassword();

    // Update the user's password in Supabase Auth
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (passwordError) {
      console.error('Error resetting password:', passwordError);
      return NextResponse.json(
        { error: `Failed to reset password: ${passwordError.message}` },
        { status: 500 }
      );
    }

    // Update the user record to require password change on next login
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_change_required: true })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user record:', updateError);
      return NextResponse.json(
        { error: 'Password reset but failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword: tempPassword
    });

  } catch (error) {
    console.error('Error in reset password API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

