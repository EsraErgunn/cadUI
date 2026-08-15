import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertySelectField } from '../../../ui/properties/PropertySelectField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import {
  APPLIANCE_TYPE_LABELS,
  type ApplianceType,
  OTHER_APPLIANCE_KIND_LABELS,
  type OtherApplianceKind,
  type OtherApplianceProperties as OtherAppliancePropertiesData,
} from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_OTHER_APPLIANCE: OtherAppliancePropertiesData = {
  type: 'hob',
  classLabel: 'hermetic',
  brand: '',
  model: '',
  description: '',
  capacity: '',
  power: '',
}

const OTHER_APPLIANCE_KIND_OPTIONS = (
  Object.entries(OTHER_APPLIANCE_KIND_LABELS) as [OtherApplianceKind, string][]
).map(([value, label]) => ({ value, label }))

const APPLIANCE_TYPE_OPTIONS = (Object.entries(APPLIANCE_TYPE_LABELS) as [ApplianceType, string][]).map(
  ([value, label]) => ({ value, label }),
)

function isOtherApplianceKind(value: string): value is OtherApplianceKind {
  return value in OTHER_APPLIANCE_KIND_LABELS
}

function isApplianceType(value: string): value is ApplianceType {
  return value in APPLIANCE_TYPE_LABELS
}

type OtherAppliancePropertiesProps = {
  elementIds: readonly Id[]
}

export function OtherApplianceProperties({ elementIds }: OtherAppliancePropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `otherAppliance-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof OtherAppliancePropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      otherAppliance: { ...EMPTY_OTHER_APPLIANCE, ...element.otherAppliance, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof OtherAppliancePropertiesData) =>
    getCommonString(selected.map((element) => element.otherAppliance?.[field] ?? ''))

  return (
    <div>
      <PropertySelectField
        label="Tip"
        value={commonValue('type')}
        options={OTHER_APPLIANCE_KIND_OPTIONS}
        targetKey={targetKey}
        onCommit={(next) => {
          if (!isOtherApplianceKind(next)) return false
          return commitField('type')(next)
        }}
      />
      <PropertySelectField
        label="Sınıf"
        value={commonValue('classLabel')}
        options={APPLIANCE_TYPE_OPTIONS}
        targetKey={targetKey}
        onCommit={(next) => {
          if (!isApplianceType(next)) return false
          return commitField('classLabel')(next)
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
