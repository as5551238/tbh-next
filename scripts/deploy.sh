#!/usr/bin/env bash
# TBH-Next Deploy Script — builds and deploys to gh-pages branch
# Usage: bash scripts/deploy.sh
# Prerequisites: pnpm, git, push access to repo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== TBH-Next Deploy ==="

# 1. Build
echo "[1/4] Building for GitHub Pages..."
GH_PAGES=1 pnpm build

# 2. Save dist to temp
echo "[2/4] Copying dist..."
rm -rf /tmp/tbh-next-deploy
cp -r dist /tmp/tbh-next-deploy

# 3. Switch to gh-pages branch
echo "[3/4] Switching to gh-pages..."
git stash --include-untracked -q 2>/dev/null || true
git checkout gh-pages -q

# 4. Replace all files with dist content
echo "[4/4] Deploying..."
# Remove old files (keep .git)
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
cp -r /tmp/tbh-next-deploy/* .
rm -rf /tmp/tbh-next-deploy

git add -A
git commit -m "deploy: $(date +%Y-%m-%d-%H%M)" --no-verify -q
git push origin gh-pages --force --no-verify

# Return to main
git checkout main -q
git stash pop -q 2>/dev/null || true

echo ""
echo "=== Deploy Complete ==="
echo "Site: https://as5551238.github.io/tbh-next/"
