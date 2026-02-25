import { NextRequest, NextResponse } from 'next/server';

/**
 * One-time (or re-register) DRx webhook subscription.
 * Uses DRX_API_ENDPOINT — set to production (e.g. https://derosa.drxapp.com/external_api/v1) to register with production DRx.
 * Subscribes to "Print" so we receive a POST to our webhook URL when a prescription fill enters Print status.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET || process.env.DRX_WEBHOOK_REGISTER_SECRET;
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL or VERCEL_URL must be set to register webhook URL' },
        { status: 400 }
      );
    }

    const webhookUrl = `${baseUrl}/api/pharmacy/drx/webhook`;
    const headerKey = process.env.DRX_WEBHOOK_HEADER_KEY || 'X-DRX-Webhook-Secret';
    const headerValue = process.env.DRX_WEBHOOK_HEADER_VALUE;
    if (!headerValue) {
      return NextResponse.json(
        { error: 'DRX_WEBHOOK_HEADER_VALUE must be set for webhook authentication' },
        { status: 400 }
      );
    }

    const drxEndpoint = process.env.DRX_API_ENDPOINT || 'https://staging.drxapp.com/external_api/v1';
    const apiKey = process.env.DRX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DRX_API_KEY must be set' },
        { status: 400 }
      );
    }

    const body = {
      url: webhookUrl,
      header_key: headerKey,
      header_value: headerValue,
      event: 'Print',
    };

    const response = await fetch(`${drxEndpoint}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'X-DRX-Key': apiKey,
        'Referer': baseUrl,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[DRx Register Webhook] DRx API error:', response.status, data);
      return NextResponse.json(
        { error: 'Failed to register webhook with DRx', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook registered with DRx (Print event)',
      url: webhookUrl,
      endpoint: drxEndpoint,
    });
  } catch (error) {
    console.error('[DRx Register Webhook] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
