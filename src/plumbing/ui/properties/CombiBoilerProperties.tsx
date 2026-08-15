import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertySelectField } from '../../../ui/properties/PropertySelectField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import {
  APPLIANCE_TYPE_LABELS,
  type ApplianceType,
  type CombiBoilerProperties as CombiBoilerPropertiesData,
} from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_COMBI_BOILER: CombiBoilerPropertiesData = {
  applianceType: 'hermetic',
  brand: '',
  model: '',
  description: '',
  capacity: '',
  power: '',
}

const APPLIANCE_TYPE_OPTIONS = (Object.entries(APPLIANCE_TYPE_LABELS) as [ApplianceType, string][]).map(
  ([value, label]) => ({ value, label }),
)

function isApplianceType(value: string): value is ApplianceType {
  return value in APPLIANCE_TYPE_LABELS
}

type CombiBoilerPropertiesProps = {
  elementIds: readonly Id[]
}

export function CombiBoilerProperties({ elementIds }: CombiBoilerPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `combiBoiler-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof CombiBoilerPropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      combiBoiler: { ...EMPTY_COMBI_BOILER, ...element.combiBoiler, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof CombiBoilerPropertiesData) =>
    getCommonString(selected.map((element) => element.combiBoiler?.[field] ?? ''))

  return (
    <div>
      <PropertySelectField
        label="Tip"
        value={commonValue('applianceType')}
        options={APPLIANCE_TYPE_OPTIONS}
        targetKey={targetKey}
        onCommit={(next) => {
          if (!isApplianceType(next)) return false
          return commitField('applianceType')(next)
        }}
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
