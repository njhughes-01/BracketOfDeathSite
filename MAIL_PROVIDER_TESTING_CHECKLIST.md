# Mail Provider Settings - Testing Checklist

## Pre-Testing Setup
- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Docker containers healthy (MongoDB, Keycloak, etc.)
- [ ] Super Admin account available for testing

## Core Functionality Tests

### 1. Initial Page Load
**Test:** Load settings page for the first time
- [ ] Page loads without errors
- [ ] Provider selection displays correctly (Mailjet/Mailgun)
- [ ] Test email section is visible
- [ ] Save button shows "Save Settings" (enabled if no changes)
- [ ] No error or success messages displayed

### 2. Provider Selection - Mailjet
**Test:** Select Mailjet provider
- [ ] Mailjet fields appear (API Key, API Secret, Sender Email)
- [ ] Mailgun fields hidden
- [ ] Provider indicator shows "Not Configured" if not set up
- [ ] Test email section remains visible

### 3. Provider Selection - Mailgun
**Test:** Select Mailgun provider
- [ ] Mailgun fields appear (Domain, API Key)
- [ ] Mailjet fields hidden
- [ ] Sender Email field visible (shared between providers)
- [ ] Provider indicator shows "Not Configured" if not set up
- [ ] Test email section remains visible

### 4. Entering Credentials - First Time Setup

**Test:** Enter Mailjet credentials
1. Select Mailjet
2. Enter API Key: `test-key-123`
3. Enter API Secret: `test-secret-456`
4. Enter Sender Email: `test@example.com`

**Expected:**
- [ ] `hasChanges` state set to `true`
- [ ] Save button changes to "Test Email First" (disabled)
- [ ] Yellow warning badge appears: "⚠️ Test required before saving"
- [ ] "Send Test" button becomes primary color (yellow/green)

**Test:** Enter Mailgun credentials
1. Select Mailgun
2. Enter Domain: `mg.example.com`
3. Enter API Key: `test-mailgun-key`
4. Enter Sender Email: `noreply@mg.example.com`

**Expected:**
- [ ] Same behavior as Mailjet (hasChanges true, save disabled)

### 5. Test Email Workflow - Success Path

**Test:** Send successful test email
1. Enter credentials (Mailjet or Mailgun)
2. Enter test email address: `your-email@example.com`
3. Click "Send Test" button

**Expected:**
- [ ] Button shows loading spinner
- [ ] "Send Test" button disabled during request
- [ ] On success: Green success message appears
- [ ] Success message: "✅ Test email sent successfully! You can now save your settings."
- [ ] `testEmailSuccess` state set to `true`
- [ ] Green badge appears: "✅ Test passed"
- [ ] Save button changes to "Save Settings" (enabled)
- [ ] Save button icon changes from lock to save icon

### 6. Test Email Workflow - Failure Path

**Test:** Send test email with invalid credentials
1. Enter invalid credentials
2. Enter test email address
3. Click "Send Test"

**Expected:**
- [ ] Error message displayed
- [ ] `testEmailSuccess` remains `false`
- [ ] Save button stays disabled with "Test Email First"
- [ ] Warning badge remains visible

### 7. Save After Successful Test

**Test:** Save settings after successful test
1. Complete successful test email
2. Click "Save Settings" button

**Expected:**
- [ ] Button shows loading spinner
- [ ] Settings saved successfully
- [ ] Success message: "Settings verified and saved successfully!"
- [ ] Page reloads settings
- [ ] API keys cleared from form (security)
- [ ] `hasChanges` reset to `false`
- [ ] `testEmailSuccess` reset to `false`
- [ ] Provider shows as "Active" with green checkmark

### 8. Change Detection - Switch Provider

**Test:** Switch provider after successful test
1. Set up and test Mailjet successfully
2. Switch to Mailgun provider

**Expected:**
- [ ] `testEmailSuccess` reset to `false`
- [ ] `hasChanges` set to `true`
- [ ] Save button disabled again ("Test Email First")
- [ ] Warning badge reappears
- [ ] Test must be re-run

### 9. Change Detection - Modify Credentials

**Test:** Modify credentials after successful test
1. Complete successful test
2. Change any credential field (API key, secret, domain, email)

**Expected:**
- [ ] `testEmailSuccess` reset to `false`
- [ ] Save button disabled
- [ ] Warning badge reappears
- [ ] Must test again before saving

### 10. Branding-Only Changes

**Test:** Update only branding settings (not email)
1. Don't modify email credentials
2. Change brand name, colors, or logo
3. Click save button on branding section

**Expected:**
- [ ] Branding saves successfully
- [ ] No email test required
- [ ] Email provider settings unchanged

### 11. Edge Cases

#### Empty Test Email Address
**Test:** Try to test without entering email address
- [ ] "Send Test" button disabled
- [ ] Error message if clicked: "Please enter an email address to send a test to"

#### Invalid Email Format
**Test:** Enter invalid email format for test
- [ ] Frontend validation prevents submission
- [ ] Or backend returns error with helpful message

