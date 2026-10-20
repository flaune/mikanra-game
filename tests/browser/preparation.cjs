const { launchBrowser, output, fixtureUrl, viewport } = require('./helpers.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const url = fixtureUrl;
  const state = () => page.evaluate(() => window.mikanraQA.shift());
  async function screen(name) { await page.addStyleTag({ content: 'body > details { display: none !important; }' }); await page.screenshot({ path: path.join(output,name+'.png') }); }
  async function fixture(day) {
    await page.evaluate(day => {const qa=window.mikanraQA;const s=qa.newShift(day);s.hired=true;qa.save(s);},day);
    await page.waitForLoadState('domcontentloaded'); await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});
    await page.waitForFunction(() => window.mikanraQA.engine?.inCafe); await page.waitForTimeout(200);
  }
  async function aim(id) {
    await page.evaluate(id => {
      const qa=window.mikanraQA,e=qa.engine,t=e.worldData.interactables.find(t=>t.id===id),p=t.mesh.getWorldPosition(e.position.clone());
      const back=p.z<97.4;const z=id==='shift-customer'?p.z-1.25:id==='barista'?p.z+1.35:back?p.z+.85:Math.max(96.85,p.z-.85);
      e.position.set(p.x,.03,z);e.motor.teleport(e.position);e.resetMovement();e.yaw=id==='barista'||back?0:Math.PI;e.pitch=id==='barista'?0:Math.atan2(1.24-1.69,Math.abs(p.z-z));e.beginPlay('mouse');e.camera.position.copy(e.position);e.camera.position.y+=1.66;e.camera.rotation.set(e.pitch,e.yaw,0);
    },id);
    await page.waitForFunction(id => window.mikanraQA.engine.interaction.currentTarget?.id === id,id,{timeout:30000});
  }
  async function use(id,hold=false) {
    await aim(id);
    if(hold){
      await page.keyboard.down('KeyE');
      await page.waitForFunction(station=>window.mikanraQA.engine.cafeService.manual?.station===station,id.replace('shift-',''),{timeout:30000});
      await page.waitForFunction(()=>!window.mikanraQA.engine.cafeService.manual,undefined,{timeout:60000});
      await page.keyboard.up('KeyE');
    }else await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    const reveal=page.getByRole('button',{name:'Show text',exact:true});if(await reveal.isVisible())await reveal.click();
  }
  async function open() {await use('shift-register');await page.getByRole('button',{name:'Open the café',exact:true}).click();await page.waitForTimeout(200);}
  async function takeOrder() {
    const c=await page.evaluate(()=>window.mikanraQA.getCustomer(window.mikanraQA.shift()));await use('shift-customer');
    await page.getByRole('button').filter({hasText:'いらっしゃいませ'}).last().click();
    const drinks=page.getByRole('group',{name:'Choose a drink'});await drinks.getByRole('button').filter({hasText:({coffee:'コーヒー',tea:'お茶',water:'水'})[c.drink]}).click();
    await page.getByRole('group',{name:'Choose number of cups'}).getByRole('button').filter({hasText:c.count===1?'一つ':'二つ'}).click();
    await page.getByRole('button',{name:'Repeat the order',exact:true}).click();if(await page.getByRole('button',{name:'Show text',exact:true}).isVisible())await page.getByRole('button',{name:'Show text',exact:true}).click();await page.getByRole('button',{name:'Return to work',exact:true}).click();await page.waitForTimeout(200);return c;
  }
  async function cook(c,capture=false) {
    if(c.drink==='tea'){await page.keyboard.press(c.count===2?'Digit2':'Digit1');await page.waitForTimeout(150);}
    for(let n=0;n<65;n++){
      const snapshot=await page.evaluate(()=>{const qa=window.mikanraQA,s=qa.shift();return {tray:s.tray,task:qa.nextServiceStep(qa.engine.cafeService,s.ticket.drink,s.day)};});
      if(snapshot.tray.length>=c.count)return;
      const t=snapshot.task;
      if(t.waiting){
        if(capture && c.drink==='tea'){
          await screen('tea-steeping');assert.equal(await page.locator('[data-rive-loaded="true"]').count(),1,'Rive should load locally');
          await page.keyboard.press('Escape');const paused=await page.evaluate(()=>window.mikanraQA.engine.cafeService.teaTime || window.mikanraQA.engine.cafeService.kettleTime);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.mikanraQA.engine.cafeService.teaTime || window.mikanraQA.engine.cafeService.kettleTime),paused);await page.evaluate(()=>window.mikanraQA.engine.beginPlay('mouse'));capture=false;
        }
        await page.waitForTimeout(1000);continue;
      }
      await use('shift-'+t.station,!!t.hold);
    }
    throw Error('Recipe did not complete '+JSON.stringify(await state()));
  }
  async function serveAndPay(c){
    await use('shift-customer');await page.getByRole('button').filter({hasText:'どうぞ'}).last().click();await page.getByRole('button',{name:'Return to work',exact:true}).click();
    await use('shift-register');await page.getByRole('group',{name:'Thank your customer'}).getByRole('button').filter({hasText:'ありがとうございます'}).click();if(c.total){await page.getByRole('textbox',{name:'Bill amount'}).fill(String(c.total));await page.getByRole('textbox',{name:'Change amount'}).fill(String((c.total<=500?500:1000)-c.total));await page.getByRole('button',{name:'Return change · Finish the visit',exact:true}).click();}else await page.getByRole('button',{name:'Finish the visit',exact:true}).click();
    await page.getByRole('button',{name:'Return to work',exact:true}).click();
  }
  try {
    await page.goto(url);await page.getByRole('button',{name:'Click to Play',exact:true}).waitFor({timeout:60000});
    await fixture(1);await open();for(let i=0;i<3;i++){const c=await takeOrder();await cook(c,i===1);await screen('first-day-'+c.drink);await serveAndPay(c);}
    assert.equal((await state()).stage,'report');assert.equal((await state()).earnings,1150);await use('shift-register');await page.getByRole('button',{name:'Close the café',exact:true}).click();await screen('first-day-report');
    await fixture(5);await open();const c=await takeOrder();assert.equal(await page.evaluate(()=>window.mikanraQA.engine.worldData.customerService.group.children.filter(c=>c.visible).length),2,'Active and waiting customer visible');await cook(c);await serveAndPay(c);await screen('later-day-queue');
    const dirty=(await state()).service.vessels.filter(v=>v.state==='dirty').length;assert.ok(dirty>0);await use('shift-sink',true);assert.equal((await state()).service.vessels.filter(v=>v.state==='dirty').length,dirty-1);
    await use('shift-pantry');assert.equal((await state()).service.stock.tea,4);
    await page.evaluate(()=>{const qa=window.mikanraQA,s=qa.shift();s.stage='report';s.customer=2;qa.save(s);});await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});
    await use('shift-register');await page.getByRole('button',{name:'Finish closing tasks',exact:true}).click();
    for(let n=0;n<12;n++){const task=await page.evaluate(()=>window.mikanraQA.closingStep(window.mikanraQA.engine.cafeService));if(!task)break;await use('shift-'+task.station,!!task.hold);}
    assert.equal(await page.evaluate(()=>window.mikanraQA.closingStep(window.mikanraQA.engine.cafeService)),null);await use('shift-register');await screen('later-day-clean-closing');await page.getByRole('button',{name:'Close the café',exact:true}).click();
    await page.evaluate(()=>{const qa=window.mikanraQA,s=qa.newShift(7,{relationships:[6,6,6]});s.stage='report';s.customer=2;s.hired=true;qa.save(s);});await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});await use('shift-register');await page.getByRole('button',{name:'Close the café · Join the reading evening',exact:true}).click();await page.getByRole('button',{name:'Try the Japanese check',exact:true}).click();await screen('chapter-one-check');
    const fallback=await browser.newPage({viewport:{width:1000,height:700}});await fallback.emulateMedia({reducedMotion:'reduce'});await fallback.route('**/rive/cafe-feedback.riv',route=>route.abort());
    await fallback.addInitScript(()=>localStorage.setItem('mikanra.chapter-one.v1',JSON.stringify({version:1,hired:true,stage:'brew',day:2,customer:0,helped:true,tray:[],service:{vessels:Array.from({length:4},(_,id)=>({id,state:'clean'})),kettle:'heating',kettleTime:8,hotWater:2}})));
    await fallback.goto(url);await fallback.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});await fallback.locator('.rive-fallback').waitFor();assert.equal(await fallback.locator('.cafe-work').count(),1);await fallback.screenshot({path:path.join(output,'rive-fallback.png')});await fallback.close();
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'preparation-results.json'),JSON.stringify({passed:true,errors,firstDaySales:1150,verified:['three recipes','two-cup tea','local Rive','pause freezes brewing','cup washing','pantry','closing cleanup','Rive fallback','waiting neighbor','finale and optional check']},null,2));console.log('PASS café preparation, day one, later management, local Rive, pause, and finale.');
  } catch(error){await screen('preparation-failure').catch(()=>{});console.error('STATE',JSON.stringify(await state()));console.error('BODY',(await page.locator('body').innerText()).slice(0,3500));throw error;} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
