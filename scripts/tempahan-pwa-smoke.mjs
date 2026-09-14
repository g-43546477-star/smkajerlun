import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.PWA_BASE_URL || 'http://127.0.0.1:4183';
const browser = await chromium.launch({channel:'chrome', headless:false});
const results=[];
try {
  const context=await browser.newContext();
  await context.route('**/*.supabase.co/**', route => {
    if (['POST','PATCH','DELETE','PUT'].includes(route.request().method())) return route.abort();
    return route.continue();
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,430,1280]) {
    await page.setViewportSize({width,height:844});
    for(const route of ['/tempahan/','/tempahan/jadual/','/tempahan/senarai/?mine=1','/tempahan/log-masuk/','/tempahan/admin/']) {
      await page.goto(base+route);
      await page.locator('.app-install').waitFor({state:'attached'});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert.equal(overflow,false,`overflow ${width} ${route}`);
      assert.equal(await page.locator('link[rel=manifest]').count(),1);
      if(width<700) assert.equal(await page.locator('.app-nav a').count(),3);
      results.push(`${width}px ${route}: pass`);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/tempahan/');
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  // Manual installation instructions and keyboard focus return.
  await page.getByRole('button',{name:'Pasang App'}).click();
  await page.locator('dialog[open]').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#app-install-button').evaluate(el=>el===document.activeElement),true);
  await page.screenshot({path:'outputs/tempahan-pwa/phone-tempahan.png',fullPage:true});
  // The first actual room selection uses the live public, read-only availability view.
  await page.locator('#f-bilik').selectOption({index:1});
  await page.locator('#f-tujuan').fill('Ujian lokal sahaja');
  await page.getByRole('button',{name:'Teruskan pilih masa'}).click();
  await page.locator('.slotbtn').first().waitFor();
  const cacheUrls=await page.evaluate(async()=>{
    const cache=await caches.open('smkaj-tempahan-offline-v1');return (await cache.keys()).map(r=>new URL(r.url).pathname);
  });
  assert.deepEqual(cacheUrls,['/tempahan/offline/']);
  const cdp=await context.newCDPSession(page);
  const manifest=await cdp.send('Page.getAppManifest');
  assert.equal(manifest.errors.length,0,JSON.stringify(manifest.errors));
  results.push('Manifest parsed by Chrome; only generic offline page cached: pass');
  await context.setOffline(true);
  await page.locator('.app-network:not([hidden])').waitFor();
  assert.equal(await page.locator('#btn-hantar').isDisabled(),true);
  assert.equal(await page.locator('#room-slots').isVisible(),false);
  await page.goto(base+'/tempahan/jadual/');
  await page.getByRole('heading',{name:'Sambung semula untuk melihat jadual terkini.'}).waitFor();
  await page.screenshot({path:'outputs/tempahan-pwa/phone-offline.png',fullPage:true});
  await context.setOffline(false);
  await page.getByRole('link',{name:'Cuba Semula'}).click();
  await page.locator('.app-nav').waitFor();
  await page.screenshot({path:'outputs/tempahan-pwa/phone-jadual.png',fullPage:true});
  results.push('Offline hides availability and blocks submit; offline launch and recovery: pass');
  // A reachable browser with a failing API must not advertise empty slots.
  await context.route('**/rest/v1/tempahan_awam*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"Test unavailable"}'}));
  await page.goto(base+'/tempahan/');
  await page.locator('#f-bilik').selectOption({index:1});
  await page.locator('#f-tujuan').fill('Ujian lokal sahaja');
  await page.getByRole('button',{name:'Teruskan pilih masa'}).click();
  await page.getByText('Kekosongan tidak dapat disemak.',{exact:false}).waitFor();
  assert.equal(await page.locator('.slotbtn:visible').count(),0);
  assert.equal(await page.locator('#btn-hantar').isDisabled(),true);
  results.push('API failure never shown as vacant: pass');
  assert.deepEqual(errors,[]);
  results.push('No uncaught browser JavaScript errors: pass');
  await context.close();
  await fs.writeFile('outputs/tempahan-pwa/checks.json',JSON.stringify(results,null,2)+'\n');
  console.log(results.join('\n'));
} finally {await browser.close();}
