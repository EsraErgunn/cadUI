import { PropertyNumberField } from './PropertyNumberField'
import type { Id } from '../../core/model'
import { MIN_OPENING_WIDTH_CM, toCenterOffsetCm, toEdgeOffsetCm } from '../../core/opening'
import { getCommonNumber } from '../../core/propertyFields'
import { useCadStore } from '../../store/cadStore'

const WIDTH_STEP_CM = 5
const OFFSET_STEP_CM = 5

type OpeningPropertiesProps = {
  openingIds: readonly Id[]
}

export function OpeningProperties({ openingIds }: OpeningPropertiesProps) {
  const openings = useCadStore((state) => state.openings)
  const setOpeningWidth = useCadStore((state) => state.setOpeningWidth)
  const moveOpening = useCadStore((state) => state.moveOpening)

  const selectedOpenings = openings.filter((opening) => openingIds.includes(opening.id))
  if (selectedOpenings.length === 0) return null

  const targetKey = `openings-${openingIds.join(',')}`
  const [sole] = selectedOpenings
  const isSingle = selectedOpenings.length === 1

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs text-ink-muted">Tür</span>
        <span className="text-sm text-ink">
          {isSingle ? (sole.type === 'door' ? 'Kapı' : 'Pencere') : 'Karışık'}
        </span>
      </div>

      <PropertyNumberField
        label="Genişlik (cm)"
        valueCm={getCommonNumber(selectedOpenings.map((opening) => opening.widthCm))}
        targetKey={targetKey}
        minCm={MIN_OPENING_WIDTH_CM}
        stepCm={WIDTH_STEP_CM}
        onCommit={(widthCm) =>
          // Her açıklık kendi duvarına ayrı sığma kontrolünden geçiyor; biri
          // reddedilirse alan uyarı gösterir ama kabul edilenler yazılmış kalır.
          selectedOpenings
            .map((opening) => setOpeningWidth(opening.id, widthCm))
            .every((isApplied) => isApplied)
        }
        rejectionMessage="Bu genişlik duvara sığmıyor."
      />

      {/*
       * Konum KENARDAN gösterilir (K-3): model merkezi tutuyor ama mühendis
       * "duvar başından X cm" derken açıklığın yakın kenarını kastediyor.
       * Çevrim core/opening.ts'te, burada formül tekrarlanmaz.
       *
       * Yalnız tek açıklıkta düzenlenebilir: iki açıklığa aynı offset yazmak
       * ikisini üst üste bindirmeye çalışmak demek, ikincisi zaten reddedilirdi.
       */}
      <PropertyNumberField
        label="Duvar başından (cm)"
        valueCm={getCommonNumber(
          selectedOpenings.map((opening) => toEdgeOffsetCm(opening.offsetCm, opening.widthCm)),
        )}
        targetKey={targetKey}
        stepCm={OFFSET_STEP_CM}
        isReadOnly={!isSingle}
        onCommit={
          isSingle
            ? (edgeOffsetCm) =>
                moveOpening(sole.id, {
                  wallId: sole.wallId,
                  offsetCm: toCenterOffsetCm(edgeOffsetCm, sole.widthCm),
                })
            : undefined
        }
        rejectionMessage="Açıklık bu konuma sığmıyor."
      />
    </div>
  )
}
