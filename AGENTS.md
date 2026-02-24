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
- All API routes in `server/routers.ts` using tRPC
- Database queries in `server/db.ts`
- Core infrastructure in `server/_core/`
- Use `publicProcedure`, `protectedProcedure`, or `adminProcedure`

### Database
- Schema in `drizzle/schema.ts`
- Use Drizzle ORM query builder
- Always add indexes for foreign keys
- Use `serial("id").primaryKey()` for IDs

## File Patterns

### Adding an API endpoint

```typescript
// server/routers.ts
myEndpoint: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input, ctx }) => {
    return await db.getById(input.id);
  }),
```

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

## AWS Services

All AWS integrations use the SDK and are in `server/_core/`:

| Service | File | Usage |
|---------|------|-------|
| S3 | `storage.ts` | `storagePut()`, `storageGet()` |
| Location | `amazonLocation.ts` | `geocode()`, `placesAutocomplete()` |
| Bedrock LLM | `llm.ts` | `invokeLLM()` |
| Bedrock Images | `imageGeneration.ts` | `generateImage()` |
| Transcribe | `voiceTranscription.ts` | `transcribeAudio()` |

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

To add a new env var, update `server/_core/env.ts`.

## Database Schema

Key tables:
- `users` - Auth and roles
- `shopping_centres` - Locations
- `sites` - Bookable spaces
- `bookings` - Reservations
- `owners` - Centre owners

Role hierarchy: `customer` < `owner_*` < `mega_admin`

## Testing

- Test files: `*.test.ts` alongside source
- Use Vitest
- Mock DB with in-memory or test database

## Deployment

- Push to `main` triggers GitHub Actions
- Builds ARM64 Docker image
- Deploys to EKS namespace `casuallease`
- Runs migrations automatically

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
