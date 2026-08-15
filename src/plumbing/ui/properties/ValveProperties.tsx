import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { ValveProperties as ValvePropertiesData } from '../../core/elementProperties'
import { getCommonString } from '../../core/propertyFields'

const EMPTY_VALVE: ValvePropertiesData = { type: '', description: '' }

type ValvePropertiesProps = {
  elementIds: readonly Id[]
}

export function ValveProperties({ elementIds }: ValvePropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `valve-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof ValvePropertiesData) => (value: string) => {
    patchElements(elementIds, (element) => ({
      valve: { ...EMPTY_VALVE, ...element.valve, [field]: value },
    }))
    return true
  }

  const commonValue = (field: keyof ValvePropertiesData) =>
    getCommonString(selected.map((element) => element.valve?.[field] ?? ''))

  return (
    <div>
      <PropertyTextField
        label="Tip"
        value={commonValue('type')}
        targetKey={targetKey}
        onCommit={commitField('type')}
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
