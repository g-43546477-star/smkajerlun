import fs from 'node:fs';
import {chromium} from 'playwright';
import {startStaticServer} from './static-server.mjs';
// Reuse the existing isolated admin fixture; all writes stay in browser memory.
const source=fs.readFileSync('scripts/admin-smoke.mjs','utf8');
const fixture=source.split('const commonStub = String.raw`')[1]?.split('\n`;')[0];
if(!fixture)throw Error('Admin fixture missing');
const widths=(process.env.REVIEW_WIDTHS||'320,390,768,820,1024,1366,1920').split(',').map(Number);
const server=await startStaticServer(),browser=await chromium.launch({channel:'chrome',headless:false});
const results=[];fs.mkdirSync('outputs/responsive',{recursive:true});
try{
const page=await browser.newPage();
await page.route('**/tempahan/assets/common.js*',r=>r.fulfill({contentType:'application/javascript',body:fixture}));
await page.route('**/*.supabase.co/**',r=>r.abort());
await page.emulateMedia({reducedMotion:'reduce'});
for(const width of widths){
await page.setViewportSize({width,height:Number(process.env.REVIEW_HEIGHT)||900});
for(const url of ['/admin/','/pss/admin/','/tempahan/admin/']){
 const errors=[];const handler=e=>errors.push(e.message);page.on('pageerror',handler);
 await page.goto(server.url+url);await page.locator('main').waitFor({state:'visible'});
 const tabs=await page.locator('.tab-btn').count();
 for(let i=0;i<Math.max(1,tabs);i++){
 if(tabs)await page.locator('.tab-btn').nth(i).click();
 const state=await page.evaluate(()=>{
 const visible=e=>e.getClientRects().length;
 const fields=[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].filter(visible);
 return {overflow:document.documentElement.scrollWidth>innerWidth+2,smallInputs:fields.filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.id)};
 });
 results.push({url,width,tab:i,...state,errors:[...errors]});
 }
 // Open each school editor without saving. Check the actual modal layout.
 if(url==='/admin/'){
 for(const [tab,button] of [['staf','staf'],['pengumuman','pengumuman'],['kandungan','kandungan'],['takwim','takwim'],['media','pencapaian'],['perkhidmatan','direktori']]){
 const target=page.locator(`.tab-btn[data-tab="${tab}"]`);if(!await target.count())continue;
 await target.click();await page.locator(`#${button}-tambah`).click();
 const dialog=page.locator(`#${button}-modal .modal`);await dialog.waitFor();
 const state=await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return {overflow:r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight+2,smallInputs:[...e.querySelectorAll('input,select,textarea')].filter(x=>x.getClientRects().length&&parseFloat(getComputedStyle(x).fontSize)<16).map(x=>x.id)};});
 results.push({url,width,modal:button,...state,errors:[...errors]});await page.keyboard.press('Escape');
 }
 }
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
 await page.screenshot({path:`outputs/responsive/admin-${url.replaceAll('/','')}-${width}.png`,fullPage:true});
 page.off('pageerror',handler);
}
console.log('Admin review',width);
}
}finally{await browser.close();server.server.close();}
fs.writeFileSync(`outputs/responsive/admin-${process.env.REVIEW_LABEL||'current'}.json`,JSON.stringify(results,null,2));
const failures=results.filter(r=>r.overflow||r.smallInputs.length||r.errors.length);console.log(JSON.stringify(failures,null,2));if(failures.length)process.exitCode=1;
