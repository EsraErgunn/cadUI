import type { Floor, Id } from './model'

const CM_PER_M = 100
const ELEVATION_FRACTION_DIGITS = 2

/** Kot okunuşu yön taşır: artı yukarı, eksi aşağı, sıfır referans düzlem. */
const POSITIVE_SIGN = '+'
const NEGATIVE_SIGN = '−'
const ZERO_SIGN = '±'

/**
 * Kotun sıfır noktası ZEMİN KATIN TABANI (KK-3). Dizide bodrumlar başta durduğu
 * için zemin kat = ilk bodrum olmayan kat.
 *
 * Zemin kat silinmiş, geriye yalnız bodrumlar kalmışsa referans dizinin ÜSTÜ
 * olur (`floors.length`): zemin düzlemi her bodrumun üstünde kalır, hepsi negatif
 * çıkar. Alternatif — en üst bodrumu ±0,00 saymak — bir bodrumun kotunu sıfır
 * gösterirdi.
 */
export function getGroundFloorIndex(floors: readonly Floor[]): number {
  const index = floors.findIndex((floor) => !floor.isBasement)
  return index < 0 ? floors.length : index
}

/**
 * Her katın TABAN kotu (cm), dizi sırasıyla. Tek geçişte üretilir: kat başına
 * ayrı ayrı hesaplansaydı liste çizimi O(n²) olurdu ve daha önemlisi kotların
 * birbiriyle tutarlılığı iki farklı çağrının insafına kalırdı.
 */
export function getFloorElevationsCm(floors: readonly Floor[]): number[] {
  const groundIndex = getGroundFloorIndex(floors)
  const elevations: number[] = []

  // Zemin katın tabanından yukarı doğru: her kat, altındakinin üstünde başlar.
  let above = 0
  for (let index = groundIndex; index < floors.length; index += 1) {
    elevations[index] = above
    above += floors[index].heightCm
  }

  // Zemin katın tabanından aşağı doğru: bodrumun tabanı kendi yüksekliği kadar
  // daha aşağıdadır, bu yüzden yukarıdan aşağıya inilir.
  let below = 0
  for (let index = groundIndex - 1; index >= 0; index -= 1) {
    below -= floors[index].heightCm
    elevations[index] = below
  }

  return elevations
}

export function getFloorElevationCm(floors: readonly Floor[], floorId: Id): number | undefined {
  const index = floors.findIndex((floor) => floor.id === floorId)
  if (index < 0) return undefined
  return getFloorElevationsCm(floors)[index]
}

/**
 * Bina yüksekliği bodrumları SAYMAZ (madde 2): bina zemin üstünde göründüğü
 * kadardır, bodrum derinliği ayrı bir büyüklüktür.
 */
export function getBuildingHeightCm(floors: readonly Floor[]): number {
  return floors.reduce((total, floor) => (floor.isBasement ? total : total + floor.heightCm), 0)
}

/** Ondalık ayracı virgül: tüm arayüz tr-TR (CLAUDE.md "Dil ve biçimlendirme"). */
function formatMeters(meters: number): string {
  return meters.toLocaleString('tr-TR', {
    minimumFractionDigits: ELEVATION_FRACTION_DIGITS,
    maximumFractionDigits: ELEVATION_FRACTION_DIGITS,
  })
}

/**
 * Kot metni: "+3,20" / "±0,00" / "−2,80". İşaret ELLE yazılır, `toLocaleString`'e
 * bırakılmaz — locale'in ürettiği eksi işareti tire olur ve sıfır hiç işaret
 * almaz; oysa "±0,00" kotun referans düzlem olduğunu söyleyen ayrı bir bilgi.
 */
export function formatElevationM(elevationCm: number): string {
  const meters = elevationCm / CM_PER_M
  if (meters === 0) return `${ZERO_SIGN}${formatMeters(0)}`

  const sign = meters > 0 ? POSITIVE_SIGN : NEGATIVE_SIGN
  return `${sign}${formatMeters(Math.abs(meters))}`
}

/** Bina yüksekliği gibi işaretsiz uzunluklar: "15,60". */
export function formatLengthM(lengthCm: number): string {
  return formatMeters(lengthCm / CM_PER_M)
}
