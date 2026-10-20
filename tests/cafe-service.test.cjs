const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=(file,imports={})=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/game/${file}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>imports[name]});return exports;};
const service=load('cafeService'),learning=load('learning'),chapter=load('chapterOne',{'./cafeService':service});
function kitchen(day=3){let s=service.freshService();return {get state(){return s;},act(a){const result=service.actService(s,a,day);s=result.state;return result;},at(station){return this.act({type:'station',station});},tick(seconds,held){for(let i=0;i<Math.ceil(seconds/.25);i++)this.act({type:'tick',seconds:.25,held});},reload(){s=service.readService(JSON.parse(JSON.stringify(s)));}};}
test('tea is a two-cup batch with conserved vessels and ingredient doses',()=>{
 const k=kitchen();k.act({type:'portions',count:2});k.at('tea');assert.equal(k.state.stock.tea,0);k.at('tea');assert.equal(k.state.tea,'leaves','Cold water cannot brew tea');
 k.at('kettle');k.at('kettle');k.tick(8);k.at('tea');assert.equal(k.state.tea,'steeping');k.at('tray');assert.equal(service.trayVessels(k.state).length,0);
 k.tick(6);for(let i=0;i<2;i++){k.at('cups');k.at('tea');k.tick(1.25,'tea');k.act({type:'release'});k.at('tray');k.reload();}
 assert.equal(service.trayVessels(k.state).length,2);assert.equal(k.state.vessels.length,4);assert.equal(k.state.tea,'empty');assert.equal(k.state.vessels.filter(v=>v.state==='clean').length,2);assert.equal(k.state.vessels.filter(v=>v.perfect).length,2);
});
test('coffee requires grinding, tamping, attachment and a cup before extraction',()=>{
 const k=kitchen();k.at('coffee');assert.equal(k.state.coffee,'empty');k.at('grinder');k.at('grinder');assert.equal(k.state.stock.coffee,1);k.at('coffee');k.at('coffee');k.at('coffee');assert.equal(k.state.coffee,'locked');
 k.at('cups');k.at('coffee');k.tick(3);k.reload();assert.equal(k.state.coffeeTime,3);k.tick(3);k.at('tray');assert.equal(service.trayVessels(k.state)[0].drink,'coffee');assert.equal(k.state.coffee,'empty');
});
test('manual work survives early release, walking away and reload without duplicate cups',()=>{
 const k=kitchen();k.at('cups');k.at('cups');k.at('water');k.tick(.5,'water');k.act({type:'release'});k.tick(2);k.reload();assert.equal(k.state.manual.elapsed,.5);k.at('water');k.tick(1.25,'water');k.at('tray');k.at('tray');assert.equal(service.trayVessels(k.state).length,1);assert.equal(k.state.vessels.filter(c=>c.state==='clean').length,3);
});
test('cup returns, free restocking and closing never destroy or duplicate vessels',()=>{
 const k=kitchen();k.at('cups');k.at('water');k.tick(2,'water');k.at('tray');k.at('return');assert.equal(k.state.vessels.filter(c=>c.state==='dirty').length,1);k.at('sink');k.tick(1,'sink');k.reload();k.tick(2,'sink');assert.equal(k.state.washed,1);k.at('pantry');k.at('pantry');assert.equal(k.state.stock.tea,4);assert.equal(k.state.stock.coffee,4);k.at('wipe');k.tick(2,'wipe');assert.equal(service.closingStep(k.state),null);
});
test('legacy trays migrate and malformed equipment recovers to four vessels',()=>{
 const s=service.readService(null,['tea','tea'],[true,false]);assert.equal(service.trayVessels(s).length,2);assert.equal(s.vessels[0].perfect,true);assert.equal(service.readService({vessels:[{id:42,state:'filled'}]}).vessels.length,4);
});
test('adaptive help fades only after distinct supported and independent visits',()=>{
 let p=learning.freshProgress();p=learning.recordUse(p,'tea',true,true,'1');p=learning.recordUse(p,'tea',true,true,'1');assert.equal(p.uses.tea.guided,1);p=learning.recordUse(p,'tea',true,true,'2');assert.equal(learning.wordHelp(p,'tea').english,false);p=learning.recordUse(p,'tea',true,false,'3');p=learning.recordUse(p,'tea',true,false,'4');assert.equal(learning.wordHelp(p,'tea').romaji,false);assert.equal(learning.wordHelp({...p,alwaysHelp:true},'tea').english,true);assert.equal(learning.wordHelp(p,'tea',true).english,true);assert.equal(learning.parseProgress(JSON.stringify(p)).uses.tea.independent,2);
});
test('assistance and incorrect answers remain separate from physical café mistakes',()=>{
 let p=learning.freshProgress();p=learning.recordUse(p,'tea',true,false,'1');p=learning.recordUse(p,'tea',true,true,'2');assert.equal(p.memories.tea.streak,1);p=learning.recordUse(p,'tea',false,false,'3');p=learning.recordUse(p,'tea',true,false,'3');assert.equal(p.memories.tea.streak,0);
 let s=chapter.actShift(chapter.newShift(3),{type:'begin'}).state;const c=chapter.getCustomer(s);s=chapter.actShift(s,{type:'take-order',drink:c.drink,count:c.count,assisted:[]}).state;s={...s,stage:'pay',customerMistakes:4,mistakes:4};s=chapter.actShift(s,{type:'collect'}).state;assert.equal(s.understoodToday.length,1,'Preparation and payment errors do not erase comprehension');
});
test('modern preparation cannot bypass recipes and closing tasks gate the till',()=>{
 let s=chapter.actShift(chapter.newShift(2),{type:'begin'}).state;s=chapter.actShift(s,{type:'listen'}).state;assert.equal(chapter.actShift(s,{type:'prepare',drink:'tea'}).state.tray.length,0);s={...s,stage:'report',service:{...s.service,counterDirty:true}};assert.equal(chapter.actShift(s,{type:'finish'}).state.stage,'report');
});
test('new preparation entries are introduced at most three per morning',()=>{
 for(let day=1;day<=7;day++){const previous=day===1?[]:learning.preparationWords(day-1);assert.ok(learning.preparationWords(day).filter(id=>!previous.includes(id)).length<=3);}
});

