# Game Plan: Change Patient Communication from 20 Minutes to One Instance Per Cycle

## Overview
**Current Requirement:** ≥ 20 minutes of Patient Communication per billing cycle  
**New Requirement:** ≥ 1 instance of Patient Communication per billing cycle (regardless of duration)

---

## Changes Required

### 1. Billing Calculations (`src/app/billing/page.tsx`)

#### A. Change CPT 98980 Eligibility Logic
**Current (Line 259):**
```typescript
const cpt_98980 = patientCommunicationMinutes >= 20 && adherenceReviewMinutes >= 20;
```

**New:**
```typescript
// Count instances instead of minutes
const patientCommunicationInstances = (timeLogs || [])
  .filter(log => log.activity_type === 'patient_communication').length;

const cpt_98980 = patientCommunicationInstances >= 1 && adherenceReviewMinutes >= 20;
```

**Key Changes:**
- Keep `patientCommunicationMinutes` calculation for reporting/display purposes
- Add `patientCommunicationInstances` count
- Change CPT 98980 check from minutes to instances

#### B. Update BillingData Interface (Line 17-30)
**Current:**
```typescript
interface BillingData {
  // ... other fields
  patient_communication_minutes: number;
  adherence_review_minutes: number;
}
```

**New:**
```typescript
interface BillingData {
  // ... other fields
  patient_communication_minutes: number;  // Keep for historical/reporting
  patient_communication_instances: number; // NEW: Count of instances
  adherence_review_minutes: number;
}
```

**Note:** Keep `patient_communication_minutes` in the interface for backward compatibility and reporting, but eligibility will be based on instances.

#### C. Update Processed Data (Line 277-290)
**Add:**
```typescript
processedData.push({
  // ... existing fields
  patient_communication_minutes: patientCommunicationMinutes, // Keep for reporting
  patient_communication_instances: patientCommunicationInstances, // NEW
  adherence_review_minutes: adherenceReviewMinutes,
});
```

---

### 2. Patients Page Display (`src/app/patients/page.tsx`)

#### A. Update Progress Calculation (Lines 304-343)
**Current:**
```typescript
let communicationMinutes = 0;
// ... sums minutes
if (log.activity_type === 'patient_communication') {
  communicationMinutes += Number(log.duration_minutes || 0);
}
```

**New:**
```typescript
let communicationMinutes = 0;
let communicationInstances = 0; // NEW

// ... in the loop
if (log.activity_type === 'patient_communication') {
  communicationMinutes += Number(log.duration_minutes || 0);
  communicationInstances += 1; // Count instances
}
```

#### B. Update Progress Bar Display (Lines 570-593)
**Current:**
```typescript
const commPct = Math.round((comm / 20) * 100);  // 20-minute target
// ... displays {communicationMinutes}/20
```

**New Option 1 - Binary Display (Recommended):**
```typescript
// Show checkmark/X instead of progress bar
const hasCommunication = communicationInstances >= 1;
// Display: ✓ Patient Communication or ✗ Patient Communication
```

**New Option 2 - Instance Count:**
```typescript
// Show instance count with target
// Display: {communicationInstances}/1
```

**New Option 3 - Keep Minutes Bar but Show Status:**
```typescript
// Keep the visual bar but change label and target
// Display: "Patient Communication: ✓ (X instances)" or "✗ (0 instances)"
```

**Recommendation:** Use Option 1 (Binary Display) - it's cleaner and matches the new requirement.

#### C. Update PatientCycleProgress Interface
**Location:** Check if there's an interface definition

**Add:**
```typescript
interface PatientCycleProgress {
  // ... existing fields
  communicationMinutes: number;
  communicationInstances: number; // NEW
  adherenceMinutes: number;
}
```

---

### 3. Billing Export Functions (`src/app/billing/page.tsx`)

#### A. CSV Export (Line 456-484)
**Current:**
```typescript
'Patient Communication (min)',
```

**New:**
```typescript
// Option 1: Replace with instances
'Patient Communication Instances',
// Option 2: Add both columns
'Patient Communication (min)',
'Patient Communication Instances',
```

**Recommendation:** Option 2 - Keep both for reporting flexibility

#### B. Excel Export (Line 497-511)
**Current:**
```typescript
'Patient Communication (min)': patient.patient_communication_minutes,
```

**New:**
```typescript
'Patient Communication (min)': patient.patient_communication_minutes,
'Patient Communication Instances': patient.patient_communication_instances, // NEW
```

#### C. PDF Export (Line 644)
**Current:** Shows individual log entries with minutes
**Change:** Can stay the same (shows individual entries), but ensure the summary shows instances

---

### 4. Billing Summary/Display (`src/app/billing/page.tsx`)

#### A. Table Columns (if displaying in a table)
**Need to find where billing data is displayed in a table**

**Changes:**
- Add column for "Patient Communication Instances"
- Update tooltips/help text to explain the requirement is "1 instance" not "20 minutes"
- Highlight if instances = 0 (not eligible for CPT 98980)

---

### 5. Time Log Tab (`src/components/patients/time-log-tab.tsx`)

#### A. Update Help Text/Tooltips
**Current:** No explicit mention of 20-minute requirement
**New:** Add tooltip or help text explaining:
- "At least one Patient Communication entry is required per billing cycle for CPT 98980 eligibility"
- Duration is still tracked but doesn't affect eligibility

**Note:** The form itself doesn't need major changes - providers still log time, but the requirement changes.

---

### 6. Documentation/Comments

