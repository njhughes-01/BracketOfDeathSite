# 🚀 Quick Start: Test Initialization Flow

## Current Status

✅ **System Status:** Uninitialized (ready for testing)
✅ **Hardcoded credentials:** Removed from UI
✅ **Backend services:** Running (mongodb, keycloak, backend API)
✅ **Test scripts:** Created and ready

---

## ⚡ 60-Second Test

### 1. Check System Status

```bash
curl http://localhost:3001/api/system/status
```

**Expected:**
```json
{"success": true, "data": {"initialized": false}}
```

### 2. Start Frontend (if not running)

```bash
cd src/frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### 3. Open Browser

Navigate to: **http://localhost:5173**

**Expected behavior:**
1. ✅ Redirects to `/setup`
2. ✅ Shows "System Not Initialized" page
3. ✅ Amber card with "Create Admin Account" button

### 4. Create First Admin

1. Click "Create Admin Account"
2. Fill registration form
3. Login with credentials
4. On Onboarding page, click "Initialize System"
5. Complete gender selection
6. Verify redirect to dashboard

### 5. Verify System Initialized

```bash
curl http://localhost:3001/api/system/status
```

**Expected:**
```json
{"success": true, "data": {"initialized": true}}
```

---

## 🔧 Reset for Testing

To reset and test again:

```bash
# Run the reset script
node scripts/verify_initialization_flow.js
```

This will delete all superadmin users and return system to uninitialized state.

---

## 📊 What Was Fixed

### Before ❌
- Hardcoded admin credentials displayed on login
- Auto-created default admin user
- Insecure initialization flow

### After ✅
- Clean login form (no credential hints)
- First user claims admin through guided flow
- Secure onboarding with race condition protection

---

## 🧪 Full Test Documentation

See **[INITIALIZATION_FLOW_TEST_REPORT.md](INITIALIZATION_FLOW_TEST_REPORT.md)** for:
- Complete test plan
- Security audit findings
- Code duplication analysis
- Automated test scripts
- Recommendations

---

## 🚨 Critical Next Steps

1. **REMOVE .env from git:**
   ```bash
   git rm .env
   echo ".env" >> .gitignore
   ```

2. **Generate new secrets:**
   ```bash
   npm run generate-secrets
   ```

3. **Run full test suite**

4. **Review code duplication** (see full report)

---

## 📝 Test Scripts Created

1. `tests/e2e/initialization-flow.spec.js` - Manual test guide
2. `tests/e2e/automated-initialization-flow.spec.js` - Automated version
3. `INITIALIZATION_FLOW_TEST_REPORT.md` - Full analysis

---

## ✅ Ready to Test!

The system is configured and ready for initialization flow testing. Follow the 60-second test above to verify everything works correctly.
