import * as THREE from 'three';
import { customers, getCustomer } from './chapterOne';
import type { Shift } from './chapterOne';
import { createAvatar, getAvatarProfile } from './avatar';
import type { Avatar } from './avatar';
import { CUSTOMER } from './cafeLayout';

type Phase = 'hidden' | 'arriving' | 'queued' | 'approaching' | 'serving' | 'departing';
interface Person { avatar: Avatar; group: THREE.Group; cups: THREE.Group; phase: Phase; route: THREE.Vector2[] }
/** Furniture-safe motion, independent of repeated recipe snapshots. */
export class CustomerService {
  readonly group = new THREE.Group();
  private people: Person[] = [];
  private active = -1;
  private waiting = -1;
  private initialized = false;
  private stage = 'briefing';
  private time = 0;
  private rejected = 0;
  private reaction = 0;
  constructor() {
    this.group.name = 'shift-customer';
    this.group.position.set(CUSTOMER.service[0],0,CUSTOMER.service[1]);
    const material = new THREE.MeshStandardMaterial({color:0xf5e5c5,roughness:.4});
    const geometry = new THREE.CylinderGeometry(.073,.057,.13,20);
    customers.forEach((customer,index) => {
      const avatar=createAvatar(getAvatarProfile(customer.name)),group=avatar.group;
      group.name=`customer-${index}`;group.visible=false;this.group.add(group);
      const trigger=new THREE.Mesh(new THREE.BoxGeometry(.65,1.1,.5),new THREE.MeshBasicMaterial({visible:false}));
      trigger.position.y=1.4;group.add(trigger);
      const cups=new THREE.Group();cups.position.set(0,.98,.37);group.add(cups);
      for(const x of [-.105,.105]){const cup=new THREE.Mesh(geometry,material);cup.position.x=x;cups.add(cup);}
      cups.visible=false;this.people.push({avatar,group,cups,phase:'hidden',route:[]});
    });
  }
  private position(person:Person,point:readonly [number,number]) {
    person.group.position.set(point[0]-CUSTOMER.service[0],0,point[1]-CUSTOMER.service[1]);
  }
  private route(person:Person,points:readonly (readonly [number,number])[],phase:Phase) {
    person.phase=phase;person.route=points.map(p=>new THREE.Vector2(p[0]-CUSTOMER.service[0],p[1]-CUSTOMER.service[1]));person.group.visible=true;
  }
  setShift(shift:Shift) {
    const next=['briefing','report','done'].includes(shift.stage)?-1:shift.customer;
    if(next!==this.active){
      if(this.active>=0){const prior=this.people[this.active];prior.cups.visible=false;this.route(prior,CUSTOMER.departure,'departing');}
      if(next>=0){
        const current=this.people[next];
        if(!this.initialized){this.position(current,CUSTOMER.service);current.phase='serving';current.group.visible=true;}
        else if(current.phase==='hidden'){this.position(current,CUSTOMER.door);this.route(current,[CUSTOMER.queue],'arriving');}
      }
      this.active=next;this.reaction=0;
    }
    const waiting=(shift.day??1)>=5&&next>=0&&next<2?next+1:-1;
    if(waiting>=0&&this.people[next].phase==='serving'&&this.people[waiting].phase==='hidden'){const p=this.people[waiting];this.position(p,CUSTOMER.queue);p.phase='queued';p.group.visible=true;}
    this.waiting=waiting;this.stage=shift.stage;
    if(shift.mistakes>this.rejected)this.reaction=2.2;
    this.rejected=shift.mistakes;this.initialized=true;
    if(next>=0){const p=this.people[next];p.cups.visible=shift.stage==='pay';p.cups.children.forEach((cup,index)=>{cup.visible=index<getCustomer(shift).count;});}
    this.updateInteractions();
  }
  private updateInteractions(){this.people.forEach((p,index)=>{p.group.userData.interactionDisabled=index!==this.active||p.phase!=='serving';p.group.userData.blocksInteraction=p.phase==='serving';});}
  update(dt:number){
    this.time+=dt;this.reaction=Math.max(0,this.reaction-dt);
    const active=this.people[this.active];
    const clear=!this.people.some(p=>p.phase==='departing'&&Math.hypot(p.group.position.x,p.group.position.z)<.9);
    if(active?.phase==='queued'&&clear)this.route(active,CUSTOMER.approach,'approaching');
    for(const [index,p] of this.people.entries()){
      if(!p.group.visible)continue;
      const point=p.route[0],moving=!!point;
      if(point){
        const dx=point.x-p.group.position.x,dz=point.y-p.group.position.z,distance=Math.hypot(dx,dz),step=Math.min(distance,dt*.85);
        if(distance>1e-6){p.group.position.x+=dx/distance*step;p.group.position.z+=dz/distance*step;p.group.rotation.y=Math.atan2(dx,dz);}
        if(distance<=step+.001){p.route.shift();if(!p.route.length){if(p.phase==='departing'){p.phase='hidden';p.group.visible=false;}else p.phase=p.phase==='arriving'?'queued':'serving';}}
      }else p.group.rotation.y=p.phase==='serving'?Math.PI:-.4;
      p.group.position.y=moving?Math.abs(Math.sin(this.time*8))*.009:0;
      const confused=index===this.active&&this.reaction>0;
      p.avatar.setExpression(confused?'confused':p.phase==='departing'||this.stage==='pay'?'happy':'neutral');
      p.avatar.setBlink((this.time+index*1.31)%4.8<.14);
      p.avatar.head.rotation.set(0,confused?Math.sin(this.time*9)*.08:Math.sin(this.time*.8+index)*.025,0);
      p.avatar.legs.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(this.time*8+i*Math.PI)*.22:0;});
      p.avatar.arms.forEach((arm,i)=>{arm.rotation.x=moving?Math.sin(this.time*8+i*Math.PI+Math.PI)*.16:this.stage==='pay'&&index===this.active?-.7:0;});
    }
    if(this.waiting>=0&&this.people[this.active]?.phase==='serving'&&this.people[this.waiting].phase==='hidden'){const p=this.people[this.waiting];this.position(p,CUSTOMER.queue);p.phase='queued';p.group.visible=true;}
    this.updateInteractions();
  }
  getObstacles(){this.group.updateWorldMatrix(true,true);return this.people.filter(p=>p.group.visible).map(p=>{const v=p.group.getWorldPosition(new THREE.Vector3());return{x:v.x,z:v.z};});}
}
