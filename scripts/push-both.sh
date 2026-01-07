#!/bin/bash
set -e

echo ""
echo "==================================="
echo "  Push to BOTH Editions"
echo "==================================="
echo ""
echo "This will:"
echo "  1. Push current changes to Commercial (origin/main)"
echo "  2. Sync code to Community Edition"
echo "  3. Commit and push to Community (public/public-release)"
echo "  4. Return to main branch"
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

# Step 1: Push to Commercial
echo ""
echo "Step 1: Pushing to Commercial (origin/main)..."
git push origin main

# Get commit for sync message
main_commit=$(git rev-parse --short HEAD)

# Step 2: Run sync script
echo ""
echo "Step 2: Syncing to Community Edition..."
./sync-to-community.sh

# Step 3: Ensure all changes are committed (sync script should do this, but be safe)
echo ""
echo "Step 3: Verifying all changes are committed..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "  Found uncommitted changes, committing..."
    git add -A
    git commit -m "Sync from commercial ($main_commit)" || true
else
    echo "  All changes already committed"
fi

# Step 4: Push to Community
echo ""
echo "Step 4: Pushing to Community (public/public-release)..."
git push public public-release

# Step 5: Return to main (stash any leftover changes just in case)
echo ""
echo "Step 5: Returning to main branch..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "  Stashing unexpected uncommitted changes..."
    git stash
fi
git checkout main

echo ""
echo "==================================="
echo "  Done! Both editions updated."
echo "==================================="
echo ""
