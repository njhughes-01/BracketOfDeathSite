# Authentication Token Refresh Fixes

## Summary

Fixed authentication token expiry and auto-login loop issues that were preventing users from using tournament management features.

## Issues Fixed

### 1. Token Expiry Causing 401 Errors
**Problem:** JWT tokens were expiring after 5 minutes, causing 401 errors when users tried to use tournament management features.

**Root Cause:** The token refresh mechanism wasn't proactively refreshing tokens early enough, leading to expired tokens being sent to the backend.

**Solution:**
- Increased `updateToken` minimum validity from 30 to 60 seconds
- Increased API token expiry check leeway from 60 to 90 seconds
- Added periodic token refresh check (every 30 seconds)

### 2. Auto-Login Loop
**Problem:** When tokens expired and refresh failed, the system would log the user out and immediately auto-login, creating an infinite loop.

**Root Cause:**
- `onTokenExpired` callback was calling `logout()` on refresh failure
- Stored tokens in localStorage were being reused after logout
- System would detect stored tokens and auto-login

**Solution:**
- Removed auto-logout on token refresh failure
- Added token clearing to logout function
- Let users manually re-login when tokens can't be refreshed

## Changes Made

### Frontend: `src/frontend/src/contexts/AuthContext.tsx`

1. **Token Refresh Improvements (lines 129-164)**:
   ```typescript
   // Increased min validity to 60 seconds
   const refreshed = await kc.updateToken(60);
   ```
   - Better timing for token refresh
   - More aggressive refresh before expiry

2. **Removed Auto-Logout (line 159-162)**:
   ```typescript
   .catch((error) => {
     console.error('Failed to refresh token on expiry:', error);
     // Don't auto-logout - prevents the logout loop
     console.warn('Token refresh failed - user will need to re-login');
   });
   ```
   - Prevents infinite logout/login loop
   - Users stay logged in until manually logging out

3. **Added Periodic Token Refresh (lines 182-208)**:
   ```typescript
   // Check every 30 seconds if token expires within 90 seconds
   const interval = setInterval(async () => {
     const expiresIn = tokenParsed.exp * 1000 - Date.now();
     if (expiresIn < 90000) {
       const refreshed = await keycloak.updateToken(60);
     }
   }, 30000);
   ```
   - Proactively refreshes tokens before expiry
   - Runs in background every 30 seconds
   - Only refreshes if token expires within 90 seconds

4. **Fixed Logout Token Clearing (line 365)**:
   ```typescript
   // Clear stored tokens to prevent auto-login loop
   localStorage.removeItem(TOKENS_KEY);
   ```
   - Prevents auto-login after logout
   - Clears all stored authentication data

### Frontend: `src/frontend/src/services/api.ts`

1. **Increased Token Expiry Leeway (line 50)**:
   ```typescript
   // Increased from 60 seconds to 90 seconds
   const tokenExpiringSoon = (token?: string, leewayMs = 90000): boolean => {
   ```
   - More time buffer before API calls
   - Accounts for network latency

2. **Enhanced Logging (lines 65-85)**:
   ```typescript
   console.log('Token expiring soon, will attempt refresh');
   console.log('Proactively refreshing token before API call...');
   console.log('Token proactively refreshed successfully');
   ```
   - Better debugging capability
   - Track token refresh attempts

## Token Lifecycle

### Before Fixes:
```
Login → Token (5 min) → Use feature at 4:55 → Token expired → 401 → Logout → Auto-login → Loop
```

### After Fixes:
```
Login → Token (5 min)
     → Periodic check at 3:30 → Refresh token
     → Use feature at 4:00 → Token valid → Success
     → Periodic check at 4:00 → Refresh token
     → Continue working...
```

## Token Refresh Strategy

1. **Periodic Background Refresh** (every 30 seconds):
   - Checks if token expires within 90 seconds
   - Refreshes proactively if needed
   - Runs while user is authenticated

2. **Pre-API Call Refresh** (tournament management actions):
   - Checks token before making API call
   - Refreshes if token expires within 90 seconds
   - Ensures fresh token for protected endpoints

3. **On-Demand Refresh** (401 response):
   - Catches 401 errors from backend
   - Attempts token refresh
   - Retries original request with new token

4. **Expiry Event Handler**:
   - Keycloak `onTokenExpired` event
   - Attempts refresh when token expires
   - No longer logs out on failure (prevents loop)

## Token Expiry Timeline

```
Token issued at 00:00
├── 03:30 - First periodic check (1.5 min left)
│   └── Refresh token (new expiry at 08:30)
├── 04:00 - API call (4.5 min left - no refresh needed)
├── 07:30 - Periodic check (1 min left)
│   └── Refresh token (new expiry at 12:30)
├── 08:00 - User idle but token still refreshing periodically
└── Logout - Tokens cleared, no auto-login
```

## Testing Checklist

- [x] Frontend TypeScript compiles
- [x] Frontend container restarted
- [ ] Manual test: Login and wait 4 minutes, then use tournament feature (should work)
- [ ] Manual test: Login, wait 4 minutes, use feature multiple times (should work)
- [ ] Manual test: Logout and verify no auto-login
- [ ] Manual test: Let token expire completely, then try to use feature (should show proper error)
- [ ] Browser console: Check for proactive refresh logs

## Expected Console Logs

When working correctly, you should see:
```
Token still valid, no refresh needed
...
Token expiring soon, will attempt refresh
Proactively refreshing token before API call...
Token proactively refreshed successfully
...
Periodic check: Token expiring soon, refreshing...
Periodic token refresh successful
```

## Troubleshooting

### Still getting 401 errors?
1. Check browser console for refresh errors
2. Verify Keycloak is running: `docker-compose ps keycloak`
3. Check Keycloak token settings (should be at least 5 minutes)
4. Clear browser localStorage and login fresh

### Still auto-logging in after logout?
1. Clear browser localStorage manually: `localStorage.clear()`
2. Hard refresh browser (Ctrl+Shift+R)
3. Check console for "Logout completed" message

### Token not refreshing?
1. Check console for "Periodic check" messages every 30 seconds
2. Verify `keycloak.updateToken()` is being called
3. Check network tab for refresh token requests to Keycloak
4. Verify refresh token hasn't expired (default 30 minutes)

## Configuration Notes

**Keycloak Token Lifespans:**
- Access Token: 5 minutes (default)
- Refresh Token: 30 minutes (default)
- SSO Session Idle: 30 minutes (default)

**Frontend Token Refresh Settings:**
- Periodic check: Every 30 seconds
- Refresh when expiring in: 90 seconds
- Min validity for updateToken: 60 seconds

## Future Improvements

1. **Token expiry notifications**: Warn user before session expires
2. **Activity detection**: Only refresh tokens when user is active
3. **Configurable timeouts**: Make refresh intervals configurable
4. **Better error handling**: Distinguish between network errors and auth errors
5. **Token refresh queue**: Prevent multiple simultaneous refresh attempts

## Related Files

- `src/frontend/src/contexts/AuthContext.tsx` - Main authentication logic
- `src/frontend/src/services/api.ts` - API client with token refresh
- `docs/LIVE_TOURNAMENT_FIXES.md` - Tennis score validation fixes
