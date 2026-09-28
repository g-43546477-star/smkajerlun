import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { HtmlValidate } from 'html-validate';
import { startStaticServer } from './static-server.mjs';

const validator = new HtmlValidate({ extends: ['html-validate:recommended'], rules: {
  'attr-quotes': 'off', 'doctype-style': 'off', 'no-inline-style': 'off',
  'no-trailing-whitespace': 'off', 'prefer-button': 'off', 'require-sri': 'off', 'void-style': 'off'
} });
const report = await validator.validateFile('log-masuk/index.html');
assert.ok(report.valid, JSON.stringify(report.results));
const local = await startStaticServer();
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'test@smkajerlun.my', user_metadata: { username: 'Guru Ujian' } };
const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'test'].join('.');
try {
  const context = await browser.newContext();
  let mode = 'success';
  await context.route('https://**.supabase.co/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/v1/token')) {
      if (mode === 'network') return route.abort();
      if (mode === 'invalid') return route.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } });
      return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user } });
    }
    if (url.includes('/auth/v1/user')) return route.fulfill({ json: user });
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204 });
    return route.fulfill({ json: [] });
  });
  const page = await context.newPage();
  for (const path of ['/perkhidmatan/klinik/', '/pss/admin/', '/tempahan/', '/admin/']) {
    await page.goto(local.url + path);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const link = page.locator('a[href^="/log-masuk/"]').first();
    await link.waitFor();
    await link.click();
    await page.waitForURL('**/log-masuk/**');
    assert.equal(new URL(page.url()).searchParams.get('next'), path);
    await page.locator('#in-nama').fill('Guru Ujian');
    await page.locator('#in-pass').fill('password-test-only');
    await page.locator('#in-pass').press('Enter');
    await page.waitForURL(local.url + path);
    if (path === '/perkhidmatan/klinik/') {
      await page.waitForFunction(() => document.getElementById('clinic-kiosk-state')?.textContent === 'Kiosk dikunci');
      assert.equal(await page.locator('#clinic-ic').isDisabled(), true);
    }
    // Existing session on the shared origin skips the login form.
    await page.goto(local.url + '/log-masuk/?next=' + encodeURIComponent('/pss/'));
    await page.waitForURL(local.url + '/pss/');
    await page.waitForFunction(() => document.getElementById('nav-login')?.textContent === 'Log Keluar');
  }
  await page.locator('#nav-login').click();
  await page.waitForFunction(() => document.getElementById('nav-login')?.textContent === 'Log Masuk');
  await page.goto(local.url + '/log-masuk/?next=%2Ftempahan%2F');
  await page.locator('#in-nama').waitFor();
  assert.equal(new URL(page.url()).pathname, '/log-masuk/');
  await page.goto(local.url + '/tempahan/log-masuk/');
  await page.waitForURL('**/log-masuk/**');
  assert.equal(new URL(page.url()).pathname, '/log-masuk/');
  assert.equal(new URL(page.url()).searchParams.get('next'), '/tempahan/');
  for (const value of ['//example.com', '/\\example.com', 'https://example.com', '/log-masuk/', '/tempahan/log-masuk/', '/api/test']) {
    await page.goto(local.url + '/log-masuk/?next=' + encodeURIComponent(value));
    assert.equal(await page.evaluate(() => destination), '/');
  }
  await page.goto(local.url + '/log-masuk/?next=%2Ftempahan%2Fsenarai%2F%3Fmine%3D1%23records');
  assert.equal(await page.evaluate(() => destination), '/tempahan/senarai/?mine=1#records');
  for (mode of ['invalid', 'network']) {
    await page.locator('#in-nama').fill('Guru Ujian');
    await page.locator('#in-pass').fill('wrong');
    await page.locator('#btn-masuk').click();
    await page.waitForFunction(() => document.getElementById('masuk-msg').textContent.length > 0);
    assert.equal(new URL(page.url()).pathname, '/log-masuk/');
    assert.equal(await page.locator('#btn-masuk').isEnabled(), true);
  }
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
  }
  fs.mkdirSync('outputs/login-review', { recursive: true });
  await page.goto(local.url + '/log-masuk/?next=%2Fperkhidmatan%2Fklinik%2F');
  await page.screenshot({ path: 'outputs/login-review/login-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'outputs/login-review/login-mobile.png', fullPage: true });
  console.log('PASS: shared login HTML, four return destinations, shared PSS session, legacy route, unsafe redirects, query/hash preservation, failed login recovery, 3 viewport widths. Headed Chrome; auth responses mocked, no live account writes.');
} finally {
  await browser.close();
  local.server.close();
}
