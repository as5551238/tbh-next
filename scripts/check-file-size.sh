#!/bin/bash
# DR-28: Single file line count CI gate
# Usage: bash scripts/check-file-size.sh
# Fails if any .ts/.tsx file exceeds 800 lines

MAX_LINES=800
VIOLATIONS=0

while IFS= read -r file; do
  lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "VIOLATION: $file is $lines lines (max $MAX_LINES)"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(find src/ -name '*.ts' -o -name '*.tsx' | grep -v node_modules | grep -v '.test.')

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "FAIL: $VIOLATIONS file(s) exceed ${MAX_LINES}-line limit (DR-28)"
  exit 1
else
  echo "PASS: All source files within ${MAX_LINES}-line limit"
  exit 0
fi
