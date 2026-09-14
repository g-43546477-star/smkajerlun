import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:false});
const base=process.env.PWA_BASE_URL || 'http://127.0.0.1:4183';
const report=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  // No real writes: all API traffic in this test is intercepted with explicit fixtures.
  const writes=[];
  const reads=[];
  let unavailable=false;
  await context.route('**/*.supabase.co/**',async route=>{
    const req=route.request();const url=new URL(req.url());
    if(['POST','PATCH','PUT','DELETE'].includes(req.method())) {
      writes.push({path:url.pathname,body:req.postDataJSON()});
      return route.fulfill({status:201,contentType:'application/json',body:'[]'});
    }
    reads.push(url.href);
    return route.fulfill({status:unavailable?503:200,contentType:'application/json',body:unavailable?'{}':'[]'});
  });
  const common=await fs.readFile('tempahan/assets/common.js','utf8');
  await context.route('**/tempahan/assets/common.js*',route=>route.fulfill({contentType:'application/javascript',body:common+`
refreshAuthBox = async () => ({ user: { id: '11111111-1111-4111-8111-111111111111' }, admin: false, teacher: { nama: 'Guru Ujian Lokal' } });
`}));
  const page=await context.newPage();
  await page.goto(base+'/tempahan/');
  await page.locator('#f-bilik').selectOption({index:1});
  await page.locator('#f-tujuan').fill('Ujian lokal sahaja');
  await page.getByRole('button',{name:'Teruskan pilih masa'}).click();
  await page.locator('.slotbtn.kosong').first().waitFor();
  await page.locator('.slotbtn.kosong').first().click();
  assert.equal(await page.locator('#btn-hantar').isEnabled(),true);
  await page.locator('#btn-hantar').click();
  await page.waitForFunction(()=>document.getElementById('count-slot').textContent==='0');
  assert.equal(writes.length,1);
  assert.equal(writes[0].path,'/rest/v1/tempahan');
  assert.equal(writes[0].body[0].nama_pemohon,'Guru Ujian Lokal');
  assert.equal(writes[0].body[0].tujuan,'Ujian lokal sahaja');
  assert.equal(await page.locator('#btn-hantar').isDisabled(),true);
  report.push('Simulated teacher: select slot, submit intercepted payload, clear selection and disable submit: pass. No live write.');
  await page.goto(base+'/tempahan/senarai/?mine=1');
  await page.getByText('Tiada rekod tempahan ditemui.',{exact:true}).waitFor();
  assert.equal(await page.locator('#f-mine').isChecked(),true);
  assert.ok(reads.some(u=>new URL(u).searchParams.get('user_id')==='eq.11111111-1111-4111-8111-111111111111'));
  report.push('Tempahan Saya applies user filter before query limit: pass (simulated user).');
  await page.goto(base+'/tempahan/jadual/');
  await page.locator('.slotcell-empty').first().waitFor();
  assert.equal(await page.locator('#thead-row th').count(),2);
  await page.locator('#f-room').selectOption('');
  await page.waitForFunction(()=>document.querySelectorAll('#thead-row th').length>2);
  await page.locator('.slotcell-empty').first().waitFor();
  unavailable=true;
  await page.locator('#f-tarikh').fill('2026-09-09');
  await page.locator('#f-tarikh').dispatchEvent('change');
  await page.getByText('Jadual tidak dapat dimuatkan.',{exact:false}).waitFor();
  assert.equal(await page.locator('.slotcell-empty').count(),0);
  report.push('Mobile room filter, all-room view, API failure clears timetable: pass.');
  // Verify both branches of the install UI without installing on the user's Mac.
  await page.evaluate(()=>{
    const e=new Event('beforeinstallprompt',{cancelable:true});
    e.prompt=async()=>{};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);
  });
  await page.locator('#app-install-button').click();
  await page.locator('.app-install').waitFor({state:'hidden'});
  report.push('Install prompt accepted hides install banner: pass (simulated browser event).');
  await context.close();
  const profile=await fs.mkdtemp('/tmp/smkaj-pwa-chrome-');
  const live=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:false,viewport:{width:390,height:844}});
  await live.route('**/*.supabase.co/**',r=>['POST','PATCH','DELETE','PUT'].includes(r.request().method())?r.abort():r.continue());
  const preview=await live.newPage();await preview.goto(base+'/tempahan/jadual/');
  await preview.locator('.slotcell-empty, .slotcell-booked').first().waitFor();
  await preview.screenshot({path:'outputs/tempahan-pwa/phone-jadual.png',fullPage:true});
  const cdp=await live.newCDPSession(preview);
  await preview.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  const installability=await cdp.send('Page.getInstallabilityErrors');
  report.push('Chrome installability errors: '+JSON.stringify(installability.installabilityErrors));
  assert.deepEqual(installability.installabilityErrors,[]);
  await live.close();
  await fs.rm(profile,{recursive:true,force:true});
  await fs.writeFile('outputs/tempahan-pwa/flow-checks.json',JSON.stringify(report,null,2)+'\n');
  console.log(report.join('\n'));
}finally{await browser.close();}
