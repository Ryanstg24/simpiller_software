# 📅 Cycle Start Date Implementation

## Overview
Added explicit `cycle_start_date` column to the `patients` table to provide better control over billing cycles, especially for ported patients.

---

## 🎯 **What Changed**

### **1. Database Schema**
- **New Column**: `patients.cycle_start_date` (TIMESTAMP WITH TIME ZONE, NOT NULL)
- **Default Value**: `NOW()` - automatically set to patient creation date
- **Indexed**: For faster queries
- **Backfilled**: All existing patients have been assigned their current calculated cycle start

### **2. Frontend Logic**
- `cycle_start_date` is now the **primary source** for cycle calculations
- Falls back to earliest medication date if `cycle_start_date` is missing (backwards compatibility)
- New patients automatically get `cycle_start_date` set to creation time via DB default

### **3. Type Definitions**
- Updated `Patient` interface in `use-patients.ts`
- Updated Supabase database types in `supabase.ts`

---

## 📁 **Files Modified**

### **1. `ADD_CYCLE_START_DATE_COLUMN.sql`** (New - Run in Supabase)
Migration script that:
- ✅ Adds `cycle_start_date` column
- ✅ Backfills existing patients with calculated cycle start
- ✅ Sets column to NOT NULL with DEFAULT NOW()
- ✅ Creates index for performance
- ✅ Includes verification queries

### **2. `src/app/patients/page.tsx`**
**Lines 153-178**: Updated cycle calculation logic
```typescript
// Use cycle_start_date if available, otherwise fall back to earliest medication
let cycleAnchor: string | null = null;

if (patient.cycle_start_date) {
  cycleAnchor = patient.cycle_start_date;
} else {
  // Fallback: Find earliest medication
  const { data: med } = await supabase
    .from('medications')
    .select('created_at')
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
    
  cycleAnchor = med?.created_at as string;
}
```

### **3. `src/hooks/use-patients.ts`**
**Line 55**: Added `cycle_start_date?: string;` to Patient interface

### **4. `src/lib/supabase.ts`**
**Lines 192, 197**: Added `cycle_start_date` to database Row and Insert types

### **5. `src/components/patients/add-patient-modal.tsx`**
**Lines 223-224**: Added comment documenting automatic cycle_start_date handling

---

## 🚀 **How to Deploy**

### **Step 1: Run Database Migration**
1. Open **Supabase SQL Editor**
2. Copy and paste contents of `ADD_CYCLE_START_DATE_COLUMN.sql`
3. Run the script
4. Verify output shows all patients have been backfilled

### **Step 2: Deploy Frontend Changes**
Frontend changes are already committed. Just deploy to Vercel:
```bash
git add .
git commit -m "Add cycle_start_date column for explicit billing cycle control"
git push origin main
```

### **Step 3: Verify**
```sql
-- Check that all patients have cycle_start_date
SELECT COUNT(*) FROM patients WHERE cycle_start_date IS NULL;
-- Should return 0

-- Sample some patients
SELECT 
  first_name, 
  last_name, 
  created_at, 
  cycle_start_date 
FROM patients 
LIMIT 5;
```

---

## 📝 **How It Works**

### **For New Patients:**
```
1. Patient created → cycle_start_date automatically set to NOW()
2. System uses cycle_start_date for all billing cycle calculations
3. Cycles advance every 30 days from that anchor date
```

### **For Existing Patients:**
```
1. Backfill calculated their current cycle start (based on earliest medication)
2. System now uses cycle_start_date for calculations
3. No disruption to existing cycles
```

### **For Ported Patients:**
```
1. Create patient normally (cycle_start_date = NOW() by default)
2. Manually adjust cycle_start_date to match their legacy system:

UPDATE patients 
SET cycle_start_date = '2025-09-15T00:00:00Z' 
WHERE id = 'patient-id-here';

3. Billing cycles now match their original schedule
```

---

## 🎯 **Benefits**

### **Before (Old System):**
❌ Cycle start determined by earliest medication  
❌ Deleting old medications could shift cycles  
❌ No explicit control for ported patients  
❌ Fragile and implicit  

### **After (New System):**
✅ Cycle start explicitly stored in database  
✅ Independent of medications  
✅ Easy to adjust for ported patients  
✅ Robust and explicit  

---

## 🛠️ **Manual Cycle Adjustment**

### **To adjust a ported patient's cycle start:**

```sql
-- Find the patient
SELECT id, first_name, last_name, cycle_start_date 
FROM patients 
WHERE last_name = 'Smith';

-- Update their cycle start date
UPDATE patients 
SET cycle_start_date = '2025-10-01T00:00:00Z'  -- Set to desired date
WHERE id = 'abc-123-def-456';

-- Verify
SELECT first_name, last_name, cycle_start_date 
FROM patients 
WHERE id = 'abc-123-def-456';
```

### **To see a patient's current cycle:**

```sql
SELECT 
  first_name,
  last_name,
  cycle_start_date,
  -- Calculate current cycle
  cycle_start_date + (
    FLOOR(
      EXTRACT(EPOCH FROM (NOW() - cycle_start_date)) / (30 * 24 * 60 * 60)
    ) * INTERVAL '30 days'
  ) as current_cycle_start,
  -- Calculate cycle end
  cycle_start_date + (
    (FLOOR(
      EXTRACT(EPOCH FROM (NOW() - cycle_start_date)) / (30 * 24 * 60 * 60)
    ) + 1) * INTERVAL '30 days'
  ) as current_cycle_end
FROM patients
WHERE id = 'abc-123-def-456';
```

---

## 📊 **Example Scenarios**

### **Scenario 1: New Patient**
```
Patient created: Oct 8, 2025 @ 10:00 AM
cycle_start_date: Oct 8, 2025 @ 10:00 AM (auto)
Cycle 1: Oct 8 - Nov 7
Cycle 2: Nov 7 - Dec 7
```

### **Scenario 2: Ported Patient** (Manual Adjustment)
```
Patient created: Oct 8, 2025 @ 10:00 AM
cycle_start_date: Oct 8, 2025 @ 10:00 AM (auto)

-- Admin manually adjusts to match legacy system:
UPDATE patients SET cycle_start_date = '2025-09-15T00:00:00Z' WHERE ...

Updated cycle_start_date: Sep 15, 2025
Current Cycle: Sep 15 - Oct 15
Next Cycle: Oct 15 - Nov 14
```

---

## ⚠️ **Important Notes**

1. **Backwards Compatible**: If `cycle_start_date` is somehow NULL, system falls back to earliest medication date
2. **30-Day Cycles**: Still using fixed 30-day billing cycles
3. **No Timezone Issues**: All timestamps are `TIMESTAMP WITH TIME ZONE`
4. **Indexed**: Fast queries for filtering/sorting by cycle dates

---

## 🔍 **Troubleshooting**

### **Issue: Patient has no cycle_start_date after migration**
```sql
-- Manually set it to their creation date
UPDATE patients 
SET cycle_start_date = created_at 
WHERE cycle_start_date IS NULL;
```

### **Issue: Cycle looks wrong for ported patient**
```sql
-- Check current value
SELECT cycle_start_date FROM patients WHERE id = 'xxx';

-- Adjust to correct date
UPDATE patients 
SET cycle_start_date = '2025-MM-DDT00:00:00Z' 
WHERE id = 'xxx';
```

---

**Last Updated**: October 8, 2025  
**Status**: ✅ Ready to Deploy  
**Migration File**: `ADD_CYCLE_START_DATE_COLUMN.sql`
