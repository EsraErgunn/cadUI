import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import {
  DEFAULT_AREA_OBJECT_SIZE_CM,
  findBlockingOpeningForAreaObject,
  getNextAreaObjectLabel,
  isAreaObjectLabelTaken,
  isAreaObjectLabelValid,
  MIN_AREA_OBJECT_SIZE_CM,
} from '../core/areaObject'
import type { PlanPoint } from '../core/coords'
import type { AreaObjectType, Id } from '../core/model'
import { normalizeAngleDeg, snapAngleDeg } from '../core/transform'

export type AddAreaObjectInput = {
  type: AreaObjectType
  x: number
  y: number
}

/**
 * Alan nesnesi ekler ve id'sini döndürür. K35/K36 gerekçesiyle, yerleştirme
 * bir kapı/pencerenin içinden geçiyorsa REDDEDİLİR — id bile harcanmaz
 * (K13 deseni). Boyut varsayılan (v1: sürükleyerek boyutlandırma yok, panelden
 * ayarlanır), etiket kat+tip başına otomatik üretilir.
 */
export function addAreaObjectToDraft(draft: CadState, input: AddAreaObjectInput): Id | undefined {
  const size = DEFAULT_AREA_OBJECT_SIZE_CM[input.type]
  const candidate = {
    floorId: draft.activeFloorId,
    x: input.x,
    y: input.y,
    widthCm: size.widthCm,
    lengthCm: size.lengthCm,
    angleDeg: 0,
  }

  if (findBlockingOpeningForAreaObject(candidate, draft.walls, draft.points, draft.openings)) {
    return undefined
  }

  const id = takeNextId(draft)
  draft.areaObjects.push({
    ...candidate,
    id,
    type: input.type,
    label: getNextAreaObjectLabel(draft.areaObjects, input.type, draft.activeFloorId),
  })
  return id
}

/**
 * Action imzaları BURADA, `pointSymbolOps.ts`'teki gerekçenin aynısı: slice
 * yalnız araya alıyor, gövdeler burada — yoksa architectureSlice 200 satır
 * sınırını aşar.
 */
export type AreaObjectActions = {
  addAreaObject: (input: AddAreaObjectInput) => Id | undefined
  /** Reddedilirse false döner, konum DEĞİŞMEZ (K36 ile aynı davranış). */
  moveAreaObject: (areaObjectId: Id, x: number, y: number) => boolean
  setAreaObjectSize: (areaObjectId: Id, widthCm: number, lengthCm: number) => boolean
  /**
   * Tutamaçla boyutlandırma: KARŞI KÖŞE sabit kaldığı için merkez de kayar,
   * dolayısıyla konum ve boyut TEK yazımda gider — ayrı action'lara bölünseydi
   * kullanıcı bir sürükleme için iki kez Ctrl+Z'ye basardı (K44).
   */
  resizeAreaObject: (areaObjectId: Id, next: AreaObjectResize) => boolean
  /**
   * Açı VARSAYILAN olarak KK-3'ün 15° adımına yakalanır; panel bu yüzden ham
   * değer gönderir. Tutamaçla döndürmede Ctrl basılıysa çağıran
   * `isSnapEnabled: false` geçer — boyutlandırmada Ctrl ızgarayı kapatıyordu,
   * döndürmede hiçbir şey yapmıyordu; aynı tuş aynı jestte iki farklı anlama
   * geliyordu (K51).
   */
  rotateAreaObject: (areaObjectId: Id, angleDeg: number, isSnapEnabled?: boolean) => boolean
  setAreaObjectLabel: (areaObjectId: Id, label: string) => boolean
  /**
   * Ad etiketinin nesneye göre kayması. Etiket bir AÇIKLAMA notudur, çizim
   * geometrisi değil: ızgaraya yakalanmaz ve açıklık kontrolünden geçmez.
   */
  setAreaObjectLabelOffset: (areaObjectId: Id, offsetCm: PlanPoint) => boolean
}

export type AreaObjectResize = {
  x: number
  y: number
  widthCm: number
  lengthCm: number
}

