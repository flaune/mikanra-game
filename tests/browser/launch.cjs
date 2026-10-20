// Public-origin journey: ordinary controls and shipped DOM only, never the QA fixture.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {launchBrowser,output}=require('./helpers.cjs');
const url=process.argv[2];if(!url)throw Error('Supply the public staged or production URL.');
(async()=>{
 const browser=await launchBrowser();
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(60000);
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mikanra.chapter-one.v1')));
 async function pulse(key,ms){await page.keyboard.down(key);try{await page.waitForTimeout(ms);}finally{await page.keyboard.up(key);}}
 async function reach(kind){
  for(let step=0;step<160;step++){
   const guide=await page.evaluate(()=>{const node=document.querySelector('.service-direction');if(!node)return null;return{bearing:parseFloat(node.querySelector('span').style.transform.replace('rotate(','')),distance:parseFloat(node.querySelector('b').textContent),route:node.textContent.includes('Around the right'),prompt:document.querySelector('.bottom-24')?.textContent??''};});
   if(!guide){await page.waitForTimeout(200);continue;}
   if(!guide.route&&guide.prompt.includes(kind==='work'?'Open workbench':'Speak with the customer'))return;
   if(Math.abs(guide.bearing)>15)await pulse(guide.bearing<0?'ArrowLeft':'ArrowRight',Math.max(65,Math.min(240,Math.abs(guide.bearing)*8)));
   else if(guide.route||guide.distance>(kind==='work'?2.3:2.7))await pulse('KeyW',180);
   else await pulse('ArrowDown',75);
   await page.waitForTimeout(160);
  }
  throw Error('Could not reach '+kind+' with ordinary controls');
 }
 try{
  await page.addInitScript(()=>{if(sessionStorage.getItem('mikanra.launch.seed'))return;sessionStorage.setItem('mikanra.launch.seed','1');localStorage.setItem('mikanra.chapter-one.v1',JSON.stringify({version:1,hired:true,stage:'brew',day:2,customer:0,ticket:{drink:'tea',count:1},tray:[],relationships:[1,0,0]}));});
  const response=await page.goto(url);assert.equal(response.status(),200);await page.getByRole('button',{name:'Continue café',exact:true}).click();
  assert.equal(await page.evaluate(()=>!!window.mikanraQA),false);
  const audio=await page.evaluate(async()=>{
   const context=new AudioContext();await context.resume();const decoded=[];
   for(const asset of ['audio/arrival.mp3','audio/ja/ja-27.mp3']){const buffer=await context.decodeAudioData(await(await fetch(new URL(asset,location.href))).arrayBuffer());let peak=0;for(const sample of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(sample));decoded.push({asset,duration:buffer.duration,peak});}
   const clip=new Audio(new URL('audio/ja/ja-27.mp3',location.href).href);clip.volume=.1;
   await new Promise((resolve,reject)=>{clip.onended=resolve;clip.onerror=()=>reject(Error('Japanese audio playback failed'));clip.play().catch(reject);});await context.close();return decoded;
  });assert.ok(audio.every(clip=>clip.duration>0&&clip.peak>.001));
  await reach('work');await page.keyboard.press('KeyE');await page.getByRole('region',{name:'Café workbench'}).waitFor();
  for(let step=0;step<100;step++){
   const button=page.locator('.bench-primary'),label=await button.innerText();
   if(label.includes('Take the tray'))break;
   if(await button.isDisabled()){await page.waitForTimeout(500);continue;}
   if(label.startsWith('Hold')){
    await page.keyboard.down('KeyE');try{await page.waitForFunction(()=>document.querySelector('.bench-primary')?.textContent.includes('Take the tray'),undefined,{timeout:30000});}finally{await page.keyboard.up('KeyE');}
   }else{await button.click();await page.waitForTimeout(220);}
  }
  await page.getByRole('button',{name:'Take the tray to your customer',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'launch-workbench.png')});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mikanra.chapter-one.v1')).tray[0]==='tea');
  await page.keyboard.press('Escape');await reach('customer');await page.keyboard.press('KeyE');
  await page.getByRole('button').filter({hasText:'どうぞ'}).last().click();await page.getByRole('button',{name:'Return to work',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mikanra.chapter-one.v1')).stage==='pay');
  const before=await saved();await page.reload();await page.getByRole('button',{name:'Continue café',exact:true}).click();
  const after=await saved();assert.equal(after.stage,'pay');assert.equal(after.day,before.day);assert.deepEqual(after.service.vessels,before.service.vessels);
  await page.screenshot({path:path.join(output,'launch-restore.png')});assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'launch-results.json'),JSON.stringify({passed:true,url,audio,errors,verified:['anonymous access','no QA globals','real audio decode and playback','ordinary walking to staff work area','guided tea preparation','service to Aoi','save restoration after reload']},null,2));
  console.log('PASS public launch: audio playback, ordinary walking, tea preparation, service and save restoration.');
 }catch(error){await page.screenshot({path:path.join(output,'launch-failure.png')}).catch(()=>{});console.error((await page.locator('body').innerText()).slice(0,1800));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
