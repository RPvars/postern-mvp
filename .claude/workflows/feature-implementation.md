# Feature Implementation Workflow

Multi-agent workflow for implementing new features in the Posterns MVP platform.

## Overview

This workflow provides a systematic approach to feature development, ensuring quality, security, and maintainability through specialized agents at each step.

## Workflow Phases

### Phase 1: Planning
**Goal**: Understand requirements and design implementation approach

**Steps**:
1. **Clarify requirements** with user
   - What problem does this solve?
   - Who are the users?
   - What are the acceptance criteria?

2. **Design architecture**
   - Identify affected components
   - Plan database schema changes
   - Consider authentication requirements
   - Plan i18n keys needed

3. **Identify dependencies**
   - Which existing features will this affect?
   - What new dependencies are needed?
   - Are there any breaking changes?

**Output**: Clear implementation plan with file paths and steps

---

### Phase 2: Implementation
**Goal**: Build the feature using domain-specific agents

#### 2.1 Database Changes (if needed)
**Agent**: database-specialist

**Tasks**:
- Update Prisma schema
- Add new models or fields
- Define relationships
- Run migrations

**Example**:
```
User: "Add user profile fields to schema"
database-specialist:
- Adds profilePhoto, bio, locale fields to User model
- Runs npx prisma generate && npx prisma db push
- Verifies schema compiles without errors
```

#### 2.2 Authentication (if needed)
**Agent**: auth-specialist

**Tasks**:
- Protect new routes
- Add authorization checks
- Implement role-based access
- Review security implications

**Example**:
```
User: "Protect profile edit route"
auth-specialist:
- Adds session check to profile API route
- Verifies user can only edit own profile
- Adds rate limiting if needed
```

#### 2.3 Core Feature Development
**Manual or with agent assistance**

**Tasks**:
- Create React components
- Implement API routes
- Add business logic
- Style with Tailwind CSS
- Integrate with existing features

**Best Practices**:
- Use TypeScript for type safety
- Follow existing code patterns
- Use shadcn/ui components where appropriate
- Keep components focused (single responsibility)

#### 2.4 Internationalization
**Agent**: i18n-specialist

**Tasks**:
- Add translation keys for all user-facing text
- Update both `messages/lv.json` and `messages/en.json`
- Test locale switching
- Verify no hardcoded strings

**Example**:
```
User: "Add translations for user profile page"
i18n-specialist:
- Adds profile.title, profile.bio, profile.saveButton to both locales
- Verifies JSON syntax is valid
- Tests locale switcher works on profile page
```

---

### Phase 3: Quality Assurance
**Goal**: Ensure code quality, security, and functionality

#### 3.1 Code Review
**Agent**: code-reviewer

**Tasks**:
- Review for security vulnerabilities
- Check code quality and TypeScript types
- Verify error handling
- Ensure i18n keys are present
- Check for performance issues

**Example**:
```
User: "Review the profile page implementation"
code-reviewer:
- Reviews all changed files
- Identifies any critical security issues
- Suggests improvements
- Provides categorized feedback (Critical/Warning/Suggestion)
```

#### 3.2 Manual Testing
**User responsibility**

