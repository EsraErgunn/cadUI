import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
import { PropertySelectField } from '../../../ui/properties/PropertySelectField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import { getLine3dLengthCm, resolvePipeResizeTarget } from '../../core/lineElevation'
import type { PipeLineProperties } from '../../core/lineProperties'
import { isPipeTypeName, PIPE_TYPE_NAMES } from '../../core/pipeTypes'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_PIPE: PipeLineProperties = { startHeightCm: 0, endHeightCm: 0, description: '' }

/** Uzunluk türetilmiş bir değer; ondalık kuyruğu panelde okunmaz olmasın (WallProperties ile aynı). */
const LENGTH_DECIMALS = 1

const PIPE_TYPE_OPTIONS = PIPE_TYPE_NAMES.map((name) => ({ value: name, label: name }))

type PipePropertiesPanelProps = {
  lineIds: readonly Id[]
}

export function PipePropertiesPanel({ lineIds }: PipePropertiesPanelProps) {
  const installationLines = useCadStore((state) => state.installationLines)
  const setLinesPipeType = useCadStore((state) => state.setLinesPipeType)
  const patchLines = useCadStore((state) => state.patchLines)
  const resizePipeEnd = useCadStore((state) => state.resizePipeEnd)

  const selected = installationLines.filter((line) => lineIds.includes(line.id))
  if (selected.length === 0) return null

  const targetKey = `pipe-${lineIds.join(',')}`

  // Gerçek 3B boru boyu (K98): kot farkı Pisagor ile katılır, metraj plan
  // boyundan fazla göstermeli — BOM/malzeme dökümü buradan okuyacak.
  const lengthsCm = selected.map((line) =>
    Number(
      getLine3dLengthCm(
        line.points.map((point) => point.position),
        line.pipe?.startHeightCm ?? 0,
        line.pipe?.endHeightCm ?? 0,
      ).toFixed(LENGTH_DECIMALS),
    ),
  )

  // Yalnız DEĞİŞEN alan yazılır, hattın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof PipeLineProperties) => (value: string | number) => {
    patchLines(lineIds, (line) => ({ pipe: { ...EMPTY_PIPE, ...line.pipe, [field]: value } }))
    return true
  }

  const commonHeightCm = (field: 'startHeightCm' | 'endHeightCm') =>
    getCommonNumber(selected.map((line) => line.pipe?.[field] ?? 0))

  // "Boy" düzenlemesi TEK ve İKİ NOKTALI hatta anlamlı: boru üstünde armatür
  // oturuyorsa (3+ nokta) ya da birden çok hat seçiliyse hangi ucun, hangi
  // yöne kayacağı belirsizleşir — WallProperties'teki "komşuyla paylaşılan
  // köşe" gerekçesiyle aynı, orada da uzunluk bilerek salt okunur bırakılmıştı.
  const resizableLine = selected.length === 1 ? selected[0] : null
  const canResize = resizableLine !== null && resizableLine.points.length === 2

  const commitLength = (valueCm: number): boolean => {
    if (!resizableLine) return false
    const [startPoint, endPoint] = resizableLine.points
    const target = resolvePipeResizeTarget(
      startPoint.position,
      endPoint.position,
      resizableLine.pipe?.startHeightCm ?? 0,
      resizableLine.pipe?.endHeightCm ?? 0,
      valueCm,
    )
    if (!target) return false

    resizePipeEnd(resizableLine.id, endPoint.id, target.position, target.endHeightCm)
    return true
  }

  return (
    <div>
      <PropertySelectField
        label="Tip"
        value={getCommonString(selected.map((line) => line.pipeTypeName))}
        options={PIPE_TYPE_OPTIONS}
        targetKey={targetKey}
        onCommit={(next) => {
          if (!isPipeTypeName(next)) return false
          setLinesPipeType(lineIds, next)
          return true
        }}
      />
      <PropertyNumberField
        label="1. Nokta Yüksekliği (cm)"
        valueCm={commonHeightCm('startHeightCm')}
        targetKey={targetKey}
        onCommit={commitField('startHeightCm')}
      />
      <PropertyNumberField
        label="2. Nokta Yüksekliği (cm)"
        valueCm={commonHeightCm('endHeightCm')}
        targetKey={targetKey}
        onCommit={commitField('endHeightCm')}
      />
      {/* Boy AYRI bir alan olarak SAKLANMAZ: geometriden türer (measurement-labels.md
          ile aynı karar — uzunluk kalıcı veri değildir). Tek ve iki noktalı hatta
          DÜZENLENEBİLİR: yazılan 3B boya göre bitiş ucu GÜNCEL yönünü koruyarak
          kayar (`resolvePipeResizeTarget`) — saf yatayda yalnız plan uzar, saf
          dikeyde (K98) yalnız kot değişir. */}
      <PropertyNumberField
        label="Boy (cm)"
        valueCm={getCommonNumber(lengthsCm)}
        targetKey={targetKey}
        isReadOnly={!canResize}
        onCommit={canResize ? commitLength : undefined}
        rejectionMessage="Geçersiz boy"
      />
      <PropertyTextField
        label="Açıklama"
        value={getCommonString(selected.map((line) => line.pipe?.description ?? ''))}
        targetKey={targetKey}
        onCommit={commitField('description')}
      />
    </div>
  )
}
