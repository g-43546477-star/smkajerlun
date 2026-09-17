import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
const local = await startStaticServer();
const browser = await chromium.launch({headless:false,channel:'chrome'});
const page = await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=local.url;
try {
 await page.goto(base+'/kokurikulum/');await page.waitForFunction(()=>document.querySelectorAll('.kp-list .ajer-icon').length===19);
 assert.equal(await page.locator('.kp-list li').count(),19);
 for(const section of ['page-content','jadual-harian','peraturan']){await page.goto(base+'/asrama/?section='+section);await page.locator('#'+section).waitFor({state:'visible'});}
 await page.getByRole('tab',{name:'Jadual',exact:true}).click();
 for(const day of ['Jumaat','Sabtu','Ahad - Khamis']){await page.getByRole('tab',{name:day,exact:true}).click();assert.equal(await page.locator('.schedule-panel:visible').count(),1);}
 await page.getByRole('tab',{name:'Panduan',exact:true}).click();await page.locator('.rule-group summary').first().click();assert.ok(await page.locator('.rule-group').first().getAttribute('open')!==null);
 await page.goto(base+'/info/?tab=pengurusan');await page.locator('.org-person').first().waitFor();const names=await page.locator('.org-person h3').allTextContents();await page.getByRole('button',{name:'Paparan senarai'}).click();assert.deepEqual(await page.locator('.org-person h3').allTextContents(),names);
 await page.goto(base+'/info/?tab=profil');await page.locator('#profil-blocks details').first().waitFor();await page.locator('#profil-blocks summary').first().click();assert.ok(await page.locator('#profil-blocks details').first().getAttribute('open')!==null);
 assert.deepEqual(errors,[]);console.log('PASS: 19 unit graphics, 3 Asrama views and schedules, rules, organisation list preserves '+names.length+' names, compact profile. Headed Chrome.');
}finally{await browser.close();local.server.close();}
