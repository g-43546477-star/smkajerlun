import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildPublic, publicFiles, publicDirectories, optionalPublicDirectories } from './build-public.mjs';
import { startStaticServer } from './static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(config.outputDirectory, 'site');
assert.equal(config.buildCommand, 'npm run build');
const output = await buildPublic(root);
await fs.writeFile(path.join(output, 'stale.sql'), 'stale private output');
await buildPublic(root);
await assert.rejects(fs.stat(path.join(output, 'stale.sql')), { code: 'ENOENT' });
for (const entry of ['scripts', 'supabase', 'docs', 'api', 'package.json', 'package-lock.json', 'vercel.json', '.env.local', '.git', '.vercel']) {
  await assert.rejects(fs.stat(path.join(output, entry)), { code: 'ENOENT' });
}
let publicCount = 0;
async function comparePublic(relative) {
  const source = path.join(root, relative);
  if ((await fs.stat(source)).isDirectory()) {
    for (const name of await fs.readdir(source)) await comparePublic(path.join(relative, name));
  } else {
    assert.deepEqual(await fs.readFile(path.join(output, relative)), await fs.readFile(source), relative);
    publicCount += 1;
  }
}
for (const entry of [...publicFiles, ...publicDirectories]) await comparePublic(entry);
for (const entry of optionalPublicDirectories) {
  if (await fs.stat(path.join(root, entry)).catch(() => null)) await comparePublic(entry);
}
await fs.stat(path.join(root, 'api/pss-visitors.js'));

const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'ajer-public-test-'));
try {
  for (const directory of publicDirectories) await fs.mkdir(path.join(fixture, directory));
  for (const file of publicFiles) await fs.writeFile(path.join(fixture, file), 'public fixture');
  await buildPublic(fixture);
  assert.equal((await fs.readFile(path.join(fixture, 'site/index.html'), 'utf8')), 'public fixture');
  for (const directory of optionalPublicDirectories) {
    await fs.mkdir(path.join(fixture, directory));
    await fs.writeFile(path.join(fixture, directory, 'index.html'), 'optional public fixture');
  }
  await buildPublic(fixture);
  assert.equal(await fs.readFile(path.join(fixture, 'site/kehadiran/index.html'), 'utf8'), 'optional public fixture');
  for (const name of ['private.sql', '.env']) {
    const file = path.join(fixture, 'assets', name);
    await fs.writeFile(file, 'private fixture');
    await assert.rejects(buildPublic(fixture), /Unsupported public input|Hidden public input/);
    await fs.unlink(file);
  }
  await fs.symlink(path.join(root, 'scripts/check-security.mjs'), path.join(fixture, 'assets', 'private.js'));
  await assert.rejects(buildPublic(fixture), /Symbolic link/);
} finally {
  await fs.rm(fixture, { recursive: true, force: true });
}

const sandbox = { window: {}, document: { addEventListener() {} } };
vm.runInNewContext(await fs.readFile(path.join(root, 'assets/admin-ui.js'), 'utf8'), sandbox);
const cell = sandbox.window.adminUI.csvValue;
function decodeCell(value) {
  assert.ok(value.startsWith('"') && value.endsWith('"'), 'Every cell is quoted, including CR-only text.');
  return value.slice(1, -1).replace(/""/g, '"');
}
for (const value of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\t=1+1', ' \r=1+1', '\u0000=1+1', '\u0085@SUM(A1)', '\nplain', '\rplain']) {
  assert.equal(decodeCell(cell(value)), "'" + value, JSON.stringify(value));
}
for (const value of ['Nur, "Aisyah"', 'أحمد', 'Nama\r=1+1', 'Baris 1\nBaris 2', '2026-10-05', 0, null]) {
  assert.equal(decodeCell(cell(value)), String(value ?? ''));
}
for (const [file, name] of [['assets/pages/pss-admin-index.js', 'ui'], ['tempahan/assets/admin.js', 'adminUI']]) {
  const source = (await fs.readFile(path.join(root, file), 'utf8')).match(/function csvValue\(value\) \{[\s\S]*?\n\}/)[0];
  const serialize = vm.runInNewContext('(' + source + ')', { [name]: sandbox.window.adminUI });
  assert.equal(serialize('\t=1+1'), cell('\t=1+1'), file);
  assert.equal(serialize('Nama\r=1+1'), cell('Nama\r=1+1'), file);
}

