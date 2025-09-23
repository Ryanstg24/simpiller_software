import { NextRequest, NextResponse } from 'next/server';
import { SFTPProcessor } from '@/lib/sftp-processor';

export async function GET(request: NextRequest) {
  try {
    console.log('[Chautauqua SFTP Test] Starting SFTP connection test...');

    // Check if SFTP integration is enabled
    if (process.env.CHAUTAUQUA_SFTP_ENABLED === 'false') {
      console.log('[Chautauqua SFTP Test] SFTP integration is disabled');
      return NextResponse.json({
        success: false,
        error: 'SFTP integration is disabled',
        organizationId: null,
        connectionTest: false
      });
    }

    // Get The Chautauqua Center organization ID
    const organizationId = await SFTPProcessor.getChautauquaOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'The Chautauqua Center organization not found in database',
        organizationId: null
      });
    }

    console.log(`[Chautauqua SFTP Test] Found organization ID: ${organizationId}`);

    // Test SFTP connection
    const processor = new SFTPProcessor(organizationId);
    const connectionTest = await processor.testConnection();

    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'SFTP connection test failed',
        organizationId,
        connectionTest: false
      });
    }

    // If connection test passes, try to process files
    console.log('[Chautauqua SFTP Test] Connection test passed, attempting to process files...');
    const result = await processor.processNewFiles();

    return NextResponse.json({
      success: true,
      message: 'SFTP test completed successfully',
      organizationId,
      connectionTest: true,
      processingResult: result
    });

  } catch (error) {
    console.error('[Chautauqua SFTP Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      organizationId: null,
      connectionTest: false
    });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
