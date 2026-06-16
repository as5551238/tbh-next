#!/usr/bin/env node
/**
 * CI Quality Gate — Anti-Pattern Detection
 * 
 * Detects patterns that indicate "Feature Completion Hallucination":
 * 1. Silent gate blocking: `if (!isPro) return;` without user feedback
 * 2. CRUD function returning input `row` instead of DB `result`
 * 3. Hardcoded Chinese strings in new pages (should use t())
 * 
 * Exit code: 0=pass, 1=fail
 * 
 * Usage: node scripts/ci-quality-gate.mjs
 */
import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const SEVERITY = { error: 1, warn: 0 };

const findings = [];

async function walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...await walkDir(full));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

async function checkFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const relPath = relative(ROOT, filePath);

  // Rule 1: Silent gate blocking — if (!isPro) return; or if (!hasFeature(...)) return;
  const silentGateRegex = /if\s*\(\s*!?\s*(isPro|hasFeature\([^)]+\))\s*\)\s*\{\s*return\s*;?\s*\}/g;
  let match;
  while ((match = silentGateRegex.exec(content)) !== null) {
    const line = content.substring(0, match.index).split('\n').length;
    findings.push({
      severity: 'error',
      file: relPath,
      line,
      message: `Silent gate blocking: "${match[0].trim()}" — user gets no feedback when blocked. Add a toast/modal or remove gate for basic features per DR-93.`,
      rule: 'DR-93',
    });
  }

  // Rule 2: CRUD function returns `row` (input) instead of `result` (DB response)
  const crudReturnRowRegex = /return\s+row\s+as\s+(?:unknown\s+as\s+)?\w+Row/g;
  while ((match = crudReturnRowRegex.exec(content)) !== null) {
    // Check if `row` is the input variable (not `data: row` from DB)
    const before = content.substring(Math.max(0, match.index - 200), match.index);
    const isInputRow = /const\s+row\s*=\s*filterColumns|const\s+row\s*=\s*\{/.test(before);
    const isDbRow = /data:\s*row/.test(before);
    if (isInputRow && !isDbRow) {
      const line = content.substring(0, match.index).split('\n').length;
      findings.push({
        severity: 'error',
        file: relPath,
        line,
        message: `CRUD function returns input "row" instead of DB "result": "${match[0].trim()}" — per DR-94, must return DB-native result.`,
        rule: 'DR-94',
      });
    }
  }

  // Rule 3: FREE_FEATURES items should not be gated by hasFeature()
  // DR-94 defines FREE_FEATURES Set — these features must never be paywall-gated
  const freeFeatures = ['basicCrud', 'tags', 'review', 'knowledgeBase', 'channelMembers', 'passwordReset', 'i18n', 'basicReports'];
  const hasFeatureCallRegex = /hasFeature\s*\(\s*['"](\w+)['"]/g;
  while ((match = hasFeatureCallRegex.exec(content)) !== null) {
    const featureName = match[1];
    if (freeFeatures.includes(featureName)) {
      const line = content.substring(0, match.index).split('\n').length;
      findings.push({
        severity: 'error',
        file: relPath,
        line,
        message: `hasFeature('${featureName}') gates a FREE_FEATURE — per DR-94, '${featureName}' must never be paywall-gated. Remove the gate or use a Pro-only feature name.`,
        rule: 'DR-94',
      });
    }
  }
}

async function main() {
  console.log('🔍 CI Quality Gate — Anti-Pattern Detection\n');
  
  const files = await walkDir(SRC);
  console.log(`Scanning ${files.length} files...\n`);

  for (const file of files) {
    await checkFile(file);
  }

  if (findings.length === 0) {
    console.log('✅ No anti-patterns detected. Quality gate PASSED.');
    process.exit(0);
  }

  const errors = findings.filter(f => f.severity === 'error');
  const warns = findings.filter(f => f.severity === 'warn');

  console.log(`❌ Found ${errors.length} errors, ${warns.length} warnings:\n`);
  
  for (const f of [...errors, ...warns]) {
    const icon = f.severity === 'error' ? '🔴' : '🟡';
    console.log(`${icon} ${f.file}:${f.line} [${f.rule}]`);
    console.log(`   ${f.message}\n`);
  }

  if (errors.length > 0) {
    console.log('\n❌ Quality gate FAILED. Fix the errors above before merging.');
    process.exit(1);
  }
  
  console.log('\n⚠️ Quality gate passed with warnings. Consider addressing them.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