#### A. Update Code Comments
**Location:** `src/app/billing/page.tsx` Line 259

**Current:**
```typescript
// CPT 98980: Requires >= 20 minutes of Patient Communication AND >= 20 minutes of Adherence Review
```

**New:**
```typescript
// CPT 98980: Requires >= 1 instance of Patient Communication AND >= 20 minutes of Adherence Review
```

#### B. Update Analysis Document
- Update `INTERACTIVE_COMMUNICATION_20MIN_ANALYSIS.md` to reflect the new requirement

---

## Implementation Steps

### Phase 1: Core Logic Changes
1. ✅ Update `processBillingDataForCycle` function
   - Add `patientCommunicationInstances` calculation
   - Change CPT 98980 eligibility from minutes to instances
   - Update `BillingData` interface
   - Update processed data output

### Phase 2: UI Updates
2. ✅ Update Patients Page
   - Add instance counting
   - Update progress bar/display (binary checkmark or instance count)
   - Update `PatientCycleProgress` interface if it exists

3. ✅ Update Billing Page Display
   - Add instance column to tables
   - Update tooltips/help text
   - Update summary statistics

### Phase 3: Export Updates
4. ✅ Update CSV Export
   - Add "Patient Communication Instances" column

5. ✅ Update Excel Export
   - Add "Patient Communication Instances" column

6. ✅ Update PDF Export
   - Add instance count to summary (if applicable)

### Phase 4: Testing & Validation
7. ✅ Test billing calculations
   - Verify CPT 98980 eligibility with 1 instance
   - Verify CPT 98980 eligibility with 0 instances
   - Verify CPT 98980 eligibility with multiple instances
   - Verify CPT 98981 calculation still works correctly

8. ✅ Test patient page display
   - Verify progress indicator shows correct status
   - Verify instance counting works

9. ✅ Test exports
   - Verify CSV includes instance column
   - Verify Excel includes instance column
   - Verify PDF shows correct information

### Phase 5: Documentation
10. ✅ Update code comments
11. ✅ Update analysis document
12. ✅ Update any user-facing documentation

---

## Edge Cases to Consider

### 1. Multiple Instances
- **Q:** What if a provider logs multiple patient communication entries?
- **A:** That's fine - requirement is "at least 1", so 2, 3, etc. are all valid. Keep counting all instances.

### 2. Duration Still Matters?
- **Q:** Should we still track and display minutes even though they don't affect eligibility?
- **A:** Yes - keep minutes for reporting/analytics purposes, but don't use them for eligibility.

### 3. Historical Data
- **Q:** What about historical billing cycles that were calculated with the 20-minute rule?
- **A:** Keep the old data as-is. Only new cycles will use the instance-based rule.

### 4. Zero Instances
- **Q:** What if a provider logs 0 instances but has minutes from a previous cycle?
- **A:** CPT 98980 = false. The requirement is instances, not minutes.

### 5. Adherence Review Still 20 Minutes?
- **Q:** Does adherence review still require 20 minutes?
- **A:** Yes - only patient communication changes from minutes to instances. Adherence review stays at 20 minutes.

---

## Testing Checklist

- [ ] Billing: Patient with 0 instances → CPT 98980 = false
- [ ] Billing: Patient with 1 instance (any duration) → CPT 98980 = true (if adherence review >= 20 min)
- [ ] Billing: Patient with multiple instances → CPT 98980 = true (if adherence review >= 20 min)
- [ ] Billing: Patient with 1 instance but adherence review < 20 min → CPT 98980 = false
- [ ] Billing: CPT 98981 calculation still works correctly
- [ ] Patients Page: Shows ✓ when instances >= 1
- [ ] Patients Page: Shows ✗ when instances = 0
- [ ] CSV Export: Includes instance column
- [ ] Excel Export: Includes instance column
- [ ] PDF Export: Shows correct information
- [ ] Time Log Tab: Can still log patient communication entries

---

## Files to Modify

1. `src/app/billing/page.tsx`
   - Lines 182-190: Add instance counting
   - Line 259: Change CPT 98980 eligibility
   - Lines 17-30: Update BillingData interface
   - Lines 277-290: Update processed data
   - Lines 456-484: Update CSV export
   - Lines 497-511: Update Excel export
   - Various: Update display/table columns

2. `src/app/patients/page.tsx`
   - Lines 304-343: Add instance counting
   - Lines 570-593: Update progress bar display
   - Check for PatientCycleProgress interface

3. `src/components/patients/time-log-tab.tsx`
   - Add help text/tooltips (optional but recommended)

4. `INTERACTIVE_COMMUNICATION_20MIN_ANALYSIS.md`
   - Update to reflect new requirement

---

## Questions to Confirm

1. **Should we keep tracking minutes?** (Recommendation: Yes, for reporting)
2. **How should we display on patients page?** (Recommendation: Binary checkmark)
3. **Should historical cycles be recalculated?** (Recommendation: No, leave as-is)
4. **Should we add instance count to all exports?** (Recommendation: Yes, add to CSV/Excel)

---

## Migration Notes

- This is a **logic change only** - no database schema changes needed
- All existing data remains valid
- The change applies to new billing cycle calculations going forward
- Historical billing cycles keep their original calculations

---

## Priority Order

1. **HIGH:** Core billing logic (CPT 98980 calculation)
2. **HIGH:** Patients page display (providers need to see status)
3. **MEDIUM:** Export functions (CSV/Excel)
4. **LOW:** Documentation updates
5. **LOW:** Help text/tooltips

