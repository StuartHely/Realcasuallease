# Manus Code Removal Log

## Summary
All Manus-specific authentication code has been removed from the codebase. The basic authentication infrastructure (JWT session management, cookie handling) has been preserved for reuse with other auth systems.

## Files Removed

### Directories
- `.manus/` - Entire directory containing debug database query logs

### Individual Files
- `client/src/components/ManusDialog.tsx` - Manus login dialog component
- `server/_core/oauth.ts` - Manus OAuth callback route handler
- `server/_core/types/manusTypes.ts` - Manus OAuth type definitions

## Files Modified

### vite.config.ts
- Removed `vite-plugin-manus-runtime` import and plugin
- Removed Manus-specific allowed hosts (`.manus.computer`, `.manuspre.computer`, etc.)

### package.json
- Removed `vite-plugin-manus-runtime` dependency

### server/_core/index.ts
- Removed `registerOAuthRoutes` import and registration

### server/_core/sdk.ts
- Removed Manus OAuth service class and methods (`OAuthService`, `exchangeCodeForToken`, `getUserInfo`, `getUserInfoWithJwt`)
- Kept JWT session management (`createSessionToken`, `verifySession`, `authenticateRequest`)
- Removed imports from `manusTypes.ts`
- Removed axios HTTP client for OAuth

### server/_core/env.ts
- Removed `oAuthServerUrl` (OAUTH_SERVER_URL env var)
- Changed `appId` from `VITE_APP_ID` to `APP_ID`
- Kept `forgeApiUrl` and `forgeApiKey` as they're used for actual platform features

### client/src/const.ts
- Simplified `getLoginUrl()` to always return `/login` (no external OAuth URL)
- Removed OAuth URL generation logic

### client/src/pages/Login.tsx
- Removed OAuth login button and "Sign In with Manus" text
- Kept username/password login form (non-Manus auth)

### client/src/_core/hooks/useAuth.ts
- Removed `getLoginUrl` import
- Removed localStorage key `manus-runtime-user-info`
- Changed default redirect path to `/login`

### client/src/main.tsx
- Removed `getLoginUrl` import
- Changed redirect URL to `/login`

### Multiple Page Components
- `client/src/pages/Profile.tsx`
- `client/src/pages/MyBookings.tsx`
- `client/src/pages/ThirdLineDetail.tsx`
- `client/src/pages/SiteDetail.tsx`
- `client/src/pages/VacantShopDetail.tsx`
- `client/src/components/AdminLayout.tsx`
- `client/src/components/DashboardLayout.tsx`

All updated to:
- Remove `getLoginUrl` imports
- Change `window.location.href = getLoginUrl()` to `window.location.href = "/login"`

### Test Files
- `server/auth.logout.test.ts`
- `server/assetTypes.test.ts`
- `server/autocomplete.test.ts`
- `server/admin.test.ts`
- `server/bookings.test.ts`

Changed `loginMethod: "manus"` to `loginMethod: "email"` in test fixtures

### Comments Updated
- `client/src/components/ImageWithFallback.tsx` - Removed Manus storage permissions comment
- `server/storage.ts` - Removed "Manus WebDev templates" from comment
- `server/_core/map.ts` - Removed "Manus WebDev Templates" from comment
- `server/_core/notification.ts` - Removed "Manus Notification Service" from comment
- `server/_core/llm.ts` - Removed fallback to `forge.manus.im` URL
- `server/_core/dataApi.ts` - Changed example query from "manus" to "example"
- `server/_core/context.ts` - Changed comment from "Manus auth" to "JWT session auth"

## Preserved Infrastructure

The following authentication infrastructure was preserved for reuse:
- JWT session token creation and verification (`sdk.createSessionToken`, `sdk.verifySession`)
- Cookie-based session management
- Request authentication (`sdk.authenticateRequest`)
- Username/password login system (`auth.login` tRPC mutation)
- Session cookie handling

## Environment Variables No Longer Needed
- `VITE_OAUTH_PORTAL_URL`
- `VITE_APP_ID` (renamed to `APP_ID`)
- `OAUTH_SERVER_URL`

## Environment Variables Still Required
- `APP_ID` - Application identifier (renamed from VITE_APP_ID)
- `JWT_SECRET` - For signing session tokens
- `DATABASE_URL` - Database connection
- `BUILT_IN_FORGE_API_URL` - For storage, maps, LLM, etc.
- `BUILT_IN_FORGE_API_KEY` - API key for forge services
