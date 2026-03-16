# Posterns MVP - Claude Code Context

## Project Overview
Posterns is a Latvian business intelligence platform that provides company data, financial information, and analytics. The MVP focuses on company search, comparison, and data visualization.

## Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Authentication**: NextAuth.js v5 (Auth.js) with email/password + Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **Language**: TypeScript
- **Email**: Resend

## Key Directories
```
app/                    # Next.js App Router pages
  (auth)/              # Auth pages (login, register, etc.)
  api/                 # API routes
    auth/              # Auth endpoints
    company/[id]/      # Company detail API
    compare/           # Comparison API
    companies/batch/   # Batch fetch companies by IDs
components/
  auth/                # Auth UI components
  ui/                  # shadcn/ui components
  company/             # Company detail tab components
    basic-tab.tsx      # Company info, registration, capital, state aid, risk
    people-tab.tsx     # Ownership, board members, beneficial owners
    financial-tab.tsx  # Financial summary, tax payments (scrollable tables)
    documents-tab.tsx  # Documents placeholder
    company-skeleton.tsx  # Loading skeleton
    company-error.tsx     # Error state
  financial-ratios-display.tsx  # Financial ratios with charts
  company-selector.tsx          # Multi-company selector for comparison
lib/
  auth.ts              # NextAuth configuration
  prisma.ts            # Prisma client (uses absolute path for SQLite)
  format.ts            # Shared formatting helpers (currency, percent, date)
  types/company.ts     # Shared Company interface and sub-types
  data-gov/client.ts   # CKAN API client for financial data (on-demand)
  business-register/   # Business Register API client, mappers, types
  i18n/                # i18n configuration
scripts/               # Data import scripts (CSV from data.gov.lv)
messages/
  lv.json              # Latvian translations
  en.json              # English translations
prisma/
  schema.prisma        # Database schema
  dev.db               # SQLite database (development)
```

## Database Notes
- **SQLite path issue**: The `lib/prisma.ts` uses absolute paths to avoid resolution issues with relative SQLite paths
- **Dev database location**: `prisma/dev.db`
- Run `npx prisma generate` after schema changes
- Run `npx prisma db push` to sync schema to database

## Authentication System
- Email/password with email verification required
- Google OAuth (optional)
- Password requirements: 8+ chars, uppercase, lowercase, number
- Rate limiting on auth endpoints (5 req/min)
- Resend verification email functionality

## Branding
- Primary color: `#FEC200` (Posterns yellow)
- Used for form submit buttons (login, register)
- Header nav button uses outline variant (white)

## Git Workflow
- **Commit format**: Conventional commits (`type: description`)
- **Commit types**: feat, fix, refactor, docs, style, test, chore, perf, security
- **CRITICAL RULE**: All commits must appear as regular developer work - never mention AI tools or include Co-Authored-By tags for AI
- **Automation**: Use git-automation agent for automated commits (say "commit and push")
- **Code review**: Use code-reviewer agent before committing significant changes
- **Atomic commits**: Each commit should represent one complete, working change
- **Commit messages**: Clear and descriptive, explaining what and why (not how)

## i18n (Internationalization)
- Uses `next-intl` library
- Default locale: Latvian (lv)
- Supported locales: lv, en
- Translation files: `messages/lv.json`, `messages/en.json`
- Key namespaces: `common`, `navigation`, `home`, `auth`, `company`, `compare`, `companySelector`
- **i18n pattern**: API returns raw enum values (e.g., `REGISTERED`, `BOARD_MEMBER`), frontend translates via `tCommon('namespace.ENUM_VALUE')`
- Translation namespaces for enums: `companyStatus`, `legalForm`, `register`, `position`, `governingBody`, `representationRights`, `controlType`, `country`
- Use `useTranslations('namespace')` hook in client components

## Common Commands
```bash
npm run dev           # Start dev server
npx prisma generate   # Regenerate Prisma client
npx prisma db push    # Push schema to database
npx prisma studio     # Open database GUI
npm run import:all    # Import all CSV data (NACE, tax, insolvency, ratings, VAT, state aid, names, reorganizations)
npm run import:vat    # Import VAT payer data only
/ship                 # Run shipping pipeline (review, fix, build, commit, push)
```

