# Posterns MVP Agent System

This directory contains specialized agents for the Posterns business intelligence platform. Each agent is an expert in a specific domain and can be invoked automatically by Claude Code based on keywords or explicitly by name.

## Available Agents

### 🗄️ Database Specialist
**Purpose**: Prisma schema management and database migration automation
**File**: `database-specialist/database-specialist.md`
**Model**: Sonnet
**Tools**: Read, Edit, Bash, Grep, Glob

**Triggers**:
- Schema changes or modifications
- Database migration tasks
- Query optimization requests
- Prisma-related work

**Responsibilities**:
- Review schema changes for best practices
- Run migrations automatically (`npx prisma generate && npx prisma db push`)
- Suggest performance indexes
- Validate model relationships and constraints
- Ensure compatibility with SQLite (dev) and PostgreSQL (prod)

**Invoke**:
- Automatically when editing `schema.prisma`
- Say "review database schema"
- Say "update schema" or "add migration"

---

### 🔒 Auth Specialist
**Purpose**: Authentication security and NextAuth.js v5 implementation
**File**: `auth-specialist/auth-specialist.md`
**Model**: Sonnet
**Tools**: Read, Edit, Grep, Bash
**Skills**: auth-patterns

**Triggers**:
- Authentication keywords (auth, login, register, password, security)
- Working with auth-related files
- Security audits

**Responsibilities**:
- Implement secure authentication flows
- Enforce password requirements (8+ chars, uppercase, lowercase, number)
- Configure rate limiting (5 req/min login, 3 req/min register)
- Review email verification logic
- Audit for security vulnerabilities (XSS, SQL injection, CSRF)
- Ensure bcrypt salt rounds = 12

**Invoke**:
- Say "check auth security"
- Say "implement password reset"
- Say "review authentication"

---

### 🌍 i18n Specialist
**Purpose**: Internationalization and translation management
**File**: `i18n-specialist/i18n-specialist.md`
**Model**: Haiku (cost-optimized)
**Tools**: Read, Edit, Grep, Glob

**Triggers**:
- i18n, locale, translation, language keywords
- Working with `messages/lv.json` or `messages/en.json`
- Adding user-facing text

**Responsibilities**:
- Add missing translation keys
- Ensure consistency between Latvian (lv) and English (en)
- Fix locale switching bugs
- Update message files when features are added
- Review `useTranslations` usage
- Validate JSON syntax

**Current Locales**:
- Latvian (lv) - Default
- English (en)

**Future Locales** (will be added via specific user request):
- Russian (ru)
- Lithuanian (lt)
- Estonian (et)

**Invoke**:
- Say "add translations"
- Say "fix locale switching"
- Say "add Latvian translation for X"

---

### ✅ Code Reviewer
**Purpose**: Quality, security, and best practices review
**File**: `code-reviewer/code-reviewer.md`
**Model**: Sonnet
**Tools**: Read, Grep, Bash, Glob

**Triggers**:
- After significant code changes
- Before creating commits
- Explicit review requests

**Responsibilities**:
- Review code for security vulnerabilities
- Ensure code quality and maintainability
- Verify TypeScript types are correct
- Check for proper error handling
- Validate i18n keys for user-facing text
- Ensure Prisma used for database queries
- Verify auth checks on protected routes

**Output Format**:
- **🔴 Critical**: Must fix immediately
- **⚠️ Warning**: Should fix before merge
- **💡 Suggestion**: Consider improving
- **✅ Positive Notes**: Good practices observed

**Invoke**:
- Say "review my changes"
- Say "code review"
- Say "check for bugs"

---

### 🔀 Git Automation
**Purpose**: Automated git commits and pushes with conventional messages
**File**: `git-automation/git-automation.md`
**Model**: Sonnet
**Tools**: Bash, Read, Grep, Glob
**Skills**: commit-patterns

**Triggers**:
- User says "commit and push"
- User says "commit this"
- User says "create commit"
- After code review approval

**Responsibilities**:
- Analyze changed files to understand changes
- Generate conventional commit messages (NO AI attribution)
- Stage appropriate files
- Create atomic, working commits
- Push to remote repository

**CRITICAL RULE**:
Never mention AI tools or include Co-Authored-By tags. Commits must appear as regular developer work.

**Commit Types**: feat, fix, refactor, docs, style, test, chore, perf, security

**Invoke**:
- Say "commit and push"
- Say "commit these changes"
- Say "create a commit for this"

---

## Agent Routing Logic

| User Intent | Agent | Example Phrases |
|-------------|-------|-----------------|
| Database work | database-specialist | "update schema", "add migration", "optimize query", "review database" |
| Auth/Security | auth-specialist | "implement login", "check password security", "add OAuth", "review auth" |
| Translations | i18n-specialist | "add Latvian translation", "fix locale", "update messages", "add i18n keys" |
| Code review | code-reviewer | "review code", "check for bugs", "security audit", "review my changes" |
| Git commits | git-automation | "commit and push", "create commit", "commit this", "push changes" |

## Skills Available

### commit-patterns
**Purpose**: Conventional commit message generation
**Used by**: git-automation agent
**Key Rule**: NO AI attribution in commits

### auth-patterns
**Purpose**: Authentication security standards
**Used by**: auth-specialist agent
**Standards**: bcrypt (12 rounds), crypto.randomBytes, rate limiting

