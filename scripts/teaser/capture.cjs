// Offline cinematic capture: scene and service state advance at exactly 30 fps.
const fs=require('node:fs');
const path=require('node:path');
const {launchBrowser}=require('../../tests/browser/helpers.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'output/teaser-cinematic');
const frames=path.join(out,'frames');fs.mkdirSync(frames,{recursive:true});
const preview=process.argv.includes('--preview');
const requested=process.argv.find(arg=>arg.startsWith('--frames='))?.slice(9).split(',').map(Number);
const url=new URL('/tests/browser/fixtures/cafe.html',process.env.MIKANRA_E2E_URL||'http://127.0.0.1:4175').href;
(async()=>{
 const browser=await launchBrowser();
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  await page.addInitScript(()=>localStorage.setItem('mikanra.chapter-one.v1',JSON.stringify({version:1,hired:true,stage:'order',day:2,customer:0,tray:[],relationships:[1,0,0]})));
  await page.goto(url);await page.getByRole('button',{name:'Continue café',exact:true}).click();
  await page.waitForFunction(()=>window.mikanraQA.engine?.active);
  await page.addScriptTag({path:path.join(__dirname,'node_modules/gsap/dist/gsap.min.js')});
  await page.addStyleTag({path:path.join(__dirname,'composition.css')});
  await page.evaluate(async()=>{await document.fonts.load('500 78px Outfit');await document.fonts.ready;});
  await page.addScriptTag({path:path.join(__dirname,'composition.js')});
  const setup=await page.evaluate(()=>window.prepareFilm());
  const storyboard=await page.evaluate(()=>window.filmStoryboard),selected=requested??(preview?[18,150,300,420,630,820]:Array.from({length:900},(_,i)=>i));
  if(selected.some(n=>!Number.isInteger(n)||n<0||n>=900))throw Error('Frame selections must be integers from 0 to 899.');
  for(const frame of selected){
   await page.evaluate(frame=>window.filmFrame(frame),frame);
   await page.screenshot({path:path.join(preview?out:frames,preview?`preview-${String(frame).padStart(4,'0')}.png`:`${String(frame).padStart(4,'0')}.png`),animations:'allow'});
   if(preview||frame%90===0)console.log(`Captured ${preview?'preview ':''}${frame}/900`);
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({width:1080,height:1920,fps:30,frames:900,edited:true,deterministic:true,...setup,storyboard,errors},null,2));
  console.log('PASS cinematic capture: actual one-cup tea service, two GSAP title moments.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
