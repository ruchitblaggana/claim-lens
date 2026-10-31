#!/usr/bin/env node
/*
 * ClaimLens build script — copies the extension directory into a clean
 * distributable folder and creates a ZIP archive.
 *
 * Usage:  node extension/tools/build.js
 * Output: extension/dist/claimlens/  (loadable unpacked extension)
 *         extension/dist/claimlens-v1.0.0.zip  (distributable archive)
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = join(__dirname, '..');
const distDir = join(extRoot, 'dist');
const outDir = join(distDir, 'claimlens');

// Files to include in the built extension (excluding dev-only files)
const EXCLUDE = new Set([
  'dist',
  'test',
  'tools',
  'node_modules',
  '.DS_Store',
  'README.md',
]);

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      copyFileSync(s, d);
      console.log('  copied:', relative(extRoot, s));
    }
  }
}

console.log('Building ClaimLens extension…');

// clean dist
if (existsSync(outDir)) {
  execSync(`rm -rf "${outDir}"`);
}
mkdirSync(outDir, { recursive: true });

// copy extension files
copyDir(extRoot, outDir);

// verify manifest
const manifestPath = join(outDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
console.log('\nManifest verified:');
console.log('  name:', manifest.name);
console.log('  version:', manifest.version);
console.log('  manifest_version:', manifest.manifest_version);
console.log('  permissions:', manifest.permissions.join(', '));

// create zip
const zipPath = join(distDir, `claimlens-v${manifest.version}.zip`);
if (existsSync(zipPath)) execSync(`rm -f "${zipPath}"`);

try {
  execSync(`cd "${outDir}" && zip -r "${zipPath}" . -x ".*"`, { stdio: 'pipe' });
  console.log(`\nZIP created: ${relative(extRoot, zipPath)}`);
} catch {
  console.log('\nZIP creation skipped (zip command not available).');
  console.log('To create a ZIP manually:');
  console.log(`  cd "${outDir}" && zip -r ../claimlens-v${manifest.version}.zip .`);
}

console.log(`\nBuild complete! Load unpacked from:`);
console.log(`  ${outDir}`);
