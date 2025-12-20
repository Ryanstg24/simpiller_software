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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
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
        { error: 'Failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password change requirement reset successfully'
    });

  } catch (error) {
    console.error('Error in reset password requirement API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
