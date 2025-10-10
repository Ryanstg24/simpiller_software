import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service-role client for RLS-safe operations
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
    console.log('[Fix Historical Partial Logs] Starting historical data fix...');

    // Find all medication logs that might be part of "partial" groups
    // We'll look for logs within 15-minute windows where some are taken and some are missed
    const { data: allLogs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('id, patient_id, medication_id, event_date, status, raw_scan_data')
      .order('patient_id, event_date');

    if (logsError) {
      console.error('[Fix Historical Partial Logs] Error fetching logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs' },
        { status: 500 }
      );
    }

    if (!allLogs || allLogs.length === 0) {
      console.log('[Fix Historical Partial Logs] No logs found');
      return NextResponse.json({
        success: true,
        message: 'No logs to process',
        processedCount: 0
      });
    }

    console.log(`[Fix Historical Partial Logs] Found ${allLogs.length} total logs to analyze`);

    // Group logs by patient and 15-minute intervals
    const logGroups = new Map<string, typeof allLogs>();
    
    allLogs.forEach(log => {
      const date = new Date(log.event_date);
      
      // Round to nearest 15-minute interval for grouping
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 15) * 15; // Rounds down to 0, 15, 30, or 45
      
      const intervalTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        roundedMinutes,
        0,
        0
      ).toISOString();
      
      const groupKey = `${log.patient_id}-${intervalTime}`;
      
      if (!logGroups.has(groupKey)) {
        logGroups.set(groupKey, []);
      }
      logGroups.get(groupKey)!.push(log);
    });

    console.log(`[Fix Historical Partial Logs] Created ${logGroups.size} time groups`);

    let processedGroups = 0;
    let logsUpdated = 0;
    const errors = [];

    // Process each group
    for (const [groupKey, groupLogs] of logGroups) {
      try {
        // Check if this group has mixed statuses (some taken, some missed)
        const takenLogs = groupLogs.filter(log => log.status === 'taken');
        const missedLogs = groupLogs.filter(log => log.status === 'missed');
        
        // If we have both taken and missed logs in the same time window,
        // and there's at least one taken log, mark ALL as taken
        if (takenLogs.length > 0 && missedLogs.length > 0) {
          console.log(`[Fix Historical Partial Logs] Found mixed group: ${groupKey} - ${takenLogs.length} taken, ${missedLogs.length} missed`);
          
          // Update all missed logs in this group to "taken"
          const missedLogIds = missedLogs.map(log => log.id);
          
          const { error: updateError } = await supabaseAdmin
            .from('medication_logs')
            .update({ 
              status: 'taken',
              raw_scan_data: JSON.stringify({
                ...JSON.parse(log.raw_scan_data || '{}'),
                historicalFix: true,
                originalStatus: 'missed',
                fixedAt: new Date().toISOString(),
                reason: 'pack_scan_fix'
              })
            })
            .in('id', missedLogIds);

          if (updateError) {
            console.error(`[Fix Historical Partial Logs] Error updating group ${groupKey}:`, updateError);
            errors.push(`Group ${groupKey}: Failed to update logs`);
          } else {
            logsUpdated += missedLogIds.length;
            console.log(`[Fix Historical Partial Logs] Updated ${missedLogIds.length} logs in group ${groupKey} from missed to taken`);
          }
        }
        
        processedGroups++;
        
        // Log progress every 100 groups
        if (processedGroups % 100 === 0) {
          console.log(`[Fix Historical Partial Logs] Processed ${processedGroups}/${logGroups.size} groups`);
        }

      } catch (error) {
        console.error(`[Fix Historical Partial Logs] Error processing group ${groupKey}:`, error);
        errors.push(`Group ${groupKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Fix Historical Partial Logs] Completed. Processed ${processedGroups} groups, updated ${logsUpdated} logs with ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Fixed historical partial logs: processed ${processedGroups} groups and updated ${logsUpdated} logs`,
      processedGroups,
      logsUpdated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Fix Historical Partial Logs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fix historical partial logs' },
      { status: 500 }
    );
  }
}
