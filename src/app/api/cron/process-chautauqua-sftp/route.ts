import { NextRequest, NextResponse } from 'next/server';
import { SFTPProcessor } from '@/lib/sftp-processor';

export async function GET(request: NextRequest) {
  try {
    console.log('[Chautauqua SFTP CRON] Starting SFTP processing...');

    // Get The Chautauqua Center organization ID
    const organizationId = await SFTPProcessor.getChautauquaOrganizationId();
    
    if (!organizationId) {
      console.error('[Chautauqua SFTP CRON] The Chautauqua Center organization not found');
      return NextResponse.json(
        { 
          success: false, 
          error: 'The Chautauqua Center organization not found in database' 
        },
        { status: 404 }
      );
    }

    console.log(`[Chautauqua SFTP CRON] Found organization ID: ${organizationId}`);

    // Create processor and process files
    const processor = new SFTPProcessor(organizationId);
    const result = await processor.processNewFiles();

    console.log(`[Chautauqua SFTP CRON] Processing completed: ${result.summary}`);

    return NextResponse.json({
      success: result.success,
      message: result.summary,
      processedFiles: result.processedFiles,
      successfulMedications: result.successfulMedications,
      failedMedications: result.failedMedications,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Chautauqua SFTP CRON] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
