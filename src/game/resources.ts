import * as THREE from 'three';

/** Scene owns its resources. Shared geometry/material/texture references free once. */
export function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
    if (object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight || object instanceof THREE.SpotLight) object.dispose();
  });
  if (scene.background instanceof THREE.Texture) textures.add(scene.background);
  if (scene.environment) textures.add(scene.environment);
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    // Expression atlases include maps that are cached but not currently displayed.
    const ownedTextures = material.userData.ownedTextures;
    if (Array.isArray(ownedTextures)) for (const texture of ownedTextures) if (texture instanceof THREE.Texture) textures.add(texture);
    material.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  scene.clear();
  scene.background = null;
  scene.environment = null;
}