## Environment Variables
Required in `.env`:
- `DATABASE_URL` - Database connection string
- `AUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - App URL (http://localhost:3000)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth (optional)
- `RESEND_API_KEY` - Email service API key
- `EMAIL_FROM` - Sender email address
- `BR_AUTH_URL` - Business Register OAuth2 token endpoint
- `BR_CONSUMER_KEY` / `BR_CONSUMER_SECRET` - API credentials from VDAA developer portal
- `BR_CERTIFICATE_PATH` / `BR_CERTIFICATE_PASSWORD` - PFAS certificate for API auth
- `BR_API_GATEWAY_URL` - API gateway base URL (default: `https://apigw.viss.gov.lv`)
- `BR_USE_MOCK_DATA` - Set to `"true"` for development without certificate

## Business Register API Integration
- **Auth flow**: PFAS certificate → JWT client assertion → OAuth2 token → Bearer auth on API calls
- **Client**: `lib/business-register/client/http.ts` — authenticated HTTPS with 5min response cache
- **Mappers**: `lib/business-register/mappers/company.ts` — transform API responses, abbreviate legal forms (SIA/AS), return raw enums for i18n
- **Name resolution**: Company detail route resolves legal entity names for members/officers missing `legalName` (max 10 parallel lookups, cached)
- **Mock mode**: Set `BR_USE_MOCK_DATA=true` to bypass certificate requirement in development
- **Key API endpoints used**: `/searchlegalentities/search/legal-entities`, `/legalentity/legal-entity/{regcode}`

## Financial Data (On-Demand API)
Financial ratios are fetched on-demand from data.gov.lv CKAN Datastore API (no auth, CC0 license).
- **Client**: `lib/data-gov/client.ts` — SQL JOIN across CKAN resources, 10min cache, LVL→EUR conversion for pre-2014 data
- **27 ratios** calculated: profitability, liquidity, leverage, efficiency + raw figures (revenue, assets, equity, etc.)
- Units on charts: `%` (profitability), `×` (ratios), `EUR` (per-employee), `dienas/days` (DSO/DPO/CCC)

## Imported Data (CSV from data.gov.lv)
Data imported via scripts from VID/UR open data (CC0). Run `npm run import:all` to refresh.
- **Tax payments**: `scripts/import-vid-tax-data.ts` — VID tax payment records (~428K)
- **Insolvency**: `scripts/import-insolvency-data.ts` — insolvency proceedings (~17K)
- **Taxpayer ratings**: `scripts/import-taxpayer-rating.ts` — VID A/B/C/N/J ratings (~141K)
- **VAT payers**: `scripts/import-vat-payers.ts` — PVN registry from VID (~280K, ISO-8859-1 encoding)
- **NACE codes**: `scripts/import-nace-codes.ts` — NACE 2.0 + 2.1 classifiers from data.gov.lv
- **State aid**: `scripts/import-state-aid.ts` — de minimis aid from deminimis.fm.gov.lv
- **Name history**: `scripts/import-name-history.ts` — previous company names from dati.ur.gov.lv (~93K)
- **Reorganizations**: `scripts/import-reorganizations.ts` — company reorganizations from dati.ur.gov.lv (~10K)
- **Note**: Imported data is static snapshots — needs periodic re-import to stay current

## Compare Page
- URL state persistence: Selected companies stored in `?companies=id1,id2,id3` parameter
- Comparison state: `?compared=true` tracks if comparison was executed
- Auto-restore: On language change/reload, companies and comparison are restored from URL
- Max 5 companies, min 2 required for comparison

## Known Issues & Solutions
1. **"Unable to open database file"**: Clear `.next` cache and restart (`rm -rf .next && npm run dev`)
2. **Prisma not finding database**: Ensure `lib/prisma.ts` uses absolute path via `path.join(process.cwd(), 'prisma', 'dev.db')`
3. **Auth not working after schema change**: Run `npx prisma generate` and restart dev server
4. **Compare page state lost on language change**: URL parameters preserve state across reloads
5. **"Company not found" (404) errors after database schema changes**: This happens when the dev server is running with stale build cache after Prisma schema modifications. The search may find companies but detail pages fail to load. Fix: Stop dev server (Ctrl+C), run `rm -rf .next && npx prisma generate`, then restart with `npm run dev`. Always clear cache after schema changes to avoid this issue.
