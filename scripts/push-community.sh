#!/bin/bash
set -e

echo ""
echo "==================================="
echo "  Push to Community Edition ONLY"
echo "==================================="
echo ""

# Ensure we're on public-release
current_branch=$(git branch --show-current)
if [ "$current_branch" != "public-release" ]; then
    echo "ERROR: You must be on the public-release branch."
    echo "Currently on: $current_branch"
    echo ""
    echo "To switch: git checkout public-release"
    exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "You have uncommitted changes. Commit them first:"
    git status --short
    exit 1
fi

echo "Pushing to Community (public/public-release)..."
git push public public-release

echo ""
echo "Done! Community Edition updated."
echo ""
echo "WARNING: These changes may be overwritten if you run push-both.sh later."
echo ""
