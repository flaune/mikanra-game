const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/game/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>imports[name]});return exports;}
const service=load('cafeService'),chapter=load('chapterOne',{'./cafeService':service});
function kitchen(drink='coffee',count=1,day=3,initial){
 let state=initial??service.freshService();
 const act=action=>{state=service.actService(state,action,day).state;assert.equal(state.vessels.length,4);assert.ok(service.trayVessels(state).length<=2);return state;};
 return {get state(){return state;},act,step(mode='recipe'){return service.guidedStep(state,drink,count,day,mode);},press(mode='recipe'){const step=this.step(mode);if(step)act({type:'guided',step:step.key,drink,count,mode});return step;},tick(seconds,held){for(let n=0;n<Math.ceil(seconds/.1);n++)act({type:'tick',seconds:.1,held});},reload(){state=service.readService(JSON.parse(JSON.stringify(state)));}};
}
test('three coffee gestures use one dose and automatically collect the real cup',()=>{
 const k=kitchen();const first=k.press();assert.equal(k.state.coffee,'ground');
 k.act({type:'guided',step:first.key,drink:'coffee',count:1});assert.equal(k.state.coffee,'ground','A stale double click cannot skip preparation');
 k.press();assert.equal(k.state.coffee,'locked');k.press();assert.equal(k.state.coffee,'extracting');
 k.tick(6.1);assert.equal(k.state.coffee,'empty');assert.equal(service.trayVessels(k.state)[0].drink,'coffee');assert.equal(k.state.stock.coffee,1);assert.equal(k.step(),null);
});
test('two teas use the confirmed batch and resume partial pours after reload',()=>{
 const k=kitchen('tea',2);k.press();assert.equal(k.state.kettle,'heating');k.press();assert.equal(k.state.portions,2);assert.equal(k.state.stock.tea,0);
 k.tick(8.1);k.press();assert.equal(k.state.tea,'steeping');k.reload();k.tick(6.1);
 for(let i=0;i<2;i++){const step=k.press();assert.equal(step.station,'tea');k.tick(.5,'tea');k.act({type:'release'});k.reload();assert.equal(k.state.manual.elapsed,.5);k.tick(.7,'tea');k.act({type:'release'});k.reload();}
 assert.equal(service.trayVessels(k.state).length,2);assert.equal(k.state.vessels.filter(v=>v.state==='clean').length,2);assert.equal(k.state.tea,'empty');
});
test('water reserves and collects one glass; repeated stale input cannot fill another',()=>{
 const k=kitchen('water');const step=k.press();k.tick(1.7,'water');k.act({type:'guided',step:step.key,drink:'water',count:1});
 assert.equal(service.trayVessels(k.state).length,1);assert.equal(k.state.vessels.filter(v=>v.state==='clean').length,3);
});
test('batch washing takes three seconds, survives reload and leaves served vessels alone',()=>{
 const s=service.freshService();s.vessels=s.vessels.map((v,i)=>({...v,state:i===3?'served':'dirty'}));
 const k=kitchen('coffee',1,3,s);k.press('wash');k.tick(1,'sink');k.reload();assert.equal(k.state.manual.batch,true);k.tick(1.9,'sink');assert.equal(k.state.washed,0);k.tick(.2,'sink');
 assert.equal(k.state.washed,3);assert.equal(k.state.vessels[3].state,'served');assert.equal(k.state.manual,undefined);
});
test('old partially prepared recipes and trays remain usable',()=>{
 const s=service.freshService();s.coffee='tamped';const k=kitchen('coffee',1,2,service.readService(s));k.press();assert.equal(k.state.coffee,'locked');k.press();k.tick(6.1);k.reload();assert.equal(k.step(),null);
 const legacy=service.readService(null,['tea','tea'],[true,false]);assert.equal(service.guidedStep(legacy,'tea',2),null);
});

test('wrong and excess legacy tray cups can be returned directly from guided preparation',()=>{
 for(const tray of [['water'],['coffee','coffee']]){
  const k=kitchen('coffee',1,3,service.readService(null,tray));
  k.reload();assert.equal(k.step().station,'return');k.press();
  assert.equal(service.trayVessels(k.state).length,0);
  assert.equal(k.state.vessels.length,4);assert.equal(k.state.vessels.filter(c=>c.state==='dirty').length,tray.length);
  assert.notEqual(k.step().station,'return');
 }
});
test('missing cups and supplies lead directly to recoverable chores',()=>{
 const s=service.freshService();s.vessels=s.vessels.map(v=>({...v,state:'dirty'}));s.stock.coffee=0;
 const k=kitchen('coffee',1,3,s);assert.equal(k.press().station,'pantry');assert.equal(k.state.stock.coffee,4);k.press();k.press();assert.equal(k.step().station,'sink');k.press();k.tick(3.1,'sink');k.press();k.tick(6.1);assert.equal(k.step(),null);
});
test('guided closing returns equipment, washes a batch and wipes without losing vessels',()=>{
 const s=service.freshService();s.kettle='hot';s.hotWater=2;s.counterDirty=true;s.vessels[0].state='dirty';
 const k=kitchen('coffee',1,4,s);assert.equal(k.press('cleanup').station,'return');assert.equal(k.press('cleanup').station,'sink');k.tick(3.1,'sink');assert.equal(k.press('cleanup').station,'wipe');k.tick(2.1,'wipe');assert.equal(k.step('cleanup'),null);
});
test('all story and free-play days finish using guided actions and reloadable saves',()=>{
 for(let day=1;day<=13;day++){
  let state=chapter.actShift(chapter.newShift(day),{type:'begin'}).state;
  const act=a=>{state=chapter.readShift(JSON.stringify(chapter.actShift(state,a).state));};
  for(let visit=0;visit<3;visit++){
   const c=chapter.getCustomer(state);act({type:'greet',correct:true});act({type:'take-order',drink:c.drink,count:c.count});
   for(let n=0;n<700&&state.tray.length<c.count;n++){
    const step=service.guidedStep(state.service,c.drink,c.count,day);assert.ok(step);
    if(!step.waiting)act({type:'service',action:{type:'guided',step:step.key,drink:c.drink,count:c.count}});
    for(let t=0;t<5;t++)act({type:'service',action:{type:'tick',seconds:.1,held:step.hold?step.station:undefined}});
   }
   assert.equal(state.tray.length,c.count);act({type:'serve'});if(c.total)act({type:'checkout',total:c.total,change:chapter.paymentFor(state)-c.total});else act({type:'collect'});
  }
  assert.equal(state.stage,'report');
  for(let n=0;n<30;n++){const step=service.guidedStep(state.service,'coffee',1,day,'cleanup');if(!step)break;act({type:'service',action:{type:'guided',step:step.key,drink:'coffee',count:1,mode:'cleanup'}});for(let t=0;t<32;t++)act({type:'service',action:{type:'tick',seconds:.1,held:step.hold?step.station:undefined}});}
  act({type:'finish'});assert.equal(state.stage,'done',`day ${day} closes`);
 }
});
