const { launchBrowser, output, fixtureUrl, viewport } = require('./helpers.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport, deviceScaleFactor: process.env.CI ? .5 : 1, reducedMotion: process.env.CI ? 'reduce' : 'no-preference' });
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
    await page.evaluate(id=>window.mikanraQA.aim(id),id);
    await page.waitForFunction(id=>window.mikanraQA.engine.interaction.currentTarget?.id===id,id,{timeout:30000});
  }
  async function use(id) {
    await aim(id);await page.keyboard.press('KeyE');await page.waitForTimeout(200);
    const reveal=page.getByRole('button',{name:'Show text',exact:true});if(await reveal.isVisible())await reveal.click();
  }
  async function hold() {
    await page.keyboard.down('KeyE');
    await page.waitForFunction(()=>!!window.mikanraQA.engine.cafeService.manual,undefined,{timeout:30000});
    await page.waitForFunction(()=>!window.mikanraQA.engine.cafeService.manual,undefined,{timeout:60000});
    await page.keyboard.up('KeyE');await page.waitForTimeout(200);
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
    await use('shift-'+c.drink);
    for(let n=0;n<100;n++){
      const snapshot=await page.evaluate(()=>{const q=window.mikanraQA;return {tray:q.shift().tray,manual:q.engine.cafeService.manual};});
      if(snapshot.tray.length>=c.count){await page.keyboard.press('Escape');return;}
      const button=page.locator('.bench-primary');
      if(await button.isDisabled()){
        if(capture){
          await screen('tea-steeping');assert.equal(await page.locator('[data-rive-loaded="true"]').count(),1);
          await page.getByRole('button',{name:'Pause',exact:false}).click();
          const before=await page.evaluate(()=>window.mikanraQA.engine.cafeService.kettleTime||window.mikanraQA.engine.cafeService.teaTime);
          await page.waitForTimeout(500);
          assert.equal(await page.evaluate(()=>window.mikanraQA.engine.cafeService.kettleTime||window.mikanraQA.engine.cafeService.teaTime),before);
          await page.getByRole('button',{name:'BACK TO THE CAFÉ',exact:false}).click();capture=false;
        }
        await page.waitForTimeout(500);continue;
      }
      if((await button.innerText()).startsWith('Hold'))await hold();else{await button.click();await page.waitForTimeout(250);}
    }
    throw Error('Guided recipe did not complete '+JSON.stringify(await state()));
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
    assert.ok((await state()).service.vessels.some(v=>v.state==='dirty'));await use('shift-sink');await hold();await page.keyboard.press('Escape');assert.equal((await state()).service.vessels.filter(v=>v.state==='dirty').length,0);
    await use('shift-pantry');await page.getByRole('button',{name:'Refill supplies',exact:true}).click();await page.locator('.bench-primary').click();await page.keyboard.press('Escape');assert.equal((await state()).service.stock.tea,4);
    await page.evaluate(()=>{const qa=window.mikanraQA,s=qa.shift();s.stage='report';s.customer=2;qa.save(s);});await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});
    await use('shift-register');await page.getByRole('button',{name:'Finish closing tasks',exact:true}).click();
    await use('shift-return');for(let n=0;n<12;n++){const task=await page.evaluate(()=>window.mikanraQA.closingStep(window.mikanraQA.engine.cafeService));if(!task)break;if(task.hold)await hold();else{await page.locator('.bench-primary').click();await page.waitForTimeout(250);}}await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>window.mikanraQA.closingStep(window.mikanraQA.engine.cafeService)),null);await use('shift-register');await screen('later-day-clean-closing');await page.getByRole('button',{name:'Close the café',exact:true}).click();
    await page.evaluate(()=>{const qa=window.mikanraQA,s=qa.newShift(7,{relationships:[6,6,6]});s.stage='report';s.customer=2;s.hired=true;qa.save(s);});await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});await use('shift-register');await page.getByRole('button',{name:'Close the café · Join the reading evening',exact:true}).click();await page.getByRole('button',{name:'Try the Japanese check',exact:true}).click();await screen('chapter-one-check');
    await page.evaluate(()=>{const qa=window.mikanraQA,s=qa.newShift(3),c=qa.getCustomer(s),drink=c.drink==='water'?'tea':'water';s.hired=true;s.stage='brew';s.ticket={drink:c.drink,count:c.count};s.tray=[drink];s.service.vessels[0]={id:0,state:'tray',drink,perfect:false};qa.save(s);});
    await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});await use('shift-return');
    await page.getByRole('button',{name:'E · Return the extra or incorrect cups',exact:true}).click();
    assert.equal((await state()).tray.length,0);await page.keyboard.press('Escape');
    const fallback=await browser.newPage({viewport:{width:1000,height:700}});await fallback.emulateMedia({reducedMotion:'reduce'});await fallback.route('**/rive/cafe-feedback.riv',route=>route.abort());
    await fallback.addInitScript(()=>localStorage.setItem('mikanra.chapter-one.v1',JSON.stringify({version:1,hired:true,stage:'brew',day:2,customer:0,helped:true,tray:[],service:{vessels:Array.from({length:4},(_,id)=>({id,state:'clean'})),kettle:'heating',kettleTime:8,hotWater:2}})));
    await fallback.goto(url);await fallback.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});await fallback.evaluate(()=>window.mikanraQA.aim('shift-tea'));await fallback.waitForTimeout(200);await fallback.keyboard.press('KeyE');await fallback.locator('.rive-fallback').waitFor({timeout:30000});assert.equal(await fallback.locator('.cafe-work').count(),1);await fallback.screenshot({path:path.join(output,'rive-fallback.png')});await fallback.close();
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'preparation-results.json'),JSON.stringify({passed:true,errors,firstDaySales:1150,verified:['three recipes','two-cup tea','local Rive','pause freezes brewing','cup washing','pantry','closing cleanup','Rive fallback','waiting neighbor','finale and optional check']},null,2));console.log('PASS café preparation, day one, later management, local Rive, pause, and finale.');
  } catch(error){await screen('preparation-failure').catch(()=>{});console.error('BROWSER ERRORS',errors);console.error('STATE',JSON.stringify(await state()));console.error('BODY',(await page.locator('body').innerText()).slice(0,3500));throw error;} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
