#!/bin/bash
# Pre-push hook: DR-38 CI Quality Gate (local mirror of .github/workflows/ci.yml)
# Install: cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

set -e

echo "=== DR-38 CI Quality Gate (local) ==="
echo ""

echo "[1/5] Installing dependencies..."
pnpm install --frozen-lockfile
echo "✅ Dependencies installed"
echo ""

echo "[2/5] Building (quality gate - must pass)..."
pnpm build
echo "✅ Build successful"
echo ""

echo "[3/5] Running unit tests..."
pnpm test -- --run
echo "✅ Tests passed"
echo ""

echo "[4/5] Type checking (non-blocking)..."
if ! pnpm tsc --noEmit 2>&1; then
  echo "⚠️  Type check has warnings (non-blocking, matches CI)"
fi
echo "✅ Type check done"
echo ""

echo "[5/5] Linting (non-blocking)..."
if ! pnpm lint --max-warnings=0 2>&1; then
  echo "⚠️  Lint has warnings (non-blocking, matches CI)"
fi
echo "✅ Lint done"
echo ""

echo "[6/7] File size check (DR-28)..."
bash scripts/check-file-size.sh
echo ""

echo "[7/7] Bundle size check..."
node scripts/bundle-report.mjs
echo ""

echo "=== All DR-38 CI checks passed! ==="
exit 0
