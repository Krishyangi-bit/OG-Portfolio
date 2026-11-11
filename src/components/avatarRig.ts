// Generated from the avatar rig build: layer boxes and joints, in the 619 x 572 illustration's pixels.
// The layers were cut from Krishyangi's illustration; the body layer has the arms, hilt, blade and
// irises removed and the hidden kimono and eyes repainted (LaMa inpainting), so parts can move over it.

export type Pt = readonly [number, number]

export const LAYERS = {
  body: { x: 0, y: 0, w: 619, h: 572 },
  grip: { x: 244, y: 155, w: 94, h: 417 },
  forearmL: { x: 156, y: 229, w: 119, h: 81 },
  forearmR: { x: 323, y: 247, w: 138, h: 90 },
  cuffL: { x: 141, y: 231, w: 40, h: 89 },
  cuffR: { x: 439, y: 260, w: 40, h: 86 },
  irisL: { x: 230, y: 138, w: 15, h: 15 },
  irisR: { x: 278, y: 138, w: 15, h: 15 },
} as const

export type LayerName = keyof typeof LAYERS

export const ELBOW_L: Pt = [150, 282]
export const ELBOW_R: Pt = [464, 318]
export const WRIST_L: Pt = [266, 262]
export const WRIST_R: Pt = [329, 272]
export const GRIP_PIVOT: Pt = [292, 262]

export const EYE_L: readonly Pt[] = [[226.5, 146.5], [228, 144.2], [231, 143], [236, 142.6], [240, 143.2], [244, 144.6], [246.5, 147], [245, 148.8], [240, 149.4], [233, 149.4], [229, 148.8]]
export const EYE_R: readonly Pt[] = [[275.5, 147.8], [277.5, 145.5], [280, 143.5], [285, 142.6], [290, 143], [293.5, 144.2], [295.5, 146.2], [294, 148.4], [289, 149.3], [282, 149.4], [277.5, 149]]
