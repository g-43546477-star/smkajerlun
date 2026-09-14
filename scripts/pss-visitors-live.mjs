import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const report = [];
try {
 const page = await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for (const width of [390,1440]) {
  await page.setViewportSize({width,height:1000});
  const post=page.waitForResponse(r=>r.url().includes('/api/pss-visitors')&&r.request().method()==='POST'&&r.status()===204);
  await page.goto('https://www.smkajerlun.my/pss/');
  await post;
  await page.locator('#visitor-status').filter({hasText:'Dikemas kini'}).waitFor();
  assert.equal(await page.locator('#visitor-chart rect').count(),7);
  assert.match(await page.locator('#visitor-countries').innerText(),/Malaysia/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#pss-visitors').screenshot({path:'outputs/pss-visitors/live-'+width+'.png'});
  report.push({width,today:await page.locator('#visitor-today').innerText(),countries:await page.locator('#visitor-countries').innerText()});
 }
 assert.equal(report[0].today,report[1].today);
 assert.deepEqual(errors,[]);
 for(const route of ['/','/tempahan/','/pss/digital/katalog/']) {
  const response=await page.goto('https://www.smkajerlun.my'+route);
  assert.equal(response.status(),200);
 }
 fs.writeFileSync('outputs/pss-visitors/live-report.json',JSON.stringify({report,errors},null,2));
 console.log('PASS live Chrome: POST 204, SVG and Malaysia displayed, desktop/mobile no overflow, deduplication, homepage/booking/catalogue 200.');
} finally {await browser.close();}
