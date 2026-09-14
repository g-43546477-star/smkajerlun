import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:false});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 await ctx.route('**/*.supabase.co/**',r=>r.fulfill({
  status:r.request().url().includes('/auth/v1/user')?401:200,
  contentType:'application/json',
  body:r.request().url().includes('/auth/v1/user')?'{"message":"not authenticated"}':'[]'
 }));
 const page=await ctx.newPage();
 await page.clock.install({time:new Date('2026-09-08T14:59:58+08:00')});
 await page.goto(new URL('/tempahan/',process.env.PWA_BASE_URL || 'http://127.0.0.1:4183').href);
 await page.locator('#f-bilik').waitFor();
 await page.waitForFunction(()=>document.getElementById('btn-esok')?.disabled===true);
 assert.equal(await page.locator('#btn-esok').isDisabled(),true);
 await page.clock.fastForward(3000);
 await page.waitForFunction(()=>document.getElementById('btn-esok')?.disabled===false);
 assert.equal(await page.locator('#btn-esok').isEnabled(),true);
 assert.equal(await page.evaluate(()=>bookingDateAllowed('2026-09-10')),false);
 await page.locator('#btn-esok').click();
 assert.equal(await page.evaluate(()=>state.tarikh),'2026-09-09');
 await page.clock.setSystemTime(new Date('2026-09-09T00:00:00+08:00'));
 await page.clock.fastForward(1100);
 assert.equal(await page.locator('#btn-esok').isDisabled(),true);
 assert.equal(await page.evaluate(()=>state.tarikh),'2026-09-09');
 assert.equal(await page.locator('#btn-hari-ini').evaluate(e=>e.classList.contains('active')),true);
 assert.equal(await page.evaluate(()=>bookingDateAllowed('2026-09-08')),false);
 console.log('Chrome: before 15:00 blocked, 15:00 auto unlock, day after tomorrow blocked, midnight rollover correct. PASS');
}finally{await browser.close();}