function assertKitchen(s){
 assert.equal(s.vessels.length,4);assert.deepEqual(Array.from(s.vessels,c=>c.id),[0,1,2,3]);assert.ok(service.trayVessels(s).length<=2);
 if(s.activeCup!==undefined)assert.equal(s.vessels[s.activeCup].state,'reserved');
 if(s.coffeeCup!==undefined){assert.notEqual(s.coffeeCup,s.activeCup);assert.ok(['reserved','filled'].includes(s.vessels[s.coffeeCup].state));}
 if(s.manual?.station!=='wipe' && s.manual)assert.ok(Number.isInteger(s.manual.cup));
}
function modernShift(day=1,previous){
 let s=chapter.newShift(day,previous);
 return {get state(){return s;},act(action){const r=chapter.actShift(s,action);s=r.state;assertKitchen(s.service);return r;},
 reload(){s=chapter.readShift(JSON.stringify(s));assertKitchen(s.service);assert.deepEqual(Array.from(s.tray),Array.from(service.trayVessels(s.service),cup=>cup.drink));},
 work(action){this.act({type:'service',action});this.reload();},
 prepare(drink,count,perfect=false){
  this.work({type:'portions',count:count===2?2:1});
  for(let attempts=0;s.tray.length<count && attempts<120;attempts++){
   const task=service.nextServiceStep(s.service,drink,day);
   if(task.waiting){
    for(let t=0;t<40;t++){
     this.work({type:'tick',seconds:.25});
     if(perfect && s.service.coffee==='extracting' && s.service.coffeeTime<=1.75){this.work({type:'release'});break;}
    }
   }else{
    this.work({type:'station',station:task.station});
    if(task.hold){
     const ticks=perfect && ['tea','water'].includes(task.station)?5:16;
     for(let t=0;t<ticks;t++)this.work({type:'tick',seconds:.25,held:task.station});
     if(perfect)this.work({type:'release'});
    }
   }
  }
  assert.equal(s.tray.length,count,`Recipe stalled for ${drink} on day ${day}`);
 },
 close(){
  for(let i=0;i<20 && service.closingStep(s.service);i++){
   const task=service.closingStep(s.service);this.work({type:'station',station:task.station});
   if(task.hold)for(let t=0;t<16;t++)this.work({type:'tick',seconds:.25,held:task.station});
  }
  assert.equal(service.closingStep(s.service),null);this.act({type:'finish'});
 }};
}

