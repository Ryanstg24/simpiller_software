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
    console.log('[Find All Mixed Groups] Starting comprehensive search for mixed groups...');

    // Get ALL medication logs
    const { data: allLogs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('id, patient_id, medication_id, event_date, status, raw_scan_data')
      .order('event_date', { ascending: false });

    if (logsError) {
      console.error('[Find All Mixed Groups] Error fetching logs:', logsError);
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

    console.log(`[Find All Mixed Groups] Found ${allLogs.length} total logs`);

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

    console.log(`[Find All Mixed Groups] Created ${logGroups.size} time groups`);

    // Find all mixed groups
    const mixedGroups = [];
    const allTakenGroups = [];
    const allMissedGroups = [];

    for (const [groupKey, groupLogs] of logGroups) {
      const takenCount = groupLogs.filter(log => log.status === 'taken').length;
      const missedCount = groupLogs.filter(log => log.status === 'missed').length;
      const totalCount = groupLogs.length;
      
      const groupInfo = {
        groupKey,
        totalCount,
        takenCount,
        missedCount,
        hasMixedStatus: takenCount > 0 && missedCount > 0,
        sampleLogs: groupLogs.slice(0, 3).map(log => ({
          id: log.id,
          medication_id: log.medication_id,
          event_date: log.event_date,
          status: log.status
        }))
      };

      if (groupInfo.hasMixedStatus) {
        mixedGroups.push(groupInfo);
      } else if (takenCount === totalCount) {
        allTakenGroups.push(groupInfo);
      } else if (missedCount === totalCount) {
        allMissedGroups.push(groupInfo);
      }
    }

    console.log(`[Find All Mixed Groups] Found ${mixedGroups.length} mixed groups, ${allTakenGroups.length} all-taken groups, ${allMissedGroups.length} all-missed groups`);

    return NextResponse.json({
      success: true,
      message: `Found ${mixedGroups.length} mixed groups out of ${logGroups.size} total groups`,
      statistics: {
        totalGroups: logGroups.size,
        mixedGroups: mixedGroups.length,
        allTakenGroups: allTakenGroups.length,
        allMissedGroups: allMissedGroups.length
      },
      mixedGroups: mixedGroups.slice(0, 10), // Show first 10 mixed groups
      recentLogs: allLogs.slice(0, 10), // Show first 10 recent logs
      dateRange: {
        earliest: allLogs[allLogs.length - 1]?.event_date,
        latest: allLogs[0]?.event_date
      }
    });

  } catch (error) {
    console.error('[Find All Mixed Groups] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to find mixed groups' },
      { status: 500 }
    );
  }
}
