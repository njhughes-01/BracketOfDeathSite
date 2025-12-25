# Mail Provider Settings - Workflow Diagram

## Visual State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL PAGE LOAD                        │
│  - hasChanges = false                                       │
│  - testEmailSuccess = false                                 │
│  - Save button = ENABLED (nothing to save)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              USER CHANGES PROVIDER/CREDENTIALS              │
│  Actions:                                                   │
│  - Select different provider (Mailjet ↔ Mailgun)          │
│  - Enter/change API key, secret, domain, or email          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CHANGE DETECTED                           │
│  State Updates:                                             │
│  - hasChanges = TRUE                                        │
│  - testEmailSuccess = FALSE (reset)                         │
│                                                             │
│  UI Updates:                                                │
│  - Save button: "🔒 Test Email First" (DISABLED)           │
│  - Warning badge: "⚠️ Test required before saving"         │
│  - Send Test button: PRIMARY COLOR (attention)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              USER ENTERS TEST EMAIL ADDRESS                 │
│  - Input: test@example.com                                  │
│  - Send Test button: ENABLED                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 USER CLICKS "SEND TEST"                     │
│  - Button shows loading spinner                             │
│  - API call: POST /api/settings/email/test                  │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   TEST SUCCESS ✅     │   │   TEST FAILURE ❌     │
│                       │   │                       │
│ State Updates:        │   │ State Updates:        │
│ - testEmailSuccess    │   │ - testEmailSuccess    │
│   = TRUE              │   │   = FALSE             │
│                       │   │                       │
│ UI Updates:           │   │ UI Updates:           │
│ - Success message:    │   │ - Error message:      │
│   "✅ Test email sent!│   │   "Failed to send..."│
│ - Green badge:        │   │ - Save button:        │
│   "✅ Test passed"    │   │   STAYS DISABLED      │
│ - Save button:        │   │ - User can retry      │
│   "💾 Save Settings"  │   │                       │
│   (ENABLED)           │   │                       │
└───────────────────────┘   └───────────────────────┘
        │                           │
        │                           └──► User can retry
        ▼                                or fix credentials
┌─────────────────────────────────────────────────────────────┐
│                  USER CLICKS "SAVE SETTINGS"                │
│  - Button shows loading spinner                             │
│  - Credentials verified again (double-check)                │
│  - API call: PUT /api/settings                              │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   SAVE SUCCESS ✅     │   │   SAVE FAILURE ❌     │
│                       │   │                       │
│ Actions:              │   │ Actions:              │
│ - Settings saved      │   │ - Error displayed     │
│ - Page reloads        │   │ - State preserved     │
│ - API keys cleared    │   │ - User can retry      │
│                       │   │                       │
│ State Reset:          │   │ No State Change       │
│ - hasChanges = false  │   │                       │
│ - testEmailSuccess =  │   │                       │
│   false               │   │                       │
│                       │   │                       │
│ UI Updates:           │   │                       │
│ - Success message     │   │                       │
│ - Provider shows      │   │                       │
│   "Active" badge      │   │                       │
└───────────────────────┘   └───────────────────────┘
        │                           │
        └───────────┬───────────────┘
                    ▼
            Back to INITIAL STATE
```

## State Transition Table

| Event                    | hasChanges | testEmailSuccess | Save Button State           |
|--------------------------|------------|------------------|-----------------------------|
| Page Load (no changes)   | `false`    | `false`          | ✅ Enabled (nothing to save)|
| Change Provider          | `true`     | `false` (reset)  | ❌ Disabled                 |
| Change Credentials       | `true`     | `false` (reset)  | ❌ Disabled                 |
| Test Email Success       | `true`     | `true`           | ✅ Enabled                  |
| Test Email Failure       | `true`     | `false`          | ❌ Disabled                 |
| Save Success             | `false` (reset) | `false` (reset) | ✅ Enabled (no changes) |
| Change After Test        | `true`     | `false` (reset)  | ❌ Disabled                 |

## Button Label Decision Tree

```
Is hasChanges true?
│
├─ NO  → "💾 Save Settings" (enabled - but nothing to save)
│
└─ YES → Is testEmailSuccess true?
          │
          ├─ YES → "💾 Save Settings" (enabled - can save)
          │
          └─ NO  → "🔒 Test Email First" (disabled - must test)
