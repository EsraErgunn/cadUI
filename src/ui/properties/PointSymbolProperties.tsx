import { useState } from 'react'

import { PropertyNumberField } from './PropertyNumberField'
import type { Id } from '../../core/model'
import { isSymbolLabelTaken, isSymbolLabelValid, SYMBOL_TYPE_LABELS } from '../../core/pointSymbol'
import { getCommonNumber } from '../../core/propertyFields'
import { getSymbolFloorId, getSymbolPose } from '../../core/symbolPlacement'
import { ROTATION_STEP_DEG } from '../../core/transform'
import { useCadStore } from '../../store/cadStore'

type PointSymbolPropertiesProps = {
  symbolIds: readonly Id[]
}

export function PointSymbolProperties({ symbolIds }: PointSymbolPropertiesProps) {
  const symbols = useCadStore((state) => state.symbols)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const rotatePointSymbol = useCadStore((state) => state.rotatePointSymbol)
  const setPointSymbolLabel = useCadStore((state) => state.setPointSymbolLabel)
  const setPointSymbolNote = useCadStore((state) => state.setPointSymbolNote)

  const selected = symbols.filter((symbol) => symbolIds.includes(symbol.id))
  const [labelDraft, setLabelDraft] = useState<string | undefined>(undefined)

  if (selected.length === 0) return null

  const targetKey = `symbols-${symbolIds.join(',')}`
  const [sole] = selected
  const isSingle = selected.length === 1

  const labelText = labelDraft ?? (isSingle ? sole.label : '')
  const labelError = (() => {
    if (labelDraft === undefined) return undefined
    if (!isSymbolLabelValid(labelDraft)) return 'Etiket boş olamaz.'
    const floorId = getSymbolFloorId(sole, walls)
    if (floorId !== undefined && isSymbolLabelTaken(symbols, labelDraft, floorId, walls, sole.id)) {
      return 'Bu etiket bu katta kullanılıyor.'
    }
    return undefined
  })()

  const commitLabel = () => {
    if (labelDraft !== undefined) setPointSymbolLabel(sole.id, labelDraft)
    setLabelDraft(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs text-ink-muted">Tür</span>
        <span className="text-sm text-ink">
          {isSingle ? SYMBOL_TYPE_LABELS[sole.type] : 'Karışık'}
        </span>
      </div>

      {/* Etiket yalnız TEK sembolde düzenlenir: aynı adı iki nesneye vermek zaten
          reddedilir (KK-10), toplu yazım ikincisinde sessizce başarısız olurdu. */}
      <div className="flex items-center justify-between gap-3 py-1">
        <label className="text-xs text-ink-muted" htmlFor="symbol-label">
          Etiket
        </label>
        <div className="flex flex-col items-end">
          <input
            id="symbol-label"
            value={labelText}
            readOnly={!isSingle}
            placeholder={isSingle ? undefined : 'Farklı'}
            aria-invalid={labelError !== undefined}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            className="w-24 rounded border border-edge bg-surface px-1.5 py-0.5 text-right text-sm text-ink read-only:text-ink-muted aria-[invalid=true]:border-danger"
          />
          {labelError && (
            <span role="alert" className="mt-0.5 text-xs text-danger">
              {labelError}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs text-ink-muted">Bağlantı</span>
        <span className="text-sm text-ink">
          {isSingle ? (sole.attachment === 'wall' ? 'Duvara bağlı' : 'Serbest') : 'Karışık'}
        </span>
      </div>

      {/*
       * Açı YALNIZ serbest sembolde düzenlenir: duvara bağlı sembolün yönü
       * duvarından türüyor, panelden ayrı bir değer yazmak ikinci bir doğruluk
       * kaynağı olurdu. Alan gizlenmiyor, salt okunur gösteriliyor — kullanıcı
       * açının nereden geldiğini görebilsin.
       */}
      <PropertyNumberField
        label="Açı (°)"
        valueCm={getCommonNumber(
          selected.map(
            (symbol) => getSymbolPose(symbol, walls, points)?.rotationDeg ?? 0,
          ),
        )}
        targetKey={targetKey}
        stepCm={ROTATION_STEP_DEG}
        isReadOnly={!isSingle || sole.attachment === 'wall'}
        // Açı KK-3'ün 15° adımına store'da yakalanıyor; panel ham değeri gönderir.
        onCommit={
          isSingle && sole.attachment === 'free'
            ? (angleDeg) => rotatePointSymbol(sole.id, angleDeg)
            : undefined
        }
        rejectionMessage="Açı uygulanamadı."
      />

      <div className="flex items-start justify-between gap-3 py-1">
        <label className="pt-1 text-xs text-ink-muted" htmlFor="symbol-note">
          Not
        </label>
        <textarea
          id="symbol-note"
          rows={2}
          value={isSingle ? sole.note : ''}
          readOnly={!isSingle}
          placeholder={isSingle ? undefined : 'Farklı'}
          onChange={(event) => setPointSymbolNote(sole.id, event.target.value)}
          className="w-32 resize-none rounded border border-edge bg-surface px-1.5 py-0.5 text-sm text-ink read-only:text-ink-muted"
        />
      </div>
    </div>
  )
}
