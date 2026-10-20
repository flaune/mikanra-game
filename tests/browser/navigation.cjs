const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {launchBrowser,fixtureUrl,output,viewport}=require('./helpers.cjs');
(async()=>{
 const browser=await launchBrowser();
 const page=await browser.newPage({viewport,deviceScaleFactor:process.env.CI?.5:1,reducedMotion:'reduce'});
 page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Interactive assertions read current simulation state; storage writes are throttled.
 const state=()=>page.evaluate(()=>window.mikanraQA.engine.shift);
 const pose=()=>page.evaluate(()=>{const e=window.mikanraQA.engine;return{x:e.position.x,z:e.position.z,yaw:e.yaw};});
 async function screenshot(name){await page.addStyleTag({content:'body>details{display:none!important}'});await page.screenshot({path:path.join(output,'walk-'+name+'.png')});}
 async function axis(key,axis,target,sign){
  await page.keyboard.down(key);
  try{await page.waitForFunction(([axis,target,sign])=>sign*(window.mikanraQA.engine.position[axis]-target)>=0,[axis,target,sign],{timeout:60000});}
  finally{await page.keyboard.up(key);}
 }
 async function face(id){
  for(let n=0;n<60;n++){
   const delta=await page.evaluate(id=>{const e=window.mikanraQA.engine,t=e.worldData.interactables.find(t=>t.id===id),p=t.mesh.getWorldPosition(e.position.clone());const yaw=Math.atan2(e.position.x-p.x,e.position.z-p.z);const pitch=Math.atan2(1.43-e.camera.position.y,Math.hypot(e.position.x-p.x,e.position.z-p.z));return {hit:e.interaction.currentTarget?.id,yaw:Math.atan2(Math.sin(yaw-e.yaw),Math.cos(yaw-e.yaw)),pitch:pitch-e.pitch};},id);
   // Stop on the real prompt. Software-rendered key pulses can span several frames;
   // the fallback tolerance stays inside the game's existing .28-radian aim cone.
   if(delta.hit===id||(Math.abs(delta.yaw)<.22&&Math.abs(delta.pitch)<.25))return;
   const horizontal=Math.abs(delta.yaw)>.22;
   const error=horizontal?delta.yaw:delta.pitch;
   const key=horizontal?(error>0?'ArrowLeft':'ArrowRight'):(error>0?'ArrowUp':'ArrowDown');
   await page.keyboard.down(key);await page.waitForTimeout(Math.max(30,Math.min(350,Math.abs(error)/(horizontal?1.5:1.1)*800)));await page.keyboard.up(key);
  }
  throw Error('Could not face '+id+' using arrow look controls');
 }
 async function use(id){await face(id);await page.waitForFunction(id=>{const hit=window.mikanraQA.engine.interaction.currentTarget?.id;return ['shift-customer','shift-register'].includes(id)?hit===id:hit?.startsWith('shift-')&&!['shift-customer','shift-register'].includes(hit);},id);await page.keyboard.press('KeyE');}
 let interrupted=false;
 async function hold(){
  await page.keyboard.down('KeyE');
  try{
   await page.waitForFunction(()=>!!window.mikanraQA.engine.cafeService.manual);
   if(!interrupted){
    await page.waitForTimeout(350);await page.keyboard.up('KeyE');
    await page.getByRole('button',{name:'Pause',exact:false}).click();
    const before=await page.evaluate(()=>window.mikanraQA.engine.cafeService.manual.elapsed);await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>window.mikanraQA.engine.cafeService.manual.elapsed),before);
    await page.getByRole('button',{name:'BACK TO THE CAFÉ',exact:false}).click();
    await page.keyboard.press('KeyJ');await page.getByRole('dialog').waitFor();await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>window.mikanraQA.engine.cafeService.manual.elapsed),before);
    await page.getByRole('button',{name:'Close notebook or lesson'}).click();
    await page.keyboard.down('KeyE');interrupted=true;
   }
   await page.waitForFunction(()=>!window.mikanraQA.engine.cafeService.manual,undefined,{timeout:60000});
  }finally{await page.keyboard.up('KeyE');}
 }

 try{
  await page.goto(fixtureUrl);
  await page.getByRole('button',{name:'Click to Play',exact:true}).waitFor({timeout:60000});
  await Promise.all([page.waitForEvent('domcontentloaded'),page.evaluate(()=>{const q=window.mikanraQA,s=q.newShift(2),c=q.getCustomer(s);s.hired=true;s.stage='brew';s.ticket={drink:c.drink,count:c.count};q.save(s);})]);
  await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});
  await page.waitForFunction(()=>window.mikanraQA.engine.active);
  await screenshot('entrance');
  // Normal WASD movement from the saved café entrance. No player/camera teleportation.
  await axis('KeyW','z',100.65,-1);await axis('KeyD','x',102.0,1);await axis('KeyW','z',97.65,-1);
  await screenshot('staff-aisle');
  const shift=await state(),customer=await page.evaluate(()=>window.mikanraQA.getCustomer(window.mikanraQA.shift()));
  await use('shift-'+customer.drink);await page.getByRole('region',{name:'Café workbench'}).waitFor();
  const before=await pose();await page.keyboard.down('KeyW');await page.waitForTimeout(300);await page.keyboard.up('KeyW');const after=await pose();assert.ok(Math.hypot(before.x-after.x,before.z-after.z)<.02,'Working cannot move the player');
  await screenshot('workbench');
  for(let n=0;n<80&&(await state()).tray.length<customer.count;n++){
   const button=page.locator('.bench-primary');
   if(await button.isDisabled()){await page.waitForTimeout(500);continue;}
   if((await button.innerText()).startsWith('Hold'))await hold();else{await button.click();await page.waitForTimeout(250);}
  }
  assert.equal((await state()).tray.length,customer.count);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.workbench-panel').count(),0);
  await use('shift-customer');await page.getByRole('button').filter({hasText:'どうぞ'}).last().click();await page.getByRole('button',{name:'Return to work',exact:true}).click();
  await use('shift-register');await page.getByRole('group',{name:'Thank your customer'}).getByRole('button').filter({hasText:'ありがとうございます'}).click();
  if(customer.total){await page.getByRole('textbox',{name:'Bill amount'}).fill(String(customer.total));await page.getByRole('textbox',{name:'Change amount'}).fill(String((customer.total<=500?500:1000)-customer.total));await page.getByRole('button',{name:'Return change · Finish the visit',exact:true}).click();}else await page.getByRole('button',{name:'Finish the visit',exact:true}).click();
  await page.getByRole('button',{name:'Return to work',exact:true}).click();
  assert.equal((await state()).customer,shift.customer+1);
  await use('shift-sink');await hold();assert.equal((await state()).service.vessels.filter(c=>c.state==='dirty').length,0);
  await screenshot('cleanup');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.mikanraQA.engine.worldData.customerService.people[1].phase==='serving',undefined,{timeout:30000});
  await face('shift-customer');await screenshot('customer-handoff');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'navigation-results.json'),JSON.stringify({passed:true,errors,verified:['WASD entrance to staff aisle','normal look/E workbench entry','movement locked during work','pause/notebook retain a partial pour','guided preparation','serving and payment','batch washing','customer handoff'],teleports:0},null,2));
  console.log('PASS normal walking, workbench controls, service, cleanup and customer handoff.');
 }catch(error){await screenshot('failure').catch(()=>{});console.error('POSE',await pose().catch(()=>null));console.error('BODY',(await page.locator('body').innerText()).slice(0,1800));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
