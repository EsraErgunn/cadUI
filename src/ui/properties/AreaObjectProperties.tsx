import { useState } from 'react'

import { PropertyNumberField } from './PropertyNumberField'
import {
  AREA_OBJECT_TYPE_LABELS,
  hasAreaObjectRectangleSize,
  isAreaObjectLabelTaken,
  isAreaObjectLabelValid,
  isAreaObjectRotatable,
} from '../../core/areaObject'
import type { Id } from '../../core/model'
import { getCommonNumber } from '../../core/propertyFields'
import { ROTATION_STEP_DEG } from '../../core/transform'
import { useCadStore } from '../../store/cadStore'

type AreaObjectPropertiesProps = {
  areaObjectIds: readonly Id[]
}

const MIN_SIZE_CM = 1

/**
 * `PointSymbolProperties` ile aynı desen: etiket ve boyut/açı alanları YALNIZ
 * tek nesne seçiliyken düzenlenir — toplu boyutlandırma v1 kapsamı dışı
 * (tutamaçla sürükleme de öyle, bkz. docs/kararlar.md).
 */
export function AreaObjectProperties({ areaObjectIds }: AreaObjectPropertiesProps) {
  const areaObjects = useCadStore((state) => state.areaObjects)
  const setAreaObjectSize = useCadStore((state) => state.setAreaObjectSize)
  const rotateAreaObject = useCadStore((state) => state.rotateAreaObject)
  const setAreaObjectLabel = useCadStore((state) => state.setAreaObjectLabel)

  const selected = areaObjects.filter((areaObject) => areaObjectIds.includes(areaObject.id))
  const [labelDraft, setLabelDraft] = useState<string | undefined>(undefined)

  if (selected.length === 0) return null

  const targetKey = `areaObjects-${areaObjectIds.join(',')}`
  const [sole] = selected
  const isSingle = selected.length === 1
  // Yalnız ÇAP taşıyan tipler: çizimleri çember, genişlik≠uzunluk anlamsız.
  const isDiameterOnly = selected.every(
    (areaObject) => !hasAreaObjectRectangleSize(areaObject.type),
  )
  // Seçimde döndürülebilir TEK bir tip bile varsa alan durur; yoksa gizlenir.
  const isRotatable = selected.some((areaObject) => isAreaObjectRotatable(areaObject.type))

  const labelText = labelDraft ?? (isSingle ? sole.label : '')
  const labelError = (() => {
    if (labelDraft === undefined) return undefined
    if (!isAreaObjectLabelValid(labelDraft)) return 'Etiket boş olamaz.'
    if (isAreaObjectLabelTaken(areaObjects, labelDraft, sole.floorId, sole.id)) {
      return 'Bu etiket bu katta kullanılıyor.'
    }
    return undefined
  })()

  const commitLabel = () => {
    if (labelDraft !== undefined) setAreaObjectLabel(sole.id, labelDraft)
    setLabelDraft(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs text-ink-muted">Tür</span>
        <span className="text-sm text-ink">
          {isSingle ? AREA_OBJECT_TYPE_LABELS[sole.type] : 'Karışık'}
        </span>
      </div>

      {/* Etiket yalnız TEK nesnede düzenlenir: aynı adı iki nesneye vermek zaten
          reddedilir (KK-10), toplu yazım ikincisinde sessizce başarısız olurdu. */}
      <div className="flex items-center justify-between gap-3 py-1">
        <label className="text-xs text-ink-muted" htmlFor="area-object-label">
          Etiket
        </label>
        <div className="flex flex-col items-end">
          <input
            id="area-object-label"
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

      {/* Kolon havalandırması ÇEMBER çiziyor ve çapı min(genişlik, uzunluk):
          iki ayrı alan gösterilseydi kullanıcının girdiği fazlalık hiç
          çizilmez, sonra tutamaçla ilk dokunuşta sessizce silinirdi — kutu
          çemberden türüyor, yani kare (K51). Tek alan: çap. */}
      {isDiameterOnly ? (
        <PropertyNumberField
          label="Çap (cm)"
          valueCm={getCommonNumber(selected.map((areaObject) => areaObject.widthCm))}
          targetKey={targetKey}
          minCm={MIN_SIZE_CM}
          isReadOnly={!isSingle}
          onCommit={
            isSingle ? (diameterCm) => setAreaObjectSize(sole.id, diameterCm, diameterCm) : undefined
          }
          rejectionMessage="Boyut bir açıklığın üstüne düşüyor."
        />
      ) : (
        <>
          <PropertyNumberField
            label="Genişlik (cm)"
            valueCm={getCommonNumber(selected.map((areaObject) => areaObject.widthCm))}
            targetKey={targetKey}
            minCm={MIN_SIZE_CM}
            isReadOnly={!isSingle}
            onCommit={
              isSingle ? (widthCm) => setAreaObjectSize(sole.id, widthCm, sole.lengthCm) : undefined
            }
            rejectionMessage="Boyut bir açıklığın üstüne düşüyor."
          />

          <PropertyNumberField
            label="Uzunluk (cm)"
            valueCm={getCommonNumber(selected.map((areaObject) => areaObject.lengthCm))}
            targetKey={targetKey}
            minCm={MIN_SIZE_CM}
            isReadOnly={!isSingle}
            onCommit={
              isSingle ? (lengthCm) => setAreaObjectSize(sole.id, sole.widthCm, lengthCm) : undefined
            }
            rejectionMessage="Boyut bir açıklığın üstüne düşüyor."
          />
        </>
      )}

      {/* Açı KK-3'ün 15° adımına store'da yakalanıyor; panel ham değeri gönderir.
          Çember çizen tipte alan HİÇ gösterilmez: tutamacı da kaldırıldı, panelde
          kalsaydı hiçbir şeyi değiştirmeyen bir sayı düzenlenebilir olurdu. */}
      {isRotatable && (
        <PropertyNumberField
          label="Açı (°)"
          valueCm={getCommonNumber(selected.map((areaObject) => areaObject.angleDeg))}
          targetKey={targetKey}
          stepCm={ROTATION_STEP_DEG}
          isReadOnly={!isSingle}
          onCommit={isSingle ? (angleDeg) => rotateAreaObject(sole.id, angleDeg) : undefined}
          rejectionMessage="Açı bir açıklığın üstüne düşüyor."
        />
      )}
    </div>
  )
}
