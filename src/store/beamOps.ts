import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import {
  DEFAULT_BEAM_THICKNESS_CM,
  getNextBeamLabel,
  isBeamLabelTaken,
  isBeamLabelValid,
  MIN_BEAM_LENGTH_CM,
  MIN_BEAM_THICKNESS_CM,
  type BeamEndKey,
} from '../core/beam'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'

export type AddBeamInput = {
  start: PlanPoint
  end: PlanPoint
}

/**
 * Kiriş ekler ve id'sini döndürür. Alan nesnesinin aksine açıklık kontrolü
 * YOK: kiriş tavan seviyesinde bir taşıyıcı, kapının üstünden geçmesi normal —
 * K35/K36'nın "bir açıklığın ortasında katı nesne duramaz" gerekçesi düşey
 * elemanlar (kolon, merdiven) içindi.
 *
 * Sıfır boy segment yazılmaz (kazara çift tıklama): id bile harcanmaz, K13 deseni.
 */
export function addBeamToDraft(draft: CadState, input: AddBeamInput): Id | undefined {
  const lengthCm = Math.hypot(input.end.x - input.start.x, input.end.y - input.start.y)
  if (lengthCm < MIN_BEAM_LENGTH_CM) return undefined

  const id = takeNextId(draft)
  draft.beams.push({
    id,
    floorId: draft.activeFloorId,
    x1: input.start.x,
    y1: input.start.y,
    x2: input.end.x,
    y2: input.end.y,
    thicknessCm: DEFAULT_BEAM_THICKNESS_CM,
    label: getNextBeamLabel(draft.beams, draft.activeFloorId),
  })
  return id
}

/**
 * Action imzaları BURADA, `areaObjectOps.ts`'teki gerekçenin aynısı: slice
 * yalnız araya alıyor, gövdeler burada — yoksa architectureSlice 200 satırı aşar.
 */
export type BeamActions = {
  addBeam: (input: AddBeamInput) => Id | undefined
  /** Kirişi KATI olarak öteler: iki ucu birlikte kayar, boy ve açı korunur. */
  moveBeam: (beamId: Id, dxCm: number, dyCm: number) => boolean
  /**
   * Tek ucu taşır (tutamaçla uzatma/kısaltma). Sonuç minimum boyun altına
   * inerse REDDEDİLİR — sıfır boy kiriş çizilemez ve seçilemez hâle gelirdi.
   */
  moveBeamEnd: (beamId: Id, end: BeamEndKey, position: PlanPoint) => boolean
  setBeamThickness: (beamId: Id, thicknessCm: number) => boolean
  setBeamLabel: (beamId: Id, label: string) => boolean
}

export function createBeamActions(set: DraftSetter): BeamActions {
  return {
    addBeam: (input: AddBeamInput): Id | undefined => {
      let createdId: Id | undefined
      set((draft) => {
        createdId = addBeamToDraft(draft, input)
        if (createdId !== undefined) markDirty(draft)
      })
      return createdId
    },

    moveBeam: (beamId: Id, dxCm: number, dyCm: number): boolean => {
      let isMoved = false
      set((draft) => {
        const beam = draft.beams.find((candidate) => candidate.id === beamId)
        if (!beam) return
        if (dxCm === 0 && dyCm === 0) return

        beam.x1 += dxCm
        beam.y1 += dyCm
        beam.x2 += dxCm
        beam.y2 += dyCm
        isMoved = true
        markDirty(draft)
      })
      return isMoved
    },

    moveBeamEnd: (beamId: Id, end: BeamEndKey, position: PlanPoint): boolean => {
      let isMoved = false
      set((draft) => {
        const beam = draft.beams.find((candidate) => candidate.id === beamId)
        if (!beam) return

        const fixed = end === 'p1' ? { x: beam.x2, y: beam.y2 } : { x: beam.x1, y: beam.y1 }
        if (Math.hypot(position.x - fixed.x, position.y - fixed.y) < MIN_BEAM_LENGTH_CM) return

        if (end === 'p1') {
          if (beam.x1 === position.x && beam.y1 === position.y) return
          beam.x1 = position.x
          beam.y1 = position.y
        } else {
          if (beam.x2 === position.x && beam.y2 === position.y) return
          beam.x2 = position.x
          beam.y2 = position.y
        }
        isMoved = true
        markDirty(draft)
      })
      return isMoved
    },

    setBeamThickness: (beamId: Id, thicknessCm: number): boolean => {
      let isApplied = false
      set((draft) => {
        const beam = draft.beams.find((candidate) => candidate.id === beamId)
        if (!beam) return
        if (thicknessCm < MIN_BEAM_THICKNESS_CM) return
        if (beam.thicknessCm === thicknessCm) return

        beam.thicknessCm = thicknessCm
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },

    /** Etiket çakışıyorsa REDDEDİLİR (KK-10) — `setAreaObjectLabel` ile aynı gerekçe. */
    setBeamLabel: (beamId: Id, label: string): boolean => {
      let isApplied = false
      set((draft) => {
        const beam = draft.beams.find((candidate) => candidate.id === beamId)
        if (!beam) return

        const trimmed = label.trim()
        if (!isBeamLabelValid(trimmed)) return
        if (isBeamLabelTaken(draft.beams, trimmed, beam.floorId, beam.id)) return
        if (beam.label === trimmed) return

        beam.label = trimmed
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },
  }
}