#### Network Error During Test
**Test:** Simulate network failure during test
- [ ] Error message displayed
- [ ] `testEmailSuccess` remains `false`
- [ ] User can retry

#### Rapidly Switching Providers
**Test:** Quickly switch between Mailjet and Mailgun multiple times
- [ ] State updates correctly each time
- [ ] No race conditions
- [ ] Test status resets appropriately

#### Save Without Changes
**Test:** Load page and try to save without changes
- [ ] Save button enabled (or shows no changes message)
- [ ] No errors occur
- [ ] Settings remain unchanged

### 12. Visual Indicators

**Test:** Verify all visual indicators work
- [ ] Yellow warning badge shows when test required
- [ ] Green success badge shows when test passed
- [ ] Lock icon on save button when disabled
- [ ] Save icon on save button when enabled
- [ ] Primary color on "Send Test" when test required
- [ ] Blue color on "Send Test" after test passed
- [ ] Provider status badges (Active/Not Configured)
- [ ] Configured checkmarks on provider tabs

### 13. Multi-Session Consistency

**Test:** Open settings in two browser tabs
1. Configure in tab 1
2. Save in tab 1
3. Refresh tab 2

**Expected:**
- [ ] Tab 2 shows updated configuration
- [ ] Provider status correct in both tabs

### 14. Security Validation

**Test:** Verify credentials are handled securely
- [ ] API keys shown as password fields (dots)
- [ ] Placeholders show "•••••••••" for existing keys
- [ ] Keys cleared from form after save
- [ ] Keys not visible in browser dev tools
- [ ] HTTPS used for API calls (production)

### 15. Error Recovery

**Test:** Recover from various error states
- [ ] After test failure, can retry successfully
- [ ] After save failure, can retry without re-testing
- [ ] After network error, state remains consistent
- [ ] Error messages clear when action succeeds

## Accessibility Tests

### Keyboard Navigation
- [ ] Can tab through all form fields
- [ ] Can select provider with keyboard
- [ ] Can submit form with Enter key
- [ ] Focus indicators visible

### Screen Reader
- [ ] Button states announced correctly
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] Form labels properly associated

## Performance Tests

### Load Time
- [ ] Page loads in < 2 seconds
- [ ] No unnecessary re-renders
- [ ] State updates efficient

### Test Email Response
- [ ] Test email sends in < 5 seconds
- [ ] Loading indicator shows immediately
- [ ] No UI freezing during operation

## Integration Tests

### Full Workflow - Mailjet
1. [ ] Load page
2. [ ] Select Mailjet
3. [ ] Enter valid Mailjet credentials
4. [ ] Send test email (verify in inbox)
5. [ ] Save settings
6. [ ] Verify email works for actual app features

### Full Workflow - Mailgun
1. [ ] Load page
2. [ ] Select Mailgun
3. [ ] Enter valid Mailgun credentials
4. [ ] Send test email (verify in inbox)
5. [ ] Save settings
6. [ ] Verify email works for actual app features

### Provider Switching
1. [ ] Configure and save Mailjet
2. [ ] Switch to Mailgun
3. [ ] Configure and save Mailgun
4. [ ] Verify only Mailgun is active
5. [ ] Switch back to Mailjet
6. [ ] Verify Mailjet credentials preserved

## Regression Tests

### Existing Functionality
- [ ] Other settings sections still work (branding)
- [ ] Email templates preview correctly
- [ ] Navigation still works
- [ ] Super Admin permissions still enforced
- [ ] Other admin features unaffected

## Documentation Verification

- [ ] User sees clear guidance at each step
- [ ] Error messages are helpful
- [ ] Success messages are encouraging
- [ ] Tooltips provide context
- [ ] Helper text explains requirements

## Post-Deployment Checklist

- [ ] Monitor error logs for issues
- [ ] Verify test emails deliver to inbox
- [ ] Check email provider dashboards for send success
- [ ] Verify no credential leaks in logs
- [ ] Confirm performance metrics acceptable

## Known Limitations

- Test email requires valid credentials (can't test with fake keys)
- Network errors require manual retry (no auto-retry)
- Provider configuration is per-instance (not per-environment)

## Test Environment Requirements

### Development
- Local backend with mock email providers
- Test email accounts available
- Console logging enabled

### Staging
- Real email provider accounts (sandbox mode)
- Test email addresses verified
- Full error tracking enabled

### Production
- Production email provider accounts
- Monitoring and alerting configured
- Backup provider ready (optional)

## Success Criteria

All core functionality tests must pass ✅
All edge cases handled gracefully ✅
No TypeScript errors ✅
No console errors ✅
Performance within acceptable limits ✅
Security requirements met ✅
Accessibility standards met ✅

## Sign-Off

- [ ] Developer tested locally
- [ ] QA verified in staging
- [ ] Product owner approved
- [ ] Documentation updated
- [ ] Ready for production deployment
