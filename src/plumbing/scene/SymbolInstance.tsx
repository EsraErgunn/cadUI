import { Line } from '@react-three/drei'
import { useMemo } from 'react'

import { SYMBOL_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { getLoadedSymbol } from './symbolLoader'
import { planToThree } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import type { InstallationElement } from '../core/installationModel'

const DEG_TO_RAD = Math.PI / 180
const MISSING_SYMBOL_SIZE_CM = 40
const PLACEHOLDER_LINE_WIDTH = 1.6

type SymbolInstanceProps = {
  element: InstallationElement
}

/**
 * Yükleme hatasında görünür, seçilemez bir kare (sessiz catch yerine). Ham `<line>`
 * JSX yerine drei `<Line>` kullanılır — R3F'in `line` primitive'i React'in SVG
 * `line` tipiyle çakışıyor (Grid.tsx'teki kalın çizgi deseniyle aynı çözüm).
 */
function MissingSymbolPlaceholder() {
  const half = MISSING_SYMBOL_SIZE_CM / 2
  const points = useMemo<Array<[number, number, number]>>(
    () => [
      [-half, 0, -half],
      [half, 0, -half],
      [half, 0, half],
      [-half, 0, half],
      [-half, 0, -half],
    ],
    [half],
  )
  return (
    <Line
      points={points}
      color={PLUMBING_COLORS.assetError}
      lineWidth={PLACEHOLDER_LINE_WIDTH}
      raycast={() => null}
      toneMapped={false}
    />
  )
}

/**
 * Tek bir tesisat elemanının R3F karşılığı. Geometri/material symbolLoader'dan PAYLAŞILIR
 * (geometry.clone() yok); rotation.y = angleDeg (aynı yönde) ports.ts → getPortWorldPosition
 * ile TUTARLI olacak şekilde seçildi (bkz. Risk R2, src/plumbing/core/ports.ts yorumu).
 */
export function SymbolInstance({ element }: SymbolInstanceProps) {
  const loaded = useMemo(() => getLoadedSymbol(element.type), [element.type])
  const position = useMemo(
    () => planToThree(element.position, SYMBOL_ELEVATION_CM),
    [element.position],
  )
  const rotationY = element.angleDeg * DEG_TO_RAD

  if (loaded.shapes.length === 0) {
    return (
      <group position={position} renderOrder={RENDER_ORDER.equipment}>
        <MissingSymbolPlaceholder />
      </group>
    )
  }

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      scale={element.scale}
      renderOrder={RENDER_ORDER.equipment}
    >
      {loaded.shapes.map(({ geometry, material }, index) => (
        // Bu dizi sabit ve yeniden sıralanmaz (bir sembol tipinin SVG'sinden bir kez
        // türetilir, önbelleklenir) — domain nesnesi değil, indeks anahtar olarak güvenli.
        <mesh key={index} geometry={geometry} material={material} />
      ))}
    </group>
  )
}
