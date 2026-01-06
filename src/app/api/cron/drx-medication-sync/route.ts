import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job endpoint for syncing medications from DRx
 * This endpoint should be called periodically (e.g., every 30 minutes)
 * Configure in vercel.json or external cron service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional: add authentication header check)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, verify the request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the poll medications endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';
    
    const pollUrl = `${baseUrl}/api/pharmacy/drx/poll-medications`;
    
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[DRx Cron] Poll medications failed:', result);
      return NextResponse.json(
        { 
          error: 'Failed to poll medications',
          details: result
        },
        { status: response.status }
      );
    }

    console.log('[DRx Cron] Medication sync completed:', result.stats);
    
    return NextResponse.json({
      success: true,
      message: 'Medication sync job completed',
      timestamp: new Date().toISOString(),
      stats: result.stats,
    });

  } catch (error) {
    console.error('[DRx Cron] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

