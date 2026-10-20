import * as THREE from 'three';
import type { CafeService } from './cafeService';
import { COUNTER_TOP as top, STATIONS } from './cafeLayout';

/** Render adapter: every visible vessel is driven by the service model. */
export class CafeEquipment {
  readonly group = new THREE.Group();
  private cups: THREE.Group[] = [];
  private bodies: THREE.Mesh[] = [];
  private handles: THREE.Mesh[] = [];
  private liquids: THREE.Mesh[] = [];
  private pot = new THREE.Group();
  private kettle = new THREE.Group();
  private pitcher = new THREE.Group();
  private teaLeaves = new THREE.Group();
  private ceramic: THREE.MeshStandardMaterial;
  private glass: THREE.MeshStandardMaterial;
  private teaLiquid: THREE.Mesh;
  private stream: THREE.Mesh;
  private steam = new THREE.Group();
  private basket: THREE.Mesh;
  private grounds: THREE.Mesh;
  private beans: THREE.Mesh;
  private leaves: THREE.Mesh;
  private stain: THREE.Mesh;
  private time = 0;
  private state?: CafeService;
  private working = false;
  constructor() {
    this.group.name = 'Café preparation equipment'; this.group.userData.interactive = true;
    const ceramic = new THREE.MeshStandardMaterial({ color: 0xf2dfb8, roughness: .35, side: THREE.DoubleSide });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc4a26a, metalness: .6, roughness: .4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xa8c9c2, transparent: true, opacity: .48, roughness: .15, side: THREE.DoubleSide });
    this.ceramic = ceramic; this.glass = glass;
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => { const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); m.castShadow = true; parent.add(m); return m; };
    for (let i = 0; i < 4; i++) {
      const cup = new THREE.Group(); cup.name = `service-vessel-${i}`; this.group.add(cup);
      this.bodies.push(mesh(new THREE.CylinderGeometry(.075,.055,.14,20,1,true), ceramic, cup, 0,.07,0));
      mesh(new THREE.CylinderGeometry(.105,.105,.012,24), ceramic, cup, 0,0,0);
      const handle = mesh(new THREE.TorusGeometry(.035,.009,8,16), ceramic, cup, .077,.08,0); handle.name = 'handle';
      this.handles.push(handle);
      const liquid = mesh(new THREE.CircleGeometry(.067,20), new THREE.MeshStandardMaterial({ color: 0x8e863f, transparent: true, opacity: .9 }), cup, 0,.02,0); liquid.rotation.x = -Math.PI / 2;
      this.cups.push(cup); this.liquids.push(liquid);
    }
    this.pot.position.set(STATIONS.tea[0],top,STATIONS.tea[1]); this.group.add(this.pot);
    mesh(new THREE.SphereGeometry(.15,20,12), glass, this.pot, 0,.09,0).scale.set(1,.8,1);
    mesh(new THREE.CylinderGeometry(.105,.105,.025,20), brass, this.pot, 0,.21,0);
    const spout = mesh(new THREE.CylinderGeometry(.025,.04,.2,12), brass, this.pot, .18,.13,0); spout.rotation.z = -.8;
    mesh(new THREE.TorusGeometry(.085,.014,8,20), brass, this.pot, -.17,.12,0);
    this.teaLiquid = mesh(new THREE.SphereGeometry(.13,16,10), new THREE.MeshStandardMaterial({ color: 0xa6b779, transparent: true, opacity: .7 }), this.pot, 0,.065,0); this.teaLiquid.scale.y = .4;
    for (let i=0;i<7;i++) { const leaf = mesh(new THREE.SphereGeometry(.014,6,4), new THREE.MeshStandardMaterial({color:0x526c35}), this.teaLeaves, Math.sin(i*2)*.075,.012,Math.cos(i*2)*.075);leaf.scale.set(1,.3,2); }
    this.pot.add(this.teaLeaves);
    this.kettle.position.set(STATIONS.kettle[0],top+.05,STATIONS.kettle[1]); this.group.add(this.kettle);
    mesh(new THREE.SphereGeometry(.15,20,12), ceramic, this.kettle, 0,.10,0);
    mesh(new THREE.TorusGeometry(.12,.016,8,20), brass, this.kettle, 0,.26,0);
    const nose = mesh(new THREE.CylinderGeometry(.025,.045,.2,12), brass, this.kettle, .17,.14,0); nose.rotation.z = -.8;
    mesh(new THREE.CylinderGeometry(.07,.07,.025,16), brass, this.kettle, 0,.25,0);
    this.pitcher.position.set(STATIONS.water[0],top,STATIONS.water[1]);this.group.add(this.pitcher);
    mesh(new THREE.CylinderGeometry(.10,.09,.24,20,1,true),glass,this.pitcher,0,.12,0);
    mesh(new THREE.CylinderGeometry(.087,.08,.18,20),new THREE.MeshStandardMaterial({color:0x8bbab5,transparent:true,opacity:.65}),this.pitcher,0,.10,0);
    mesh(new THREE.TorusGeometry(.075,.012,8,20),glass,this.pitcher,.13,.13,0);
    const pitcherSpout = mesh(new THREE.CylinderGeometry(.025,.04,.12,12),glass,this.pitcher,-.12,.21,0);pitcherSpout.rotation.z = .9;
    // A small sink bowl and tap make washing a visible workstation.
    mesh(new THREE.CylinderGeometry(.18,.13,.07,24,1,true),brass,this.group,STATIONS.sink[0],top+.04,STATIONS.sink[1]);
    const tap = mesh(new THREE.TorusGeometry(.09,.012,8,20,Math.PI),brass,this.group,STATIONS.sink[0]+.16,1.38,STATIONS.sink[1]);tap.rotation.y = Math.PI/2;
    mesh(new THREE.CylinderGeometry(.012,.012,.20,10),brass,this.group,STATIONS.sink[0]+.16,1.28,STATIONS.sink[1]-.09);
    const drain=mesh(new THREE.CircleGeometry(.13,24),new THREE.MeshStandardMaterial({color:0x45504a,roughness:.4}),this.group,STATIONS.sink[0],top+.007,STATIONS.sink[1]);drain.rotation.x=-Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(.18,.012,8,32),brass,this.group,STATIONS.sink[0],top+.075,STATIONS.sink[1]);rim.rotation.x=Math.PI/2;
    this.stream = mesh(new THREE.CylinderGeometry(.012,.018,.26,8), new THREE.MeshStandardMaterial({ color: 0xc8bb73, transparent: true, opacity: .8 }), this.group, -.8,1.54,-1.46);
    for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(.024,8,6), new THREE.MeshBasicMaterial({ color: 0xf3e8cf, transparent: true, opacity: .16, depthWrite: false }), this.steam, (i%2)*.06-.03, i*.07,0);
    this.group.add(this.steam);
    this.basket = mesh(new THREE.CylinderGeometry(.055,.05,.055,16), brass, this.group, -2.45,1.18,-1.65);
    mesh(new THREE.BoxGeometry(.15,.022,.035), brass, this.basket, .10,0,0);
    this.grounds = mesh(new THREE.CircleGeometry(.048,16), new THREE.MeshStandardMaterial({ color: 0x4d3022 }), this.basket, 0,.03,0); this.grounds.rotation.x = -Math.PI/2;
    this.beans = mesh(new THREE.CylinderGeometry(.09,.09,.20,16), new THREE.MeshStandardMaterial({ color: 0x50352a }), this.group, STATIONS.grinder[0],1.59,STATIONS.grinder[1]);
    this.leaves = mesh(new THREE.CylinderGeometry(.08,.08,.16,16), new THREE.MeshStandardMaterial({ color: 0x617547 }), this.group, -1.35,top+.08,-1.05);
    mesh(new THREE.BoxGeometry(.48,.018,.32),new THREE.MeshStandardMaterial({color:0x725035}),this.group,STATIONS.tray[0],top+.012,STATIONS.tray[1]);
    const till = mesh(new THREE.BoxGeometry(.29,.16,.24),new THREE.MeshStandardMaterial({color:0x355349}),this.group,STATIONS.register[0],top+.08,STATIONS.register[1]);
    mesh(new THREE.BoxGeometry(.20,.035,.10),ceramic,till,0,.10,0);
    this.stain = mesh(new THREE.CircleGeometry(.16,20), new THREE.MeshBasicMaterial({ color: 0x6a4d2d, transparent: true, opacity: .25, depthWrite: false }), this.group, STATIONS.wipe[0],top+.005,STATIONS.wipe[1]); this.stain.rotation.x = -Math.PI/2;
  }
  setState(s: CafeService) { this.state = s; this.update(0, false); }
  setWorkbench(working: boolean) { this.working = working; this.update(0, false); }
  update(dt: number, motion: boolean) {
    const s = this.state; if (!s) return; this.time += dt;
    for (const [i, vessel] of s.vessels.entries()) {
      const cup = this.cups[i]; cup.visible = vessel.state !== 'served' && (vessel.state !== 'tray' || this.working);
      if (vessel.state === 'clean') cup.position.set(STATIONS.cups[0] + (i % 2)*.23,1.16 + Math.floor(i/2)*.16,STATIONS.cups[1]);
      else if (vessel.state === 'dirty') cup.position.set(2.88+(i%2)*.2,top+.02,-2.8+Math.floor(i/2)*.2);
      else if (vessel.id === s.coffeeCup) cup.position.set(STATIONS.coffee[0]-.15,1.205,STATIONS.coffee[1]-.04);
      else cup.position.set(STATIONS.tea[0]+.35,top+.01,STATIONS.tea[1]-.23);
      if (vessel.state === 'tray') { const slot=s.vessels.filter(c=>c.state==='tray').findIndex(c=>c.id===vessel.id);cup.position.set(STATIONS.tray[0]-.12+slot*.24,top+.025,STATIONS.tray[1]); }
      cup.rotation.z=0;
      if (s.manual?.station==='sink' && s.manual.cup===vessel.id) {cup.position.set(STATIONS.sink[0],top+.03,STATIONS.sink[1]);cup.rotation.z=Math.sin(this.time*8)*.07;}
      const manual = s.manual?.cup === vessel.id && ['tea','water'].includes(s.manual.station) ? s.manual.elapsed / 1.6 : 0;
      const extract = vessel.id === s.coffeeCup && s.coffee === 'extracting' ? 1-s.coffeeTime/6 : 0;
      const water = vessel.drink === 'water' || (s.manual?.station === 'water' && s.manual.cup === vessel.id);
      this.bodies[i].material = water ? this.glass : this.ceramic;
      this.handles[i].visible = !water;
      this.liquids[i].visible = ['filled','tray'].includes(vessel.state) || manual > 0 || extract > 0;
      this.liquids[i].position.y = .02 + .105 * (['filled','tray'].includes(vessel.state) ? 1 : Math.max(manual, extract));
      (this.liquids[i].material as THREE.MeshStandardMaterial).color.set(vessel.drink === 'coffee' || extract ? 0x493020 : vessel.drink === 'water' || s.manual?.station === 'water' ? 0x91c8c1 : 0x9b9144);
    }
    this.teaLiquid.visible = ['steeping','ready'].includes(s.tea);
    this.teaLeaves.visible = s.tea !== 'empty';
    (this.teaLiquid.material as THREE.MeshStandardMaterial).color.set(s.tea === 'ready' ? 0x8e843a : new THREE.Color(0xb3c887).lerp(new THREE.Color(0x8e843a),1-s.teaTime/6));
    const pouring = s.manual?.station === 'tea'; this.pot.rotation.z = pouring ? -.45 : 0;
    this.pitcher.position.x = s.manual?.station === 'water' ? -.35 : STATIONS.water[0];
    this.pitcher.rotation.z = s.manual?.station === 'water' ? .45 : 0;
    this.kettle.rotation.z = s.tea === 'steeping' && s.teaTime > 5.5 ? -.4 : 0;
    this.stream.visible = pouring || s.coffee === 'extracting' || s.manual?.station === 'water';
    this.stream.position.set(s.coffee === 'extracting' ? -2.27 : -.6, s.coffee === 'extracting' ? 1.40 : 1.37,s.coffee === 'extracting' ? -1.4 : -1.28);
    this.steam.visible = s.kettle === 'heating' || s.kettle === 'hot' || ['steeping','ready'].includes(s.tea);
    this.steam.position.set(s.kettle === 'heating' || s.kettle === 'hot' ? STATIONS.kettle[0] : STATIONS.tea[0],1.53,-1.05);
    this.steam.children.forEach((p,i) => { p.position.y = motion ? (this.time*.2+i*.07)% .35 : i*.06; });
    this.basket.position.x = ['locked','extracting','ready'].includes(s.coffee) ? -2.27 : -2.5;
    this.basket.position.z = ['locked','extracting','ready'].includes(s.coffee) ? -1.4 : -1.12;
    this.basket.position.y = ['locked','extracting','ready'].includes(s.coffee) ? 1.36 : top+.04;
    this.basket.rotation.z = s.coffee === 'ground' && motion ? Math.sin(this.time*12)*.025 : 0;
    this.grounds.visible = s.coffee !== 'empty';
    this.beans.scale.y = Math.max(.04,s.stock.coffee/4); this.leaves.scale.y = .1+s.stock.tea/4;
    this.stain.visible = s.counterDirty;
  }
}
