import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { Group } from 'three'

import { PortMarkers } from './PortMarkers'
import { SelectionOutline } from './SelectionOutline'
import { INSTALLATION_GHOST_ELEVATION_CM, SYMBOL_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { getGhostMaterial, getLoadedSymbol } from './symbolLoader'
import { planToThree, type PlanPoint } from '../../core/coords'
import { RENDER_ORDER } from '../../scene/layers'
import type { InstallationElement } from '../core/installationModel'

const DEG_TO_RAD = Math.PI / 180
const MISSING_SYMBOL_SIZE_CM = 40
const PLACEHOLDER_LINE_WIDTH = 1.6

// Prop olarak `undefined` geçilseydi three'nin varsayılan raycast'ini geri
// koymak R3F'in prop sıfırlama davranışına kalırdı; hiç geçmemek kesin çözüm.
// Mimari görünümde tesisat salt bağlamdır: tıklanamaz, seçilemez.
const GHOST_MESH_PROPS = { raycast: () => null }

/** `ghost` = mimari görünümdeki soluk iz: seçilemez, rengi korunur, saydamdır. */
export type SymbolTone = 'normal' | 'ghost'

type SymbolInstanceProps = {
  element: InstallationElement
  tone?: SymbolTone
  isSelected?: boolean
  /** Yalnız SÜRÜKLENEN elemana verilir: geçici konum her frame buradan okunur. */
  positionRef?: RefObject<PlanPoint | null>
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
 *
 * Seçim vurgusu ve port işaretleri grubun İÇİNDE: dönme, ölçek ve sürükleme
 * dönüşümü onlara kendiliğinden uygulanır, ikinci kez hesaplanmaz.
 */
export function SymbolInstance({
  element,
  tone = 'normal',
  isSelected = false,
  positionRef,
}: SymbolInstanceProps) {
  const isGhost = tone === 'ghost'
  const groupRef = useRef<Group>(null)
  const loaded = useMemo(() => getLoadedSymbol(element.type), [element.type])
  const position = useMemo(
    () =>
      planToThree(
        element.position,
        isGhost ? INSTALLATION_GHOST_ELEVATION_CM : SYMBOL_ELEVATION_CM,
      ),
    [element.position, isGhost],
  )
  const rotationY = element.angleDeg * DEG_TO_RAD
  const renderOrder = isGhost ? RENDER_ORDER.installationGhost : RENDER_ORDER.equipment

  // Sürükleme konumu doğrudan object3D'ye yazılır: imleç her kıpırdadığında
  // React render'ı tetiklenmez (DrawPreview ile aynı desen).
  useFrame(() => {
    const dragged = positionRef?.current
    if (!groupRef.current || !dragged) return
    groupRef.current.position.set(...planToThree(dragged, SYMBOL_ELEVATION_CM))
  })

  // Sürükleme bitince grup store konumuna geri döner. İptal edilen (Esc) veya
  // yerinde biten sürüklemede `position` propu DEĞİŞMEZ, dolayısıyla R3F kendi
  // başına geri yazmaz ve sembol bırakıldığı yerde asılı kalırdı.
  useEffect(() => {
    if (positionRef) return
    groupRef.current?.position.set(...position)
  }, [positionRef, position])

  if (loaded.shapes.length === 0) {
    return (
      <group ref={groupRef} position={position} renderOrder={renderOrder}>
        <MissingSymbolPlaceholder />
      </group>
    )
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      scale={element.scale}
      renderOrder={renderOrder}
    >
      {loaded.shapes.map(({ geometry, material }, index) => (
        // Bu dizi sabit ve yeniden sıralanmaz (bir sembol tipinin SVG'sinden bir kez
        // türetilir, önbelleklenir) — domain nesnesi değil, indeks anahtar olarak güvenli.
        <mesh
          key={index}
          geometry={geometry}
          material={isGhost ? getGhostMaterial(material) : material}
          {...(isGhost ? GHOST_MESH_PROPS : {})}
        />
      ))}

      {isSelected && !isGhost && (
        <>
          <SelectionOutline metadata={loaded.metadata} scale={element.scale} />
          <PortMarkers metadata={loaded.metadata} scale={element.scale} />
        </>
      )}
    </group>
  )
}
