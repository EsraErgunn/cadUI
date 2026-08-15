import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyCheckboxField } from '../../../ui/properties/PropertyCheckboxField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { InsulationProperties as InsulationPropertiesData } from '../../core/elementProperties'
import { getCommonBoolean, getCommonString } from '../../core/propertyFields'

const EMPTY_INSULATION: InsulationPropertiesData = {
  isGrounded: false,
  groundingType: '',
  description: '',
}

type InsulationPropertiesProps = {
  elementIds: readonly Id[]
}

export function InsulationProperties({ elementIds }: InsulationPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `insulation-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField =
    (field: keyof InsulationPropertiesData) => (value: string | boolean) => {
      patchElements(elementIds, (element) => ({
        insulation: { ...EMPTY_INSULATION, ...element.insulation, [field]: value },
      }))
      return true
    }

  const isGrounded = getCommonBoolean(selected.map((element) => element.insulation?.isGrounded ?? false))

  return (
    <div>
      <PropertyCheckboxField
        label="Topraklama"
        checked={isGrounded}
        targetKey={targetKey}
        onCommit={commitField('isGrounded')}
      />
      {isGrounded === true && (
        <PropertyTextField
          label="Topraklama Tipi"
          value={getCommonString(selected.map((element) => element.insulation?.groundingType ?? ''))}
          targetKey={targetKey}
          onCommit={commitField('groundingType')}
        />
      )}
      <PropertyTextField
        label="Açıklama"
        value={getCommonString(selected.map((element) => element.insulation?.description ?? ''))}
        targetKey={targetKey}
        onCommit={commitField('description')}
      />
    </div>
  )
}
