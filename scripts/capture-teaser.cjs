// Edited gameplay capture in an isolated development fixture; no normal browser saves.
const fs=require('node:fs');
const path=require('node:path');
const {launchBrowser}=require('../tests/browser/helpers.cjs');
const out=path.resolve('output/teaser');fs.mkdirSync(out,{recursive:true});
const url=new URL('/tests/browser/fixtures/cafe.html',process.env.MIKANRA_E2E_URL||'http://127.0.0.1:5173').href;
const pause=(page,ms)=>page.waitForTimeout(ms);
const selected=process.argv.slice(2);
const previous=fs.existsSync(path.join(out,'capture.json'))?JSON.parse(fs.readFileSync(path.join(out,'capture.json'),'utf8')).clips:[];
async function shot(browser,name,seed,setup,action,seconds){
 if(selected.length&&!selected.includes(name)){const old=previous.find(c=>c.name===name);if(!old)throw Error('Missing previous capture '+name);return old;}
 const context=await browser.newContext({viewport:{width:1000,height:1100},recordVideo:{dir:path.join(out,'raw'),size:{width:1000,height:1100}},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 await page.goto(url);await page.getByRole('button',{name:'Click to Play',exact:true}).waitFor({timeout:60000});
 await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(seed=>{
  const q=window.mikanraQA,s=q.newShift(seed.day??1),c=q.getCustomer({...q.newShift(seed.day??1),customer:seed.customer??0});
  s.customer=seed.customer??0;s.hired=true;s.stage=seed.stage??'briefing';
  if(s.stage==='brew')s.ticket={drink:c.drink,count:c.count};
  if(seed.greeted)s.greeted=true;
  if(seed.teaReady){s.service.tea='ready';s.service.teaLeft=c.count;s.service.portions=c.count;s.service.hotWater=1;s.service.kettle='hot';}
  q.save(s);
 },seed)]);
 await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});
 await page.waitForFunction(()=>window.mikanraQA.engine?.active);
 await page.addStyleTag({content:'body>details,.rail-objective,.rail-game-hint,.play-tools,.street-location,.workbench-hint,.order-ticket,.service-toast{display:none!important}'});
 if(setup)await setup(page);
 if(['01-cafe','03-coffee','04-tea'].includes(name)){
  for(const size of [{width:1440,height:900},{width:1000,height:700}]){
   await page.setViewportSize(size);await pause(page,300);await page.screenshot({path:path.join(out,`${name}-${size.width}.png`)});
  }
  await page.setViewportSize({width:1000,height:1100});
 }
 await pause(page,400);
 const start=Date.now();if(action)await action(page);
 await pause(page,Math.max(0,seconds*1000-(Date.now()-start)));
 await page.screenshot({path:path.join(out,name+'.png')});
 const video=page.video();await context.close();await video.saveAs(path.join(out,name+'.webm'));
 console.log('Captured '+name);
 return{name,seconds};
}
async function aim(page,id){await page.evaluate(id=>window.mikanraQA.aim(id),id);await pause(page,250);await page.waitForFunction(id=>window.mikanraQA.engine.interaction.currentTarget?.id===id,id);}
async function work(page,drink){await aim(page,'shift-'+drink);await page.keyboard.press('KeyE');await page.getByRole('region',{name:'Café workbench'}).waitFor();}
(async()=>{
 const browser=await launchBrowser();const clips=[];
 try{
  const beauty=page=>page.evaluate(()=>{const e=window.mikanraQA.engine;e.position.set(100,.03,102.1);e.motor.teleport(e.position);e.resetMovement();e.yaw=0;e.pitch=-.03;e.beginPlay('mouse');e.guidance?.removeFromParent();});
  clips.push(await shot(browser,'01-cafe',{day:1},beauty,null,4.5));
  clips.push(await shot(browser,'02-order',{day:1,stage:'order'},async page=>{await aim(page,'shift-customer');await page.keyboard.press('KeyE');},async page=>{await pause(page,500);const reveal=page.getByRole('button',{name:'Show text',exact:true});if(await reveal.isVisible())await reveal.click();await page.getByRole('button').filter({hasText:'いらっしゃいませ'}).last().click();},5.5));
  clips.push(await shot(browser,'03-coffee',{day:1,stage:'brew'},page=>work(page,'coffee'),async page=>{for(let n=0;n<3;n++){await page.locator('.bench-primary').click();await pause(page,450);}await pause(page,6100);},8));
  clips.push(await shot(browser,'04-tea',{day:2,stage:'brew',teaReady:true},page=>work(page,'tea'),async page=>{await pause(page,650);await page.keyboard.down('KeyE');await pause(page,1250);await page.keyboard.up('KeyE');await pause(page,2300);await page.keyboard.press('Escape');},6.5));
  clips.push(await shot(browser,'05-friends',{day:5,stage:'order',greeted:true},async page=>{await aim(page,'shift-customer');await page.keyboard.press('KeyE');const reveal=page.getByRole('button',{name:'Show text',exact:true});if(await reveal.isVisible())await reveal.click();await page.locator('.customer-chat-button').click();},async page=>{await pause(page,1700);const reveal=page.getByRole('button',{name:'Show text',exact:true});if(await reveal.isVisible())await reveal.click();await page.locator('.chat-reply').first().click();},4.5));
  clips.push(await shot(browser,'06-mikanra',{day:1},beauty,null,4.5));
  fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({viewport:{width:1000,height:1100},edited:true,clips},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
