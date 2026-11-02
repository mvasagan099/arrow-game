/* Web Asset Build Process for Arrow Escape Capacitor packaging.
   Copies runtime assets (index.html, style.css, src/) to www/
   while preserving ES module relative import paths and excluding dev files. */

import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const outDir = resolve(rootDir, 'www');

console.log('Building Arrow Escape web assets for Capacitor...');

// 1. Clean previous build
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

// 2. Copy entry points and styles
cpSync(resolve(rootDir, 'index.html'), resolve(outDir, 'index.html'));
cpSync(resolve(rootDir, 'style.css'), resolve(outDir, 'style.css'));

// 3. Copy src ES modules
cpSync(resolve(rootDir, 'src'), resolve(outDir, 'src'), { recursive: true });

console.log(`✓ Web assets successfully assembled in: ${outDir}`);
