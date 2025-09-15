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
      name,
      subdomain,
      acronym,
      brand_name,
      tagline,
      street1,
      street2,
      city,
      state,
      postal_code,
      country,
      phone,
      email,
      website,
      clia_id,
      taxonomy,
      timezone,
      client_name,
      patient_id_title,
      clinician_title
    } = body;

    // Validate required fields
    if (!name || !subdomain || !acronym) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subdomain, and acronym are required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating organization with data:', { name, subdomain, acronym });

    // Check if subdomain already exists
    const { data: existingOrg, error: checkError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking subdomain:', checkError);
      return NextResponse.json(
        { error: 'Failed to validate subdomain' },
        { status: 500 }
      );
    }

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 400 }
      );
    }

    // Create the organization
    const { data: newOrganization, error: createError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        subdomain,
        acronym,
        brand_name: brand_name || null,
        tagline: tagline || null,
        street1: street1 || null,
        street2: street2 || null,
        city: city || null,
        state: state || null,
        postal_code: postal_code || null,
        country: country || 'US',
        phone: phone || null,
        email: email || null,
        website: website || null,
        clia_id: clia_id || null,
        taxonomy: taxonomy || null,
        timezone: timezone || 'America/New_York',
        client_name: client_name || 'Client',
        patient_id_title: patient_id_title || 'Client ID',
        clinician_title: clinician_title || 'Clinician',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);
      return NextResponse.json(
        { error: `Failed to create organization: ${createError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Organization created successfully:', newOrganization);

    return NextResponse.json({
      success: true,
      organization: newOrganization
    });

  } catch (error) {
    console.error('💥 Error in organization creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
