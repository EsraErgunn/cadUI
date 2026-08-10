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
} from '../core/areaObject'
import type { AreaObjectType, Id } from '../core/model'
import { snapAngleDeg } from '../core/transform'

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
  /** Açı KK-3'ün 15° adımına yakalanır. */
  rotateAreaObject: (areaObjectId: Id, angleDeg: number) => boolean
  setAreaObjectLabel: (areaObjectId: Id, label: string) => boolean
}

const MIN_AREA_OBJECT_SIZE_CM = 1

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

    rotateAreaObject: (areaObjectId: Id, angleDeg: number): boolean => {
      let isRotated = false
      set((draft) => {
        const areaObject = draft.areaObjects.find((candidate) => candidate.id === areaObjectId)
        if (!areaObject) return

        const next = snapAngleDeg(angleDeg)
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
  }
}
