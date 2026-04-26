# Posterns MVP - Claude Code Context

## Project Overview
Posterns is a Latvian business intelligence platform that provides company data, financial information, and analytics. The MVP focuses on company search, comparison, and data visualization.

## Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Authentication**: NextAuth.js v5 (Auth.js) with email/password + Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui components + dark mode via `next-themes`
- **Language**: TypeScript
- **Email**: Resend

## Key Directories
```
app/                    # Next.js App Router pages
  (auth)/              # Auth pages (login, register, etc.)
  api/                 # API routes
    auth/              # Auth endpoints
    company/[id]/      # Company detail API (monolithic, used by compare)
      basic/           # Progressive: core company data + DB queries
      people/          # Progressive: name-resolved members/officers
      external/        # Progressive: financial ratios + annual reports
    compare/           # Comparison API
    companies/batch/   # Batch fetch companies by IDs
    industries/        # Industry listing + detail API (NACE hierarchy)
  industries/          # Industry browsing pages (NACE drill-down)
  address/             # Reverse address search page
components/
  auth/                # Auth UI components
  ui/                  # shadcn/ui components
  company/             # Company detail tab components
    basic-tab.tsx      # Company info, registration, capital, state aid, risk
    people-tab.tsx     # Ownership, board members, beneficial owners
    financial-tab.tsx  # Financial summary, tax payments (scrollable tables)
    documents-tab.tsx  # Annual reports table with download + PDF preview
    company-skeleton.tsx  # Loading skeleton
    company-error.tsx     # Error state
  financial-ratios-display.tsx  # Financial ratios with charts
  company-selector.tsx          # Multi-company selector for comparison
  industry/             # Industry page components (icons, etc.)
lib/
  auth.ts              # NextAuth configuration
  prisma.ts            # Prisma client (uses absolute path for SQLite)
  format.ts            # Shared formatting helpers (currency, percent, date)
  text-utils.ts        # Name normalization, legal form abbreviation, address normalization, display formatting
  industry-icons.ts    # NACE section → Lucide icon mapping
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
- Key namespaces: `common`, `navigation`, `home`, `auth`, `company`, `compare`, `companySelector`, `industries`
- **i18n pattern**: API returns raw enum values (e.g., `REGISTERED`, `BOARD_MEMBER`), frontend translates via `translateEnum(t, 'namespace.ENUM_VALUE', rawValue)` from `lib/i18n/translate-enum.ts`. Components use local `te()` wrapper for brevity
- Translation namespaces for enums: `companyStatus`, `legalForm`, `register`, `position`, `governingBody`, `representationRights`, `controlType`, `country`
- Use `useTranslations('namespace')` hook in client components

## Common Commands
```bash
npm run dev           # Start dev server
npx prisma generate   # Regenerate Prisma client
npx prisma db push    # Push schema to database
npx prisma studio     # Open database GUI
npm run import:all    # Import all CSV data (includes people data from UR open data)
npm run import:people # Import person data only (register, members, officers, beneficial owners, stockholders)
npm run import:financial # Import financial data from CKAN (revenue, profit, assets ~1M records)
npm run import:nace   # Import NACE classification with hierarchy
npm run enrich:websites # Discover company websites via DNS + homepage verification
npm run enrich:contacts # Extract email/phone from known company websites
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
- **Name resolution**: `/api/company/[id]/people` resolves legal entity names for members/officers missing `legalName` (max 10 parallel lookups, cached). Uses immutable mapping (no mutation of cached objects)
- **Mock mode**: Set `BR_USE_MOCK_DATA=true` to bypass certificate requirement in development
- **Key API endpoints used**: `/searchlegalentities/search/legal-entities`, `/legalentity/legal-entity/{regcode}`, `/legalentity/legal-entity/{regcode}/annual-reports`, `/annualreport/annual-report/{fileId}/content`
- **Annual reports**: Listed via legalentity endpoint (flat array), downloaded via annualreport endpoint. Proxy route at `app/api/annual-report/[fileId]/content/`. Deduplication by year+type prefers PDF > HTML > DUF format. PDF preview via `?preview=true` (Content-Disposition: inline)

