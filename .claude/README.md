# Posterns MVP

Latvijas Uzņēmumu Analīzes Platforma - Baltic States Business Intelligence Platform

## Project Overview

Posterns is a business intelligence platform for searching and analyzing companies across the Baltic states (Latvia, Estonia, Lithuania). The MVP focuses on providing comprehensive company information including ownership structures, board members, beneficial owners, financial ratios, and tax payment data with side-by-side company comparison capabilities.

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Database**: SQLite
- **ORM**: Prisma
- **Fonts**: Geist Sans, Geist Mono

## Project Structure

```
Posterns_MVP/
├── app/
│   ├── api/
│   │   ├── search/route.ts          # Search API with Latvian char normalization
│   │   ├── compare/route.ts         # Multi-company comparison API
│   │   └── company/[id]/route.ts    # Company details API
│   ├── company/[id]/page.tsx        # Company detail page
│   ├── compare/page.tsx             # Company comparison page (NEW)
│   ├── page.tsx                     # Landing page with search
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── navigation.tsx               # Header navigation with grouped layout (logo+links | search+buttons)
│   ├── header-search.tsx            # Compact header search bar
│   ├── search-bar.tsx               # Main search with country selector
│   ├── company-selector.tsx         # Multi-select company picker
│   ├── financial-ratios-display.tsx # Financial metrics with 2-column grid and charts
│   ├── ownership-chart.tsx          # Ownership visualization component
│   └── sparkline.tsx                # Mini chart component
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── seed.ts                      # Database seeding script
│   └── dev.db                       # SQLite database
├── public/
│   ├── postern-logo.svg             # Posterns logo (#FEC200)
│   └── BG_2.avif                    # Background image
└── .claude/
    └── README.md                    # This file
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Database**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to database
   npx prisma db push

   # Seed database with sample data
   npm run db:seed
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

   Application will be available at `http://localhost:3000`

## Features

### Search Functionality

**Main Search Bar** (Homepage)
- Multi-field search across:
  - Company name (with Latvian character normalization)
  - Registration number
  - Tax number
  - Owner names
- Debounced search (300ms delay)
- Autocomplete dropdown with results
- Country selector (Latvia, Estonia, Lithuania, All)

**Header Search** (Global Navigation)
- Compact search bar in header for quick access
- Same search capabilities as main search
- Proper z-index layering for dropdown visibility
- Custom button-based dropdown (avoids cmdk context issues)
- Navigates directly to company detail page

**Latvian Character Normalization**
- Automatic normalization of Latvian diacritics (ā, č, ē, ģ, ī, ķ, ļ, ņ, š, ū, ž)
- Search works with or without special characters
- Example: "Rezekne" matches "Rēzeknes IT Parks SIA"

### Company Comparison

**Compare Page** (`/compare`)
- Select 2-5 companies for side-by-side comparison
- Multi-select company search interface
- Validation for minimum (2) and maximum (5) selections
- Year selector for historical data comparison

**Comparison Views**
- **Basic Information**: Name, registration number, tax number, status, legal form
- **Financial Ratios** (21 metrics across 4 categories):
  - **Rentabilitāte** (Profitability - 6 metrics): ROE, ROA, Net Profit Margin, Gross Profit Margin, Operating Profit Margin, EBITDA Margin
  - **Likviditāte** (Liquidity - 4 metrics): Current Ratio, Quick Ratio, Cash Ratio, Working Capital Ratio
  - **Finansiālais Sviras Efekts** (Leverage - 5 metrics): Debt-to-Equity, Debt Ratio, Interest Coverage, Equity Ratio, Long-term Debt to Capital
  - **Efektivitāte** (Efficiency - 6 metrics): Asset Turnover, Inventory Turnover, Receivables Turnover, Payables Turnover, Days Sales Outstanding, Cash Conversion Cycle
- **Tax Payments**: Bar chart visualization comparing annual tax payments
- **Capital Structure**: Share capital and ownership information

**Comparison Features**
- Best/worst value highlighting (green/red backgrounds)
- Tabbed interface for metric categories
- Missing data handling with "N/A" placeholders
- Responsive card-based layout

### Company Details

**Basic Information**
- Name, registration number, tax number
- Legal address, registration date
- Contact info (phone, email)
- **Business Status**: Active status, legal form, registry name
- **Capital**: Share capital amount and registration date
- **CSDD Data**: Registered vehicles count

**Risk & Compliance Indicators**
- Encumbrances status
- Liquidation status
- Insolvency register presence
- Payment claims
- Commercial pledges
- Securities status
- Tax debts (with last checked date)

**Ownership Structure**
- List of owners with detailed shareholding information:
  - Share percentage
  - Number of shares
  - Nominal value per share
  - Total value
  - Voting rights
  - Member since date
  - Historical ownership tracking

**Board Members**
- Name and personal code
- Institution (e.g., "Valde")
- Position (e.g., "Valdes priekšsēdētājs")
- Appointed date
- Representation rights
- Historical board member tracking

**Beneficial Owners**
- Name and personal code
- Date from
- Residence country
- Citizenship
- Control type (e.g., "kā dalībnieks")

