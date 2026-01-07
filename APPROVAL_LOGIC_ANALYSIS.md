# Booking Approval Logic Analysis

## Overview
The booking approval system determines whether a booking requires manual approval or can be automatically confirmed based on several factors.

## Approval Scenarios

### 1. **Additional Category Text Provided**
- **Trigger:** `additionalCategoryText` is provided and not empty
- **Result:** `requiresApproval = true`
- **Reason:** Additional text indicates special requirements that need manual review
- **Status:** ✅ Working as intended

### 2. **No Approved Categories Configured (Default All Approved)**
- **Trigger:** Site has no approved categories configured (`approvedCategories.length === 0`)
- **Result:** `requiresApproval = false`
- **Reason:** Default behavior - all categories are accepted
- **Status:** ✅ Working as intended

### 3. **Category Not Approved for Site**
- **Trigger:** Site has approved categories configured, but the selected category is NOT in the list
- **Result:** `requiresApproval = true`
- **Reason:** Category needs manual approval from site owner
- **Status:** ✅ Working as intended

### 4. **Category Approved - Check for Duplicates**
- **Trigger:** Category is explicitly approved for the site
- **Check:** Look for existing bookings by same customer + same category + same centre (any site)
- **Result:** 
  - If duplicates found: `requiresApproval = true`
  - If no duplicates: `requiresApproval = false` (auto-approved)
- **Reason:** Prevent duplicate bookings that might indicate reselling or policy violations
- **Status:** ✅ Working as intended

### 5. **Legacy: Custom Usage**
- **Trigger:** `customUsage` is provided (old system)
- **Result:** `requiresApproval = true`
- **Reason:** Custom usage always requires manual review
- **Status:** ✅ Working as intended (legacy support)

### 6. **Legacy: Usage Type Requires Approval**
- **Trigger:** `usageTypeId` is provided and that type has `requiresApproval = true`
- **Result:** `requiresApproval = true`
- **Reason:** Old system flag
- **Status:** ✅ Working as intended (legacy support)

---

## Booking Status Logic

After determining `requiresApproval`, the booking status is set:

```typescript
status: requiresApproval ? "pending" : (site.instantBooking ? "confirmed" : "pending")
```

### Status Flow:
1. **If `requiresApproval = true`**: Status = `"pending"` (manual approval needed)
2. **If `requiresApproval = false` AND `site.instantBooking = true`**: Status = `"confirmed"` (auto-approved)
3. **If `requiresApproval = false` AND `site.instantBooking = false`**: Status = `"pending"` (needs approval)

### Potential Issue ⚠️
**Problem:** Even if `requiresApproval = false` (category is approved, no duplicates), the booking can still be `"pending"` if `site.instantBooking = false`.

**Expected Behavior:**
- If a category is explicitly approved for a site, bookings should be auto-confirmed
- The `site.instantBooking` flag should only apply to sites with no category restrictions

**Recommendation:** 
The logic should be:
```typescript
status: requiresApproval ? "pending" : "confirmed"
```

OR

```typescript
// If category is explicitly approved, ignore instantBooking flag
const autoConfirm = !requiresApproval && (approvedCategories.length === 0 || isApproved);
status: autoConfirm ? "confirmed" : "pending"
```

---

## Test Scenarios Needed

1. ✅ **Scenario 1:** Category approved, no duplicates → Should be `"confirmed"`
2. ✅ **Scenario 2:** Category approved, has duplicates → Should be `"pending"` with `requiresApproval = true`
3. ✅ **Scenario 3:** Category not approved → Should be `"pending"` with `requiresApproval = true`
4. ✅ **Scenario 4:** Additional text provided → Should be `"pending"` with `requiresApproval = true`
5. ✅ **Scenario 5:** No categories configured → Should be `"confirmed"` (default all approved)
6. ⚠️ **Scenario 6:** Category approved but `site.instantBooking = false` → Currently `"pending"`, should be `"confirmed"`?

---

## Conclusion

The approval logic is **mostly working correctly**, but there's a potential issue with the interaction between `requiresApproval` and `site.instantBooking`. 

**Question for clarification:**
- Should `site.instantBooking = false` override category approval?
- Or should explicitly approved categories always result in instant confirmation?
