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
    console.log('[Diagnose Medication Logs] Starting diagnosis...');

    // Get a sample of recent medication logs
    const { data: recentLogs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('id, patient_id, medication_id, event_date, status, raw_scan_data')
      .order('event_date', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('[Diagnose Medication Logs] Error fetching logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch medication logs' },
        { status: 500 }
      );
    }

    if (!recentLogs || recentLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No logs found',
        data: null
      });
    }

    console.log(`[Diagnose Medication Logs] Found ${recentLogs.length} recent logs`);

    // Group logs by patient and 15-minute intervals
    const logGroups = new Map<string, typeof recentLogs>();
    
    recentLogs.forEach(log => {
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

    console.log(`[Diagnose Medication Logs] Created ${logGroups.size} time groups`);

    // Analyze the groups
    const groupAnalysis = Array.from(logGroups.entries()).map(([groupKey, groupLogs]) => {
      const takenCount = groupLogs.filter(log => log.status === 'taken').length;
      const missedCount = groupLogs.filter(log => log.status === 'missed').length;
      const totalCount = groupLogs.length;
      
      return {
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
    });

    // Find groups with mixed statuses
    const mixedGroups = groupAnalysis.filter(group => group.hasMixedStatus);
    
    // Get overall statistics
    const totalGroups = groupAnalysis.length;
    const allTakenGroups = groupAnalysis.filter(g => g.missedCount === 0).length;
    const allMissedGroups = groupAnalysis.filter(g => g.takenCount === 0).length;
    const mixedGroupsCount = mixedGroups.length;

    console.log(`[Diagnose Medication Logs] Analysis complete:`);
    console.log(`- Total groups: ${totalGroups}`);
    console.log(`- All taken groups: ${allTakenGroups}`);
    console.log(`- All missed groups: ${allMissedGroups}`);
    console.log(`- Mixed status groups: ${mixedGroupsCount}`);

    return NextResponse.json({
      success: true,
      message: `Diagnosis complete: ${totalGroups} groups analyzed`,
      statistics: {
        totalGroups,
        allTakenGroups,
        allMissedGroups,
        mixedGroupsCount
      },
      sampleData: {
        recentLogs: recentLogs.slice(0, 5),
        groupAnalysis: groupAnalysis.slice(0, 10),
        mixedGroups: mixedGroups.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('[Diagnose Medication Logs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to diagnose medication logs' },
      { status: 500 }
    );
  }
}
