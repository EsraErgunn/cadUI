import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { StrainerMeterProperties as StrainerMeterPropertiesData } from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_STRAINER_METER: StrainerMeterPropertiesData = { classLabel: '', description: '' }

type StrainerMeterPropertiesProps = {
  elementIds: readonly Id[]
}

export function StrainerMeterProperties({ elementIds }: StrainerMeterPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `strainerMeter-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof StrainerMeterPropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      strainerMeter: { ...EMPTY_STRAINER_METER, ...element.strainerMeter, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof StrainerMeterPropertiesData) =>
    getCommonString(selected.map((element) => element.strainerMeter?.[field] ?? ''))

  return (
    <div>
      <PropertyTextField
        label="Sınıf"
        value={commonValue('classLabel')}
        targetKey={targetKey}
        onCommit={commitField('classLabel')}
      />
      <PropertyTextField
        label="Açıklama"
        value={commonValue('description')}
        targetKey={targetKey}
        onCommit={commitField('description')}
      />
    </div>
  )
}
