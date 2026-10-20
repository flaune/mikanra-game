/* Offline capture only. Uses the shipped service model and scene; no game imports this file. */
window.prepareFilm = async function () {
  const {actShift,newShift,getCustomer}=await import('/src/game/chapterOne.ts');
  const {guidedStep}=await import('/src/game/cafeService.ts');
  const e=window.mikanraQA.engine;
  e.pause();cancelAnimationFrame(e.frameId);e.frameId=0;
  e.renderer.domElement.id='film-canvas';
  e.guidance?.removeFromParent();
  e.interaction.clear();
  e.worldData.owner.group.visible=false;
  for(const target of e.worldData.interactables)if(target.id.startsWith('shift-')&&target.id!=='shift-customer')target.mesh.visible=false;
  const act=(s,action)=>actShift(s,action).state;
  const service=(s,action)=>act(s,{type:'service',action});
  const tick=(s,seconds,held)=>{for(let left=seconds;left>1e-6;left-=.1)s=service(s,{type:'tick',seconds:Math.min(.1,left),held});return s;};
  const press=s=>{const c=getCustomer(s),step=guidedStep(s.service,c.drink,c.count,s.day);return service(s,{type:'guided',step:step.key,drink:c.drink,count:c.count});};
  let order=newShift(2);order.hired=true;order=act(order,{type:'begin'});order=act(order,{type:'greet',correct:true});
  let brewing=act(order,{type:'take-order',drink:'tea',count:1});
  let heating=press(brewing);heating=press(heating);
  let ready=tick(heating,8.1);ready=press(ready);ready=tick(ready,6.1);
  const pouring=press(ready),finished=tick(pouring,1.7,'tea');
  const served=act(finished,{type:'serve'});
  if(served.stage!=='pay'||served.service.vessels.filter(c=>c.state==='served').length!==1)throw Error('Film must follow a real one-cup tea order.');
  const rig={x:0,y:0,z:0,tx:0,ty:0,tz:0,fov:50};
  const shots=[
    {name:'pour-hook',start:0,end:3,state:tick(pouring,.15,'tea'),speed:.46,held:'tea',position:[99.32,1.65,97.64],look:[99.3,1.28,98.85],fov:48},
    {name:'aoi-order',start:3,end:8,state:order,speed:0,position:[101.15,1.70,97.4],look:[101.15,1.48,99.92],fov:54},
    {name:'kettle',start:8,end:12,state:tick(heating,1.5),speed:1.65,position:[99.4,1.78,96.9],look:[99.36,1.31,98.95],fov:48},
    {name:'pour',start:12,end:17,state:pouring,speed:.315,held:'tea',position:[98.85,1.62,97.6],look:[99.30,1.27,98.85],fov:46},
    {name:'thank-you',start:17,end:25,state:served,speed:0,position:[103.0,1.95,98.8],look:[101.15,1.32,99.8],fov:56},
    {name:'cafe',start:25,end:30,state:served,speed:0,position:[100.12,1.76,96.8],look:[100.65,1.25,100.15],fov:58},
  ];
  const opening=document.createElement('div');opening.className='film-title film-opening';opening.innerHTML='Run a café.<br>Learn Japanese.';
  const ending=document.createElement('div');ending.className='film-title film-ending';ending.innerHTML='<strong>Mikanra</strong><span>Free desktop demo</span>';
  document.body.append(opening,ending);
  const titles=gsap.timeline({paused:true});
  titles.set([opening,ending],{opacity:0,y:8},0)
    .to(opening,{opacity:1,y:0,duration:.35,ease:'power2.out'},.18)
    .to(opening,{opacity:0,y:-4,duration:.3,ease:'power1.in'},2.6)
    .to(ending,{opacity:1,y:0,duration:.5,ease:'power2.out'},25.15)
    .to(ending,{opacity:0,duration:.3,ease:'power1.in'},29.7);
  gsap.ticker.sleep();
  let lastShot=-1,state,local=0,cameraTimeline;
  window.filmFrame=function(frame){
    const time=frame/30,index=shots.findIndex(s=>time>=s.start&&time<s.end),shot=shots[index];
    if(!shot)throw Error('Frame outside storyboard');
    if(index!==lastShot||time-shot.start<local){
      state=structuredClone(shot.state);local=0;lastShot=index;
      const [x,y,z]=shot.position,[tx,ty,tz]=shot.look;
      Object.assign(rig,{x,y,z,tx,ty,tz,fov:shot.fov});
      cameraTimeline=gsap.timeline({paused:true}).to(rig,{z:z+.045,x:x+.012,duration:shot.end-shot.start,ease:'sine.inOut'});
    }
    const target=time-shot.start,delta=Math.max(0,target-local);local=target;
    if(delta&&shot.speed)state=tick(state,delta*shot.speed,shot.held);
    e.setShiftPresentation(state);
    const equipment=e.worldData.equipment;equipment.setWorkbench(true);equipment.update(1/30,true);
    for(const object of equipment.group.children)if(object.isMesh&&object.geometry.type==='BoxGeometry'&&Math.abs(object.position.x-1.25)<.01)object.visible=false;
    equipment.pitcher.visible=false;equipment.kettle.visible=shot.name==='kettle';
    // Cinematic adapter: lift the pot and connect its stream to the actual reserved cup.
    // These presentation adjustments are confined to this offline recording fixture.
    equipment.pot.position.y=1.14+(state.service.manual?.station==='tea'?.18:0);
    if(state.service.manual?.station==='tea'){
      equipment.group.updateWorldMatrix(true,true);
      const vector=(x,y,z)=>e.camera.position.clone().set(x,y,z);
      const start=equipment.group.worldToLocal(equipment.pot.localToWorld(vector(.252,.20,0)));
      const end=equipment.group.worldToLocal(equipment.cups[state.service.manual.cup].localToWorld(vector(0,.132,0)));
      const direction=end.clone().sub(start),length=direction.length();
      equipment.stream.position.copy(start.add(end).multiplyScalar(.5));
      equipment.stream.quaternion.setFromUnitVectors(vector(0,1,0),direction.normalize());
      equipment.stream.scale.set(.4,length/.26,.4);
    }
    if(e.trayView)e.trayView.visible=false;
    e.worldData.customerService.update(1/30);
    const owner=e.worldData.owner;if(owner)owner.setBlink((time%4.8)<.13);
    cameraTimeline.time(target,false);titles.time(time,false);gsap.ticker.sleep();
    e.camera.position.set(rig.x,rig.y,rig.z);e.camera.fov=rig.fov;e.camera.lookAt(rig.tx,rig.ty,rig.tz);e.camera.updateProjectionMatrix();
    e.renderer.render(e.scene,e.camera);
    return {frame,time,shot:shot.name,stage:state.stage,tray:state.tray.length};
  };
  window.filmStoryboard=shots.map(({name,start,end})=>({name,start,end}));
  return {customer:getCustomer(brewing).name,drink:getCustomer(brewing).drink,quantity:getCustomer(brewing).count,frames:900};
};
