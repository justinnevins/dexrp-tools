#!/bin/bash

# DEXrp Community Edition Sync Script
# This script syncs changes from the main (Commercial) branch to the public-release (Community) branch
# while preserving the community edition configuration.

set -e

echo "=== DEXrp Community Edition Sync Script ==="
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Warning: You are on '$CURRENT_BRANCH' branch, not 'main'."
    echo "This script is designed to run from the main branch."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Store the current commit for reference
SOURCE_COMMIT=$(git rev-parse --short HEAD)
echo "Source commit: $SOURCE_COMMIT"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

echo ""
echo "Switching to public-release branch..."
git checkout public-release

# Pull latest changes
echo "Pulling latest changes..."
git pull origin public-release || true

# Merge from main (this will bring in all changes)
echo ""
echo "Merging changes from main branch..."
git merge main -m "Sync with main branch (commit $SOURCE_COMMIT)" --no-edit || {
    echo ""
    echo "Merge conflicts detected. Please resolve them manually."
    echo "After resolving conflicts, make sure to restore the community edition index.ts:"
    echo ""
    echo "  The file client/src/edition/index.ts should contain:"
    echo "  export const EDITION = 'community' as const;"
    echo "  export { default } from './community';"
    echo ""
    exit 1
}

# Restore the community edition index.ts (create directory if needed)
echo "Restoring community edition configuration..."
mkdir -p client/src/edition
cat > client/src/edition/index.ts << 'EOF'
export const EDITION = 'community' as const;
export { default } from './community';
EOF

# Copy stub files to replace real implementations
echo "Copying stub files for Community Edition..."

# Copy stub hooks
if [ -f "client/src/edition/stubs/useAuth.ts" ]; then
    cp client/src/edition/stubs/useAuth.ts client/src/hooks/useAuth.ts
    echo "  - Copied useAuth.ts stub"
fi

if [ -f "client/src/edition/stubs/useSubscription.ts" ]; then
    cp client/src/edition/stubs/useSubscription.ts client/src/hooks/useSubscription.ts
    echo "  - Copied useSubscription.ts stub"
fi

if [ -f "client/src/edition/stubs/useSync.ts" ]; then
    cp client/src/edition/stubs/useSync.ts client/src/hooks/useSync.ts
    echo "  - Copied useSync.ts stub"
fi

# Copy stub sync-manager
if [ -f "client/src/edition/stubs/sync-manager.ts" ]; then
    cp client/src/edition/stubs/sync-manager.ts client/src/lib/sync-manager.ts
    echo "  - Copied sync-manager.ts stub"
fi

# Copy stub sync-context
if [ -f "client/src/edition/stubs/sync-context.tsx" ]; then
    cp client/src/edition/stubs/sync-context.tsx client/src/contexts/sync-context.tsx
    echo "  - Copied sync-context.tsx stub"
fi

# Copy stub server files
if [ -f "client/src/edition/stubs/server/auth.ts" ]; then
    cp client/src/edition/stubs/server/auth.ts server/auth.ts
    echo "  - Copied server/auth.ts stub"
fi

if [ -f "client/src/edition/stubs/server/stripeService.ts" ]; then
    cp client/src/edition/stubs/server/stripeService.ts server/stripeService.ts
    echo "  - Copied server/stripeService.ts stub"
fi

if [ -f "client/src/edition/stubs/server/stripeClient.ts" ]; then
    cp client/src/edition/stubs/server/stripeClient.ts server/stripeClient.ts
    echo "  - Copied server/stripeClient.ts stub"
fi

# Check if any files were changed and commit if needed
if ! git diff --quiet 2>/dev/null; then
    echo "Committing community edition configuration..."
    git add -A
    git commit -m "Restore community edition configuration and stubs" || true
fi

echo ""
echo "=== Sync Complete ==="
echo ""
echo "The public-release branch has been updated with changes from main."
echo "The community edition configuration has been preserved."
echo ""
echo "Next steps:"
echo "1. Review the changes: git log --oneline -5"
echo "2. Test the application: npm run dev"
echo "3. Push to remote: git push origin public-release"
echo ""
echo "To return to main branch: git checkout main"
