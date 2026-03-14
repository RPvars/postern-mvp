# TODO

## 🔥 Today / This Week

- [x] PFAS certificate request sent to atbalsts@vdaa.gov.lv (2026-01-02)
- [x] PFAS certificate received from VDAA (2026-01-07)
- [x] Certificate converted to PFX format (2026-01-31)
- [x] Application code updated with TLS certificate support (2026-01-31)
- [ ] Get Consumer Key/Secret from developer portal
- [ ] Test API connection

## 📋 To Do

### Get API Credentials - Production (NEXT STEP)

**Step 1: Install Certificate in Browser**
- [ ] Import `/Users/ralfspavars/certificates/FP_RPAVARS.pfx` into macOS Keychain or browser
  - Password: see macOS Keychain item "PFAS Certificate" or `.env` file
- [ ] Access production developer portal: https://api.viss.gov.lv/devportal/apis
- [ ] Login with username: API_RPAVARS + password from phone

**Step 2: Register Application & Get Credentials**
- [ ] Create application: APP-FP_RPAVARS-PosternMVP
- [ ] Subscribe to Business Register API
- [ ] Copy **Consumer Key** and **Consumer Secret**
- [ ] Update .env:
  ```
  BR_CONSUMER_KEY="your-consumer-key"
  BR_CONSUMER_SECRET="your-consumer-secret"
  ```
- [ ] Find and set API base URL: `BR_API_BASE_URL="https://..."`

**Step 3: Test API Connection**
- [ ] Run: `npx tsx scripts/test-certificate.ts`
- [ ] Verify all 6 steps pass (pingpong, token, transaction)
- [ ] Set `BR_USE_MOCK_DATA="false"` when ready

### Phase 3: Real API Integration (After Credentials Working)
- [x] Update lib/business-register/client/auth.ts with proper certificate loading
- [ ] Find actual Business Register API endpoints from developer portal
- [ ] Update lib/business-register/client/http.ts with real API URLs
- [ ] Test company lookup by registration number
- [ ] Test board member retrieval
- [ ] Validate API response structure matches types

### Phase 4: Route Migration
- [ ] Migrate app/api/search/route.ts to use searchService
- [ ] Migrate app/api/company/[id]/route.ts to use companyService
- [ ] Migrate app/api/compare/route.ts to use service layer
- [ ] Migrate app/api/companies/batch/route.ts to use service layer
- [ ] Test all frontend features still work
- [ ] Add fallback error handling for API failures

### Phase 5: Optimization
- [ ] Implement caching layer (Redis or in-memory)
- [ ] Add API response time monitoring
- [ ] Implement retry logic for failed requests
- [ ] Add circuit breaker pattern for API downtime
- [ ] Performance testing and optimization

## 🐛 Bugs

- [ ]

## 💡 Ideas

- [ ]

## ✅ Done

- [x] Created agent system (2026-01-02)
- [x] Fixed critical security issues (2026-01-02):
  - Removed dangerous email account linking in auth config
  - Optimized search endpoint with database filtering (prevents DoS)
  - Added rate limiting to all public API endpoints
  - Protected console.log statements (development-only)
  - Added UUID validation for company IDs
- [x] Business Register API Integration Phase 1 (2026-01-02):
  - Created configuration system with environment validation
  - Defined TypeScript types for API responses
  - Built OAuth 2.0 authentication client with PFAS certificate support
  - Implemented transaction ID generator
- [x] Business Register API Integration Phase 2 (2026-01-02):
  - Created HTTP client with mock data support
  - Built data mappers for company and board member transformations
  - Implemented company, board member, and search services
  - Added environment variables with mock mode enabled
  - Created .env.example documentation
- [x] PFAS Certificate Request (2026-01-02):
  - Generated private key: ~/certificates/FP_RPAVARS.key
  - Generated certificate request: ~/certificates/FP_RPAVARS.req
  - Sent certificate request to atbalsts@vdaa.gov.lv
- [x] PFAS Certificate Received & Processed (2026-01-31):
  - Certificate received from VDAA (2026-01-07)
  - Converted to PFX format with secure password
  - Updated auth.ts with TLS certificate support (https module)
  - Updated http.ts with TLS certificate support
  - Updated .env with certificate path and password
  - Created test script: scripts/test-certificate.ts

---

## 📝 Quick Reference

### PFAS Certificate Files
- **Private Key** (KEEP SECURE): `/Users/ralfspavars/certificates/FP_RPAVARS.key`
- **Certificate** (.cer): `/Users/ralfspavars/certificates/fp_rpavars.cer` ✅
- **Certificate Chain** (.p7b): `/Users/ralfspavars/certificates/fp_rpavars.p7b`
- **PFX Certificate** (legacy): `/Users/ralfspavars/certificates/FP_RPAVARS.pfx`
- **PFX Certificate** (Node.js v24 compatible): `/Users/ralfspavars/certificates/FP_RPAVARS_modern.pfx` ✅
- **PFX Password**: stored in macOS Keychain and `.env` (BR_CERTIFICATE_PASSWORD)

### Production Environment Credentials
- **Username**: API_RPAVARS
- **Password**: Sent to +37129997132
- **Authority ID**: FP_RPAVARS
- **eServiceId**: URN:IVIS:100001:EP.DA-DA616-V1-0
- **App Name**: APP-FP_RPAVARS-PosternMVP
- **Developer Portal**: https://api.viss.gov.lv/devportal/apis
- **OAuth Token URL**: https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token
- **Transaction API**: https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/transactions
- **Pingpong URL**: https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/pingpong
- **Data Exchange Nr**: DA616

### Next Steps
1. Import PFX into browser to access developer portal
2. Login to production portal (API_RPAVARS), create application
3. Subscribe to Business Register API
4. Copy Consumer Key/Secret to .env
5. Find and set BR_API_BASE_URL
6. Run test: `npx tsx scripts/test-certificate.ts`
7. Set BR_USE_MOCK_DATA="false"
