#!/bin/bash
set -e

# Banned terms: real client data, internal emails, production MCP servers, internal names
# NOTE: "TomitaLaw AI" as a brand name IS allowed — only raw identifiers are banned.
BANNED="hugotomita|@tomitalawoffice\.net|mcp__tomitalaw__|sharepoint\.com|erikohiga|tomitalawoffice"

if grep -riE "$BANNED" --include="*.js" --include="*.jsx" --include="*.json" --include="*.md" --include="*.txt" --include="*.yaml" --include="*.yml" --include="*.html" --exclude="sanitize-check.sh" --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir=".git" -r .; then
  echo "FAILED: Banned terms found"
  exit 1
fi
echo "PASSED: No banned terms"
