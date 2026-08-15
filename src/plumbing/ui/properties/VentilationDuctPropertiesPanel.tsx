import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyCheckboxField } from '../../../ui/properties/PropertyCheckboxField'
import type { VentilationDuctLineProperties } from '../../core/lineProperties'
import { getCommonBoolean } from '../../core/propertyFields'

const EMPTY_VENTILATION_DUCT: VentilationDuctLineProperties = { isSubDuct: false, isForced: false }

type VentilationDuctPropertiesPanelProps = {
  lineIds: readonly Id[]
}

export function VentilationDuctPropertiesPanel({ lineIds }: VentilationDuctPropertiesPanelProps) {
  const installationLines = useCadStore((state) => state.installationLines)
  const patchLines = useCadStore((state) => state.patchLines)

  const selected = installationLines.filter((line) => lineIds.includes(line.id))
  if (selected.length === 0) return null

  const targetKey = `ventilationDuct-${lineIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, hattın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (PipePropertiesPanel'deki gerekçeyle aynı).
  const commitField = (field: keyof VentilationDuctLineProperties) => (value: boolean) => {
    patchLines(lineIds, (line) => ({
      ventilationDuct: { ...EMPTY_VENTILATION_DUCT, ...line.ventilationDuct, [field]: value },
    }))
    return true
  }

  const commonBoolean = (field: keyof VentilationDuctLineProperties) =>
    getCommonBoolean(selected.map((line) => line.ventilationDuct?.[field] ?? false))

  return (
    <div>
      <PropertyCheckboxField
        label="Alt Kanal"
        checked={commonBoolean('isSubDuct')}
        targetKey={targetKey}
        onCommit={commitField('isSubDuct')}
      />
      <PropertyCheckboxField
        label="Cebri"
        checked={commonBoolean('isForced')}
        targetKey={targetKey}
        onCommit={commitField('isForced')}
      />
    </div>
  )
}
