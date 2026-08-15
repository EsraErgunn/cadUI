import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { StoveProperties as StovePropertiesData } from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_STOVE: StovePropertiesData = {
  brand: '',
  model: '',
  description: '',
  capacity: '',
  power: '',
}

type StovePropertiesProps = {
  elementIds: readonly Id[]
}

export function StoveProperties({ elementIds }: StovePropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `stove-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof StovePropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      stove: { ...EMPTY_STOVE, ...element.stove, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof StovePropertiesData) =>
    getCommonString(selected.map((element) => element.stove?.[field] ?? ''))

  return (
    <div>
      <PropertyTextField
        label="Marka"
        value={commonValue('brand')}
        targetKey={targetKey}
        onCommit={commitField('brand')}
      />
      <PropertyTextField
        label="Model"
        value={commonValue('model')}
        targetKey={targetKey}
        onCommit={commitField('model')}
      />
      <PropertyTextField
        label="Açıklama"
        value={commonValue('description')}
        targetKey={targetKey}
        onCommit={commitField('description')}
      />
      <PropertyTextField
        label="Kapasite"
        value={commonValue('capacity')}
        targetKey={targetKey}
        onCommit={commitField('capacity')}
      />
      <PropertyTextField
        label="Güç"
        value={commonValue('power')}
        targetKey={targetKey}
        onCommit={commitField('power')}
      />
    </div>
  )
}
