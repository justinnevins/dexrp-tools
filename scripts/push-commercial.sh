#!/bin/bash
set -e

echo ""
echo "==================================="
echo "  Push to Commercial Edition ONLY"
echo "==================================="
echo ""

# Ensure we're on main
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "ERROR: You must be on the main branch."
    echo "Currently on: $current_branch"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "You have uncommitted changes. Commit them first:"
    git status --short
    exit 1
fi

echo "Pushing to Commercial (origin/main)..."
git push origin main

echo ""
echo "Done! Commercial Edition updated."
echo ""
echo "Note: Community Edition was NOT updated."
echo "Run ./scripts/push-both.sh later to sync to Community."
echo ""