export function createAreaObjectActions(set: DraftSetter): AreaObjectActions {
  return {
    addAreaObject: (input: AddAreaObjectInput): Id | undefined => {
      let createdId: Id | undefined
      set((draft) => {
        createdId = addAreaObjectToDraft(draft, input)
        if (createdId !== undefined) markDirty(draft)
      })
      return createdId
    },

    moveAreaObject: (areaObjectId: Id, x: number, y: number): boolean => {
      let isMoved = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return

        const moved = { ...areaObject, x, y }
        if (findBlockingOpeningForAreaObject(moved, draft.walls, draft.points, draft.openings)) return

        areaObject.x = x
        areaObject.y = y
        isMoved = true
        markDirty(draft)
      })
      return isMoved
    },

    setAreaObjectSize: (areaObjectId: Id, widthCm: number, lengthCm: number): boolean => {
      let isResized = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return
        if (widthCm < MIN_AREA_OBJECT_SIZE_CM || lengthCm < MIN_AREA_OBJECT_SIZE_CM) return

        const resized = { ...areaObject, widthCm, lengthCm }
        if (findBlockingOpeningForAreaObject(resized, draft.walls, draft.points, draft.openings)) {
          return
        }

        areaObject.widthCm = widthCm
        areaObject.lengthCm = lengthCm
        isResized = true
        markDirty(draft)
      })
      return isResized
    },

    resizeAreaObject: (areaObjectId: Id, next: AreaObjectResize): boolean => {
      let isResized = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return
        if (next.widthCm < MIN_AREA_OBJECT_SIZE_CM || next.lengthCm < MIN_AREA_OBJECT_SIZE_CM) return

        const resized = { ...areaObject, ...next }
        if (findBlockingOpeningForAreaObject(resized, draft.walls, draft.points, draft.openings)) {
          return
        }

        areaObject.x = next.x
        areaObject.y = next.y
        areaObject.widthCm = next.widthCm
        areaObject.lengthCm = next.lengthCm
        isResized = true
        markDirty(draft)
      })
      return isResized
    },

    rotateAreaObject: (
      areaObjectId: Id,
      angleDeg: number,
      isSnapEnabled: boolean = true,
    ): boolean => {
      let isRotated = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return

        // Yakalama KAPALIYKEN de açı 0-359'a indirgenir: -30 ile 330 aynı açı,
        // ikisi ayrı değer olarak saklanırsa panel ve karşılaştırmalar şaşar.
        const next = isSnapEnabled ? snapAngleDeg(angleDeg) : normalizeAngleDeg(angleDeg)
        if (areaObject.angleDeg === next) return

        const rotated = { ...areaObject, angleDeg: next }
        if (findBlockingOpeningForAreaObject(rotated, draft.walls, draft.points, draft.openings)) {
          return
        }

        areaObject.angleDeg = next
        isRotated = true
        markDirty(draft)
      })
      return isRotated
    },

    /**
     * Etiket çakışıyorsa REDDEDİLİR (KK-10), sessizce numaralandırılmaz —
     * `setPointSymbolLabel` ile aynı gerekçe.
     */
    setAreaObjectLabel: (areaObjectId: Id, label: string): boolean => {
      let isApplied = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return

        const trimmed = label.trim()
        if (!isAreaObjectLabelValid(trimmed)) return
        if (isAreaObjectLabelTaken(draft.areaObjects, trimmed, areaObject.floorId, areaObject.id)) {
          return
        }
        if (areaObject.label === trimmed) return

        areaObject.label = trimmed
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },

    setAreaObjectLabelOffset: (areaObjectId: Id, offsetCm: PlanPoint): boolean => {
      let isApplied = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return
        // Aynı değerde yazma: sürüklemeden bırakılan etiket geçmişe boş adım
        // yazmasın (K13'ün "reddedilen action geçmişi kirletmez" kuralı).
        if (
          areaObject.labelOffsetCm?.x === offsetCm.x &&
          areaObject.labelOffsetCm?.y === offsetCm.y
        ) {
          return
        }

        areaObject.labelOffsetCm = offsetCm
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },
  }
}