test('every morning and six free-play shifts survive reload at each recipe step and settle each reward once',()=>{
 let previous;
 for(let day=1;day<=13;day++){
  const shift=modernShift(day,previous);shift.act({type:'begin'});let expected=0,tips=0;
  for(let visit=0;visit<3;visit++){
   const customer=chapter.getCustomer(shift.state);shift.act({type:'greet',correct:true});shift.act({type:'take-order',drink:customer.drink,count:customer.count,assisted:[]});
   shift.prepare(customer.drink,customer.count,true);shift.act({type:'serve'});shift.reload();
   assert.equal(shift.state.stage,'pay');assert.equal(shift.state.service.vessels.filter(c=>c.state==='served').length,customer.count);
   assert.equal(shift.state.visitPerfect,customer.count);assert.equal(shift.state.earnings,expected);assert.equal(shift.state.tips,tips);
   shift.act({type:'checkout',total:customer.total,change:chapter.paymentFor(shift.state)-customer.total});expected+=customer.total;tips+=customer.count*25;
   shift.reload();shift.act({type:'collect'});assert.equal(shift.state.earnings,expected);assert.equal(shift.state.tips,tips);
  }
  assert.equal(shift.state.understoodToday.length,day===1?2:3);assert.equal(shift.state.stage,'report');
  shift.close();shift.reload();assert.equal(shift.state.stage,'done');assert.equal(shift.state.chapterCompleted,day>=7);
  previous=chapter.nextShift(shift.state);assert.equal(previous.day,day+1);
 }
 assert.deepEqual(Array.from(previous.relationships),[7,7,7]);
});

test('leftover hot water is refilled and reheated before a larger tea batch',()=>{
 const k=kitchen();k.at('kettle');k.at('kettle');k.at('tea');k.tick(8);k.at('tea');k.tick(6);k.at('cups');k.at('tea');k.tick(2,'tea');k.at('tray');
 assert.equal(k.state.hotWater,1);assert.equal(k.state.kettle,'hot');
 k.act({type:'portions',count:2});k.at('pantry');k.at('tea');
 assert.equal(service.nextServiceStep(k.state,'tea',3).station,'kettle');k.at('tea');assert.equal(k.state.tea,'leaves');
 k.at('kettle');k.reload();assert.equal(k.state.kettle,'filled');k.at('kettle');k.tick(8);k.at('tea');k.tick(6);k.at('cups');k.at('tea');k.tick(2,'tea');k.at('tray');
 assert.equal(service.trayVessels(k.state).length,2);assert.equal(k.state.teaLeft,1);assert.equal(k.state.tea,'ready');assert.equal(k.state.stock.tea,2);assertKitchen(k.state);
});

test('malformed saves cannot own one cup twice, pour without tea, or extend the vessel supply',()=>{
 const cases=[
  {...service.freshService(),manual:{station:'water',elapsed:1}},
  {...service.freshService(),tea:'ready',teaLeft:0,activeCup:0,vessels:[{id:0,state:'reserved'},...service.freshService().vessels.slice(1)],manual:{station:'tea',elapsed:1,cup:0}},
  {...service.freshService(),coffee:'extracting',coffeeTime:2,coffeeCup:0,activeCup:0,vessels:[{id:0,state:'reserved'},...service.freshService().vessels.slice(1)]},
  {...service.freshService(),coffee:'ready',coffeeCup:99,kettle:'hot',hotWater:0,tea:'steeping',teaLeft:.2},
 ];
 for(const raw of cases){let s=service.readService(raw);assertKitchen(s);s=service.actService(s,{type:'tick',seconds:.25,held:'tea'},3).state;assertKitchen(s);s=service.actService(s,{type:'station',station:'return'},3).state;assertKitchen(s);}
 assert.equal(service.readService(cases[0]).manual,undefined);assert.equal(service.readService(cases[1]).manual,undefined);assert.equal(service.readService(cases[2]).activeCup,undefined);assert.equal(service.readService(cases[3]).tea,'empty');
 const migrated=service.readService(null,['tea','coffee'],[true,false],999);assertKitchen(migrated);assert.equal(service.trayVessels(migrated).length,2);
});

test('reload uses completed vessel contents instead of stale cached trays and repairs stranded served cups',()=>{
 let s=chapter.actShift(chapter.newShift(3),{type:'begin'}).state;
 s={...s,stage:'brew',tray:['tea'],service:{...s.service,vessels:[{id:0,state:'tray',drink:'coffee',perfect:true},...s.service.vessels.slice(1)]}};
 s=chapter.readShift(JSON.stringify(s));assert.deepEqual(Array.from(s.tray),['coffee']);assert.equal(s.trayQuality[0],true);
 s=chapter.readShift(JSON.stringify({...s,stage:'report',service:{...s.service,vessels:s.service.vessels.map(c=>({...c,state:'served'}))}}));
 assert.equal(s.tray.length,0);assert.equal(s.service.vessels.filter(c=>c.state==='dirty').length,4);assert.equal(chapter.serviceGuide(s).target,'shift-sink');
});

test('releasing a partly washed cup cannot finish the coffee extraction running beside it',()=>{
 const k=kitchen();k.at('cups');k.at('water');k.tick(2,'water');k.at('tray');k.at('return');k.at('grinder');k.at('coffee');k.at('coffee');k.at('cups');k.at('coffee');k.tick(4.25);k.at('sink');k.tick(.5,'sink');k.act({type:'release'});
 assert.equal(k.state.coffee,'extracting');assert.equal(k.state.manual.station,'sink');assert.equal(k.state.manual.elapsed,.5);k.reload();k.tick(2.5,'sink');assert.equal(k.state.coffee,'ready');assert.equal(k.state.washed,1);assert.equal(k.state.vessels[k.state.coffeeCup].perfect,undefined);
});

