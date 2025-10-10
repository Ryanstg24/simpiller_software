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
    console.log('[Fix Identified Mixed Groups] Starting fix for identified mixed groups...');

    // Get ALL medication logs
    const { data: allLogs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('id, patient_id, medication_id, event_date, status, raw_scan_data')
      .order('event_date', { ascending: false });

    if (logsError) {
      console.error('[Fix Identified Mixed Groups] Error fetching logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs' },
        { status: 500 }
      );
    }

    if (!allLogs || allLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No logs found',
        data: null
      });
    }

    console.log(`[Fix Identified Mixed Groups] Found ${allLogs.length} total logs`);

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

    console.log(`[Fix Identified Mixed Groups] Created ${logGroups.size} time groups`);

    // Find mixed groups and fix them
    let totalLogsUpdated = 0;
    const fixedGroups = [];

    for (const [groupKey, groupLogs] of logGroups) {
      const takenCount = groupLogs.filter(log => log.status === 'taken').length;
      const missedCount = groupLogs.filter(log => log.status === 'missed').length;
      const totalCount = groupLogs.length;
      
      // If this is a mixed group (has both taken and missed)
      if (takenCount > 0 && missedCount > 0) {
        console.log(`[Fix Identified Mixed Groups] Found mixed group: ${groupKey} (${takenCount} taken, ${missedCount} missed)`);
        
        // Get all the missed logs in this group
        const missedLogs = groupLogs.filter(log => log.status === 'missed');
        
        // Update all missed logs to taken
        for (const missedLog of missedLogs) {
          const updatedRawScanData = {
            ...(missedLog.raw_scan_data ? JSON.parse(missedLog.raw_scan_data) : {}),
            fixedFromMixedGroup: true,
            originalStatus: 'missed',
            fixedAt: new Date().toISOString(),
            groupKey: groupKey
          };

          const { error: updateError } = await supabaseAdmin
            .from('medication_logs')
            .update({
              status: 'taken',
              raw_scan_data: JSON.stringify(updatedRawScanData)
            })
            .eq('id', missedLog.id);

          if (updateError) {
            console.error(`[Fix Identified Mixed Groups] Error updating log ${missedLog.id}:`, updateError);
          } else {
            totalLogsUpdated++;
            console.log(`[Fix Identified Mixed Groups] Updated log ${missedLog.id} from missed to taken`);
          }
        }

        fixedGroups.push({
          groupKey,
          totalCount,
          takenCount,
          missedCount,
          logsUpdated: missedLogs.length
        });
      }
    }

    console.log(`[Fix Identified Mixed Groups] Fixed ${fixedGroups.length} mixed groups, updated ${totalLogsUpdated} logs`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedGroups.length} mixed groups, updated ${totalLogsUpdated} logs`,
      statistics: {
        totalGroups: logGroups.size,
        mixedGroupsFixed: fixedGroups.length,
        logsUpdated: totalLogsUpdated
      },
      fixedGroups: fixedGroups
    });

  } catch (error) {
    console.error('[Fix Identified Mixed Groups] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fix mixed groups' },
      { status: 500 }
    );
  }
}
