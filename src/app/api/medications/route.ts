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
    console.log('🚀 Received medication creation request with body:', JSON.stringify(body, null, 2));
    
    const {
      patient_id,
      name,
      strength,
      format,
      dose_count,
      quantity,
      frequency,
      time_of_day,
      with_food,
      avoid_alcohol,
      impairment_warning,
      special_instructions,
      rx_number,
      rx_filled_date,
      rx_refills,
      status,
      start_date,
      end_date
    } = body;

    console.log('📋 Extracted fields:', {
      patient_id,
      name,
      strength,
      format,
      dose_count,
      quantity,
      frequency
    });

    // Validate required fields
    if (!patient_id || !name || !strength || !format || !dose_count || !quantity || !frequency) {
      console.error('❌ Missing required fields:', {
        patient_id: !!patient_id,
        name: !!name,
        strength: !!strength,
        format: !!format,
        dose_count: !!dose_count,
        quantity: !!quantity,
        frequency: !!frequency
      });
      return NextResponse.json(
        { error: 'Missing required fields: patient_id, name, strength, format, dose_count, quantity, and frequency are required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating medication with data:', { patient_id, name, strength, format });

    // Create the medication
    const { data: newMedication, error: createError } = await supabaseAdmin
      .from('medications')
      .insert({
        patient_id,
        name,
        strength,
        format,
        dose_count,
        quantity,
        frequency,
        time_of_day: time_of_day || null,
        with_food: with_food || false,
        avoid_alcohol: avoid_alcohol || false,
        impairment_warning: impairment_warning || false,
        special_instructions: special_instructions || null,
        rx_number: rx_number || null,
        rx_filled_date: rx_filled_date || null,
        rx_refills: rx_refills || 0,
        status: status || 'active',
        start_date: start_date || null,
        end_date: end_date || null
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating medication:', createError);
      return NextResponse.json(
        { error: `Failed to create medication: ${createError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Medication created successfully:', newMedication);

    // Auto-populate medication schedules after creation
    try {
      const populateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/populate-medication-schedules`, { 
        method: 'POST' 
      });
      if (!populateResponse.ok) {
        console.warn('Failed to populate medication schedules (non-blocking)');
      }
    } catch (e) {
      console.warn('Populate medication schedules failed (non-blocking):', e);
    }

    return NextResponse.json({
      success: true,
      medication: newMedication
    });

  } catch (error) {
    console.error('💥 Error in medication creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      patient_id,
      name,
      strength,
      format,
      dose_count,
      quantity,
      frequency,
      time_of_day,
      with_food,
      avoid_alcohol,
      impairment_warning,
      special_instructions,
      rx_number,
      rx_filled_date,
      rx_refills,
      status,
      start_date,
      end_date
    } = body;

    // Validate required fields
    if (!id || !patient_id || !name || !strength || !format || !dose_count || !quantity || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: id, patient_id, name, strength, format, dose_count, quantity, and frequency are required' },
        { status: 400 }
      );
    }

    console.log('🚀 Updating medication with data:', { id, name, strength, format });

    // Update the medication
    const { data: updatedMedication, error: updateError } = await supabaseAdmin
      .from('medications')
      .update({
        patient_id,
        name,
        strength,
        format,
        dose_count,
        quantity,
        frequency,
        time_of_day: time_of_day || null,
        with_food: with_food || false,
        avoid_alcohol: avoid_alcohol || false,
        impairment_warning: impairment_warning || false,
        special_instructions: special_instructions || null,
        rx_number: rx_number || null,
        rx_filled_date: rx_filled_date || null,
        rx_refills: rx_refills || 0,
        status: status || 'active',
        start_date: start_date || null,
        end_date: end_date || null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating medication:', updateError);
      return NextResponse.json(
        { error: `Failed to update medication: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Medication updated successfully:', updatedMedication);

    // Auto-populate medication schedules after update
    try {
      const populateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/populate-medication-schedules`, { 
        method: 'POST' 
      });
      if (!populateResponse.ok) {
        console.warn('Failed to populate medication schedules (non-blocking)');
      }
    } catch (e) {
      console.warn('Populate medication schedules failed (non-blocking):', e);
    }

    return NextResponse.json({
      success: true,
      medication: updatedMedication
    });

  } catch (error) {
    console.error('💥 Error in medication update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