**Tax Payments**
- Historical tax payments to state budget
- Year-over-year trends

**Financial Ratios**
- 21 comprehensive financial metrics in 2-column grid layout
- Multi-year historical data with full-height line charts
- YoY (Year-over-Year) trend indicators with color coding
- Current year value display with trend arrows
- Grouped by category with tabbed interface (Rentabilitāte, Likviditāte, Finansējums, Efektivitāte)
- Enhanced RatioCard component with FinancialChart for data visualization

### UI/UX

**Navigation**
- Restructured header with grouped layout:
  - Left: Logo + navigation links (Meklēt, Salīdzināt, Analītika, Ziņojumi)
  - Right: Search bar + language selector + login button
- Active page indication with bold black text (no underline)
- Increased navigation link size (text-base/16px)
- Consistent element heights (h-9/36px) across header
- Proper spacing: gap-6 between logo and links, gap-6 between nav items, gap-3 between header right elements

**Language Selection**
- Dropdown selector with flag emojis
- Available languages: 🇱🇻 LV, 🇱🇹 LT (disabled), 🇪🇪 EE (disabled), 🇬🇧 EN (disabled), 🇷🇺 RU (disabled)
- Currently only Latvian is functional

**General UI**
- Latvian language interface
- Responsive design
- Background image with opacity control
- Brand color: #FEC200 (Yellow)
- Proper z-index layering for dropdowns (header: z-10, dropdowns: z-50)
- Hover states and transitions
- Color-coded data visualization (green for positive, red for negative)

## Database Schema

### Models

**Company**
- **Basic Info**: id, name, registrationNumber (unique), taxNumber (unique), legalAddress, registrationDate, phone, email
- **Business Status & Capital**: status, legalForm, registryName, shareCapital, shareCapitalRegisteredDate, registeredVehiclesCount
- **Risk & Compliance**: hasEncumbrances, inLiquidation, inInsolvencyRegister, hasPaymentClaims, hasCommercialPledges, hasSecurities, hasTaxDebts, taxDebtsCheckedDate
- **Timestamps**: createdAt, updatedAt
- **Relations**: owners (Ownership[]), boardMembers (BoardMember[]), beneficialOwners (BeneficialOwner[]), taxPayments (TaxPayment[]), financialRatios (FinancialRatio[])
- **Indexes**: name, registrationNumber, taxNumber

**Owner**
- id, name, personalCode
- **Relations**: companies (Ownership[])

**Ownership** (Junction table)
- id, companyId, ownerId
- **Share Details**: sharePercentage, sharesCount, nominalValue, totalValue, votingRights, memberSince, notes
- **Historical Tracking**: isHistorical
- **Timestamps**: createdAt, updatedAt
- **Indexes**: companyId, ownerId, isHistorical
- **Constraints**: Unique(companyId, ownerId)

**BoardMember**
- id, companyId, name, personalCode
- **Position Details**: institution, position, appointedDate, representationRights, notes
- **Historical Tracking**: isHistorical
- **Timestamps**: createdAt, updatedAt
- **Indexes**: companyId, isHistorical

**BeneficialOwner**
- id, companyId, name, personalCode
- **Details**: dateFrom, residenceCountry, citizenship, controlType
- **Timestamps**: createdAt, updatedAt
- **Indexes**: companyId

**TaxPayment**
- id, companyId, year, amount, date
- **Timestamps**: createdAt, updatedAt
- **Indexes**: companyId, year

**FinancialRatio**
- id, companyId, year
- **Profitability** (6 metrics): returnOnEquity, returnOnAssets, netProfitMargin, grossProfitMargin, operatingProfitMargin, ebitdaMargin
- **Liquidity** (4 metrics): currentRatio, quickRatio, cashRatio, workingCapitalRatio
- **Leverage** (5 metrics): debtToEquity, debtRatio, interestCoverage, equityRatio, longTermDebtToCapital
- **Efficiency** (6 metrics): assetTurnover, inventoryTurnover, receivablesTurnover, payablesTurnover, daysSalesOutstanding, cashConversionCycle
- **Timestamps**: createdAt, updatedAt
- **Indexes**: companyId, year
- **Constraints**: Unique(companyId, year)

### Sample Data

Database is seeded with 20 realistic Latvian companies including:
- SIA "Latvijas Telekoms"
- SIA "Rīgas Satiksme"
- SIA "Aldaris"
- SIA "Rēzeknes IT Parks"
- And 16 more companies with 3 years of financial data each

Each company includes:
- Complete ownership structures
- Board member information
- Beneficial owner data
- Risk and compliance indicators
- Multi-year financial ratios and tax payment history

## API Routes

### GET /api/search?q={query}
Search for companies by name, registration number, tax number, or owner name.

**Features:**
- Latvian character normalization
- Case-insensitive search
- Returns up to 10 results

**Response:**
```json
{
  "results": [
    {
      "id": "string",
      "name": "string",
      "registrationNumber": "string",
      "taxNumber": "string",
      "owners": [
        { "name": "string", "share": number }
      ]
    }
  ]
}
```

