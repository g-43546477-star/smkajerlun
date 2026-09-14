import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.PWA_BASE_URL || 'http://127.0.0.1:4183';
const browser=await chromium.launch({channel:'chrome',headless:false});
const results=[];
await fs.mkdir('outputs/tempahan-app-review',{recursive:true});
try {
 const context=await browser.newContext();
 await context.route('**/*.supabase.co/**',r=>['POST','PATCH','PUT','DELETE'].includes(r.request().method())?r.abort():r.continue());
 const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:844});
  for(const path of ['/tempahan/','/tempahan/jadual/','/tempahan/senarai/?mine=1','/tempahan/log-masuk/']) {
   await page.goto(base+path); await page.locator('.app-nav').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${path}`);
   results.push(`${width}px ${path}: no overflow`);
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/tempahan/jadual/'); await page.locator('.slotcell-empty').first().waitFor();
 await page.screenshot({path:'outputs/tempahan-app-review/jadual.png',fullPage:true});
 const free=page.locator('a.slotcell-empty').first();
 if(await free.count()) {
  const href=await free.getAttribute('href'); await free.click();
  await page.waitForFunction(()=>typeof state!=='undefined' && state.ready);
  assert.equal(await page.evaluate(()=>state.bilik),new URL(href,base).searchParams.get('room'));
  assert.equal(await page.evaluate(()=>state.selected.length),1);
  await page.getByRole('button',{name:'Teruskan pilih masa'}).click();
  await page.getByText('Nyatakan tujuan atau aktiviti.',{exact:true}).waitFor();
  await page.locator('#f-tujuan').fill('PdPc Bahasa Arab');
  await page.getByRole('button',{name:'Teruskan pilih masa'}).click();
  await page.locator('#room-slots').waitFor();
  await page.screenshot({path:'outputs/tempahan-app-review/slot.png',fullPage:true});
  await page.getByRole('button',{name:'Ubah bilik atau aktiviti'}).click();
  assert.equal(await page.locator('#f-tujuan').inputValue(),'PdPc Bahasa Arab');
  results.push('Schedule deep link selects room/date/slot; validation, step navigation and retained input: pass');
 }
 await page.goto(base+'/tempahan/');await page.locator('#f-bilik option').nth(1).waitFor({state:'attached'});
 await page.screenshot({path:'outputs/tempahan-app-review/tempah.png',fullPage:true});
 await page.locator('#app-install-button').click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#app-install-button').evaluate(e=>e===document.activeElement),true);
 await page.evaluate(()=>{window.bookingAuth={admin:true};window.dispatchEvent(new Event('booking-auth-ready'));});
 await page.getByText('Mod pentadbir',{exact:true}).waitFor();
 results.push('Install dialog focus and explicit administrator exception: pass');
 await page.goto(base+'/tempahan/log-masuk/');await page.getByRole('button',{name:'Tunjuk kata laluan'}).click();
 assert.equal(await page.locator('#in-pass').getAttribute('type'),'text');
 await page.getByRole('button',{name:'Log Masuk',exact:true}).click();await page.getByText('Sila isi nama guru dan kata laluan.',{exact:true}).waitFor();
 await page.screenshot({path:'outputs/tempahan-app-review/login.png',fullPage:true});
 await page.goto(base+'/tempahan/senarai/?mine=1');
 await page.waitForFunction(()=>typeof currentUser!=='undefined' && document.getElementById('empty').style.display==='block');
 await page.evaluate(()=>{
  currentUser={id:'local-fixture'};
  allEntries=[{id:'fixture-1',user_id:'local-fixture',tarikh:'2026-09-08',bilik:'Bilik PAK 21',masa_mula:'09:10',masa_tamat:'09:40',nama_pemohon:'Guru Ujian',kelas:'4 Imtiyaz',tujuan:'PdPc Bahasa Arab',status:'aktif'}];renderRows();
 });
 await page.locator('.booking-record').waitFor();await page.screenshot({path:'outputs/tempahan-app-review/rekod-fixture.png',fullPage:true});
 await page.locator('.booking-record').getByRole('button',{name:'Ubah',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.booking-record .btn-edit').evaluate(e=>e===document.activeElement),true);
 results.push('Booking cards and edit focus: pass with local fixture; no live writes');
 assert.deepEqual(errors,[]);results.push('No uncaught JavaScript errors');
 await fs.writeFile('outputs/tempahan-app-review/results.json',JSON.stringify(results,null,2));console.log(results.join('\n'));
} finally {await browser.close();}
