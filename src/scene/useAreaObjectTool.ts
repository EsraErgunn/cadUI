import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { DEFAULT_AREA_OBJECT_SIZE_CM, getAreaObjectTypeForTool } from '../core/areaObject'
import {
  findAreaObjectWallSnap,
  hasAreaObjectWallSnap,
} from '../core/areaObjectWallSnap'
import type { PlanPoint } from '../core/coords'
import type { AreaObjectType } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { getSnapToleranceCm } from '../core/snap'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

/**
 * Yeni nesnenin duvara yaslanmış hâli. Şekil VARSAYILAN boyuttan kuruluyor —
 * nesne henüz yok, `addAreaObject` da aynı boyutu yazacak; yaslanma payı
 * gerçek boyla hesaplansın diye burada da o okunuyor.
 */
function findWallSnapForNewObject(type: AreaObjectType, cursor: PlanPoint, zoom: number) {
  const cad = useCadStore.getState()
  const size = DEFAULT_AREA_OBJECT_SIZE_CM[type]

  return findAreaObjectWallSnap(
    { x: cursor.x, y: cursor.y, ...size, angleDeg: 0 },
    cursor,
    cad.walls.filter((wall) => wall.floorId === cad.activeFloorId),
    cad.points,
    getSnapToleranceCm(zoom),
    true,
  )
}

export type AreaObjectPreview = {
  type: AreaObjectType
  position: PlanPoint
  /** Duvara yaslanınca duvarın açısı; boşluğa yerleştirmede 0. */
  angleDeg: number
}

/**
 * Alan nesnesi (merdiven/kolon/baca şaftı) yerleştirme aracı — v1: tıkla,
 * varsayılan boyutta yerleşir; boyut/açı SONRADAN sağ panelden ayarlanır
 * (tutamaçla sürükleyerek boyutlandırma henüz yok, bkz. docs/kararlar.md).
 *
 * `usePointSymbolTool` ile aynı sözleşme: yerleştirme pointer UP'ta, araç
 * yerleştirdikten SONRA aktif kalır (arka arkaya ekleme). Jesti bitiren şey
 * SAĞ TIK: hem önizlemeyi siler hem paleti seçim aracına döndürür (K42) —
 * tesisat tarafındaki `useEscapeToSelectionTool` ile aynı gerekçe, kullanıcı
 * "bu iş bitti" demek için palete geri gitmek zorunda kalmasın.
 *
 * Kolon ve baca şaftı duvara YASLANIR (K139): duvarın yüzüne değer ve açısını
 * alır. PointSymbol'deki gibi duvara BAĞLANMA (referans modeli) değil — nesne
 * serbest kalır, yalnız yerleşim anında oraya çekilir; sonradan duvar taşınırsa
 * peşinden gitmez. Kapı/pencere üstüne düşen yerleştirme K35/K36
 * gerekçesiyle `addAreaObject` içinde REDDEDİLİR (id bile harcanmaz); bu araç
 * o reddi sessizce kabul eder — önizleme yine de gösterilir, kullanıcı
 * tıklayınca hiçbir şey olmadığını görür (K13 deseni: kaydırılmaz, reddedilir).
 */
export function useAreaObjectTool(): AreaObjectPreview | undefined {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const areaObjectType = getAreaObjectTypeForTool(activeToolId)
  const [preview, setPreview] = useState<AreaObjectPreview | undefined>(undefined)

  useEffect(() => {
    // setPreview burada ÇAĞRILMAZ: senkron setState effect gövdesinde zincirleme
    // render tetikler (usePointSymbolTool ile aynı gerekçe).
    if (!areaObjectType || !(camera instanceof OrthographicCamera)) return undefined

    /**
     * Yerleşim: önce DUVAR, olmazsa ızgara.
     *
     * Duvar yakalaması ızgaradan ÖNCE geliyor — kullanıcının istediği bu:
     * kolon/baca şaftı duvara yaslanmalı, ızgaraya değil. Duvara yaslanan nesne
     * duvarın AÇISINI da alır: eğik bir duvarda ızgara hizasında duran bir kolon
     * duvarın içine girerdi.
     *
     * Ctrl İKİSİNİ birden kapatır (taşıma/köşe sürüklemesiyle aynı jest):
     * kullanıcı serbest yerleştirmek istediğinde tek tuş yetmeli.
     */
    const readPlacement = (event: DrawSurfacePointerEvent): AreaObjectPreview => {
      if (event.ctrlKey) {
        return { type: areaObjectType, position: event.planPoint, angleDeg: 0 }
      }

      const { zoom } = readCameraViewport(camera)
      const snap = hasAreaObjectWallSnap(areaObjectType)
        ? findWallSnapForNewObject(areaObjectType, event.planPoint, zoom)
        : undefined
      if (snap) {
        return { type: areaObjectType, position: snap.position, angleDeg: snap.wallAngleDeg }
      }

      return {
        type: areaObjectType,
        position: getPlacementPosition(event.planPoint, zoom),
        angleDeg: 0,
      }
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event: DrawSurfacePointerEvent) => {
        const next = readPlacement(event)
        // Aynı yerde yeni nesne yazılmaz: her fare hareketi render etmesin.
        setPreview((current) =>
          current &&
          current.position.x === next.position.x &&
          current.position.y === next.position.y &&
          current.angleDeg === next.angleDeg
            ? current
            : next,
        )
      },

      onPointerUp: (event: DrawSurfacePointerEvent) => {
        if (event.button !== LEFT_BUTTON) return
        const next = readPlacement(event)
        useCadStore.getState().addAreaObject({
          type: areaObjectType,
          x: next.position.x,
          y: next.position.y,
          angleDeg: next.angleDeg,
        })
      },

      // Sağ tık önizlemeyi siler; ARAÇTAN ÇIKMA kısmı artık ortak hook'ta
      // (`useRightClickReturnsToSelection`, K84) — kural bütün araçlara
      // yayıldığı için her birinde ayrı kopyası duramazdı.
      //
      // Araç değişimi bu hook'un effect'ini söker, temizlik zaten orada;
      // setPreview yine de çağrılıyor çünkü sökülme bir sonraki render'da olur.
      onContextMenu: () => setPreview(undefined),

      onCancel: () => setPreview(undefined),
    })

    return () => {
      unsubscribe()
      // Araç değişince önizleme son konumunda asılı kalmasın.
      setPreview(undefined)
    }
  }, [camera, areaObjectType])

  return areaObjectType ? preview : undefined
}