### POST /api/compare
Get multiple companies for side-by-side comparison.

**Request Body:**
```json
{
  "companyIds": ["id1", "id2", "id3"]
}
```

**Features:**
- Validates 2-5 companies
- Returns complete company data with all relations
- Filters out historical records

**Response:**
```json
{
  "companies": [
    {
      "id": "string",
      "name": "string",
      // ... all company fields
      "owners": [...],
      "boardMembers": [...],
      "beneficialOwners": [...],
      "taxPayments": [...],
      "financialRatios": [...]
    }
  ]
}
```

### GET /api/company/[id]
Get detailed company information by ID.

**Response:**
```json
{
  "company": {
    "id": "string",
    "name": "string",
    "registrationNumber": "string",
    "taxNumber": "string",
    "legalAddress": "string",
    "registrationDate": "ISO date",
    "phone": "string | null",
    "email": "string | null",
    "status": "string",
    "legalForm": "string | null",
    "shareCapital": "number | null",
    // ... all company fields
    "owners": [...],
    "boardMembers": [...],
    "beneficialOwners": [...],
    "taxPayments": [...],
    "financialRatios": [...]
  }
}
```

## Available Scripts

```bash
npm run dev          # Start development server (with Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run kill         # Kill development server on port 3000
npm run db:push      # Push schema changes to database
npm run db:seed      # Seed database with sample data
```

## Common Commands

**Kill the Development Server:**
```bash
npm run kill         # Quick command to kill the dev server
# Or press Ctrl+C in the terminal where the server is running
# Or manually: lsof -ti:3000 | xargs kill -9
```

**Restart the Development Server:**
```bash
npm run dev
```

**View Prisma Database:**
```bash
npx prisma studio  # Opens database GUI at http://localhost:5555
```

**Reset Database:**
```bash
npx prisma db push --force-reset  # Resets and recreates database
npm run db:seed                    # Re-seed with sample data
```

## Technical Implementation Notes

### Tab Persistence
Company detail pages use URL-based tab state management to persist the active tab across page refreshes:
```typescript
const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();
const activeTab = searchParams.get('tab') || 'basic';

const handleTabChange = (value: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('tab', value);
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
};
```
This ensures users don't lose their place when refreshing or sharing links to specific tabs.

### Search Debouncing
All search inputs use 300ms debouncing to reduce API calls and improve performance.

### Z-Index Layering
Proper stacking context is maintained throughout the application:
- Background images: z-0
- Header: z-10 (with relative positioning)
- Dropdowns: z-50

### Header Search Implementation
The header search uses a custom dropdown instead of cmdk's CommandList to avoid React context issues when the dropdown is conditionally rendered outside the Command component hierarchy.

### Navigation Layout Strategy
The header uses a two-group flexbox layout with `justify-between`:
- **Left group** (`gap-6`): Logo + navigation links (with `gap-6` between nav items)
- **Right group** (`gap-3`): Search bar (w-80) + language selector (w-[110px]) + login button
This creates clear visual separation between navigation and user actions.

### Latvian Character Normalization
The search API implements comprehensive normalization:
```typescript
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[āĀ]/g, 'a')
    .replace(/[čČ]/g, 'c')
    // ... all Latvian diacritics
}
```

## Completed Features

- ✅ Basic search functionality with Latvian character support
- ✅ Company detail pages with comprehensive information
- ✅ Header search integration for quick access
- ✅ Company comparison feature (Salīdzināt)
- ✅ Multi-company selection interface
- ✅ Financial ratio visualization with 21 metrics in 2-column grid layout
- ✅ Enhanced financial charts with YoY trend indicators
- ✅ URL-based tab persistence for company detail pages
- ✅ Redesigned navigation with grouped layout and active states
- ✅ Language selector dropdown with flag emojis (LV, LT, EE, EN, RU)
- ✅ Consistent header element sizing and spacing
- ✅ Tax payment comparisons with charts
- ✅ Board member and beneficial owner tracking
- ✅ Risk and compliance indicators
- ✅ Expanded database schema with enhanced models

## Future Enhancements

- [ ] Enable English and Russian language options
- [ ] Implement actual country filtering in search API
- [ ] Add country field to Company model
- [ ] Integrate with real Latvian Uzņēmumu Reģistrs API
- [ ] Add Estonian and Lithuanian business data
- [ ] Add analytics dashboard (Analītika)
- [ ] Create reports functionality (Ziņojumi)
- [ ] Implement authentication/login system
- [ ] Add data export capabilities (CSV, PDF)
- [ ] Implement advanced filtering and sorting
- [ ] Add company relationship graphs
- [ ] Create watchlist/favorites feature
- [ ] Add email alerts for company changes

## Notes

- Currently uses dummy data for MVP demonstration
- Country selector is UI-only; backend filtering not yet implemented
- Only Latvian language is functional (LV flag)
- SQLite used for simplicity; consider PostgreSQL for production
- All financial ratios and compliance data are sample/mock data
- UI optimized for desktop; mobile responsive design could be enhanced
