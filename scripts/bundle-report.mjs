/**
 * Bundle Size Report — monitors production build output sizes
 * Run: node scripts/bundle-report.mjs
 * CI: Fails if any chunk exceeds size thresholds
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST = join(import.meta.dirname, '..', 'dist', 'assets');

// Size thresholds (in KB) — fail CI if exceeded
const THRESHOLDS = {
  'index': 320,     // Main bundle (includes Tailwind runtime)
  'vendor': 260,    // Vendor (React, Router, etc.)
  'supabase': 220,  // Supabase client
  'collab': 80,     // Collab interface
  'personalAI': 130, // Personal AI interface
  'workspace': 15,   // Workspace shell (lazy loaded modules are separate chunks)
  'default': 25,    // Default per-chunk threshold
};

function getChunkType(name) {
  for (const [key, _] of Object.entries(THRESHOLDS)) {
    if (name.toLowerCase().startsWith(key.toLowerCase())) return key;
  }
  return 'default';
}

function formatKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

try {
  const files = readdirSync(DIST)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const stat = statSync(join(DIST, f));
      const type = getChunkType(f.replace(/-[A-Za-z0-9]+\.js$/, ''));
      const threshold = THRESHOLDS[type];
      return { name: f, size: stat.size, type, threshold, passed: stat.size / 1024 <= threshold };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\n=== Bundle Size Report ===\n');
  console.log('Chunk'.padEnd(45) + 'Size'.padEnd(12) + 'Threshold'.padEnd(12) + 'Status');
  console.log('-'.repeat(80));

  let failed = 0;
  for (const f of files) {
    const status = f.passed ? '✓' : '✗ OVER';
    if (!f.passed) failed++;
    console.log(
      f.name.padEnd(45) +
      formatKB(f.size).padEnd(12) +
      (f.threshold + ' KB').padEnd(12) +
      status
    );
  }

  // Summary
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const jsChunks = files.length;
  console.log('-'.repeat(80));
  console.log(`Total: ${formatKB(totalSize)} across ${jsChunks} JS chunks`);

  if (failed > 0) {
    console.log(`\n✗ ${failed} chunk(s) exceed size threshold!`);
    process.exit(1);
  } else {
    console.log('\n✓ All chunks within size thresholds');
    process.exit(0);
  }
} catch (err) {
  console.error('Error reading dist/assets:', err.message);
  console.error('Run `pnpm build` first');
  process.exit(1);
}
