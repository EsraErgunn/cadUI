import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'

import { PREVIEW_ELEVATION_CM } from './plumbingLayers'
import { getLoadedSymbol } from './symbolLoader'
import type { PlacementPreviewState } from './usePlacementTool'
import { planToThree } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'

const PREVIEW_OPACITY = 0.5

/**
 * Bırakılacak sembolün yarı saydam önizlemesi. Konum useFrame'de doğrudan
 * object3D'ye yazılır — imleç her kıpırdadığında React render'ı tetiklenmez.
 */
export function DrawPreview({ elementType, positionRef }: PlacementPreviewState) {
  const groupRef = useRef<Group>(null)

  const shapes = useMemo(
    () => (elementType ? getLoadedSymbol(elementType).shapes : []),
    [elementType],
  )

  // symbolLoader'ın PAYLAŞILAN material'ine yazılmaz; saydamlık klon üzerinde.
  const materials = useMemo(
    () =>
      shapes.map((shape) => {
        const material = shape.material.clone()
        material.transparent = true
        material.opacity = PREVIEW_OPACITY
        material.depthWrite = false
        return material
      }),
    [shapes],
  )

  useEffect(
    () => () => {
      for (const material of materials) material.dispose()
    },
    [materials],
  )

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const position = positionRef.current
    group.visible = position !== null
    if (position) group.position.set(...planToThree(position, PREVIEW_ELEVATION_CM))
  })

  if (shapes.length === 0) return null

  return (
    // visible=false ile başlar: imleç tuvale girip ilk pointermove gelene kadar
    // önizleme (0,0)'da durmasın.
    <group ref={groupRef} visible={false} renderOrder={RENDER_ORDER.linePreview}>
      {shapes.map((shape, index) => (
        // Dizi bir sembol tipinin SVG'sinden bir kez türer ve yeniden sıralanmaz —
        // domain nesnesi değil, indeks anahtar olarak güvenli (SymbolInstance ile aynı).
        <mesh
          key={index}
          geometry={shape.geometry}
          material={materials[index]}
          raycast={() => null}
        />
      ))}
    </group>
  )
}