## Financial Data (On-Demand API)
Financial ratios are fetched on-demand from data.gov.lv CKAN Datastore API (no auth, CC0 license).
- **Client**: `lib/data-gov/client.ts` — SQL JOIN across CKAN resources, 10min cache, LVL→EUR conversion for pre-2014 data
- **29 ratios** calculated: profitability (incl. ROIC, Gross Profit/Assets), liquidity, leverage, efficiency + raw figures + 11 intermediate values (grossProfit, EBIT, EBITDA, etc.)
- **Ratio warnings**: `negativeEquityNegativeIncome` (dotted chart gap + red value), `negativeEquity`, `lowEquityRatio` (equity/assets < 10%) — detected in `calculateRatios()`, displayed via `RatioWarning` type
- **Formula breakdown UI**: `RatioCard` accepts `formulaDescription` (static formula text under description) and `formulaSteps` (dynamic per-year computed steps shown in tooltip). Used for complex ratios (ROIC, ROCE, EBITDA margin, quick ratio, working capital ratio) where hover reveals intermediate values like Capital Employed, Invested Capital, Working Capital
- **Chart tooltip**: Shows either `formulaSteps` (computed per year) or `contextFields` (raw values) — mutually exclusive. Invalid segments shown as dotted orange line sinking below chart
- Units on charts: `%` (profitability), `×` (ratios), `EUR` (per-employee), `dienas/days` (DSO/DPO/CCC)
- **Dev test page**: `/dev/ratios` — 5 mock companies testing warning scenarios (blocked in production via server-side redirect)

## Imported Data (CSV from data.gov.lv)
Data imported via scripts from VID/UR open data (CC0). Run `npm run import:all` to refresh.
- **Tax payments**: `scripts/import-vid-tax-data.ts` — VID tax payment records (~428K)
- **Insolvency**: `scripts/import-insolvency-data.ts` — insolvency proceedings (~17K)
- **Taxpayer ratings**: `scripts/import-taxpayer-rating.ts` — VID A/B/C/N/J ratings (~141K)
- **VAT payers**: `scripts/import-vat-payers.ts` — PVN registry from VID (~280K, ISO-8859-1 encoding)
- **NACE codes**: `scripts/import-nace-codes.ts` — NACE 2.0 + 2.1 classifiers from data.gov.lv. Imports hierarchy (parentCode, level). NACE 2.0 sections/divisions are authoritative; 2.1 only updates names for existing codes (does not override parentCode)
- **Financial data**: `scripts/import-financial-data.ts` — bulk import from data.gov.lv CKAN API (revenue, profit, assets, employees). ~1M records. `npm run import:financial`
- **State aid**: `scripts/import-state-aid.ts` — de minimis aid from deminimis.fm.gov.lv
- **Name history**: `scripts/import-name-history.ts` — previous company names from dati.ur.gov.lv (~93K)
- **Reorganizations**: `scripts/import-reorganizations.ts` — company reorganizations from dati.ur.gov.lv (~10K)
- **Company register**: `scripts/import-register.ts` — all LV companies from dati.ur.gov.lv (~482K)
- **Members (owners)**: `scripts/import-members.ts` — shareholders from dati.ur.gov.lv (~181K). Masked personal codes — match by code+name to avoid cross-person collisions
- **Officers (board)**: `scripts/import-officers.ts` — board members from dati.ur.gov.lv (~279K). Uses `externalId` for upsert
- **Beneficial owners**: `scripts/import-beneficial-owners.ts` — from dati.ur.gov.lv (~195K). Uses `externalId` for upsert
- **Stockholders**: `scripts/import-stockholders.ts` — AS company shareholders (~22K)
- **Note**: Imported data is static snapshots — needs periodic re-import to stay current
- **Person import**: `npm run import:people` runs all 5 person-related imports in sequence

## Company Data Enrichment
Scripts that discover and populate contact data from company websites:
- **Website discovery**: `scripts/enrich-websites.ts` — generates domain candidates from company names, DNS-checks them, fetches homepage HTML, verifies by finding registration number or company name. Stores verified URL in `Company.website`. Run: `npm run enrich:websites -- --limit=1000`
- **Contact extraction**: `scripts/enrich-contacts.ts` — fetches known company websites, extracts email (mailto: links + regex, domain-matched, generic prefixes only) and phone (tel: links + LV phone regex). Run: `npm run enrich:contacts`
- **Business card**: `components/company/business-card.tsx` — displays address, NACE, website, phone, email, Clearbit logo on company detail page
- **Enrichment pipeline**: Run `enrich:websites` first (populates `website`), then `enrich:contacts` (populates `email`/`phone` from those websites)
- **Logo**: Clearbit Logo API (`https://logo.clearbit.com/{domain}`) with `<img onError>` fallback to Building2 icon

