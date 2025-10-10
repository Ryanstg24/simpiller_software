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
    console.log('[Fix Specific Mixed Groups] Starting fix for specific mixed groups...');

    // Get ALL medication logs (not just recent ones)
    const { data: allLogs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('id, patient_id, medication_id, event_date, status, raw_scan_data')
      .order('patient_id, event_date');

    if (logsError) {
      console.error('[Fix Specific Mixed Groups] Error fetching logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs' },
        { status: 500 }
      );
    }

    if (!allLogs || allLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No logs found',
        processedCount: 0
      });
    }

    console.log(`[Fix Specific Mixed Groups] Found ${allLogs.length} total logs to analyze`);

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

    console.log(`[Fix Specific Mixed Groups] Created ${logGroups.size} time groups`);

    let processedGroups = 0;
    let logsUpdated = 0;
    const errors = [];
    const mixedGroupsFound = [];

    // Process each group
    for (const [groupKey, groupLogs] of logGroups) {
      try {
        // Check if this group has mixed statuses (some taken, some missed)
        const takenLogs = groupLogs.filter(log => log.status === 'taken');
        const missedLogs = groupLogs.filter(log => log.status === 'missed');
        
        // If we have both taken and missed logs in the same time window,
        // and there's at least one taken log, mark ALL as taken
        if (takenLogs.length > 0 && missedLogs.length > 0) {
          console.log(`[Fix Specific Mixed Groups] Found mixed group: ${groupKey} - ${takenLogs.length} taken, ${missedLogs.length} missed`);
          mixedGroupsFound.push({
            groupKey,
            takenCount: takenLogs.length,
            missedCount: missedLogs.length,
            totalCount: groupLogs.length
          });
          
          // Update all missed logs in this group to "taken"
          for (const missedLog of missedLogs) {
            const { error: updateError } = await supabaseAdmin
              .from('medication_logs')
              .update({ 
                status: 'taken',
                raw_scan_data: JSON.stringify({
                  ...JSON.parse(missedLog.raw_scan_data || '{}'),
                  packScanFix: true,
                  originalStatus: 'missed',
                  fixedAt: new Date().toISOString(),
                  reason: 'pack_scan_all_medications_taken',
                  groupKey: groupKey
                })
              })
              .eq('id', missedLog.id);

            if (updateError) {
              console.error(`[Fix Specific Mixed Groups] Error updating log ${missedLog.id}:`, updateError);
              errors.push(`Log ${missedLog.id}: Failed to update`);
            } else {
              logsUpdated++;
              console.log(`[Fix Specific Mixed Groups] Updated log ${missedLog.id} from missed to taken`);
            }
          }
        }
        
        processedGroups++;
        
        // Log progress every 1000 groups
        if (processedGroups % 1000 === 0) {
          console.log(`[Fix Specific Mixed Groups] Processed ${processedGroups}/${logGroups.size} groups`);
        }

      } catch (error) {
        console.error(`[Fix Specific Mixed Groups] Error processing group ${groupKey}:`, error);
        errors.push(`Group ${groupKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Fix Specific Mixed Groups] Completed. Processed ${processedGroups} groups, found ${mixedGroupsFound.length} mixed groups, updated ${logsUpdated} logs with ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Fixed mixed status groups: processed ${processedGroups} groups, found ${mixedGroupsFound.length} mixed groups, updated ${logsUpdated} logs`,
      processedGroups,
      mixedGroupsFound,
      logsUpdated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[Fix Specific Mixed Groups] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fix mixed status groups' },
      { status: 500 }
    );
  }
}
