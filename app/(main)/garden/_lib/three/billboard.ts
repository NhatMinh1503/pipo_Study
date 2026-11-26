import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Camera,
  type Texture,
} from "three";

import { gardenAsset } from "@/lib/garden/assets";

/**
 * Flat pictures standing in the 3D garden: Pipo, the pets without a 3D model yet and the
 * decorations reuse their 2D art (public/garden) as camera-facing cards, so they keep the
 * look and the frame-by-frame animation they already had.
 */

/** A card showing one garden picture, with its anchor (feet, base) at the local origin. */
export function anchoredCard(id: string, texture: Texture): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const info = gardenAsset(id);
  const geometry = new PlaneGeometry(info.width, info.height).translate(
    info.width / 2 - info.anchor.x,
    info.anchor.y - info.height / 2,
    0,
  );
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.02,
    side: DoubleSide,
  });
  return new Mesh(geometry, material);
}

/** A group that always turns to face the camera; put cards inside it. */
export class Billboard extends Group {
  face(camera: Camera): void {
    this.quaternion.copy(camera.quaternion);
  }
}

/** A soft round shadow lying on the ground, shared by Pipo and the pets. */
export function shadowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 32);
    gradient.addColorStop(0, "rgba(40,48,30,0.45)");
    gradient.addColorStop(0.6, "rgba(40,48,30,0.25)");
    gradient.addColorStop(1, "rgba(40,48,30,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const GROUND_PLANE = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** A blob shadow `width` px across; scale and fade it with the pose. */
export function blobShadow(
  texture: Texture,
  width: number,
): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const shadow = new Mesh(
    GROUND_PLANE,
    new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  shadow.scale.set(width, 1, width * 0.8);
  shadow.userData.width = width;
  shadow.renderOrder = -1;
  return shadow;
}
