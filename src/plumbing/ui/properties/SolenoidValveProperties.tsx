import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { SolenoidValveProperties as SolenoidValvePropertiesData } from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_SOLENOID_VALVE: SolenoidValvePropertiesData = { type: '', brand: '', model: '' }

type SolenoidValvePropertiesProps = {
  elementIds: readonly Id[]
}

export function SolenoidValveProperties({ elementIds }: SolenoidValvePropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `solenoidValve-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof SolenoidValvePropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      solenoidValve: { ...EMPTY_SOLENOID_VALVE, ...element.solenoidValve, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof SolenoidValvePropertiesData) =>
    getCommonString(selected.map((element) => element.solenoidValve?.[field] ?? ''))

  return (
    <div>
      <PropertyTextField
        label="Tip"
        value={commonValue('type')}
        targetKey={targetKey}
        onCommit={commitField('type')}
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
    </div>
  )
}