## Company Detail Progressive Loading
The company detail page uses 3 parallel API calls for progressive rendering:
- `/api/company/[id]/basic` — BR API `getLegalEntity` + 7 DB queries + NACE. Returns everything for Basic tab + raw people data
- `/api/company/[id]/people` — Name resolution for legal entity members/officers (hits getLegalEntity cache). Returns resolved owners/boardMembers/beneficialOwners
- `/api/company/[id]/external` — `getFinancialData` + `getAnnualReports` in parallel. Returns financialRatios + annualReports
- Page renders as soon as `/basic` returns; other data merges via `useMemo` when available
- Original monolithic `/api/company/[id]` route kept for Compare page backward compatibility
- All 3 routes share the same rate limit bucket (`company:${identifier}`)

## Dark Mode
- **Provider**: `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`
- **Toggle**: Sun/Moon icon button in navigation header
- **CSS Variables**: All colors defined in `globals.css` `:root` and `.dark` selectors (shadcn/ui pattern)
- **Chart colors**: `--chart-grid` and `--chart-text` CSS vars for Recharts components
- **Brand yellow** (#FEC200): Used for logo, CTA buttons (bg), chart lines. Never as text color directly
- **Link accent**: `--link-accent` CSS variable — `#B45309` (amber-700) in light mode, `#FEC200` in dark mode. Use `text-link-accent` for accent links, `text-muted-foreground hover:text-foreground` for subtle links. `AddressLink` component supports `variant="accent"|"subtle"`
- **Color mapping**: All components use Tailwind CSS variable classes (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-accent`, `border-border`) — no hardcoded `bg-white`, `text-slate-*`, etc.

## Person Profile Page
- **Route**: `/person/[code]` — displays all companies a person is connected to
- **Data source**: Bulk CSV imports from dati.ur.gov.lv (members, officers, beneficial owners) + BR API enrichment
- **API**: `/api/person/[code]` — queries Owner/Ownership, BoardMember, BeneficialOwner by personalCode. Supports `?name=` param for masked code disambiguation
- **Relationship graph**: Custom SVG with multi-ring layout (auto-scales for 15+ companies), pan/zoom, Cmd+Click opens new tab
- **Company map**: Leaflet + OpenStreetMap showing company locations. Geocoding via Nominatim with DB coordinate caching
- **Unified table**: Single table showing all company connections with role indicators (owner/board/beneficial)
- **Person search**: `/api/person/search?q=name` — searches BoardMember, BeneficialOwner, Owner tables. Handles reversed name order (Vārds Uzvārds = Uzvārds Vārds)
- **Masked codes**: CSV data uses masked personal codes (`123456-*****`). Person links include `?name=` for disambiguation. Masked codes require `?name=` param (400 without it). For full codes, API queries both full and masked variants with `OR`, validates masked matches via BR API (`getLegalEntity`), and shows unverified matches as "possibly connected". Verified codes are upgraded in DB fire-and-forget
- **Person links**: Natural persons clickable in people-tab → `/person/[personalCode]?name=...`
- **Legal entities**: Still link to `/company/[regcode]` as before

## Search
- **Unified search**: Company, person, and address results in one dropdown (header + home page)
- **Enter key**: Navigates to `/search?q=...` full results page. **Cmd+Enter** opens in new tab. **Cmd+Click** on results opens in new tab
- **Company search**: BR API + local DB (482K companies) in parallel
- **Person search**: `/api/person/search` — queries 3 tables, reversed name matching, dedup by normalized name
- **Address search**: `/api/address/search` — GROUP BY normalized address, returns unique addresses with company counts
- **Geocoding**: `/api/geocode` — Nominatim proxy with DB coordinate caching on Company model (latitude/longitude)

## Address Reverse Search
- **Route**: `/address?q=<encoded-address>` — shows all companies at a given address
- **API**: `/api/address?q=<address>&page=1&limit=50` — paginated company list by normalized address match
- **Search API**: `/api/address/search?q=<partial>` — grouped addresses with company counts (LIKE on `legalAddressNormalized`)
- **Normalization**: `normalizeAddress()` in `lib/text-utils.ts` — lowercase, remove quotes, strip postal codes (LV-XXXX), sort parts alphabetically. This ensures "Rīga, Rēznas iela 9A" and "Rēznas iela 9A, Rīga, LV-1019" normalize to the same value
- **DB field**: `Company.legalAddressNormalized` with index. Updated on CSV import and BR API cache
- **Clickable addresses**: `AddressLink` component (`components/address/address-link.tsx`) — used in business card, basic tab, industry table. Yellow (#FEC200) text with underline on hover
- **Migration script**: `scripts/normalize-addresses.ts` — one-time batch normalization of all addresses
- **i18n**: `address` namespace in `messages/lv.json`, `messages/en.json`
- **No auth required**: Address data is public company registration data (unlike person pages which are GDPR-gated)

## Industry Browsing
- **Route**: `/industries` — grid of 21 NACE sections (A-U) with company counts, revenue, employees
- **Detail**: `/industries/[code]` — drill-down with breadcrumb, inline subcategory expansion (dynamic depth), stats cards, top 20 companies
- **API**: `/api/industries` (list sections/children), `/api/industries/[code]` (detail + top companies)
- **Ranking**: 4 metrics — profit, revenue, taxes, employees. Sortable columns, year selector
- **Data sources**: `TaxPayment.naceCode` for industry classification, `FinancialData` table for revenue/profit (bulk CKAN import)
- **NACE hierarchy**: `NaceCode` model with `parentCode` and `level` (1=Section, 2=Division, 3=Group, 4=Class)
- **NACE import**: NACE 2.0 provides authoritative section→division mapping; NACE 2.1 only updates names (not parentCode)
- **Company names**: `formatCompanyDisplayName` in `lib/text-utils.ts` moves legal form to end ("SIA Foo" → "Foo, SIA")
- **Icons**: `lib/industry-icons.ts` maps sections AND divisions to Lucide icons
- **Inline drill-down**: `drillPath` array tracks selected codes at each level. `levelData` Map stores fetched children. `ancestorTabs` auto-populates when landing on deep codes via direct link. URL syncs via `?path=33,33.1,33.14`
- **SQL**: Uses `$queryRawUnsafe` with sanitized inputs (NACE prefixes validated as 1-4 digit numbers) to avoid SQLite 999-parameter limit
- **Rank history**: Top companies show ▲/▼ rank change vs previous year with hover tooltip (3-year history)
- **Compare integration**: Checkbox selection in top table → "Salīdzināt" sticky bar → `/compare?companies=...&compared=true`
- **CSV export**: Client-side CSV generation with BOM for Excel UTF-8 compatibility
- **API cache**: Industry listings cached 5min in-memory (per-process, not shared across serverless instances)

## Compare Page
- URL state persistence: Selected companies stored in `?companies=id1,id2,id3` parameter
- Comparison state: `?compared=true` tracks if comparison was executed
- Auto-restore: On language change/reload, companies and comparison are restored from URL (parallel batch+compare fetch)
- Max 5 companies, min 2 required for comparison
- **Supports both ID formats**: Compare API auto-detects registration numbers (all digits) vs internal IDs (cuid)
- **BigInt serialization**: Ownership.sharesCount is BigInt — API uses JSON replacer to convert to Number before response
- **Sections**: Summary cards → Basic info (incl PVN) → Year selector → Financial summary (absolute EUR + YoY growth %) → Ownership comparison → Radar chart → Financial ratios (4 tabs) → Tax payments (with IIN/VSAOI breakdown) → Trend charts
- **Financial summary**: Shows revenue, profit, assets, equity, debt, employees as absolute EUR figures + YoY growth % with best/worst highlighting
- **Actions**: Copy link to clipboard, CSV export with BOM for Excel compatibility

## Known Issues & Solutions
1. **"Unable to open database file"**: Clear `.next` cache and restart (`rm -rf .next && npm run dev`)
2. **Prisma not finding database**: Ensure `lib/prisma.ts` uses absolute path via `path.join(process.cwd(), 'prisma', 'dev.db')`
3. **Auth not working after schema change**: Run `npx prisma generate` and restart dev server
4. **Compare page state lost on language change**: URL parameters preserve state across reloads
5. **"Company not found" (404) errors after database schema changes**: This happens when the dev server is running with stale build cache after Prisma schema modifications. The search may find companies but detail pages fail to load. Fix: Stop dev server (Ctrl+C), run `rm -rf .next && npx prisma generate`, then restart with `npm run dev`. Always clear cache after schema changes to avoid this issue.
