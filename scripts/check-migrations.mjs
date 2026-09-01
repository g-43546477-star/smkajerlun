import fs from 'node:fs/promises';
import path from 'node:path';

const migrationDirectory = path.resolve('supabase/migrations');
const baselinePath = path.resolve('supabase/migration-baseline.txt');
const legacyBaselinePath = path.resolve('supabase/legacy-baseline.txt');
const files = (await fs.readdir(migrationDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort();
const failures = [];
const versions = new Map();
const filenamePattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;

for (const file of files) {
  const match = file.match(filenamePattern);
  if (!match) {
    failures.push(`invalid migration filename: ${file}`);
    continue;
  }
  const [, version] = match;
  if (versions.has(version)) failures.push(`duplicate migration version: ${version}`);
  versions.set(version, file);
}

const baseline = await fs.readFile(baselinePath, 'utf8');
const baselineEntries = baseline.split('\n').map((entry) => entry.trim()).filter(Boolean);
const baselineVersions = new Set();
for (const entry of baselineEntries) {
  const match = entry.match(/^(\d{14})_[a-z0-9_]+$/);
  if (!match) failures.push(`invalid migration baseline entry: ${entry}`);
  else if (baselineVersions.has(match[1])) failures.push(`duplicate baseline version: ${match[1]}`);
  else baselineVersions.add(match[1]);
}

for (const [version, file] of versions) {
  if (!baselineVersions.has(version)) failures.push(`${file}: version is missing from migration baseline`);
}

const legacyBaseline = await fs.readFile(legacyBaselinePath, 'utf8');
const legacyEntries = legacyBaseline.split('\n').map((entry) => entry.trim()).filter(Boolean);
const legacyVersions = new Set();
for (const entry of legacyEntries) {
  const match = entry.match(/^(\d{14})_[a-z0-9_]+$/);
  if (!match) failures.push(`invalid legacy baseline entry: ${entry}`);
  else if (!baselineVersions.has(match[1])) failures.push(`legacy baseline is absent from production manifest: ${entry}`);
  else if (legacyVersions.has(match[1])) failures.push(`duplicate legacy baseline version: ${match[1]}`);
  else legacyVersions.add(match[1]);
}

for (const entry of baselineEntries) {
  const version = entry.slice(0, 14);
  if (!versions.has(version) && !legacyVersions.has(version)) {
    failures.push(`${entry}: production migration has neither tracked SQL nor an explicit legacy-baseline entry`);
  }
}

for (const version of legacyVersions) {
  if (versions.has(version)) failures.push(`${version}: remove from legacy baseline because tracked SQL now exists`);
}

try {
  await fs.access(path.resolve('supabase/tests/security_contract.sql'));
} catch {
  failures.push('supabase/tests/security_contract.sql: database security assertions are missing');
}

for (const staleVersion of ['20260814101239', '20260818090000', '20260818093000', '20260818110000']) {
  if (versions.has(staleVersion)) failures.push(`stale local migration timestamp: ${staleVersion}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Migration manifest check passed: ${files.length} tracked SQL files, ${legacyVersions.size} explicit legacy entries, ${baselineVersions.size} production entries`);
