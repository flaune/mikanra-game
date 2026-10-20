import * as THREE from "three";

export type InteractionType = "info" | "door" | "dialogue" | "sign";
export interface InteractionData {
  id: string;
  type: InteractionType;
  prompt: string;
  japanesePrompt?: string;
  range: number;
  aimAssist?: boolean;
  interact: () => void;
}
export interface Interactable extends InteractionData { mesh: THREE.Object3D }
export interface InteractionResult {
  prompt: string;
  japanesePrompt?: string;
  id: string;
  type: InteractionType;
}

function visible(object: THREE.Object3D) {
  for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) {
    if (!parent.visible) return false;
  }
  return true;
}

type EmissiveMaterial = THREE.Material & { emissive: THREE.Color; emissiveIntensity: number };
function hasEmissive(material: THREE.Material): material is EmissiveMaterial {
  return 'emissive' in material && material.emissive instanceof THREE.Color && 'emissiveIntensity' in material;
}

export class InteractionSystem {
  private interactables: Interactable[] = [];
  private raycaster = new THREE.Raycaster();
  private direction = new THREE.Vector3();
  private origin = new THREE.Vector3();
  private bounds = new THREE.Box3();
  private meshBounds = new THREE.Box3();
  private aimPoint = new THREE.Vector3();
  private aimDirection = new THREE.Vector3();
  private current: Interactable | null = null;
  private result: InteractionResult | null = null;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private highlights = new Map<THREE.Material, THREE.Material>();

  constructor(private scene?: THREE.Object3D) {}

  register(interactable: Interactable) { this.interactables.push(interactable); }

  update(camera: THREE.Camera): InteractionResult | null {
    this.scene?.updateMatrixWorld(true);
    camera.getWorldPosition(this.origin);
    camera.getWorldDirection(this.direction);
    this.raycaster.set(this.origin, this.direction);
    this.raycaster.far = Math.max(0, ...this.interactables.map(item => item.range));

    let nearest: Interactable | null = null;
    let nearestDistance = Infinity;
    for (const item of this.interactables) {
      if (!visible(item.mesh)) continue;
      item.mesh.updateWorldMatrix(true, true);
      const hit = this.raycaster.intersectObject(item.mesh, true).find(hit => {
        if (!visible(hit.object)) return false;
        for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) if (object.userData.interactionDisabled) return false;
        return true;
      });
      if (hit && hit.distance <= item.range && hit.distance < nearestDistance) {
        nearest = item;
        nearestDistance = hit.distance;
      }
    }

    // Small café stations remain usable when they are just below the crosshair.
    // This still checks a real line of sight, range, and a narrow facing cone.
    if (!nearest) {
      let bestAngle = Infinity;
      for (const item of this.interactables) {
        if (!item.aimAssist || !visible(item.mesh)) continue;
        this.targetBounds(item.mesh);
        if (this.bounds.isEmpty()) continue;
        this.bounds.getCenter(this.aimPoint);
        this.aimPoint.y = Math.max(this.bounds.min.y, this.bounds.max.y - .12);
        this.aimDirection.subVectors(this.aimPoint, this.origin);
        const distance = this.aimDirection.length();
        if (distance > item.range || distance < .05) continue;
        this.aimDirection.normalize();
        const horizontalAngle = Math.abs(Math.atan2(this.aimDirection.x, -this.aimDirection.z) - Math.atan2(this.direction.x, -this.direction.z));
        const wrappedAngle = Math.min(horizontalAngle, Math.PI * 2 - horizontalAngle);
        const angle = this.direction.angleTo(this.aimDirection);
        if (wrappedAngle > .28 || angle > .8 || angle >= bestAngle) continue;
        this.raycaster.set(this.origin, this.aimDirection);
        if (this.blocked(item.mesh, distance)) continue;
        nearest = item; nearestDistance = distance; bestAngle = angle;
      }
      if (nearest) {
        this.targetBounds(nearest.mesh).getCenter(this.aimPoint);
        this.aimPoint.y = Math.max(this.bounds.min.y, this.bounds.max.y - .12);
        this.raycaster.set(this.origin, this.aimDirection.subVectors(this.aimPoint, this.origin).normalize());
      }
    }

    if (nearest && this.blocked(nearest.mesh, nearestDistance)) nearest = null;

    if (nearest !== this.current) {
      this.clear();
      this.current = nearest;
      if (nearest) this.highlight(nearest.mesh);
    }
    if (!nearest) return null;
    if (!this.result || this.result.id !== nearest.id || this.result.type !== nearest.type ||
        this.result.prompt !== nearest.prompt || this.result.japanesePrompt !== nearest.japanesePrompt) {
      this.result = { id: nearest.id, type: nearest.type, prompt: nearest.prompt, japanesePrompt: nearest.japanesePrompt };
    }
    return this.result;
  }

  private blocked(target: THREE.Object3D, distance: number) {
    if (this.scene) {
      // Visible opaque surfaces block sight. Invisible trigger volumes and
      // transparent glass do not; content can explicitly opt out per object.
      return this.raycaster.intersectObject(this.scene, true).some(hit => {
        if (hit.distance >= distance - .001 || !visible(hit.object)) return false;
        for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
          if (object === target || object.userData.blocksInteraction === false) return false;
        }
        if (!(hit.object instanceof THREE.Mesh)) return false;
        const materials = hit.object.material;
        const material = Array.isArray(materials) ? materials[hit.face?.materialIndex ?? 0] : materials;
        return material?.visible && !material.transparent && material.opacity > 0;
      });
    }
    return false;
  }

  private targetBounds(target: THREE.Object3D) {
    this.bounds.makeEmpty();
    target.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (parent.userData.interactionDisabled) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) this.bounds.union(this.meshBounds.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld));
    });
    return this.bounds;
  }

  trigger(): boolean {
    if (!this.current || !visible(this.current.mesh)) return false;
    this.current.interact();
    return true;
  }

  get currentTarget() { return this.current; }

  private highlight(object: THREE.Object3D) {
    const highlight = (material: THREE.Material) => {
      if (!hasEmissive(material)) return material;
      let clone = this.highlights.get(material);
      if (!clone) {
        const emissiveClone = material.clone();
        emissiveClone.emissive.set(0x555500);
        emissiveClone.emissiveIntensity = .6;
        clone = emissiveClone;
        this.highlights.set(material, clone);
      }
      return clone;
    };
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      this.originalMaterials.set(child, child.material);
      child.material = Array.isArray(child.material) ? child.material.map(highlight) : highlight(child.material);
    });
  }

  clear() {
    for (const [mesh, original] of this.originalMaterials) mesh.material = original;
    for (const material of this.highlights.values()) material.dispose();
    this.originalMaterials.clear();
    this.highlights.clear();
    this.current = null;
    this.result = null;
  }

  dispose() {
    this.clear();
    this.interactables = [];
    this.scene = undefined;
  }
}
