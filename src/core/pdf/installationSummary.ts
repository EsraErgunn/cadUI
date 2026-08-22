import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { buildMeterReport } from '../../plumbing/core/meterReport'

/**
 * Kapaktaki tesisat satırı. Değerler ÇİZİMDEN hesaplanıyor, uçtan değil:
 * kullanıcının kendi koyduğu sayaç, kendi bağladığı cihaz, kendi girdiği debi
 * ve basınç. Bilinmeyen alan boş dizge — sıfır YAZILMAZ, çünkü "hiç sayaç yok"
 * ile "debisi girilmemiş sayaç var" aynı şey değil.
 */
export type InstallationSummary = {
  meterCount: string
  deviceCount: string
  totalFlowCubicMeterPerHour: string
  usagePressure: string
}

export type InstallationSummaryInput = {
  installationElements: readonly InstallationElement[]
  installationLines: readonly InstallationLine[]
  installationConnections: readonly InstallationConnection[]
}

/** Ondalık ancak gerekiyorsa yazılır: "7" ile "7.0" arasında bilgi farkı yok. */
function formatFlow(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Sayaçların basıncı. Hepsi AYNI değeri taşıyorsa o değer yazılır; farklıysa
 * BOŞ bırakılır.
 *
 * Tek bir sayı seçmek (ilki, en büyüğü…) kâğıda "tesisatın basıncı budur" diye
 * yazmak olurdu ve farklı basınçlı bir tesisatta bu yanlış olur. Kapak tek
 * kutuluk bir özet; çelişkiyi gizlemek yerine söylememek doğru.
 */
function getSharedPressure(pressures: readonly number[]): string {
  const values = pressures.filter((value) => value > 0)
  if (values.length === 0) return ''

  const [first] = values
  return values.every((value) => value === first) ? `${first} mbar` : ''
}

/**
 * Çizimden tesisat özeti çıkarır.
 *
 * Kaynağı `buildMeterReport`: sayaç/cihaz ilişkisini borular üzerinden izleyen
 * TEK yer o. Burada ikinci bir sayım yazılsaydı (elemanları türe göre saymak
 * gibi) sayaca bağlı olmayan bir cihaz da toplama girer ve kapak, birim/cihaz
 * raporundan farklı bir sayı gösterirdi.
 */
export function getInstallationSummary(
  input: InstallationSummaryInput,
): InstallationSummary {
  const rows = buildMeterReport({
    installationElements: [...input.installationElements],
    installationLines: [...input.installationLines],
    installationConnections: [...input.installationConnections],
  })

  if (rows.length === 0) {
    return { meterCount: '', deviceCount: '', totalFlowCubicMeterPerHour: '', usagePressure: '' }
  }

  const deviceCount = rows.reduce((total, row) => total + row.devices.length, 0)
  const totalFlow = rows.reduce((total, row) => total + row.flowCubicMeterPerHour, 0)

  return {
    meterCount: String(rows.length),
    deviceCount: String(deviceCount),
    totalFlowCubicMeterPerHour: totalFlow > 0 ? formatFlow(totalFlow) : '',
    usagePressure: getSharedPressure(rows.map((row) => row.pressureMbar)),
  }
}
