import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { RegulatorProperties as RegulatorPropertiesData } from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_REGULATOR: RegulatorPropertiesData = {
  brand: '',
  model: '',
  pressure: '',
  description: '',
}

type RegulatorPropertiesProps = {
  elementIds: readonly Id[]
}

export function RegulatorProperties({ elementIds }: RegulatorPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `regulator-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur — patchElements'in updater alması bunun için (bkz.
  // plumbingSlice.ts).
  const commitField = (field: keyof RegulatorPropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      regulator: { ...EMPTY_REGULATOR, ...element.regulator, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof RegulatorPropertiesData) =>
    getCommonString(selected.map((element) => element.regulator?.[field] ?? ''))

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
        label="Basınç"
        value={commonValue('pressure')}
        targetKey={targetKey}
        onCommit={commitField('pressure')}
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
