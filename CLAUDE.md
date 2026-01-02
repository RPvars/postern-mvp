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
  financial-ratios-display.tsx  # Financial ratios with charts
  company-selector.tsx          # Multi-company selector for comparison
lib/
  auth.ts              # NextAuth configuration
  prisma.ts            # Prisma client (uses absolute path for SQLite)
  i18n/                # i18n configuration
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
- Company status values (from DB in Latvian) are translated via `common.companyStatus` mapping
- Use `useTranslations('namespace')` hook in client components

## Common Commands
```bash
npm run dev           # Start dev server
npx prisma generate   # Regenerate Prisma client
npx prisma db push    # Push schema to database
npx prisma studio     # Open database GUI
```

## Environment Variables
Required in `.env`:
- `DATABASE_URL` - Database connection string
- `AUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - App URL (http://localhost:3000)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth (optional)
- `RESEND_API_KEY` - Email service API key
- `EMAIL_FROM` - Sender email address

## Financial Ratios
The `FinancialRatio` model includes comprehensive financial metrics organized by category:
- **Profitability**: ROE, ROA, ROCE, Net/Gross/EBIT/EBITDA margins, Cash Flow Margin, Revenue/Profit per Employee
- **Liquidity**: Current Ratio, Quick Ratio, Cash Ratio, Working Capital Ratio
- **Leverage**: Debt-to-Equity, Debt-to-Assets, Interest Coverage, Equity Multiplier
- **Efficiency**: Asset/Inventory/Receivables/Payables Turnover, DSO, DPO, Cash Conversion Cycle

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
