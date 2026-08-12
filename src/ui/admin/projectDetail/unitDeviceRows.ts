import type { ProjectDeviceRow, ProjectUnitRow } from '../../../api/projectDetail'

export interface UnitDeviceRow {
  key: string
  unit: ProjectUnitRow
  /** Cihazı olmayan birim de bir satır üretir; cihaz sütunları boş kalır. */
  device: ProjectDeviceRow | null
  /** Birim bilgileri YALNIZ ilk satırda gösterilir (KK-6). */
  isFirstOfUnit: boolean
}

/**
 * Birim × cihaz düzleştirmesi. Bir birimde birden fazla cihaz varsa her cihaz
 * ayrı satıra iner ve birim bilgileri yalnız ilkinde görünür (KK-6).
 *
 * `rowSpan` ile TEK satırda birleştirilmedi: birim hücresi cihaz sayısı kadar
 * uzayınca satır vurgusu ve yatay kaydırma bozuluyor, ekran okuyucu da
 * birleşmiş hücreyi her cihaz satırında yeniden okuyor. Gereksinim de zaten
 * "alt satırlar boş kalır" diyor — birleştirme değil, boş bırakma.
 */
export function flattenUnitDeviceRows(units: ProjectUnitRow[]): UnitDeviceRow[] {
  return units.flatMap((unit): UnitDeviceRow[] => {
    if (unit.devices.length === 0) {
      return [{ key: `unit-${unit.id}`, unit, device: null, isFirstOfUnit: true }]
    }

    return unit.devices.map((device, index) => ({
      key: `unit-${unit.id}-device-${device.id}`,
      unit,
      device,
      isFirstOfUnit: index === 0,
    }))
  })
}
