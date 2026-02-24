# CasualLease

A casual leasing platform for shopping centres. Enables tenants to browse, book, and manage temporary retail spaces (sites/kiosks) within shopping centres.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type check
pnpm run check

# Run tests
pnpm test
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (React)                          │
│  - Vite + React 19 + TypeScript                                 │
│  - TailwindCSS + Radix UI components                            │
│  - tRPC client for type-safe API calls                          │
│  - MapLibre GL for maps (powered by Amazon Location)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server (Express + tRPC)                    │
│  - Express.js with tRPC router                                  │
│  - Drizzle ORM for database operations                          │
│  - JWT-based authentication                                     │
│  - AWS SDK integrations                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Services                             │
│  - S3: File storage (images, documents)                         │
│  - Location Service: Geocoding, places, routing                 │
│  - Bedrock: LLM (Claude), Image generation (Stable Diffusion)   │
│  - Transcribe: Voice-to-text                                    │
│  - EKS: Container orchestration                                 │
│  - RDS PostgreSQL: Database                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
.
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Route pages
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities (trpc client, etc.)
│       └── contexts/       # React contexts
│
├── server/                 # Express backend
│   ├── _core/              # Core infrastructure
│   │   ├── index.ts        # Server entry point
│   │   ├── trpc.ts         # tRPC router setup
│   │   ├── env.ts          # Environment variables
│   │   ├── authService.ts  # Authentication logic
│   │   ├── amazonLocation.ts # AWS Location Service
│   │   ├── llm.ts          # AWS Bedrock LLM
│   │   ├── imageGeneration.ts # AWS Bedrock images
│   │   └── voiceTranscription.ts # AWS Transcribe
│   ├── routers.ts          # All tRPC procedures
│   ├── db.ts               # Database queries
│   └── storage.ts          # AWS S3 operations
│
├── shared/                 # Shared code (client + server)
│   └── types.ts            # Shared TypeScript types
│
├── drizzle/                # Database schema & migrations
│   └── schema.ts           # Drizzle ORM schema
│
├── k8s/                    # Kubernetes manifests
│   ├── deployment.yml
│   ├── service.yml
│   ├── configmap.yml
│   └── ingress.yml
│
├── scripts/                # Utility scripts
│   ├── seed-admin-user.ts  # Create admin user
│   └── import-*.ts         # Data import scripts
│
└── .github/workflows/      # CI/CD
    └── deploy.yml          # EKS deployment
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT token signing |
| `AWS_REGION` | AWS region (default: `ap-southeast-2`) |
| `AWS_S3_BUCKET` | S3 bucket for file storage |
| `AWS_ACCESS_KEY_ID` | AWS credentials (or use IRSA) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (or use IRSA) |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `AMAZON_LOCATION_PLACE_INDEX` | Place index name | `casuallease-place-index` |
| `AMAZON_LOCATION_ROUTE_CALCULATOR` | Route calculator name | `casuallease-route-calculator` |
| `SMTP_HOST` | Email server host | - |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASS` | Email password | - |
| `SMTP_FROM` | Default from address | - |

## AWS Services Integration

### S3 - File Storage
**File:** `server/storage.ts`

```typescript
import { storagePut, storageGet } from './storage';

// Upload a file
const { url } = await storagePut('path/to/file.jpg', buffer, 'image/jpeg');

// Get download URL (presigned, 1hr expiry)
const { url } = await storageGet('path/to/file.jpg');
```

### Amazon Location Service - Maps & Geocoding
**File:** `server/_core/amazonLocation.ts`

```typescript
import { geocode, reverseGeocode, placesAutocomplete, getDirections } from './_core/amazonLocation';

// Address to coordinates
const result = await geocode('123 Main St, Sydney NSW');

// Coordinates to address
const result = await reverseGeocode(-33.8688, 151.2093);

// Place autocomplete suggestions
const suggestions = await placesAutocomplete('Westfield', { maxResults: 5 });

// Get directions between points
const route = await getDirections(
  { lat: -33.8688, lng: 151.2093 },
  { lat: -33.9173, lng: 151.2313 }
);
```

**Required AWS Resources:**
- Place Index: `casuallease-place-index`
- Route Calculator: `casuallease-route-calculator`

### AWS Bedrock - LLM
**File:** `server/_core/llm.ts`

```typescript
import { invokeLLM } from './_core/llm';

