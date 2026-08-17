import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import {
  DEFAULT_TEXT,
  DEFAULT_TEXT_HEIGHT_CM,
  isBlankText,
  MAX_TEXT_HEIGHT_CM,
  MIN_TEXT_HEIGHT_CM,
} from '../core/textLabel'

/**
 * Metin ekler ve id'sini döndürür. Kiriş/alan nesnesinin aksine hiçbir
 * geçerlilik kontrolü yok: metin bir NOT, geometriye katılmıyor — duvarın,
 * açıklığın, odanın üstüne düşmesi serbest.
 */
export function addTextLabelToDraft(draft: CadState, position: PlanPoint): Id {
  const id = takeNextId(draft)
  draft.texts.push({
    id,
    floorId: draft.activeFloorId,
    x: position.x,
    y: position.y,
    text: DEFAULT_TEXT,
    heightCm: DEFAULT_TEXT_HEIGHT_CM,
    angleDeg: 0,
  })
  return id
}

/**
 * Action imzaları BURADA, `beamOps.ts`/`areaObjectOps.ts` ile aynı gerekçe:
 * slice yalnız araya alıyor, gövdeler burada — yoksa architectureSlice 200
 * satırı aşar.
 */
export type TextLabelActions = {
  addTextLabel: (position: PlanPoint) => Id
  /** Metnin içeriği. BOŞ metin kabul edilmez — ekranda tutulamaz hâle gelirdi. */
  setTextLabelText: (textId: Id, text: string) => boolean
  moveTextLabel: (textId: Id, dxCm: number, dyCm: number) => boolean
  setTextLabelHeightCm: (textId: Id, heightCm: number) => boolean
  setTextLabelAngleDeg: (textId: Id, angleDeg: number) => boolean
}

export function createTextLabelActions(set: DraftSetter): TextLabelActions {
  return {
    addTextLabel: (position: PlanPoint): Id => {
      let createdId: Id = 0
      set((draft) => {
        createdId = addTextLabelToDraft(draft, position)
        markDirty(draft)
      })
      return createdId
    },

    setTextLabelText: (textId: Id, text: string): boolean => {
      let isApplied = false
      set((draft) => {
        const label = draft.texts.find((candidate) => candidate.id === textId)
        if (!label) return

        // Boş metin BURADA yazılmaz: görünmez ve tutulamaz bir nesne, kullanıcı
        // sildiğini sanarken planda hayalet bırakır. Kutuyu boşaltıp onaylamak
        // ise SİLME anlamına geliyor (K81 eki) ve o yolu `TextLabelEditor`
        // `deleteSelection` ile yürütüyor — kural tek adreste: `isBlankText`.
        if (isBlankText(text)) return
        const trimmed = text.trim()
        if (label.text === trimmed) return

        label.text = trimmed
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },

    moveTextLabel: (textId: Id, dxCm: number, dyCm: number): boolean => {
      let isMoved = false
      set((draft) => {
        const label = draft.texts.find((candidate) => candidate.id === textId)
        if (!label) return
        if (dxCm === 0 && dyCm === 0) return

        label.x += dxCm
        label.y += dyCm
        isMoved = true
        markDirty(draft)
      })
      return isMoved
    },

    setTextLabelHeightCm: (textId: Id, heightCm: number): boolean => {
      let isApplied = false
      set((draft) => {
        const label = draft.texts.find((candidate) => candidate.id === textId)
        if (!label) return
        // Aralık dışı REDDEDİLİR, kırpılmaz (K13 deseni): kullanıcı yazdığı
        // sayının sessizce değiştirilmesini beklemiyor.
        if (heightCm < MIN_TEXT_HEIGHT_CM || heightCm > MAX_TEXT_HEIGHT_CM) return
        if (label.heightCm === heightCm) return

        label.heightCm = heightCm
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },

    setTextLabelAngleDeg: (textId: Id, angleDeg: number): boolean => {
      let isApplied = false
      set((draft) => {
        const label = draft.texts.find((candidate) => candidate.id === textId)
        if (!label) return
        if (label.angleDeg === angleDeg) return

        label.angleDeg = angleDeg
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },
  }
}
