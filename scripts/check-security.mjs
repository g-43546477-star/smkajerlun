import fs from 'node:fs/promises';
import path from 'node:path';
import { projectFiles } from './project-files.mjs';

const failures = [];
const htmlFiles = await projectFiles('.html');
const jsFiles = await projectFiles('.js');

for (const file of htmlFiles) {
  const source = await fs.readFile(file, 'utf8');
  if (source.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js')) {
    failures.push(`${file}: loads Supabase JavaScript from a third-party CDN`);
  }
  const ids = Array.from(source.matchAll(/\bid=["']([^"']+)["']/g), (match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) failures.push(`${file}: duplicate IDs: ${Array.from(new Set(duplicateIds)).join(', ')}`);
}

for (const file of jsFiles) {
  const source = await fs.readFile(file, 'utf8');
  if (source.includes('.auth.signUp(')) failures.push(`${file}: public account registration is still enabled in the client`);
}

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
if (packageJson.dependencies?.['@supabase/supabase-js'] !== '2.57.4') {
  failures.push('package.json: @supabase/supabase-js must remain pinned exactly to 2.57.4');
}

const vendorPath = 'assets/vendor/supabase-2.57.4.js';
const installedVendorPath = 'node_modules/@supabase/supabase-js/dist/umd/supabase.js';
try {
  const [vendor, installed] = await Promise.all([fs.readFile(vendorPath), fs.readFile(installedVendorPath)]);
  if (!vendor.equals(installed)) failures.push(`${vendorPath}: does not match the pinned npm package`);
} catch (error) {
  failures.push(`Supabase vendor verification failed: ${error.message}`);
}

try {
  await fs.access('.github/workflows/verify.yml');
} catch {
  failures.push('.github/workflows/verify.yml: CI verification workflow is missing');
}

const topLevelSupabaseSql = (await fs.readdir('supabase', { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name);
if (topLevelSupabaseSql.length) {
  failures.push(`supabase/: standalone SQL is not allowed (${topLevelSupabaseSql.join(', ')})`);
}

const migrationFiles = (await fs.readdir('supabase/migrations'))
  .filter((file) => file.endsWith('_harden_identity_privacy_and_public_forms.sql'));
if (migrationFiles.length !== 1) {
  failures.push('supabase/migrations: expected one identity/privacy hardening migration');
} else {
  const migration = await fs.readFile(path.join('supabase/migrations', migrationFiles[0]), 'utf8');
  const viewDefinition = migration.match(/create view public\.tempahan_awam[\s\S]*?revoke all on public\.tempahan_awam/i)?.[0] || '';
  for (const field of ['nama_pemohon', 'kelas', 'tujuan', 'guna_lcd', 'created_at']) {
    if (viewDefinition.includes(field)) failures.push(`${migrationFiles[0]}: public booking view exposes ${field}`);
  }
  for (const required of ['guru_pengguna', 'check_public_submission_rate', 'enforce_booking_identity', "interval '1 year'"]) {
    if (!migration.includes(required)) failures.push(`${migrationFiles[0]}: missing security contract ${required}`);
  }
}

const loginHtml = await fs.readFile('tempahan/log-masuk/index.html', 'utf8');
for (const inputId of ['in-nama', 'in-pass']) {
  if (!new RegExp(`<label[^>]+for=["']${inputId}["']`).test(loginHtml)) {
    failures.push(`tempahan/log-masuk/index.html: ${inputId} is missing an associated label`);
  }
}

const bookingListHtml = await fs.readFile('tempahan/senarai/index.html', 'utf8');
if (!bookingListHtml.includes('role="dialog"') || !bookingListHtml.includes('aria-modal="true"')) {
  failures.push('tempahan/senarai/index.html: edit modal is missing dialog semantics');
}
const bookingListJs = await fs.readFile('tempahan/assets/senarai.js', 'utf8');
if (!bookingListJs.includes("event.key === 'Escape'") || !bookingListJs.includes("event.key !== 'Tab'")) {
  failures.push('tempahan/assets/senarai.js: edit modal is missing keyboard focus handling');
}

if (failures.length) {
  console.error(`Security contract failures (${failures.length}):`);
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Security contract passed: ${htmlFiles.length} HTML and ${jsFiles.length} JavaScript files`);
