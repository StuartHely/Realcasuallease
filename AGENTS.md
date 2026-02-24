# AI Agent Instructions for CasualLease

This file provides guidance for AI coding assistants working on this codebase.

## Commands

```bash
# Development
pnpm dev              # Start dev server (hot reload)
pnpm run check        # TypeScript type check (RUN AFTER CHANGES)
pnpm test             # Run tests
pnpm build            # Production build

# Database
pnpm run db:push      # Generate and run migrations

# Git push (use stuart_new SSH key)
ssh-agent bash -c "ssh-add ~/.ssh/stuart_new && git push origin main"
```

## Code Conventions

### TypeScript
- Strict mode enabled
- Use `z.object()` for tRPC input validation
- Prefer explicit return types for public functions
- Use `type` over `interface` for object shapes

### React
- Functional components only
- Use `trpc.*.useQuery()` / `useMutation()` for API calls
- Components in `client/src/components/`
- Pages in `client/src/pages/`
- Use existing Radix UI components from `@/components/ui/`

### Server
- API routes split into domain-specific files in `server/routers/` (17 files)
- `server/routers.ts` is a thin aggregator (~55 lines) that imports and merges all sub-routers
- Sub-routers: `auth.ts`, `profile.ts`, `centres.ts`, `sites.ts`, `bookings.ts`, `search.ts`, `admin.ts`, `users.ts`, `usageCategories.ts`, `searchAnalytics.ts`, `systemConfig.ts`, `faqs.ts`, `dashboard.ts`, `budgets.ts`, `owners.ts`, `adminBooking.ts`, `assets.ts`
- Database queries in `server/db.ts`
- Core infrastructure in `server/_core/`
- Auth procedure hierarchy (defined in `server/_core/trpc.ts`):
  - `publicProcedure` — anyone (no auth required)
  - `protectedProcedure` — any logged-in user
  - `ownerProcedure` — any non-customer role (all owner_* + mega_state_admin + mega_admin)
  - `adminProcedure` — mega_admin or mega_state_admin only
- Rate limiting on login: `server/_core/rateLimit.ts` (in-memory IP-based, 5 attempts per 15min)
- JWT sessions last 7 days (`SESSION_MAX_AGE_MS` in `shared/const.ts`)
- **Auth system:** Dual auth — password-based JWT (primary) with SDK/OAuth fallback. A future Cognito integration is planned to replace the custom JWT auth.

### Database
- Schema in `drizzle/schema.ts`
- Use Drizzle ORM query builder
- Always add indexes for foreign keys
- Use `serial("id").primaryKey()` for IDs

## File Patterns

### Adding an API endpoint

Add to the appropriate domain router file in `server/routers/`:

```typescript
// server/routers/myDomain.ts
import { protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const myEndpoint = protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input, ctx }) => {
    return await db.getById(input.id);
  });
```

Then register it in `server/routers.ts` if creating a new router file.

### Adding a database query

```typescript
// server/db.ts
export async function getById(id: number) {
  return await db.select().from(myTable).where(eq(myTable.id, id));
}
```

### Adding a React page

```typescript
// client/src/pages/MyPage.tsx
import { trpc } from "@/lib/trpc";

export default function MyPage() {
  const { data } = trpc.myRouter.myEndpoint.useQuery({ id: 1 });
  return <div>{data?.name}</div>;
}
```

Then add to `client/src/App.tsx`:
```typescript
<Route path="/my-page" component={MyPage} />
```

## AWS Services & Integrations

AWS integrations are in `server/_core/`. Storage uses a Forge API proxy, not direct S3 SDK calls.

| Service | File | Usage |
|---------|------|-------|
| Storage (Forge proxy) | `server/storage.ts` | `storagePut()`, `storageGet()` — uses `BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY`, NOT direct S3 SDK |
| Location | `amazonLocation.ts` | `geocode()`, `placesAutocomplete()` — server-side geocoding & directions |
| Bedrock LLM | `llm.ts` | `invokeLLM()` |
| Bedrock Images | `imageGeneration.ts` | `generateImage()` |
| Transcribe | `voiceTranscription.ts` | `transcribeAudio()` |

**Maps:** Google Maps for the Australia overview map and address autocomplete (client-side). Amazon Location for geocoding and directions (server-side).

### Adding a new AWS service

1. Install SDK: `pnpm add @aws-sdk/client-<service>`
2. Create file in `server/_core/<service>.ts`
3. Use credentials from `ENV`:
```typescript
import { ENV } from "./env";

const client = new MyClient({
  region: ENV.awsRegion,
  credentials: ENV.awsAccessKeyId ? {
    accessKeyId: ENV.awsAccessKeyId,
    secretAccessKey: ENV.awsSecretAccessKey,
  } : undefined, // Falls back to IRSA
});
```

## Environment Variables

Access via `server/_core/env.ts`:

```typescript
import { ENV } from "./_core/env";

ENV.databaseUrl
ENV.awsRegion
ENV.awsS3Bucket
```

Key env vars (some undocumented in previous versions):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT token signing |
| `BUILT_IN_FORGE_API_URL` | Storage proxy base URL (required for file storage) |
| `BUILT_IN_FORGE_API_KEY` | Storage proxy API key (required for file storage) |
| `OAUTH_SERVER_URL` | OAuth server for legacy auth |
| `OWNER_OPEN_ID` | Owner OAuth identifier |
| `AWS_REGION` | AWS region (default: `ap-southeast-2`) |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | AWS credentials (or use IRSA) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (or use IRSA) |

Amazon Location defaults use `casuallease-*` prefix (e.g., `casuallease-place-index`).

To add a new env var, update `server/_core/env.ts`.

## Database Schema

Key tables:
- `users` - Auth and roles
- `shopping_centres` - Locations
- `sites` - Bookable spaces
- `bookings` - Reservations
- `owners` - Centre owners

Role hierarchy: `customer` < `owner_*` < `mega_state_admin` < `mega_admin`

## Testing

- Test files: `*.test.ts` alongside source
- Use Vitest
- Mock DB with in-memory or test database

## Scripts

- Debug/test scripts are in `scripts/debug/` (68 files moved from root)
- Utility scripts (seed, import) remain in `scripts/`

## Deployment

- Push to `main` triggers GitHub Actions
- Builds ARM64 Docker image
- Deploys to EKS namespace `casuallease`
- Runs migrations automatically (uses ESM imports, not `require()`)
- `ingress.yml` ACM certificate ARN uses `REPLACE_WITH_ACM_CERTIFICATE_ARN` placeholder, sed-replaced from `secrets.ACM_CERTIFICATE_ARN` in CI

## Common Fixes

### Type errors with nullable fields
Database returns `string | null`, but type expects `string`:
```typescript
// Add null to type or provide default
const value = field ?? "default";
```

### Missing dependency
```bash
pnpm add <package>
```

### Lockfile out of sync
```bash
pnpm install
git add pnpm-lock.yaml
```

## Do NOT

- Use `any` type without explicit need
- Skip `pnpm run check` before committing
- Hardcode credentials
- Use `@ts-ignore` or `@ts-expect-error`
- Create new UI components when Radix equivalents exist
