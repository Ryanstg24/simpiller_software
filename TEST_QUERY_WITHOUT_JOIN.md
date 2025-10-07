# Test: Query Without Medications Join

## Hypothesis
The `medications` join might be filtering out recent logs if:
1. Medications were deleted
2. RLS policy on medications is blocking them
3. Join is causing the query to fail silently

## Test Query

Open browser console and run this manually:

```javascript
// Test 1: Query WITHOUT join (should return all logs)
const { data: logsWithoutJoin, error: error1 } = await window.supabase
  .from('medication_logs')
  .select('id, medication_id, patient_id, event_date, status, qr_code_scanned')
  .eq('patient_id', 'PATIENT_ID_HERE')  // Replace with actual patient ID
  .order('event_date', { ascending: false })
  .limit(100);

console.log('Logs WITHOUT join:', logsWithoutJoin?.length, logsWithoutJoin);

// Test 2: Query WITH join (current implementation)
const { data: logsWithJoin, error: error2 } = await window.supabase
  .from('medication_logs')
  .select(`
    id,
    medication_id,
    patient_id,
    event_date,
    status,
    qr_code_scanned,
    medications (
      name,
      strength,
      format
    )
  `)
  .eq('patient_id', 'PATIENT_ID_HERE')  // Replace with actual patient ID
  .order('event_date', { ascending: false })
  .limit(100);

console.log('Logs WITH join:', logsWithJoin?.length, logsWithJoin);

// Compare counts
console.log('Difference:', (logsWithoutJoin?.length || 0) - (logsWithJoin?.length || 0), 'logs missing due to join');
```

## Expected Results

### If join is the problem:
- `logsWithoutJoin`: 100+ logs (includes Oct 5-7)
- `logsWithJoin`: Fewer logs (stops at Oct 4)
- **Solution:** Change query to LEFT JOIN or fetch medications separately

### If logs don't exist:
- Both queries return same count
- Both stop at Oct 4
- **Problem:** Logs aren't being created

## Quick Fix If Join is the Issue

Change the query to use a LEFT JOIN pattern:

```typescript
.select(`
  id,
  medication_id,
  patient_id,
  event_date,
  status,
  qr_code_scanned,
  medications!left (  // ← LEFT JOIN instead of INNER
    name,
    strength,
    format
  )
`)
```

Or fetch logs first, then medications separately.

