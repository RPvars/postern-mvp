#!/bin/bash
# Pre-commit secret detection script
# Scans staged files for accidentally committed secrets

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FOUND=0

# Get staged file contents (only what's being committed)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Skip files that are gitignored (like .env)
for file in $STAGED_FILES; do
  # Skip binary files
  if file "$file" | grep -q "binary"; then
    continue
  fi

  # Skip certificate/key files (shouldn't be staged, but just in case)
  case "$file" in
    *.pfx|*.p12|*.key|*.pem|*.cer|*.p7b)
      echo -e "${RED}BLOCKED:${NC} Certificate/key file staged: $file"
      echo "  Remove with: git reset HEAD $file"
      FOUND=1
      continue
      ;;
  esac

  CONTENT=$(git show ":$file" 2>/dev/null)

  # Check for hardcoded BR_ env values (not placeholders)
  if echo "$CONTENT" | grep -qE 'BR_(CERTIFICATE_PASSWORD|CONSUMER_SECRET)\s*=\s*"[^"]*[A-Za-z0-9]{8}' | grep -vq 'your-'; then
    echo -e "${RED}BLOCKED:${NC} Possible hardcoded BR credential in $file"
    FOUND=1
  fi

  # Generic secret patterns in non-.env files
  # Look for inline passwords/secrets (key=value with high entropy)
  if echo "$CONTENT" | grep -qiE '(password|secret|private.?key)\s*[:=]\s*["`'"'"'][A-Za-z0-9+/=_\-]{16,}["`'"'"']'; then
    # Allow known safe patterns
    if ! echo "$CONTENT" | grep -q "your-password\|your-secret\|your-certificate-password\|your-consumer"; then
      echo -e "${YELLOW}WARNING:${NC} Possible secret in $file"
      echo "  Review the password/secret values before committing"
      echo "  If intentional (e.g., placeholder), ignore this warning"
      FOUND=1
    fi
  fi
done

if [ $FOUND -ne 0 ]; then
  echo ""
  echo -e "${RED}Commit blocked: secrets detected in staged files${NC}"
  echo "Fix the issues above, then try again."
  echo "To bypass (emergency only): git commit --no-verify"
  exit 1
fi

exit 0
