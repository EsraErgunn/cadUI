import type { Id } from '../../../core/model'
import { getCommonNumber } from '../../../core/propertyFields'
import { useCadStore } from '../../../store/cadStore'
import { PropertyCheckboxField } from '../../../ui/properties/PropertyCheckboxField'
import { PropertyNumberField } from '../../../ui/properties/PropertyNumberField'
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
  meterOrder: 0,
  unitNumber: '',
  subscriberName: '',
  subscriberNo: '',
  flowCubicMeterPerHour: 0,
  pressureMbar: 0,
  areaSquareMeters: 0,
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
  const commitField = (field: keyof GasMeterPropertiesData) => (value: string | boolean | number) => {
    patchElements(elementIds, (element) => ({
      gasMeter: { ...EMPTY_GAS_METER, ...element.gasMeter, [field]: value },
    }))
    return true
  }

  const commonString = (
    field: 'classLabel' | 'inletConsumptionPoint' | 'outletConsumptionPoint' | 'unitNumber' | 'subscriberName' | 'subscriberNo',
  ) => getCommonString(selected.map((element) => element.gasMeter?.[field] ?? ''))

  const commonBoolean = (field: 'isIndoor' | 'isAccessible247' | 'hasCorrector') =>
    getCommonBoolean(selected.map((element) => element.gasMeter?.[field] ?? false))

  const commonNumber = (field: 'meterOrder' | 'flowCubicMeterPerHour' | 'pressureMbar' | 'areaSquareMeters') =>
    getCommonNumber(selected.map((element) => element.gasMeter?.[field] ?? 0))

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
      <PropertyNumberField
        label="Sıra No"
        valueCm={commonNumber('meterOrder')}
        targetKey={targetKey}
        onCommit={commitField('meterOrder')}
      />
      <PropertyTextField
        label="Birim"
        value={commonString('unitNumber')}
        targetKey={targetKey}
        onCommit={commitField('unitNumber')}
      />
      <PropertyTextField
        label="Abone Adı"
        value={commonString('subscriberName')}
        targetKey={targetKey}
        onCommit={commitField('subscriberName')}
      />
      <PropertyTextField
        label="Abone No"
        value={commonString('subscriberNo')}
        targetKey={targetKey}
        onCommit={commitField('subscriberNo')}
      />
      <PropertyNumberField
        label="Debi (m³/h)"
        valueCm={commonNumber('flowCubicMeterPerHour')}
        targetKey={targetKey}
        onCommit={commitField('flowCubicMeterPerHour')}
      />
      <PropertyNumberField
        label="Basınç (mbar)"
        valueCm={commonNumber('pressureMbar')}
        targetKey={targetKey}
        onCommit={commitField('pressureMbar')}
      />
      <PropertyNumberField
        label="Alan (m²)"
        valueCm={commonNumber('areaSquareMeters')}
        targetKey={targetKey}
        onCommit={commitField('areaSquareMeters')}
      />
    </div>
  )
}
