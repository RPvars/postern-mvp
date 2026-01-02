# TODO

## 🔥 Today / This Week

- [x] PFAS certificate request sent to atbalsts@vdaa.gov.lv (2026-01-02)
- [ ] Wait for VDAA to send FP_RPAVARS.cer file via email
- [ ] Process certificate when received (see detailed steps below)

## 📋 To Do

### When PFAS Certificate Arrives (FP_RPAVARS.cer)

**Step 1: Convert Certificate to PFX Format**
- [ ] Save .cer file to ~/certificates/FP_RPAVARS.cer
- [ ] Run: `openssl pkcs12 -export -in ~/certificates/FP_RPAVARS.cer -inkey ~/certificates/FP_RPAVARS.key -out ~/certificates/FP_RPAVARS.pfx`
- [ ] Choose a secure password when prompted (remember it!)

**Step 2: Install Certificate in Browser**
- [ ] Import FP_RPAVARS.pfx into macOS Keychain or browser
- [ ] Test access to developer portal: https://apitest.vraa.gov.lv/devportal/apis
- [ ] Login with username: APITV_RPAVARS + password from phone

**Step 3: Configure Application**
- [ ] Update .env with certificate path and password:
  ```
  BR_CERTIFICATE_PATH="/Users/ralfspavars/certificates/FP_RPAVARS.pfx"
  BR_CERTIFICATE_PASSWORD="your-password"
  BR_USE_MOCK_DATA="false"
  ```
- [ ] Get consumer key/secret from developer portal (after subscribing to Business Register API)
- [ ] Update BR_CONSUMER_KEY and BR_CONSUMER_SECRET in .env

**Step 4: Test API Connection**
- [ ] Test OAuth token retrieval with certificate
- [ ] Test simple API call to Business Register
- [ ] Verify transaction ID generation works
- [ ] Check error handling

### Phase 3: Real API Integration (After Certificate Working)
- [ ] Update lib/business-register/client/auth.ts with proper certificate loading
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
  - Waiting for FP_RPAVARS.cer file from VDAA

---

## 📝 Quick Reference

### PFAS Certificate Files
- **Private Key** (KEEP SECURE): `/Users/ralfspavars/certificates/FP_RPAVARS.key`
- **Certificate Request** (sent to VDAA): `/Users/ralfspavars/certificates/FP_RPAVARS.req`
- **Certificate** (waiting for): `/Users/ralfspavars/certificates/FP_RPAVARS.cer` ⏳
- **PFX Certificate** (create after receiving .cer): `/Users/ralfspavars/certificates/FP_RPAVARS.pfx`

### Test Environment Credentials
- **Username**: APITV_RPAVARS
- **Password**: Sent to +37129997132
- **Authority ID**: FP_RPAVARS
- **eServiceId**: URN:IVIS:100001:EP.DA-DA616-V1-0
- **Developer Portal**: https://apitest.vraa.gov.lv/devportal/apis
- **OAuth Token URL**: https://ha.vraa.gov.lv/STS/VISS.Pfas.STS/oauth2/token

### When Certificate Arrives
1. Run conversion command (see Step 1 in "When PFAS Certificate Arrives")
2. Install in browser to access developer portal
3. Update .env with certificate path and password
4. Get API credentials from developer portal
5. Start Phase 3 implementation