test('a targeted clue remains assisted after reload even when the order action sends an empty assistance list',()=>{
 let s=chapter.actShift(chapter.newShift(3),{type:'begin'}).state;
 s=chapter.actShift(s,{type:'clue'}).state;s=chapter.readShift(JSON.stringify(s));const customer=chapter.getCustomer(s);
 assert.deepEqual(Array.from(s.languageHelp),['two']);
 s=chapter.actShift(s,{type:'take-order',drink:customer.drink,count:customer.count,assisted:[]}).state;
 assert.deepEqual(Array.from(s.comprehension.assisted),['two']);
 s=chapter.actShift({...s,stage:'pay'},{type:'collect'}).state;assert.equal(s.understoodToday.length,0);assert.equal(s.relationships[0],1);
});

test('Haru washes mistaken and manually returned cups on day one so repeated retries never exhaust the supply',()=>{
 const shift=modernShift();shift.act({type:'begin'});shift.act({type:'take-order',drink:'coffee',count:1});
 for(let retry=0;retry<5;retry++){
  shift.prepare('water',1);shift.act({type:'serve'});
  assert.equal(shift.state.service.vessels.filter(c=>c.state==='clean').length,4,'Haru cleans each rejected tray immediately');shift.reload();
 }
 shift.work({type:'station',station:'cups'});shift.work({type:'station',station:'water'});shift.work({type:'tick',seconds:.25,held:'water'});
 shift.work({type:'station',station:'return'});assert.equal(shift.state.service.manual,undefined);assert.equal(shift.state.service.vessels.filter(c=>c.state==='clean').length,4);
 shift.prepare('water',1);shift.act({type:'clear'});assert.equal(shift.state.service.vessels.filter(c=>c.state==='clean').length,4);
 shift.prepare('coffee',1);shift.act({type:'serve'});shift.act({type:'collect'});
 assert.equal(shift.state.customer,1);assert.equal(shift.state.earnings,450);assert.equal(shift.state.service.washed,0,'Player washing begins on day two');assert.equal(shift.state.service.vessels.filter(c=>c.state==='clean').length,4);
 const later=kitchen(2);later.at('cups');later.at('water');later.tick(2,'water');later.at('tray');later.at('return');assert.equal(later.state.vessels.filter(c=>c.state==='dirty').length,1,'From day two, the player handles returned cups');
});

test('cups can be washed and supplies restocked between customers while new recipes stay gated by the next order',()=>{
 const shift=modernShift(5);shift.act({type:'begin'});const customer=chapter.getCustomer(shift.state);
 shift.act({type:'take-order',drink:customer.drink,count:customer.count});shift.prepare(customer.drink,customer.count);shift.act({type:'serve'});
 shift.work({type:'station',station:'pantry'});assert.equal(shift.state.service.stock.tea,4,'Restocking remains available while payment is pending');
 shift.act({type:'checkout',total:customer.total,change:chapter.paymentFor(shift.state)-customer.total});
 assert.equal(shift.state.stage,'order');assert.equal(shift.state.service.vessels.filter(c=>c.state==='dirty').length,2);
 shift.work({type:'station',station:'sink'});shift.work({type:'tick',seconds:.25,held:'sink'});shift.work({type:'release'});assert.equal(shift.state.service.manual.elapsed,.25);
 for(let t=0;t<11;t++)shift.work({type:'tick',seconds:.25,held:'sink'});
 assert.equal(shift.state.service.washed,1);assert.equal(shift.state.service.vessels.filter(c=>c.state==='dirty').length,1);
 const before=JSON.stringify(shift.state.service);
 for(const action of [{type:'station',station:'grinder'},{type:'station',station:'cups'},{type:'portions',count:2}]){
  const result=shift.act({type:'service',action});assert.match(result.message,/Confirm an order/);assert.equal(JSON.stringify(shift.state.service),before);
 }
 shift.work({type:'station',station:'wipe'});for(let t=0;t<8;t++)shift.work({type:'tick',seconds:.25,held:'wipe'});assert.equal(shift.state.service.counterDirty,false);
 let briefing=chapter.newShift(3);briefing=chapter.actShift(briefing,{type:'service',action:{type:'station',station:'pantry'}}).state;assert.equal(briefing.service.stock.coffee,4);
 const closed={...briefing,stage:'done'};assert.equal(chapter.actShift(closed,{type:'service',action:{type:'station',station:'pantry'}}).state,closed);
});
