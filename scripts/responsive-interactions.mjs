import fs from 'node:fs';
import {chromium} from 'playwright';
import {startStaticServer} from './static-server.mjs';
const server=await startStaticServer(),browser=await chromium.launch({channel:'chrome',headless:false});
const results=[];
try{
 const page=await browser.newPage();await page.emulateMedia({reducedMotion:'reduce'});
 for(const viewport of [{width:320,height:844},{width:768,height:1024},{width:1024,height:768},{width:844,height:390},{width:1920,height:1080}]){
 await page.setViewportSize(viewport);
 for(const route of ['/akademik/','/pss/','/tempahan/','/tempahan/jadual/']){
 await page.goto(server.url+route);await page.waitForTimeout(300);
 const toggle=page.locator(route==='/akademik/'?'.school-menu-toggle':'.menu-toggle');
 if(await toggle.isVisible())await toggle.click();
 const groups=page.locator(route==='/akademik/'?'nav.tabs summary':'.pss-links summary');
 if(await groups.count()){
 await groups.last().focus();await page.keyboard.press('Enter');
 const target=page.locator(route==='/akademik/'?'nav.tabs details[open] .nav-mega-links a':'.pss-links details[open] .pss-mega-links a').last();
 await target.scrollIntoViewIfNeeded();
 const bounds=await target.boundingBox();
 if(!bounds||bounds.x<0||bounds.x+bounds.width>viewport.width+2||bounds.y<0||bounds.y+bounds.height>viewport.height+2)throw Error('Menu outside viewport '+route+' '+JSON.stringify(viewport));
 await page.keyboard.press('Escape');
 }
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
 await page.screenshot({path:`outputs/responsive/${route.replaceAll('/','')||'school'}-${viewport.width}x${viewport.height}.png`,fullPage:true});
 results.push({route,...viewport});
 }
 }
 console.log('PASS navigation and portrait/landscape:',results.length,'views');
}finally{await browser.close();server.server.close();}
