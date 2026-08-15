import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { FilterKitProperties as FilterKitPropertiesData } from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_FILTER_KIT: FilterKitPropertiesData = {
  kit: '',
  brand: '',
  model: '',
  description: '',
}

type FilterKitPropertiesProps = {
  elementIds: readonly Id[]
}

export function FilterKitProperties({ elementIds }: FilterKitPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `filterKit-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof FilterKitPropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      filterKit: { ...EMPTY_FILTER_KIT, ...element.filterKit, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof FilterKitPropertiesData) =>
    getCommonString(selected.map((element) => element.filterKit?.[field] ?? ''))

  return (
    <div>
      <PropertyTextField
        label="Kit"
        value={commonValue('kit')}
        targetKey={targetKey}
        onCommit={commitField('kit')}
      />
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
    </div>
  )
}
