# TokenIQ Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, seed the database (first time only)
npm run db:seed

# Visit http://localhost:3000/login
# Demo credentials: demo@example.com / demo123
```

## Architecture

### Project Structure
```
tokeniq/
├── app/
│   ├── (auth)/login/              # Authentication pages
│   ├── (dashboard)/               # Protected dashboard pages
│   │   ├── page.tsx              # Executive overview
│   │   ├── prs/page.tsx          # PR analytics
│   │   ├── cost/page.tsx         # Cost breakdown
│   │   ├── models/page.tsx       # Model distribution
│   │   └── repositories/page.tsx # GitHub repo management
│   ├── api/auth/[...nextauth]/   # NextAuth routes
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── charts/                   # Recharts wrappers
│   └── layout/                   # Dashboard layout
├── lib/
│   ├── db.ts                    # Prisma singleton
│   ├── auth.ts                  # NextAuth config
│   ├── github.ts                # GitHub API client
│   ├── generator.ts             # Token cost generator
│   └── crypto.ts                # API key encryption
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── dev.db                   # SQLite database (local)
│   └── seed.ts                  # Demo data seeder
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── setup.ts                 # Test configuration
└── package.json
```

### Core Concepts

**Provider-Agnostic Integration Layer**: New AI platform integrations only need to implement the `IntegrationProvider` interface:

```typescript
interface IntegrationProvider {
  platform: 'OPENAI' | 'ANTHROPIC' | 'GITHUB_COPILOT' | 'CURSOR'
  fetchUsage(apiKey: string, from: Date, to: Date): Promise<UsageEntry[]>
}
```

**GitHub-Driven Analytics**: TokenIQ connects to GitHub to pull real PR data, then generates proportional AI cost estimates based on:
- Lines changed (input tokens ∝ lines)
- PR size (model selection: GPT-4o for >300 lines, GPT-4o-mini for <300)
- Realistic pricing for June 2026 models

## Development Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Build for production
npm run start            # Run production build
npm run lint             # Run ESLint

# Database
npm run db:seed          # Seed demo data
npx prisma studio       # Open Prisma Studio (visual DB browser)
npx prisma migrate dev  # Create and apply migrations

# Testing
npm test                 # Run all tests (watch mode)
npm run test:ui          # Run tests with Vitest UI
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:all         # Run all tests sequentially
```

## Environment Variables

Create `.env.local`:

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
```

Generate a new `ENCRYPTION_KEY`:
```bash
openssl rand -hex 32
```

## Adding a New Integration

1. **Create provider** in `lib/integrations/{platform}.ts`:
   ```typescript
   import { IntegrationProvider, UsageEntry } from './types'

   export class MyPlatformProvider implements IntegrationProvider {
     platform = 'MY_PLATFORM'

     async fetchUsage(
       apiKey: string,
       from: Date,
       to: Date,
     ): Promise<UsageEntry[]> {
       // Fetch from API and transform to UsageEntry[]
       return []
     }
   }
   ```

2. **Register** in `lib/integrations/registry.ts`:
   ```typescript
   import { MyPlatformProvider } from './myplatform'

   const PROVIDERS: IntegrationProvider[] = [
     // ... existing
     new MyPlatformProvider(),
   ]
   ```

3. **Add model** in Prisma schema:
   ```prisma
   enum Platform { OPENAI ANTHROPIC GITHUB_COPILOT CURSOR MY_PLATFORM }
   ```

4. **Migrate**:
   ```bash
   npx prisma migrate dev --name add_myplatform
   ```

## Database

- **Provider**: SQLite (local development)
- **ORM**: Prisma
- **Location**: `prisma/dev.db`

### Schema Overview
- `Organization` — holds teams, users, repositories
- `Repository` — GitHub repos with encrypted PATs
- `PullRequest` — real PR metadata from GitHub
- `UsageRecord` — AI cost estimates derived from PR data
- `User` — team members with authentication

## Testing

Tests are in `tests/` organized by type:
- **Unit**: Pure function testing (no DB)
- **Integration**: Database operations

Run before committing:
```bash
npm run test:all
```

## Authentication

NextAuth.js with credentials provider. Demo user:
- Email: demo@example.com
- Password: demo123

Session stored server-side. See `lib/auth.ts` for configuration.

## Styling

- **Framework**: Tailwind CSS v4
- **Components**: shadcn/ui (headless, unstyled)
- **Colors**: Slate color palette
- **Dark mode**: next-themes (toggle in sidebar)

## Charts

- **Library**: Recharts
- **Components**: Wrapped in `components/charts/`
- Common charts: BarChart, LineChart, PieChart, ScatterChart

## Performance

- **Build**: Next.js with App Router (streaming SSR)
- **Database queries**: Aggregated via Prisma
- **Caching**: No client-side caching (demo uses real data)

## Troubleshooting

### Database locked
```bash
rm -f prisma/dev.db*
npm run db:seed
```

### Tests fail to import modules
Check that you've run `npm install` and all dev dependencies are installed.

### NextAuth session not persisting
Verify `NEXTAUTH_SECRET` is set in `.env.local`.

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth Docs](https://next-auth.js.org)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Vitest](https://vitest.dev)