```

## Visual Indicator Logic

### Warning Badge (Yellow)
```
Show when: !testEmailSuccess && hasChanges
Text: "⚠️ Test required before saving"
Color: Yellow (#FFEB3B)
```

### Success Badge (Green)
```
Show when: testEmailSuccess
Text: "✅ Test passed"
Color: Green (#4CAF50)
```

### Send Test Button Color
```
If (!testEmailSuccess && hasChanges):
    Color: PRIMARY (#4CAF50 - draws attention)
Else:
    Color: BLUE (#2196F3 - normal state)
```

## User Journey Map

```
START: User wants to configure email
    ↓
[Select Provider]
    ↓
[Enter Credentials]
    ↓
[See Save Button Disabled] ← Visual feedback: test required
    ↓
[Enter Test Email]
    ↓
[Click Send Test]
    ↓
[Wait for Response]
    ↓
┌─────────────────┐
│ Success?        │
│  ├─ Yes → [See Success Message]
│  │         ↓
│  │        [See Save Button Enabled]
│  │         ↓
│  │        [Click Save]
│  │         ↓
│  │        [Configuration Active]
│  │         ↓
│  │        END ✅
│  │
│  └─ No  → [See Error Message]
│           ↓
│          [Fix Credentials]
│           ↓
│          [Try Again] → Back to [Click Send Test]
└─────────────────┘
```

## Edge Case Handling

### Scenario 1: User Switches Provider Mid-Config
```
1. Configure Mailjet
2. Test Mailjet successfully ✅
3. Switch to Mailgun
   → State resets (testEmailSuccess = false)
   → Must test Mailgun before saving
4. Prevents accidental saves with wrong provider
```

### Scenario 2: User Changes Credentials After Test
```
1. Enter credentials
2. Test successfully ✅
3. Modify API key
   → State resets (testEmailSuccess = false)
   → Must re-test with new credentials
4. Ensures credentials are always verified
```

### Scenario 3: User Only Updates Branding
```
1. Change brand name or colors
2. No email credentials changed
   → emailCredentialsChanged = false
   → Test NOT required
3. Can save immediately
4. Smart detection prevents unnecessary tests
```

### Scenario 4: Network Error During Test
```
1. Enter credentials
2. Click Send Test
3. Network error occurs
   → Error displayed
   → testEmailSuccess remains false
   → User can retry immediately
4. State preserved for easy retry
```

## Component State Diagram

```
┌─────────────────────────────────────────────────┐
│         Settings Component State                │
│                                                  │
│  Core State:                                     │
│  ├─ activeProvider: "mailjet" | "mailgun"       │
│  ├─ hasChanges: boolean                         │
│  ├─ testEmailSuccess: boolean                   │
│  └─ initialValues: {...}                        │
│                                                  │
│  Derived State:                                  │
│  ├─ emailCredentialsChanged: computed           │
│  ├─ canSave: hasChanges && testEmailSuccess     │
│  └─ requiresTest: hasChanges && !testEmailSuccess│
└─────────────────────────────────────────────────┘
```

## Code Flow Simplified

```javascript
// When user changes credentials
useEffect(() => {
  if (credentials changed) {
    setTestEmailSuccess(false);  // Reset test
    setHasChanges(true);          // Mark as changed
  }
}, [credentials]);

// When user tests email
handleTestEmail() {
  if (success) {
    setTestEmailSuccess(true);   // Enable save
  } else {
    setTestEmailSuccess(false);  // Keep disabled
  }
}

// When user saves
handleSubmit() {
  if (emailChanged && !testEmailSuccess) {
    return error;                 // Block save
  }
  saveSettings();                 // Allow save
  setHasChanges(false);           // Reset
  setTestEmailSuccess(false);     // Reset
}
```

## Integration Points

```
Frontend (Settings.tsx)
    │
    ├─► API: POST /api/settings/email/verify
    │   Purpose: Verify credentials before save
    │   Response: { success: boolean }
    │
    ├─► API: POST /api/settings/email/test
    │   Purpose: Send test email
    │   Body: { testEmail: string }
    │   Response: { success: boolean, message: string }
    │
    └─► API: PUT /api/settings
        Purpose: Save all settings
        Body: { activeProvider, credentials, branding }
        Response: { success: boolean, message: string }
```

---

**Legend:**
- ✅ = Enabled/Success
- ❌ = Disabled/Failure
- ⚠️ = Warning
- 🔒 = Locked
- 💾 = Save
- 📧 = Email

This workflow ensures users can never save invalid email configurations while maintaining a smooth, guided experience through the setup process.
