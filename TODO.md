# TODO

## 🔥 Today / This Week

- [ ] Request PFAS certificate from VDAA (URGENT - required for live API)
- [ ] Phase 3-5: Complete Business Register API integration after certificate arrives

## 📋 To Do

- [ ] Phase 3: Integrate real Business Register API (requires PFAS certificate)
- [ ] Phase 4: Migrate routes to use service layer
- [ ] Phase 5: Add caching and optimization

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
