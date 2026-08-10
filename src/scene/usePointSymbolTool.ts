import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import type { PointSymbolType, SymbolAttachment } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { getPointSymbolTypeForTool } from '../core/pointSymbol'
import {
  getSymbolPose,
  resolveSymbolAttachment,
  type SymbolPose,
} from '../core/symbolPlacement'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type PointSymbolPreview = {
  type: PointSymbolType
  /** Önizleme, bırakılınca oluşacak bağlanmanın pozudur — duvara yapışık görünür. */
  pose: SymbolPose
}

/**
 * Nokta sembolü yerleştirme aracı (Desen A, KK-1). DrawSurface yalnız ham pointer
 * olayı yayınlar; araç mantığı CLAUDE.md kural 7 gereği burada durur.
 *
 * Yerleştirme pointer **UP**'ta yapılır — tesisat tarafındaki `usePlacementTool`
 * ile aynı sözleşme (knowledge/plumbing-placement.md). Palet iki giriş yolu
 * vaat ediyor: araca tıkla→tuvale tıkla ve palet butonundan tuvale sürükle.
 * İkisinde de tuvale bir pointerup düşer; down'da yerleştirilseydi ilk yol için
 * ayrıca "bu jest zaten yerleştirdi" bayrağı tutmak gerekirdi.
 *
 * Yerleştirmeden sonra araç bilerek AKTİF KALIR: arka arkaya sembol eklenebilsin.
 *
 * Yerleşimin uygunluğu DENETLENMEZ (tutanak K-6): sembol duvarın üstüne de,
 * boşluğa da bırakılabilir. Uygunsuz durumlar hata kontrollerinin işi.
 */
export function usePointSymbolTool(): PointSymbolPreview | undefined {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const symbolType = getPointSymbolTypeForTool(activeToolId)
  // Önizleme React state'inde: sembol geometrisi zaten her karede değil, imleç
  // ızgara adımını GEÇTİĞİNDE değişiyor — ref+useFrame'in kazancı yok, kod
  // karmaşıklığı var (tesisat önizlemesi ölçek/rotasyon taşıdığı için orada ref).
  const [preview, setPreview] = useState<PointSymbolPreview | undefined>(undefined)

  useEffect(() => {
    // Burada setPreview ÇAĞRILMAZ: effect gövdesinde senkron setState zincirleme
    // render tetikler. Temizlik zaten araç değişiminde koşuyor ve dönüş değeri
    // aşağıda symbolType ile korunuyor.
    if (!symbolType || !(camera instanceof OrthographicCamera)) return undefined

    const readPlacement = (planPoint: PlanPoint) => {
      const cad = useCadStore.getState()
      const { zoom } = readCameraViewport(camera)
      // Duvara bağlanma ham imleçten çözülür; ızgaraya oturtma yalnız SERBEST
      // yerleştirme için — duvara yapışan sembolün offseti ızgaraya değil
      // duvarın eksenine göre anlamlı.
      const attachment = resolveSymbolAttachment(planPoint, symbolType, {
        walls: cad.walls,
        points: cad.points,
        floorId: cad.activeFloorId,
      })
      if (attachment.attachment === 'wall') return attachment

      const snapped = getPlacementPosition(planPoint, zoom)
      return { ...attachment, x: snapped.x, y: snapped.y }
    }

    const readPose = (attachment: SymbolAttachment): SymbolPose | undefined => {
      const cad = useCadStore.getState()
      return getSymbolPose(
        { id: 0, type: symbolType, label: '', note: '', ...attachment },
        cad.walls,
        cad.points,
      )
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event: DrawSurfacePointerEvent) => {
        const pose = readPose(readPlacement(event.planPoint))
        // Aynı yerde yeni nesne yazılmaz: her fare hareketi render etmesin.
        setPreview((current) =>
          current &&
          pose &&
          current.pose.position.x === pose.position.x &&
          current.pose.position.y === pose.position.y &&
          current.pose.rotationDeg === pose.rotationDeg
            ? current
            : pose && { type: symbolType, pose },
        )
      },

      onPointerUp: (event: DrawSurfacePointerEvent) => {
        if (event.button !== LEFT_BUTTON) return
        useCadStore.getState().addPointSymbol({
          type: symbolType,
          attachment: readPlacement(event.planPoint),
        })
      },

      onCancel: () => setPreview(undefined),
    })

    return () => {
      unsubscribe()
      // Araç değişince önizleme son konumunda asılı kalmasın.
      setPreview(undefined)
    }
  }, [camera, symbolType])

  return symbolType ? preview : undefined
}
