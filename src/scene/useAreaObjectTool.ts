import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { getAreaObjectTypeForTool } from '../core/areaObject'
import type { PlanPoint } from '../core/coords'
import type { AreaObjectType } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type AreaObjectPreview = {
  type: AreaObjectType
  position: PlanPoint
}

/**
 * Alan nesnesi (merdiven/kolon/baca şaftı) yerleştirme aracı — v1: tıkla,
 * varsayılan boyutta yerleşir; boyut/açı SONRADAN sağ panelden ayarlanır
 * (tutamaçla sürükleyerek boyutlandırma henüz yok, bkz. docs/kararlar.md).
 *
 * `usePointSymbolTool` ile aynı sözleşme: yerleştirme pointer UP'ta, araç
 * yerleştirdikten SONRA aktif kalır (arka arkaya ekleme).
 *
 * PointSymbol'den farklı olarak duvara bağlanma YOK — her zaman serbest,
 * yalnız ızgaraya oturur. Kapı/pencere üstüne düşen yerleştirme K35/K36
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

    // Ctrl ızgarayı kapatır — köşe/duvar/sembol sürüklemesiyle aynı jest
    // (useAreaObjectSelectionTool.ts, usePointDragTool.ts). İlk yerleştirmede
    // de aynı davranmalı: kullanıcı Ctrl'i yalnız taşırken değil, ilk basışta
    // da tutabilir.
    const readPosition = (event: DrawSurfacePointerEvent): PlanPoint => {
      if (event.ctrlKey) return event.planPoint
      const { zoom } = readCameraViewport(camera)
      return getPlacementPosition(event.planPoint, zoom)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event: DrawSurfacePointerEvent) => {
        const position = readPosition(event)
        // Aynı yerde yeni nesne yazılmaz: her fare hareketi render etmesin.
        setPreview((current) =>
          current && current.position.x === position.x && current.position.y === position.y
            ? current
            : { type: areaObjectType, position },
        )
      },

      onPointerUp: (event: DrawSurfacePointerEvent) => {
        if (event.button !== LEFT_BUTTON) return
        const position = readPosition(event)
        useCadStore.getState().addAreaObject({ type: areaObjectType, x: position.x, y: position.y })
      },

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