**Checklist**:
- [ ] Feature works as expected
- [ ] All edge cases handled
- [ ] Error states display correctly
- [ ] Loading states work properly
- [ ] Both locales (lv/en) work correctly
- [ ] Authentication/authorization works
- [ ] Database operations succeed
- [ ] No console errors
- [ ] UI is responsive (mobile/desktop)
- [ ] Branding colors match (#FEC200)

#### 3.3 Fix Issues
**As needed**

If code review or testing reveals issues:
1. Fix critical issues immediately
2. Address warnings before committing
3. Consider suggestions for improvement
4. Re-test after fixes
5. Re-review if significant changes made

---

### Phase 4: Commit & Deploy
**Goal**: Create clean commits and push to repository

#### 4.1 Automated Commit
**Agent**: git-automation

**Tasks**:
- Analyze changes to understand what changed
- Generate conventional commit message (NO AI attribution)
- Stage appropriate files
- Create commit
- Push to remote

**Example**:
```
User: "Commit and push the profile page"
git-automation:
- Runs git status and git diff
- Identifies this as a new feature (feat)
- Generates commit message:

  feat: add user profile page with edit functionality

  Implements user profile view showing:
  - User information display (name, email)
  - Profile photo upload
  - Bio editing with validation
  - Locale preference selector

  Integrates with NextAuth session for current user data.
  Profile photos stored in public/uploads directory.

- Stages all relevant files
- Creates commit
- Pushes to origin/main
```

#### 4.2 Verify Deployment
**Manual verification**

**Checklist**:
- [ ] Commit appears in GitHub
- [ ] Commit message is clean (no AI attribution)
- [ ] All files committed
- [ ] No unintended files committed
- [ ] Branch is up to date

---

## Complete Workflow Example

### Feature: Add User Dashboard

**Phase 1: Planning**
```
User: "I want to add a user dashboard showing their recent activity"

Planning discussion:
- Dashboard shows: recent searches, saved companies, profile summary
- Available to logged-in users only
- Needs new Dashboard model in database
- Should support both lv/en locales
- Use existing card components from shadcn/ui
```

**Phase 2: Implementation**

*Step 1 - Database*:
```
User: "Add Dashboard model to schema"

database-specialist:
- Adds Dashboard model with userId, recentSearches (JSON), savedCompanies relation
- Adds relation to User model
- Runs prisma generate && prisma db push
- Verifies schema is valid
```

*Step 2 - Auth*:
```
User: "Protect the dashboard route"

auth-specialist:
- Reviews app/dashboard/page.tsx
- Adds session check: const session = await auth()
- Adds redirect if not authenticated
- Verifies only user can access their own dashboard
```

*Step 3 - Core Development*:
```
[User implements dashboard manually]
- Creates app/dashboard/page.tsx
- Creates components/dashboard/activity-card.tsx
- Creates components/dashboard/saved-companies.tsx
- Creates app/api/dashboard/route.ts
- Implements data fetching and display
```

*Step 4 - i18n*:
```
User: "Add dashboard translations"

i18n-specialist:
- Adds dashboard namespace to messages/lv.json:
  {
    "dashboard": {
      "title": "Mana pārskatu panelis",
      "recentSearches": "Nesenie meklējumi",
      "savedCompanies": "Saglabātie uzņēmumi",
      "noActivity": "Nav nesenas aktivitātes"
    }
  }
- Adds same keys to messages/en.json (translated)
- Verifies all hardcoded text replaced with t('dashboard.key')
```

**Phase 3: Quality Assurance**

*Code Review*:
```
User: "Review the dashboard implementation"

code-reviewer:
✅ Positive Notes:
- Good use of TypeScript types
- Proper auth checks
- Clean component structure

⚠️ Warning:
- Dashboard API doesn't have rate limiting
- Suggestion: Add rate limiting (10 req/min)

💡 Suggestion:
- Consider caching dashboard data for 5 minutes
- Reduces database load

User: [Adds rate limiting and caching]
```

*Manual Testing*:
```
[User tests feature]
✅ Dashboard loads for authenticated users
✅ Redirects to login if not authenticated
✅ Recent searches display correctly
✅ Saved companies show with links
✅ Empty state works ("No activity")
✅ Both lv/en locales work
✅ Mobile responsive
```

**Phase 4: Commit & Deploy**

```
User: "Commit and push the dashboard feature"

git-automation:
- Analyzes changes (Dashboard model, components, routes, translations)
- Generates commit:

  feat: add user dashboard with activity tracking

  Implements personalized dashboard for logged-in users:
  - Recent search history (last 10 searches)
  - Saved companies with quick access links
  - Profile summary widget
  - Empty state when no activity

  Dashboard data cached for 5 minutes to reduce load.
  Rate limited to 10 requests per minute per user.
  Supports both Latvian and English locales.

- Stages files:
  - prisma/schema.prisma
  - app/dashboard/page.tsx
  - app/api/dashboard/route.ts
  - components/dashboard/activity-card.tsx
  - components/dashboard/saved-companies.tsx
  - messages/lv.json
  - messages/en.json
- Commits and pushes
- Reports success with commit hash
```

---

## Workflow Variations

### Small Feature (No Database Changes)

1. Implement feature
2. i18n-specialist: Add translations
3. code-reviewer: Review code
4. git-automation: Commit and push

**Example**: Add export button to comparison page

---

### Bug Fix Workflow

1. Identify bug
2. Implement fix
3. code-reviewer: Verify fix doesn't introduce issues
4. git-automation: Commit with "fix: description"

**Example**: Fix locale switching bug on comparison page

---

### Security Fix Workflow

1. auth-specialist: Identify security issue
2. Implement fix
3. code-reviewer: Verify security issue resolved
4. git-automation: Commit with "security: description"

**Example**: Add rate limiting to forgot password endpoint

---

### Refactoring Workflow

1. Plan refactoring approach
2. Implement refactoring
3. code-reviewer: Verify no functionality changed
4. git-automation: Commit with "refactor: description"

**Example**: Extract duplicate validation logic to shared utility

---

## Best Practices

### Planning
- ✅ Clarify requirements before starting
- ✅ Design database schema changes carefully
- ✅ Consider authentication early
- ✅ Plan for i18n from the start
- ❌ Don't skip planning for "quick" features

### Implementation
- ✅ Follow single responsibility principle
- ✅ Use TypeScript for type safety
- ✅ Match existing code patterns
- ✅ Keep components focused and reusable
- ❌ Don't mix multiple concerns in one component

### Code Review
- ✅ Address critical issues immediately
- ✅ Fix warnings before committing
- ✅ Consider suggestions seriously
- ✅ Re-test after significant changes
- ❌ Don't ignore security warnings

### Commits
- ✅ One feature per commit (atomic)
- ✅ Clear, descriptive commit messages
- ✅ Include what changed and why
- ✅ Test before committing
- ❌ Don't commit broken code
- ❌ Don't mention AI tools in commits

### Testing
- ✅ Test happy path
- ✅ Test error cases
- ✅ Test both locales
- ✅ Test authentication/authorization
- ✅ Test on different screen sizes
- ❌ Don't skip edge case testing

---

## Common Pitfalls to Avoid

### 1. Skipping i18n
❌ **Don't**: Hardcode English text, plan to "add translations later"
✅ **Do**: Add i18n keys immediately when adding user-facing text

### 2. Weak Authentication
❌ **Don't**: Trust client-side checks only
✅ **Do**: Always verify session server-side

### 3. No Error Handling
❌ **Don't**: Assume operations always succeed
✅ **Do**: Handle errors gracefully with user-friendly messages

### 4. Mixed Commits
❌ **Don't**: Commit feature + bug fix + refactoring in one commit
✅ **Do**: Create separate commits for each logical change

### 5. Skipping Code Review
❌ **Don't**: Commit without review for "simple" changes
✅ **Do**: Use code-reviewer agent even for small changes

---

## Measuring Success

A well-implemented feature should:
- [ ] Work correctly in production
- [ ] Have no security vulnerabilities
- [ ] Support all required locales
- [ ] Be properly authenticated/authorized
- [ ] Have clean, readable code
- [ ] Have clear commit history
- [ ] Be documented (if complex)
- [ ] Handle errors gracefully
- [ ] Be tested thoroughly
- [ ] Match existing patterns

---

## Resources

- [Posterns MVP Agent System](.claude/agents/README.md)
- [Commit Patterns Skill](.claude/skills/commit-patterns/SKILL.md)
- [Auth Patterns Skill](.claude/skills/auth-patterns/SKILL.md)
- [CLAUDE.md Project Documentation](../CLAUDE.md)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Last Updated**: 2026-01-02
**Workflow Version**: 1.0
