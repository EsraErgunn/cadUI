import type { Id } from '../../../core/model'
import { useCadStore } from '../../../store/cadStore'
import { PropertyCheckboxField } from '../../../ui/properties/PropertyCheckboxField'
import { PropertyTextField } from '../../../ui/properties/PropertyTextField'
import type { GasMeterProperties as GasMeterPropertiesData } from '../../core/elementProperties'
import { getCommonBoolean, getCommonString } from '../../core/propertyFields'

const EMPTY_GAS_METER: GasMeterPropertiesData = {
  classLabel: '',
  inletConsumptionPoint: '',
  outletConsumptionPoint: '',
  isIndoor: false,
  isAccessible247: false,
  hasCorrector: false,
}

type GasMeterPropertiesProps = {
  elementIds: readonly Id[]
}

export function GasMeterProperties({ elementIds }: GasMeterPropertiesProps) {
  const installationElements = useCadStore((state) => state.installationElements)
  const patchElements = useCadStore((state) => state.patchElements)

  const selected = installationElements.filter((element) => elementIds.includes(element.id))
  if (selected.length === 0) return null

  const targetKey = `gasMeter-${elementIds.join(',')}`

  // Yalnız DEĞİŞEN alan yazılır, elemanın diğer alt-alanları KENDİ mevcut
  // değerinden korunur (RegulatorProperties'teki gerekçeyle aynı).
  const commitField = (field: keyof GasMeterPropertiesData) => (value: string | boolean) => {
    patchElements(elementIds, (element) => ({
      gasMeter: { ...EMPTY_GAS_METER, ...element.gasMeter, [field]: value },
    }))
    return true
  }

  const commonString = (field: 'classLabel' | 'inletConsumptionPoint' | 'outletConsumptionPoint') =>
    getCommonString(selected.map((element) => element.gasMeter?.[field] ?? ''))

  const commonBoolean = (field: 'isIndoor' | 'isAccessible247' | 'hasCorrector') =>
    getCommonBoolean(selected.map((element) => element.gasMeter?.[field] ?? false))

  return (
    <div>
      <PropertyTextField
        label="Sınıf"
        value={commonString('classLabel')}
        targetKey={targetKey}
        onCommit={commitField('classLabel')}
      />
      <PropertyTextField
        label="Giriş Tüketim Noktası"
        value={commonString('inletConsumptionPoint')}
        targetKey={targetKey}
        onCommit={commitField('inletConsumptionPoint')}
      />
      <PropertyTextField
        label="Çıkış Tüketim Noktası"
        value={commonString('outletConsumptionPoint')}
        targetKey={targetKey}
        onCommit={commitField('outletConsumptionPoint')}
      />
      <PropertyCheckboxField
        label="İçeride"
        checked={commonBoolean('isIndoor')}
        targetKey={targetKey}
        onCommit={commitField('isIndoor')}
      />
      <PropertyCheckboxField
        label="7/24 Ulaşılabilir"
        checked={commonBoolean('isAccessible247')}
        targetKey={targetKey}
        onCommit={commitField('isAccessible247')}
      />
      <PropertyCheckboxField
        label="Korrektör"
        checked={commonBoolean('hasCorrector')}
        targetKey={targetKey}
        onCommit={commitField('hasCorrector')}
      />
    </div>
  )
}
