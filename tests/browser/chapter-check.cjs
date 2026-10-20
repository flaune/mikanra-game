const { launchBrowser, output, fixtureUrl, viewport } = require('./helpers.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await launchBrowser();
 const page=await browser.newPage({viewport,reducedMotion:process.env.CI?'reduce':'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function summary(){await page.getByRole('button',{name:'Continue café',exact:true}).click({timeout:60000});await page.evaluate(()=>window.mikanraQA.aim('shift-register'));await page.waitForFunction(()=>window.mikanraQA.engine.interaction.currentTarget?.id==='shift-register');await page.keyboard.press('KeyE');await page.getByRole('heading',{name:'A place to belong.',exact:true}).waitFor();}
 try{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('check-fixture')){localStorage.setItem('mikanra.chapter-one.v1',JSON.stringify({version:1,stage:'done',customer:2,day:7,hired:true,chapterCompleted:true,relationships:[6,6,6],tray:[]}));localStorage.removeItem('mikanra.learning.v1');sessionStorage.setItem('check-fixture','1');}});
  await page.goto(fixtureUrl);await summary();await page.getByRole('button',{name:'Try the Japanese check',exact:true}).click();await page.getByRole('button',{name:'Show meaning',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mikanra.learning.v1')).chapterCheckHelp?.includes(0));await page.reload();await summary();await page.getByRole('button',{name:'Try the Japanese check',exact:true}).click();await page.getByRole('button',{name:'Meaning shown',exact:true}).waitFor();
  for(const answer of ['One tea','Two coffees','どうぞ']){await page.getByRole('group',{name:'Choose your answer'}).getByRole('button',{name:answer,exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();}
  await page.getByText('2/3 understood independently · 1 with help · 0 to revisit.',{exact:false}).waitFor();
  const results=await page.evaluate(()=>JSON.parse(localStorage.getItem('mikanra.learning.v1')).chapterCheck);assert.deepEqual(results,[{correct:true,assisted:true},{correct:true,assisted:false},{correct:true,assisted:false}]);await page.screenshot({path:path.join(output,'chapter-one-learning-results.png')});
  await page.reload();await summary();await page.getByRole('button',{name:'View Japanese check results',exact:true}).click();await page.getByText('2/3 understood independently · 1 with help · 0 to revisit.',{exact:false}).waitFor();await page.getByRole('button',{name:'Keep running the café',exact:false}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mikanra.chapter-one.v1')).day===8);const shift=await page.evaluate(()=>window.mikanraQA.shift());assert.equal(shift.chapterCompleted,true);assert.equal(shift.stage,'briefing');assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'chapter-check-results.json'),JSON.stringify({passed:true,results,freePlayDay:shift.day,errors},null,2));console.log('PASS: pending help, all three answers, results after reload, and day-eight continuation.');
 }catch(e){await page.screenshot({path:path.join(output,'chapter-check-failure.png')});console.error((await page.locator('body').innerText()).slice(0,4000));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