const local = await startStaticServer(0, output);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  for (const route of ['/scripts/check-security.mjs', '/supabase/migrations/20261004031422_add_teacher_attendance_250m.sql', '/package.json', '/api/pss-visitors.js']) {
    const response = await fetch(local.url + route);
    assert.equal(response.status, 404, route);
    assert.equal(await response.text(), 'Not found', route + ' body');
  }
  for (const route of ['/', '/manifest.json', '/sw.js', '/offline/', '/pss/admin/', '/tempahan/manifest.webmanifest']) {
    assert.equal((await fetch(local.url + route)).status, 200, route);
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'UTC' });
  await context.route('**/api/pss-visitors*', route => route.fulfill({ json: { today: 0, total: 0 } }));
  await context.route('**/api.waktusolat.app/**', route => route.abort());
  let mode = 'error';
  const article = { id: 1, tajuk: 'Program ujian', slug: 'program-ujian', tarikh: '2026-10-05', penerangan: 'Ringkasan program', kategori: 'sekolah' };
  const dateQueries = [];
  await context.route('**/*.supabase.co/**', route => {
    if (route.request().method() !== 'GET') return route.abort();
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    if (table === 'takwim') dateQueries.push(url.searchParams.get('or'));
    if (table !== 'achievement') return route.fulfill({ json: [] });
    if (mode === 'network') return route.abort();
    if (mode === 'error' || (mode === 'page-error' && Number(url.searchParams.get('offset')) > 0)) {
      return route.fulfill({ status: 503, json: { message: 'Simulated outage' } });
    }
    return route.fulfill({ json: mode === 'empty' ? [] : mode === 'page-error' ? Array.from({ length: 100 }, (_, i) => ({ ...article, id: i + 1 })) : [article] });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(local.url + '/program/');
  const retry = page.locator('#program-list .achievement-retry');
  await retry.waitFor();
  assert.match(await page.locator('#program-list').innerText(), /tidak dapat dimuatkan/);
  await retry.press('Enter');
  await page.waitForFunction(() => document.activeElement?.matches('#program-list .achievement-retry'));
  mode = 'success';
  await retry.press('Enter');
  await page.getByRole('heading', { name: 'Program ujian', exact: true }).waitFor();
  assert.equal(await page.locator('#program-list .achievement-card').count(), 1);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '/program/?slug=program-ujian');
  mode = 'empty';
  await page.evaluate(() => window.cmsLoadProgramArticles('program-list'));
  assert.match(await page.locator('#program-list').innerText(), /Belum ada program sekolah/);
  assert.equal(await retry.count(), 0);
  mode = 'network';
  await page.evaluate(() => window.cmsLoadProgramArticles('program-list'));
  await retry.waitFor();
  mode = 'page-error';
  await page.evaluate(() => window.cmsLoadProgramArticles('program-list', { all: true }));
  await retry.waitFor();
  assert.equal(await page.locator('#program-list .achievement-card').count(), 0, 'A later page error cannot appear as a complete collection.');
  await page.evaluate(async () => {
    const original = window.cms.from;
    window.cms.from = function () { throw new Error('Test rejection'); };
    try { await window.cmsLoadProgramArticles('program-list'); } finally { window.cms.from = original; }
  });
  await retry.waitFor();
  assert.equal(await page.locator('#program-list').getAttribute('aria-busy'), null);

  const dates = [
    ['2026-10-04T16:15:00Z', '2026-10-05', 'Oktober 2026', '5'],
    ['2026-09-30T16:15:00Z', '2026-10-01', 'Oktober 2026', '1'],
    ['2026-12-31T16:15:00Z', '2027-01-01', 'Januari 2027', '1']
  ];
  for (const [instant, malaysiaDate, month, day] of dates) {
    await page.clock.setFixedTime(new Date(instant));
    dateQueries.length = 0;
    await page.goto(local.url + '/pss/');
    await page.waitForFunction(() => window.cmsTodayIso && document.getElementById('pss-aktiviti-tajuk')?.textContent !== 'Memuatkan aktiviti...');
    assert.equal(await page.evaluate(() => window.cmsTodayIso()), malaysiaDate);
    await page.waitForFunction(() => document.querySelector('#weekly-activity-feature strong'));
    assert.ok(dateQueries.filter(Boolean).length >= 2);
    assert.ok(dateQueries.filter(Boolean).every(query => query.includes('tarikh_mula.gte.' + malaysiaDate) && query.includes('tarikh_tamat.gte.' + malaysiaDate)), dateQueries.join('; '));
    await page.goto(local.url + '/pss/program/kalendar/');
    await page.locator('#pss-calendar-grid [role="row"]').first().waitFor();
    assert.equal(await page.locator('#pss-calendar-month').innerText(), month);
    assert.equal(await page.locator('[aria-current="date"] .pss-calendar-number').innerText(), day);
    assert.equal(await page.getByRole('table', { name: 'Kalendar aktiviti PSS' }).count(), 1);
    const rowSizes = await page.locator('#pss-calendar-grid [role="row"]').evaluateAll(rows => rows.map(row => row.children.length));
    assert.ok(rowSizes.length >= 5 && rowSizes.every(size => size === 7));
    assert.equal(await page.locator('#pss-calendar-grid > [role="cell"], #pss-calendar-grid > [role="columnheader"]').count(), 0);
    await page.getByRole('button', { name: 'Bulan seterusnya' }).press('Enter');
    assert.notEqual(await page.locator('#pss-calendar-month').innerText(), month);
    await page.getByRole('button', { name: 'Bulan semasa' }).press('Enter');
    assert.equal(await page.locator('#pss-calendar-month').innerText(), month);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
  }
  await context.close();
  assert.deepEqual(errors, []);
  console.log('Audit fixes passed: ' + publicCount + ' unchanged public files, private output exclusion, CSV variants, program retry/empty/error, Malaysia day/month/year boundaries and calendar rows.');
} finally {
  await browser.close();
  local.server.close();
}
