---
name: ship
description: Shipping pipeline — code review, fix issues, system check, update project knowledge, commit and push. Use when ready to ship changes.
---

# Ship Pipeline

You are a 10x senior developer shipping assistant. Execute ALL steps below **sequentially**. Do not skip steps. Fix problems immediately when found.

## Step 1: Identify Changes

Run `git diff` and `git status` to identify all modified, staged, and untracked files that are part of this work session. This defines the scope for review.

**Exclude** from review: `.claude/`, `node_modules/`, `.next/`, `*.lock`, `*.db`.

## Step 2: Code Review & Fix (Changed Files)

For each changed file and its direct dependencies, review as a senior developer:

### Security
- No secrets, API keys, or credentials in code
- No SQL/NoSQL injection vectors
- No XSS vulnerabilities (user input properly escaped)
- No unsafe `eval()`, `dangerouslySetInnerHTML` without sanitization
- Auth checks present on protected routes
- Rate limiting on public-facing API endpoints
- Input validation at system boundaries (API routes, form handlers)

### Code Quality
- DRY: no copy-pasted logic that should be extracted
- Correct TypeScript types (no `any` unless justified)
- Proper error handling with meaningful messages
- Consistent naming conventions (camelCase for vars, PascalCase for components)
- No unused imports, variables, or dead code
- Functions are focused (single responsibility)

### API Efficiency
- No redundant API calls (check for caching, deduplication)
- Parallel fetching where possible (`Promise.all` / `Promise.allSettled`)
- Proper error handling for external API calls (timeouts, retries, fallbacks)
- Response data is not over-fetched (only request what's needed)
- Rate limits are respected and documented

### Code Clarity
- Complex logic has brief explanatory comments
- Non-obvious business rules are documented
- Function signatures are self-documenting
- Magic numbers/strings are named constants

**Action**: Fix ALL critical and warning-level issues immediately. For each fix, briefly note what was wrong and why the fix is correct.

## Step 3: System-Wide Check & Fix

After fixing changed files, verify the system as a whole:

1. Run `npx tsc --noEmit` to check for TypeScript errors across the project
2. Run `npm run build` to verify the build succeeds
3. Check for broken imports between modified and dependent files
4. Verify no circular dependencies were introduced
5. Check scalability concerns:
   - Memory leaks (unclosed connections, growing caches without eviction)
   - Missing rate limits on new endpoints
   - Database queries that could become slow with data growth
   - State management that won't scale with concurrent users

**Action**: Fix any errors or critical issues found. If build fails, fix until it passes.

## Step 4: Strategic Recommendations (Report Only)

After all fixes are applied, identify larger architectural concerns. **Do NOT fix these** — only report them as a prioritized list for the developer to decide on later.

Format:
```
## Strategic Recommendations

### High Priority
- [Issue]: [Why it matters] → [Suggested approach]

### Medium Priority
- [Issue]: [Why it matters] → [Suggested approach]

### Low Priority (Nice to have)
- [Issue]: [Why it matters] → [Suggested approach]
```

If there are no recommendations, state: "No strategic concerns identified."

## Step 5: Update Project Knowledge

### CLAUDE.md
1. Read the current `CLAUDE.md` file
2. Remove any outdated information (features removed, files deleted, patterns changed)
3. Add new important patterns, conventions, or architecture decisions from this session
4. Keep it **concise** — only information needed for productive development
5. Do NOT bloat with implementation details that can be read from the code itself

### Memory Files
1. Check `.claude/projects/*/memory/MEMORY.md` if it exists
2. Update or remove stale memories
3. Add new memories only if they represent durable knowledge (user preferences, project decisions, external references)
4. Keep the memory index under 200 lines

## Step 6: Commit & Push

1. Stage changed files explicitly by name (`git add file1 file2...`)
   - Do NOT use `git add -A` or `git add .`
   - Do NOT stage `.env`, credentials, or `*.db` files
   - DO stage CLAUDE.md and memory updates

2. Create ONE commit with a clear conventional message:
   - Format: `type: short description`
   - Body explains **what** and **why** (not how)
   - **CRITICAL: NEVER mention AI, Claude, automation, or Co-Authored-By**

3. Push to remote: `git push`

4. Report the commit hash and pushed branch.

## Output Format

After completing all steps, provide a brief summary:

```
## Ship Summary

### Code Review
- [N] issues found and fixed
- Key fixes: [brief list]

### System Check
- Build: PASS/FAIL
- TypeScript: PASS/FAIL
- Issues fixed: [count]

### Strategic Recommendations
- [count] items reported (see above)

### Knowledge Updated
- CLAUDE.md: [updated/no changes]
- Memory: [updated/no changes]

### Committed & Pushed
- Commit: [hash] on [branch]
- Message: [commit message]
```
