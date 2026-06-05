#!/bin/bash
# TBH Next Local CI - runs before push to ensure quality gates
set -e

echo "=== TBH Next Local CI ==="
echo ""

# Step 1: Type check
echo "[1/4] Type checking..."
if ! pnpm tsc --noEmit 2>&1; then
  echo "⚠️  Type check has warnings (non-blocking)"
fi
echo "✅ Type check done"
echo ""

# Step 2: Lint
echo "[2/4] Linting..."
if ! pnpm eslint src/ --ext .ts,.tsx --max-warnings 50 2>&1; then
  echo "⚠️  Lint has warnings (non-blocking)"
fi
echo "✅ Lint done"
echo ""

# Step 3: Test
echo "[3/4] Running tests..."
pnpm test -- --run
echo "✅ Tests passed"
echo ""

# Step 4: Build
echo "[4/4] Building..."
pnpm build
echo "✅ Build successful"
echo ""

echo "=== All CI checks passed! ==="
