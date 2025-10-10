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
    console.log('[Debug Specific Group] Starting debug for Oct 10, 08:00 AM group...');

    // Look for logs around Oct 10, 2025, 08:00 AM
    const startTime = '2025-10-10T08:00:00.000Z';
    const endTime = '2025-10-10T08:15:00.000Z';

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('medication_logs')
      .select('id, patient_id, medication_id, event_date, status, raw_scan_data')
      .gte('event_date', startTime)
      .lt('event_date', endTime)
      .order('event_date');

    if (logsError) {
      console.error('[Debug Specific Group] Error fetching logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No logs found in the specified time range',
        data: null
      });
    }

    console.log(`[Debug Specific Group] Found ${logs.length} logs in time range`);

    // Group by patient and show the grouping logic
    const patientGroups = new Map<string, typeof logs>();
    
    logs.forEach(log => {
      if (!patientGroups.has(log.patient_id)) {
        patientGroups.set(log.patient_id, []);
      }
      patientGroups.get(log.patient_id)!.push(log);
    });

    const analysis = Array.from(patientGroups.entries()).map(([patientId, patientLogs]) => {
      // Apply the same 15-minute grouping logic
      const timeGroups = new Map<string, typeof patientLogs>();
      
      patientLogs.forEach(log => {
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
        
        if (!timeGroups.has(intervalTime)) {
          timeGroups.set(intervalTime, []);
        }
        timeGroups.get(intervalTime)!.push(log);
      });

      return {
        patientId,
        totalLogs: patientLogs.length,
        timeGroups: Array.from(timeGroups.entries()).map(([intervalTime, groupLogs]) => {
          const takenCount = groupLogs.filter(log => log.status === 'taken').length;
          const missedCount = groupLogs.filter(log => log.status === 'missed').length;
          
          return {
            intervalTime,
            totalCount: groupLogs.length,
            takenCount,
            missedCount,
            hasMixedStatus: takenCount > 0 && missedCount > 0,
            logs: groupLogs.map(log => ({
              id: log.id,
              medication_id: log.medication_id,
              event_date: log.event_date,
              status: log.status,
              rawMinutes: new Date(log.event_date).getMinutes(),
              roundedMinutes: Math.floor(new Date(log.event_date).getMinutes() / 15) * 15
            }))
          };
        })
      };
    });

    return NextResponse.json({
      success: true,
      message: `Debug complete for Oct 10, 08:00 AM time range`,
      timeRange: { startTime, endTime },
      totalLogs: logs.length,
      analysis
    });

  } catch (error) {
    console.error('[Debug Specific Group] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to debug specific group' },
      { status: 500 }
    );
  }
}
