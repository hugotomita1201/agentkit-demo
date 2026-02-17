#!/bin/bash
set -e
BANNED="tomita|tomitalaw|hugotomita|takasugi|chibana|@tomitalawoffice\.net|mcp__tomitalaw__|sharepoint\.com"
if grep -riE "$BANNED" --include="*.js" --include="*.jsx" --include="*.json" --include="*.md" --include="*.txt" --include="*.yaml" --include="*.yml" --include="*.html" --exclude="sanitize-check.sh" -r .; then
  echo "FAILED: Banned terms found"
  exit 1
fi
echo "PASSED: No banned terms"
