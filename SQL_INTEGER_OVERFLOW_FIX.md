# 🔧 SQL Integer Overflow Fix

## Issue
PostgreSQL integer overflow when calculating 30-day cycles in milliseconds:
```sql
cycle_ms := 30 * 24 * 60 * 60 * 1000; -- ERROR: integer out of range
```

**Calculation**: 30 × 24 × 60 × 60 × 1000 = **2,592,000,000**  
**PostgreSQL INT max**: 2,147,483,647 (32-bit signed integer)  
**Result**: Integer overflow ❌

---

## Root Cause
PostgreSQL defaults to 32-bit integers for literal calculations, and the milliseconds value exceeds the max INT value.

---

## Fix Applied

### **Before (Broken):**
```sql
DECLARE
  cycle_ms BIGINT := 30 * 24 * 60 * 60 * 1000; -- Overflow before BIGINT cast
  elapsed_ms BIGINT;
BEGIN
  elapsed_ms := EXTRACT(EPOCH FROM (now_ts - earliest_med_date)) * 1000;
  cycles_passed := FLOOR(elapsed_ms / cycle_ms);
```

### **After (Fixed):**
```sql
DECLARE
  elapsed_seconds BIGINT;
  cycles_passed INTEGER;
BEGIN
  -- Use seconds instead of milliseconds
  elapsed_seconds := EXTRACT(EPOCH FROM (now_ts - earliest_med_date))::BIGINT;
  cycles_passed := FLOOR(elapsed_seconds / (30.0 * 24 * 60 * 60))::INTEGER;
  -- Use INTERVAL arithmetic (PostgreSQL native)
  calculated_cycle_start := earliest_med_date + (cycles_passed * INTERVAL '30 days');
```

---

## Why This Works

### **1. Work in Seconds, Not Milliseconds**
- Seconds: 30 × 24 × 60 × 60 = **2,592,000** ✅ (fits in INT)
- Milliseconds: 30 × 24 × 60 × 60 × 1000 = **2,592,000,000** ❌ (overflows INT)

### **2. Use Floating Point Division**
- `30.0 * 24 * 60 * 60` → PostgreSQL treats as NUMERIC/DOUBLE, avoids overflow
- Cast result to INTEGER only after division

### **3. Use INTERVAL Arithmetic**
- PostgreSQL's native date/time handling
- More reliable than manual millisecond math
- No overflow risk

---

## Verification

### **Test the Fix:**
```sql
-- This should work now
DO $$
DECLARE
  elapsed_seconds BIGINT := 2592000; -- 30 days in seconds
  cycles_passed INTEGER;
BEGIN
  cycles_passed := FLOOR(elapsed_seconds / (30.0 * 24 * 60 * 60))::INTEGER;
  RAISE NOTICE 'Cycles passed: %', cycles_passed; -- Should be 1
END $$;
```

### **Test with Actual Data:**
```sql
-- Run the full migration
\i ADD_CYCLE_START_DATE_COLUMN.sql

-- Verify all patients got a cycle_start_date
SELECT COUNT(*) FROM patients WHERE cycle_start_date IS NULL;
-- Should return 0
```

---

## JavaScript/TypeScript Code (Already Safe)

The frontend JavaScript code **does NOT need fixing** because:

### **JavaScript Uses 64-bit Floats**
```javascript
const cycleMs = 30 * 24 * 60 * 60 * 1000; // ✅ No overflow
// JavaScript Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991
```

**Files checked and confirmed safe:**
- ✅ `src/app/patients/page.tsx` (Line 133)
- ✅ `src/app/api/debug/patient-progress/route.ts` (Line 44)

---

## Best Practices for PostgreSQL

### **❌ Don't Do This:**
```sql
-- Literal multiplication can overflow before cast
DECLARE
  big_number BIGINT := 30 * 24 * 60 * 60 * 1000; -- OVERFLOW
```

### **✅ Do This Instead:**
```sql
-- Option 1: Cast first operand to BIGINT
DECLARE
  big_number BIGINT := 30::BIGINT * 24 * 60 * 60 * 1000; -- Safe

-- Option 2: Use floating point
DECLARE
  big_number BIGINT := (30.0 * 24 * 60 * 60 * 1000)::BIGINT; -- Safe

-- Option 3: Use INTERVAL (best for date/time)
SELECT NOW() + INTERVAL '30 days'; -- Native, safe, readable
```

---

## Other SQL Considerations

### **If You Write Custom SQL Functions:**
Always be aware of integer limits when doing large calculations:

```sql
-- BAD: Can overflow
CREATE FUNCTION calculate_something(days INT) RETURNS BIGINT AS $$
  SELECT days * 24 * 60 * 60 * 1000; -- Overflow if days > 24
$$ LANGUAGE SQL;

-- GOOD: Cast or use decimals
CREATE FUNCTION calculate_something(days INT) RETURNS BIGINT AS $$
  SELECT (days::BIGINT * 24 * 60 * 60 * 1000); -- Safe
$$ LANGUAGE SQL;

-- BEST: Use INTERVAL
CREATE FUNCTION calculate_something(days INT) RETURNS TIMESTAMP AS $$
  SELECT NOW() + (days || ' days')::INTERVAL;
$$ LANGUAGE SQL;
```

---

## Summary

| Issue | Fix | Status |
|-------|-----|--------|
| SQL integer overflow in migration | Use seconds + INTERVAL arithmetic | ✅ Fixed |
| JavaScript code overflow risk | None (uses 64-bit floats) | ✅ Already safe |
| Other SQL files | None found in codebase | ✅ No action needed |

---

**Files Modified:**
- ✅ `ADD_CYCLE_START_DATE_COLUMN.sql` - Fixed integer overflow

**Files Verified Safe:**
- ✅ `src/app/patients/page.tsx`
- ✅ `src/app/api/debug/patient-progress/route.ts`

---

**Last Updated**: October 8, 2025  
**Fix Status**: ✅ Complete
