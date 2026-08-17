import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
import { PropertySelectField } from '../../../ui/properties/PropertySelectField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import {
  APPLIANCE_TYPE_LABELS,
  type ApplianceType,
  type BoilerProperties as BoilerPropertiesData,
} from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_BOILER: BoilerPropertiesData = {
  applianceType: 'hermetic',
  brand: '',
  model: '',
  description: '',
  capacity: '',
  power: '',
  flowCubicMeterPerHour: 0,
}

const APPLIANCE_TYPE_OPTIONS = (Object.entries(APPLIANCE_TYPE_LABELS) as [ApplianceType, string][]).map(
  ([value, label]) => ({ value, label }),
)

function isApplianceType(value: string): value is ApplianceType {
  return value in APPLIANCE_TYPE_LABELS
}

type BoilerPropertiesProps = {
  elementIds: readonly Id[]
}

export function BoilerProperties({ elementIds }: BoilerPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `boiler-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof BoilerPropertiesData) => (value: string | number) => {
    patchElements(elementIds, (element) => ({
      boiler: { ...EMPTY_BOILER, ...element.boiler, [field]: value },
    }))
    return true
  }

  const commonValue = (
    field: 'applianceType' | 'brand' | 'model' | 'description' | 'capacity' | 'power',
  ) => getCommonString(selected.map((element) => element.boiler?.[field] ?? ''))

  const commonFlow = () =>
    getCommonNumber(selected.map((element) => element.boiler?.flowCubicMeterPerHour ?? 0))

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
      <PropertyNumberField
        label="Debi (m³/h)"
        valueCm={commonFlow()}
        targetKey={targetKey}
        onCommit={commitField('flowCubicMeterPerHour')}
      />
    </div>
  )
}