const response = await invokeLLM({
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  messages: [
    { role: 'user', content: 'Describe this shopping centre...' }
  ],
  maxTokens: 1000,
});
```

### AWS Bedrock - Image Generation
**File:** `server/_core/imageGeneration.ts`

```typescript
import { generateImage } from './_core/imageGeneration';

const { url } = await generateImage({
  prompt: 'A modern shopping centre kiosk with LED lighting',
  width: 1024,
  height: 1024,
});
```

### AWS Transcribe - Voice to Text
**File:** `server/_core/voiceTranscription.ts`

```typescript
import { transcribeAudio } from './_core/voiceTranscription';

const { text, segments } = await transcribeAudio(audioUrl, {
  language: 'en-AU',
});
```

## Database Schema

Key tables in `drizzle/schema.ts`:

| Table | Description |
|-------|-------------|
| `users` | User accounts (customers, admins, owners) |
| `customer_profiles` | Extended customer info (company, ABN, insurance) |
| `owners` | Shopping centre owners with bank details |
| `shopping_centres` | Shopping centre locations |
| `floor_levels` | Multi-level centre floors |
| `sites` | Bookable spaces within centres |
| `bookings` | Site reservations |
| `usage_categories` | Product/service categories |
| `transactions` | Payment records |

### User Roles
- `customer` - Can browse and book sites
- `owner_centre_manager` - Manage specific centre
- `owner_state_admin` - Manage centres in a state
- `mega_admin` - Full system access

## Adding New Features

### Adding a New API Endpoint

1. Add the procedure to `server/routers.ts`:

```typescript
// In the appropriate router section
myNewEndpoint: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input, ctx }) => {
    // Access user via ctx.user
    return await db.getMyData(input.id);
  }),
```

2. Add database function if needed in `server/db.ts`:

```typescript
export async function getMyData(id: number) {
  return await db.select().from(myTable).where(eq(myTable.id, id));
}
```

3. Use in client:

```typescript
const { data } = trpc.myRouter.myNewEndpoint.useQuery({ id: 1 });
```

### Adding a New Database Table

1. Add to `drizzle/schema.ts`:

```typescript
export const myNewTable = pgTable("my_new_table", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

2. Generate and run migration:

```bash
pnpm run db:push
```

### Adding a New Page

1. Create component in `client/src/pages/MyPage.tsx`
2. Add route in `client/src/App.tsx`:

```typescript
<Route path="/my-page" component={MyPage} />
```

## Deployment

### GitHub Actions (Automatic)

Push to `main` triggers:
1. Type check
2. Docker build (ARM64)
3. Push to ECR
4. Deploy to EKS
5. Run migrations

### Manual Deployment

```bash
# Build Docker image
docker build -t casuallease .

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker push <account>.dkr.ecr.<region>.amazonaws.com/casuallease:latest

# Apply to EKS
kubectl apply -f k8s/
```

### Post-Deploy

```bash
# Run migrations on pod
kubectl exec -n casuallease <pod> -- npx drizzle-kit push

# Seed admin user
kubectl exec -n casuallease <pod> -- npx tsx scripts/seed-admin-user.ts
```

## Default Admin Credentials

After seeding:
- **Username:** `admin`
- **Password:** Set via `scripts/seed-admin-user.ts`

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/booking.test.ts

# Run with coverage
pnpm test -- --coverage
```

## Common Tasks

### Import Shopping Centre Data

```bash
# Copy data to pod
kubectl cp import-data.json casuallease/<pod>:/tmp/

# Run import
kubectl exec -n casuallease <pod> -- node scripts/import-centres.js
```

### Check Pod Logs

```bash
kubectl logs -n casuallease -l app=casuallease -f
```

### Database Access

```bash
# Connect via pod
kubectl exec -it -n casuallease <pod> -- node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Run queries...
"
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| UI Components | Radix UI, Lucide Icons |
| State | TanStack Query, tRPC |
| Backend | Express, tRPC, Node.js |
| Database | PostgreSQL, Drizzle ORM |
| Auth | JWT, bcrypt |
| Maps | MapLibre GL, Amazon Location |
| Storage | AWS S3 |
| AI | AWS Bedrock (Claude, Stable Diffusion) |
| Deployment | Docker, Kubernetes (EKS) |
| CI/CD | GitHub Actions |

## License

MIT
