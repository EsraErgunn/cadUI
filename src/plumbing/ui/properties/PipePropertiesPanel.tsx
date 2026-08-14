import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
import { PropertySelectField } from '../../../ui/properties/PropertySelectField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import { getLineLengthCm } from '../../core/lineGeometry'
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

  const selected = installationLines.filter((line) => lineIds.includes(line.id))
  if (selected.length === 0) return null

  const targetKey = `pipe-${lineIds.join(',')}`

  const lengthsCm = selected.map((line) =>
    Number(getLineLengthCm(line.points.map((point) => point.position)).toFixed(LENGTH_DECIMALS)),
  )

  // Yalnız DEĞİŞEN alan yazılır, hattın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof PipeLineProperties) => (value: string | number) => {
    patchLines(lineIds, (line) => ({ pipe: { ...EMPTY_PIPE, ...line.pipe, [field]: value } }))
    return true
  }

  const commonHeightCm = (field: 'startHeightCm' | 'endHeightCm') =>
    getCommonNumber(selected.map((line) => line.pipe?.[field] ?? 0))

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
          ile aynı karar — uzunluk kalıcı veri değildir), panel salt okunur gösterir. */}
      <PropertyNumberField
        label="Boy (cm)"
        valueCm={getCommonNumber(lengthsCm)}
        targetKey={targetKey}
        isReadOnly
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
