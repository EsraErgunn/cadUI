import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { ChimneyLineProperties } from '../../core/lineProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_CHIMNEY: ChimneyLineProperties = { type: '', startHeightCm: 0, endHeightCm: 0 }

type ChimneyPropertiesPanelProps = {
  lineIds: readonly Id[]
}

export function ChimneyPropertiesPanel({ lineIds }: ChimneyPropertiesPanelProps) {
  const installationLines = useCadStore((state) => state.installationLines)
  const patchLines = useCadStore((state) => state.patchLines)

  const selected = installationLines.filter((line) => lineIds.includes(line.id))
  if (selected.length === 0) return null

  const targetKey = `chimney-${lineIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, hattın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (PipePropertiesPanel'deki gerekçeyle aynı).
  const commitField = (field: keyof ChimneyLineProperties) => (value: string | number) => {
    patchLines(lineIds, (line) => ({ chimney: { ...EMPTY_CHIMNEY, ...line.chimney, [field]: value } }))
    return true
  }

  const commonHeightCm = (field: 'startHeightCm' | 'endHeightCm') =>
    getCommonNumber(selected.map((line) => line.chimney?.[field] ?? 0))

  return (
    <div>
      <PropertyTextField
        label="Tip"
        value={getCommonString(selected.map((line) => line.chimney?.type ?? ''))}
        targetKey={targetKey}
        onCommit={commitField('type')}
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
    </div>
  )
}
