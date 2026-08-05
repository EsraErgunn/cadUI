import { useState } from 'react'

import { getOpeningTypeForTool, MIN_OPENING_WIDTH_CM } from '../core/opening'
import { selectOpeningById } from '../store/architectureSlice'
import {
  selectSoleSelectedOpeningId,
  useArchitectureUiStore,
} from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const WIDTH_STEP_CM = 5

/**
 * Kapı/pencere aracının seçenek şeridi. Özellik paneli (PropertyPanel) başka bir
 * issue'nun kapsamında olduğu için genişlik düzenlemesi buraya alındı (K15).
 * Seçili açıklık varsa ONUN genişliğini, yoksa sıradaki yerleştirmenin
 * varsayılanını düzenler.
 */
export function OpeningToolOptions() {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const selectedOpeningId = useArchitectureUiStore(selectSoleSelectedOpeningId)
  const openingWidthCm = useArchitectureUiStore((state) => state.openingWidthCm)
  const setOpeningWidthCm = useArchitectureUiStore((state) => state.setOpeningWidthCm)
  const setOpeningWidth = useCadStore((state) => state.setOpeningWidth)
  // selectOpeningById dizideki nesnenin kendisini döndürür (yeni nesne üretmez),
  // bu yüzden abonelik olarak güvenli.
  const selectedOpening = useCadStore((state) =>
    selectedOpeningId === undefined ? undefined : selectOpeningById(state, selectedOpeningId),
  )

  const openingType = getOpeningTypeForTool(activeToolId)
  const widthCm = selectedOpening?.widthCm ?? (openingType ? openingWidthCm[openingType] : 0)
  const targetKey = selectedOpening ? `opening-${selectedOpening.id}` : `next-${openingType}`

  // Yazarken store'a yazılmaz: girdi doğrudan store'dan beslenirse her tuş
  // yeniden render edip rakamları eski değerin üstüne ekler (90 + "100" → 90100).
  const [draftText, setDraftText] = useState(String(widthCm))
  const [syncedFrom, setSyncedFrom] = useState({ targetKey, widthCm })
  const [isWidthRejected, setIsWidthRejected] = useState(false)

  // Düzenlenen hedef değişince veya değer dışarıdan güncellenince metin tazelenir.
  if (syncedFrom.targetKey !== targetKey || syncedFrom.widthCm !== widthCm) {
    setSyncedFrom({ targetKey, widthCm })
    setDraftText(String(widthCm))
    setIsWidthRejected(false)
  }

  // Araç aktif değilken şerit hiç yer kaplamaz.
  if (!openingType) return null

  const commitWidth = () => {
    const nextWidthCm = Number.parseFloat(draftText)
    if (!Number.isFinite(nextWidthCm)) {
      setDraftText(String(widthCm))
      return
    }

    if (!selectedOpening) {
      setOpeningWidthCm(openingType, nextWidthCm)
      setIsWidthRejected(false)
      return
    }

    const isApplied = setOpeningWidth(selectedOpening.id, nextWidthCm)
    setIsWidthRejected(!isApplied)
    if (isApplied) {
      setOpeningWidthCm(openingType, nextWidthCm)
      return
    }

    // Reddedilen genişlik ekranda kalmaz — yalan bir sayı göstermek yerine geri döner.
    setDraftText(String(selectedOpening.widthCm))
  }

  return (
    <div className="absolute left-3 top-12 flex items-center gap-2 rounded-md border border-edge bg-surface/95 px-2 py-1">
      <label
        className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
        htmlFor="opening-width"
      >
        Genişlik (cm)
      </label>
      <input
        className="w-20 rounded border border-edge bg-surface px-1 py-0.5 text-sm text-ink"
        id="opening-width"
        type="number"
        min={MIN_OPENING_WIDTH_CM}
        step={WIDTH_STEP_CM}
        value={draftText}
        aria-invalid={isWidthRejected}
        onChange={(event) => setDraftText(event.target.value)}
        onBlur={commitWidth}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commitWidth()
        }}
      />
      {isWidthRejected && (
        <span aria-live="polite" className="text-xs text-ink-muted">
          Bu genişlik duvara sığmıyor.
        </span>
      )}
    </div>
  )
}
