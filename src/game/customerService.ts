import * as THREE from 'three';
import { customers, getCustomer } from './chapterOne';
import type { Shift } from './chapterOne';
import { createAvatar, getAvatarProfile } from './avatar';
import type { Avatar } from './avatar';

interface Person {
  avatar: Avatar;
  group: THREE.Group;
  cups: THREE.Group;
  progress: number;
  goal: number;
  departing: boolean;
}
/** Scene adapter: original rounded avatars react to service, while rules remain in chapterOne. */
export class CustomerService {
  readonly group = new THREE.Group();
  private people: Person[] = [];
  private active = -1;
  private waiting = -1;
  private stage = 'briefing';
  private time = 0;
  private rejected = 0;
  private reaction = 0;
  constructor() {
    this.group.name = 'shift-customer';
    this.group.position.set(1.4, 0, -.55);
    const cupGeometry = new THREE.CylinderGeometry(.073, .057, .13, 24);
    const cupMaterial = new THREE.MeshStandardMaterial({ color: 0xf5e5c5, roughness: .4 });
    customers.forEach((customer, index) => {
      const avatar = createAvatar(getAvatarProfile(customer.name));
      const person = avatar.group;
      person.name = `customer-${index}`;
      person.visible = false;
      this.group.add(person);
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.12, .5), new THREE.MeshBasicMaterial({ visible: false }));
      trigger.position.y = 1.43;
      person.add(trigger);
      const cups = new THREE.Group();
      cups.position.set(0, .98, .37);
      person.add(cups);
      for (const x of [-.105, .105]) {
        const cup = new THREE.Mesh(cupGeometry, cupMaterial);
        cup.position.x = x;
        cups.add(cup);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(.034, .008, 8, 20), cupMaterial);
        handle.position.set(x + .078, .01, 0);
        cups.add(handle);
      }
      cups.visible = false;
      this.people.push({ avatar, group: person, cups, progress: 0, goal: 0, departing: false });
    });
  }
  setShift(shift: Shift) {
    const next = ['briefing', 'report', 'done'].includes(shift.stage) ? -1 : shift.customer;
    if (next !== this.active) {
      if (this.active >= 0) {
        const prior = this.people[this.active];
        prior.cups.visible = false;
        prior.goal = 0;
        prior.departing = true;
        prior.group.userData.interactionDisabled = true;
        prior.group.userData.blocksInteraction = false;
        prior.avatar.setExpression('happy');
      }
      if (next >= 0) {
        const current = this.people[next];
        current.group.visible = true;
        current.progress = 0;
        current.goal = 1;
        current.departing = false;
        current.group.userData.interactionDisabled = false;
        current.group.userData.blocksInteraction = true;
        current.cups.visible = false;
      }
      this.active = next;
      this.reaction = 0;
    }
    this.waiting = (shift.day ?? 1) >= 5 && next >= 0 && next < 2 ? next + 1 : -1;
    if (this.waiting >= 0) { const neighbor = this.people[this.waiting]; neighbor.group.visible = true; neighbor.progress = 0; neighbor.goal = 0; neighbor.departing = false; neighbor.cups.visible = false; neighbor.group.userData.interactionDisabled = true; neighbor.group.userData.blocksInteraction = true; }
    if (shift.mistakes > this.rejected) this.reaction = 2.2;
    this.rejected = shift.mistakes;
    this.stage = shift.stage;
    if (next >= 0) {
      const current = this.people[next];
      current.cups.visible = shift.stage === 'pay';
      current.cups.children.forEach((cup, index) => { cup.visible = Math.floor(index / 2) < getCustomer(shift).count; });
    }
  }
  update(dt: number) {
    this.time += dt;
    this.reaction = Math.max(0, this.reaction - dt);
    for (const [index, person] of this.people.entries()) {
      if (!person.group.visible) continue;
      if (index === this.waiting) { person.group.position.set(-1.3,0,.65); person.group.rotation.y = Math.PI; person.avatar.setBlink((this.time+index)%4.8 < .14); continue; }
      const moving = Math.abs(person.goal - person.progress) > .001;
      person.progress = THREE.MathUtils.clamp(person.progress + (person.goal === 1 ? 1 : -1) * dt * .55, 0, 1);
      person.group.position.set(-1.3 * (1 - person.progress) + Math.sin(person.progress * Math.PI) * (person.departing ? -.32 : .32), moving ? Math.abs(Math.sin(this.time * 9)) * .014 : Math.sin(this.time * 2.1 + index) * .003, .65 * (1 - person.progress));
      person.group.rotation.y = person.departing ? -.9 : moving ? 2.05 : Math.PI;
      const confused = this.reaction > 0 && index === this.active;
      person.avatar.setExpression(confused ? 'confused' : person.departing || this.stage === 'pay' ? 'happy' : 'neutral');
      person.avatar.setBlink((this.time + index * 1.31) % 4.8 < .14);
      person.avatar.head.rotation.set(this.stage === 'pay' ? Math.sin(this.time * 3) * .025 : 0, confused ? Math.sin(this.time * 10) * .11 : Math.sin(this.time * .8 + index) * .035, confused ? -.07 : Math.sin(this.time * 1.3 + index) * .018);
      person.avatar.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(this.time * 9 + i * Math.PI) * .28 : 0; });
      person.avatar.arms.forEach((arm, i) => {
        arm.rotation.x = moving ? Math.sin(this.time * 9 + i * Math.PI + Math.PI) * .2 : this.stage === 'pay' ? -.7 : -.06;
        arm.rotation.z = !moving && i === 1 && this.stage === 'order' ? -.30 - Math.sin(this.time * 2.5) * .08 : 0;
      });
      if (person.departing && person.progress === 0) person.group.visible = false;
    }
  }

  getObstacles() {
    return this.people.filter(person => person.group.visible).map(person => ({
      x: this.group.position.x + person.group.position.x + 100,
      z: this.group.position.z + person.group.position.z + 100,
    }));
  }
}
