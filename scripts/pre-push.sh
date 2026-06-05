#!/bin/bash
# Pre-push hook: run local CI before pushing
# Install: cp scripts/pre-push.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

echo "Running pre-push CI checks..."
bash scripts/ci-local.sh
if [ $? -ne 0 ]; then
  echo "❌ CI checks failed! Push aborted."
  exit 1
fi
echo "✅ Pre-push checks passed. Pushing..."
exit 0
