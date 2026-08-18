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
import { useCadStore } from '../../store/cadStore'
import type { InstallationElement } from '../core/installationModel'
import { isPortOccupied } from '../core/portSnap'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

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
  /**
   * Yalnız SÜRÜKLENEN elemanlara verilir: geçici kayma her frame buradan okunur.
   * Mutlak konum değil KAYMA, çünkü çoklu seçimde aynı ref tüm seçime gider —
   * her elemana ayrı ref üretilseydi seçim büyüdükçe ref sayısı da büyürdü.
   */
  dragDeltaRef?: RefObject<PlanPoint | null>
  /** Boruya oturan elemanın kotu (K102) — türetilmiş, store'a yazılmaz. */
  elevationCm?: number
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
  dragDeltaRef,
  elevationCm = 0,
}: SymbolInstanceProps) {
  const isGhost = tone === 'ghost'
  const groupRef = useRef<Group>(null)
  const loaded = useMemo(() => getLoadedSymbol(element.type), [element.type])
  // Dizinin KENDİSİNE abone olunur; doluluk render sırasında türetilir (R10:
  // doluluk için elemanda ikinci bir alan tutulmaz).
  const connections = useCadStore((state) => state.installationConnections)
  const occupiedPortIds = loaded.metadata.ports
    .filter((port) => isPortOccupied(connections, element.id, port.id))
    .map((port) => port.id)
  // Döndürme tutamacıyla sürüklenirken ÖNİZLENEN açı+konum kullanılır —
  // bırakılana kadar cadStore'a yazılmaz (bkz. useElementRotateTool.ts), sahne
  // bu tek kaynaktan (`elementRotateDrag`) okuyup canlı döner; ikon da AYNI
  // kaynağı okuyor (`ElementRotateHandle.tsx`), ikisi ayrışmaz. Boruya/porta
  // bağlı elemanlarda döndürme `position`'ı da değiştirir (tutunduğu nokta
  // dünyada sabit kalsın diye), bu yüzden konum burada da izlenir.
  const rotateDrag = usePlumbingUiStore((state) =>
    state.elementRotateDrag?.elementId === element.id ? state.elementRotateDrag : undefined,
  )
  const position = useMemo(
    () =>
      planToThree(
        rotateDrag?.position ?? element.position,
        isGhost ? INSTALLATION_GHOST_ELEVATION_CM : SYMBOL_ELEVATION_CM + elevationCm,
      ),
    [element.position, rotateDrag?.position, isGhost, elevationCm],
  )
  const rotationY = (rotateDrag?.angleDeg ?? element.angleDeg) * DEG_TO_RAD
  const renderOrder = isGhost ? RENDER_ORDER.installationGhost : RENDER_ORDER.equipment

  // Sürükleme konumu doğrudan object3D'ye yazılır: imleç her kıpırdadığında
  // React render'ı tetiklenmez (DrawPreview ile aynı desen).
  useFrame(() => {
    const delta = dragDeltaRef?.current
    if (!groupRef.current || !delta) return
    groupRef.current.position.set(
      ...planToThree(
        { x: element.position.x + delta.x, y: element.position.y + delta.y },
        SYMBOL_ELEVATION_CM + elevationCm,
      ),
    )
  })

  // Sürükleme bitince grup store konumuna geri döner. İptal edilen (Esc) veya
  // yerinde biten sürüklemede `position` propu DEĞİŞMEZ, dolayısıyla R3F kendi
  // başına geri yazmaz ve sembol bırakıldığı yerde asılı kalırdı.
  useEffect(() => {
    if (dragDeltaRef) return
    groupRef.current?.position.set(...position)
  }, [dragDeltaRef, position])

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
          <PortMarkers
            metadata={loaded.metadata}
            scale={element.scale}
            occupiedPortIds={occupiedPortIds}
          />
        </>
      )}
    </group>
  )
}