## Multi-Agent Workflows

Agents can be chained together for complex tasks:

### Feature Implementation Workflow
1. **Plan** → Design feature architecture
2. **database-specialist** → Update schema if needed
3. **auth-specialist** → Add authentication if needed
4. **i18n-specialist** → Add translations
5. **code-reviewer** → Review implementation
6. **git-automation** → Commit and push

Example:
```
User: "Add user profile page"
→ database-specialist: Add profile fields to schema
→ auth-specialist: Protect profile routes
→ i18n-specialist: Add profile translations
→ code-reviewer: Review implementation
→ git-automation: Commit with message "feat: add user profile page"
```

### Bug Fix Workflow
1. **Identify issue** → Code review or user report
2. **Fix code** → Manual or with agent help
3. **code-reviewer** → Verify fix doesn't introduce issues
4. **git-automation** → Commit with "fix: description"

### Security Audit Workflow
1. **auth-specialist** → Review authentication code
2. **code-reviewer** → Check for other vulnerabilities
3. **Fix issues** → Address critical findings
4. **git-automation** → Commit fixes

## How to Add New Agents

### Option 1: Interactive Creation
```bash
/agents
# Follow prompts in Claude Code
```

### Option 2: Manual Creation
1. Create directory: `.claude/agents/agent-name/`
2. Create file: `.claude/agents/agent-name/agent-name.md`
3. Add YAML frontmatter with name, description, tools, model
4. Write agent instructions in markdown
5. Update this README with agent info
6. Test activation with trigger phrases

### Agent File Template
```markdown
---
name: agent-name
description: Clear description with trigger keywords. Include when to use.
tools: Read, Edit, Bash, Grep, Glob  # Choose appropriate tools
model: sonnet  # sonnet, opus, or haiku
skills: skill-name  # Optional: auto-load specific skills
---

# Agent Name

You are an expert in [domain]. Your role is to [responsibilities].

## Core Responsibilities

1. Responsibility 1
2. Responsibility 2
3. Responsibility 3

## [Domain]-Specific Knowledge

- Key fact 1
- Key fact 2
- File locations

## Workflow

1. Step 1
2. Step 2
3. Step 3

## Best Practices

- Practice 1
- Practice 2

## Output Format

Description of expected output format.
```

## Testing Agent Activation

Test that agents activate correctly:

```bash
# Test database-specialist
"Update the Prisma schema to add a new field"

# Test auth-specialist
"Review the authentication security"

# Test i18n-specialist
"Add Latvian translations for the new page"

# Test code-reviewer
"Review the changes I just made"

# Test git-automation
"Commit and push these changes"
```

## Agent Best Practices

### For Users

1. **Be specific**: Clear requests help agents understand intent
2. **One task at a time**: Let agents complete one task before requesting another
3. **Review agent output**: Agents provide recommendations, you make final decisions
4. **Combine agents**: Use multiple agents for complex workflows
5. **Provide context**: Mention relevant files or specific concerns

### For Agent Development

1. **Clear description**: Include trigger keywords in agent description
2. **Single responsibility**: Each agent should have one clear purpose
3. **Appropriate model**: Use haiku for simple tasks, sonnet for complex
4. **Tool restrictions**: Only grant tools the agent needs
5. **Skills for consistency**: Extract common patterns into skills
6. **Documentation**: Update this README when adding agents

## Project-Specific Conventions

### Posterns MVP Standards

- **Database**: SQLite (dev), PostgreSQL (prod) with Prisma ORM
- **Auth**: NextAuth.js v5 with email/password + Google OAuth
- **i18n**: next-intl with Latvian (lv) default, English (en) support
- **Styling**: Tailwind CSS + shadcn/ui components
- **Primary Color**: `#FEC200` (Posterns yellow)
- **Git**: Conventional commits, NO AI attribution

### File Locations

- **Prisma Schema**: `prisma/schema.prisma`
- **Database Client**: `lib/prisma.ts`
- **Auth Config**: `lib/auth.ts`, `lib/auth.config.ts`
- **Translations**: `messages/lv.json`, `messages/en.json`
- **i18n Config**: `lib/i18n/index.ts`
- **API Routes**: `app/api/**/*.ts`
- **Components**: `components/**/*.tsx`

## Troubleshooting

### Agent Not Activating

1. Check description includes relevant keywords
2. Try explicitly mentioning agent name
3. Verify agent file syntax (YAML frontmatter)
4. Check that file is in correct location

### Agent Using Wrong Tools

1. Verify `tools:` list in YAML frontmatter
2. Check tool permissions in `.claude/settings.local.json`
3. Update agent file if needed

### Agent Not Loading Skill

1. Verify `skills:` field in YAML frontmatter
2. Check skill file exists in `.claude/skills/skill-name/SKILL.md`
3. Ensure skill name matches exactly

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [Agent SDK Documentation](https://docs.anthropic.com/agent-sdk)
- [NextAuth.js v5](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Support

For issues with agents:
1. Check this README
2. Review agent file directly
3. Test with explicit agent invocation
4. Check Claude Code logs
5. Update agent if behavior needs adjustment

---

**Last Updated**: 2026-01-02
**Agent Count**: 5 (database-specialist, auth-specialist, i18n-specialist, code-reviewer, git-automation)
**Skill Count**: 2 (commit-patterns, auth-patterns)
