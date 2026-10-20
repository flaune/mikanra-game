import RAPIER from "@dimforge/rapier3d-compat";
import { Vector3 } from "three";

const PLAYER_RADIUS = 0.22;
const BODY_HEIGHT = 0.89;
const EYE_HEIGHT = 1.66;
const GRAVITY = 9.81;
const TERMINAL_VELOCITY = -18;
const CONTROLLER_OFFSET = 0.015;

export { EYE_HEIGHT };

let initialization: Promise<void> | undefined;

export interface MotorState {
  position: Vector3;
  grounded: boolean;
}

export class CharacterMotor {
  private world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  private controller = this.world.createCharacterController(CONTROLLER_OFFSET);
  private body: RAPIER.RigidBody;
  private capsule: RAPIER.Collider;
  private fallSpeed = 0;
  private onGround = false;
  private disposed = false;
  private customers: RAPIER.Collider[] = [];

  get grounded() {
    return this.onGround;
  }

  static async create(spawn: Vector3): Promise<CharacterMotor> {
    initialization ??= RAPIER.init();
    await initialization;
    return new CharacterMotor(spawn);
  }

  private constructor(spawn: Vector3) {
    this.controller.setApplyImpulsesToDynamicBodies(false);
    this.controller.enableAutostep(0.28, 0.25, false);
    this.controller.enableSnapToGround(0.3);

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      spawn.x,
      spawn.y,
      spawn.z,
    );
    this.body = this.world.createRigidBody(bodyDesc);

    const capsuleDesc = RAPIER.ColliderDesc.capsule(
      BODY_HEIGHT / 2,
      PLAYER_RADIUS,
    );
    capsuleDesc.setTranslation(0, BODY_HEIGHT / 2 + PLAYER_RADIUS, 0);
    this.capsule = this.world.createCollider(capsuleDesc, this.body);
  }

  addBoxCollider(
    x: number,
    y: number,
    z: number,
    halfWidth: number,
    halfHeight: number,
    halfDepth: number,
    rotation?: { x: number; y: number; z: number; w: number },
  ) {
    const desc = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth);
    desc.setTranslation(x, y, z);
    if (rotation) desc.setRotation(rotation);
    this.world.createCollider(desc);
  }

  /** Moving customers have bodies too; the camera cannot pass through their faces. */
  setCustomers(positions: readonly { x: number; z: number }[]) {
    positions.forEach((position, index) => {
      const collider = this.customers[index] ?? this.world.createCollider(RAPIER.ColliderDesc.capsule(.6, .35));
      this.customers[index] = collider;
      collider.setEnabled(true);
      collider.setTranslation({ x: position.x, y: 1, z: position.z });
    });
    for (let index = positions.length; index < this.customers.length; index++) this.customers[index].setEnabled(false);
  }

  move(
    dx: number,
    dz: number,
    dt: number,
    outPosition: Vector3,
  ): MotorState {
    if (dt <= 0) return { position: outPosition, grounded: this.onGround };
    if (this.onGround) {
      this.controller.enableAutostep(0.28, 0.25, false);
      this.controller.enableSnapToGround(0.3);
    } else {
      this.controller.disableAutostep();
      this.controller.disableSnapToGround();
    }

    const dy = this.fallSpeed * dt - 0.5 * GRAVITY * dt * dt;
    this.fallSpeed = Math.max(this.fallSpeed - GRAVITY * dt, TERMINAL_VELOCITY);

    this.world.timestep = dt;
    this.controller.computeColliderMovement(this.capsule, {
      x: dx,
      y: dy,
      z: dz,
    });

    const movement = this.controller.computedMovement();
    const current = this.body.translation();
    const nextX = current.x + movement.x;
    const nextY = current.y + movement.y;
    const nextZ = current.z + movement.z;

    this.body.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
    this.world.step();

    this.onGround =
      this.fallSpeed <= 0 && this.controller.computedGrounded();
    if (this.onGround) {
      this.fallSpeed = 0;
    } else if (this.fallSpeed > 0) {
      for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
        const collision = this.controller.computedCollision(i);
        if (collision && collision.normal1.y < -0.5) {
          this.fallSpeed = 0;
          break;
        }
      }
    }

    const finalPos = this.body.translation();
    outPosition.set(finalPos.x, finalPos.y, finalPos.z);
    return { position: outPosition, grounded: this.onGround };
  }

  teleport(position: Vector3) {
    this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    this.body.setNextKinematicTranslation({
      x: position.x,
      y: position.y,
      z: position.z,
    });
    this.fallSpeed = 0;
    this.onGround = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeCharacterController(this.controller);
    this.world.free();
  }
}
