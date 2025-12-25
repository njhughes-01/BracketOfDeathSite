# Mail Provider Settings - Implementation Plan

## Current State Analysis

### Backend Implementation ✅
- **SettingsController**:
  - `verifyCredentials()` - Verifies provider credentials via API call
  - `testEmail()` - Sends test email to specified address
  - `updateSettings()` - Saves settings (already includes verification)

- **EmailService**:
  - `verifyProvider()` - Verifies credentials for a provider
  - `sendTestEmail()` - Sends test email using active provider
  - Supports Mailjet and Mailgun providers
  - Only one provider active at a time (via `activeProvider` field)

- **Provider Implementations**:
  - MailjetProvider: `verifyCredentials()` - calls Mailjet API
  - MailgunProvider: `verifyCredentials()` - calls Mailgun domain API

### Frontend Implementation (Partially Complete)
- **Settings.tsx**:
  - Provider selection (radio buttons) ✅
  - Test email section (shows when configured) ✅
  - "Verify & Save Settings" button ✅
  - Test email input and "Send Test" button ✅

- **api.ts**:
  - `verifyEmailCredentials()` ✅
  - `testEmail()` ✅

## Issues Identified

1. ❌ Save button is always enabled (should be greyed out until test succeeds)
2. ❌ No state tracking for test email success
3. ❌ No form change detection (should reset test status when provider/credentials change)
4. ❌ Test email section shows for configured providers, but should be available for new setup too
5. ❌ No visual indication that testing is required before saving

## Implementation Plan

### Phase 1: Frontend State Management (Settings.tsx)

**New State Variables:**
```typescript
const [testEmailSuccess, setTestEmailSuccess] = useState(false);
const [hasChanges, setHasChanges] = useState(false);
const [initialProvider, setInitialProvider] = useState<"mailjet" | "mailgun">("mailjet");
```

**Change Detection Logic:**
- Track when user changes provider
- Track when user enters/changes credentials
- Reset `testEmailSuccess` to `false` when changes detected
- Set `hasChanges` to `true` when form is modified

**Save Button State:**
```typescript
const canSave = testEmailSuccess && hasChanges;
```

### Phase 2: UI Updates

**Test Email Section:**
- Show test email section for BOTH configured and unconfigured providers
- Add visual indicator: "⚠️ You must send a test email before saving"
- Change "Send Test" button to primary color when test is required
- Show success message: "✅ Test email sent successfully! You can now save."

**Save Button:**
- Disable when `!canSave`
- Add tooltip explaining why it's disabled
- Change button text based on state:
  - Not tested: "Test Email First" (disabled)
  - Tested: "Save Settings" (enabled)

### Phase 3: Workflow Implementation

**User Flow:**
1. User selects provider (Mailjet or Mailgun)
2. User enters credentials
3. Save button becomes disabled with message "Send test email first"
4. User enters test email address
5. User clicks "Send Test" button
6. If successful:
   - Show success message
   - Enable save button
   - Allow user to save
7. If user changes provider or credentials:
   - Reset test status
   - Disable save button again
   - Show "Send test email first" message

### Phase 4: Code Organization

**Extract Components (Optional Enhancement):**
- `EmailProviderSelector` - Provider radio buttons
- `MailjetConfigForm` - Mailjet-specific fields
- `MailgunConfigForm` - Mailgun-specific fields
- `TestEmailSection` - Test email input and button

**Extract Helper Functions:**
- `hasFormChanged()` - Detect form changes
- `canSubmitForm()` - Determine if save should be enabled
- `resetTestStatus()` - Reset test-related state

## Implementation Tasks

### Task 1: Add State Management
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] Add `testEmailSuccess` state
- [ ] Add `hasChanges` state
- [ ] Add `initialProvider` state
- [ ] Add `initialValues` state to track original form values

### Task 2: Implement Change Detection
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] Create `useEffect` to detect provider changes
- [ ] Create `useEffect` to detect credential changes
- [ ] Reset `testEmailSuccess` when changes detected
- [ ] Set `hasChanges` appropriately

### Task 3: Update Test Email Handler
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] Set `testEmailSuccess = true` on successful test
- [ ] Show clear success message
- [ ] Keep error handling for failures

### Task 4: Update Save Button Logic
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] Disable button when `!testEmailSuccess || !hasChanges`
- [ ] Update button styling for disabled state
- [ ] Add tooltip/helper text explaining why disabled
- [ ] Update button text based on state

### Task 5: Update Test Email Section Visibility
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] Show section when provider is selected (regardless of configuration)
- [ ] Add warning indicator when test is required
- [ ] Show success indicator when test passes

### Task 6: Add Visual Indicators
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] Add ⚠️ warning for "test required"
- [ ] Add ✅ success for "test passed"
- [ ] Add helpful messages guiding user through flow
- [ ] Use primary color for "Send Test" button when test is required

### Task 7: Reset Logic After Save
**File:** `src/frontend/src/pages/admin/Settings.tsx`
- [ ] After successful save, update initial values
- [ ] Reset `hasChanges` to `false`
- [ ] Keep `testEmailSuccess` as `true` (credentials are verified)
- [ ] Show success message

## Testing Checklist

### Manual Testing Scenarios
- [ ] Fresh load: Save button disabled
- [ ] Select provider, enter credentials, don't test: Save button disabled
- [ ] Send test email successfully: Save button enabled
- [ ] Change provider after successful test: Save button disabled again
- [ ] Change credentials after successful test: Save button disabled again
- [ ] Test with invalid credentials: Show error, save button stays disabled
- [ ] Test with valid credentials, then save: Success, button disabled until new changes
- [ ] Switch between Mailjet and Mailgun: Test status resets correctly
- [ ] Invalid email address in test field: Show validation error

### Edge Cases
- [ ] Network error during test
- [ ] Invalid email format in test email field
- [ ] Switching providers multiple times
- [ ] Entering credentials but not filling test email address
- [ ] Clearing credentials after successful test

## Success Criteria

1. ✅ Save button is greyed out until user successfully sends a test email
2. ✅ Test email section is always visible when configuring a provider
3. ✅ Changing provider or credentials resets test status
4. ✅ Only one provider can be active at a time (already implemented)
5. ✅ Clear visual feedback for each step of the process
6. ✅ Helpful error messages and guidance
7. ✅ Smooth user experience from selection to save

## Implementation Strategy

### Parallel Tasks (Can be done simultaneously):
- Task 1 (State Management) + Task 2 (Change Detection) - Foundation
- Task 5 (Visibility) + Task 6 (Visual Indicators) - UI Polish

### Sequential Tasks (Must be done in order):
1. Tasks 1-2 (Foundation)
2. Task 3-4 (Core Logic)
3. Task 5-6 (UI/UX)
4. Task 7 (Cleanup)

### Specialized Agents:
- **code-reviewer**: Review state management logic
- **test-designer**: Create comprehensive test plan
- **test-implementer**: Implement unit tests for new logic

## Estimated Complexity

- **Frontend Changes**: Medium complexity
- **Backend Changes**: None required (already well-implemented)
- **Testing**: Medium complexity (multiple states and transitions)
- **Risk Level**: Low (isolated to Settings.tsx, no database changes)

## Notes

- Existing backend implementation is solid and requires no changes
- Focus is on improving UX and preventing premature saves
- Must maintain backward compatibility with existing settings
- Consider adding unit tests for new state management logic
