import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from './model'
import type { Floor, Id } from './model'

/**
 * Kat sırası dizinin KENDİSİDİR, ayrı bir `order` alanı yoktur: iki yerde tutulan
 * sıra zamanla ayrışır ve JSON'a fazladan alan girer. Dizinin başı en ALT kat,
 * indeks arttıkça yukarı çıkılır — "alt kat gölgesi" bu yüzden index-1'dir.
 */
export const LOWEST_FLOOR_INDEX = 0

/** Proje en az bir kat taşır: son kat silinirse çizilecek yüzey kalmaz. */
export const MIN_FLOOR_COUNT = 1

/** Madde 10: tavan bodrumları DA kapsar, bodrum için ayrıca kendi tavanı var. */
export const MAX_FLOOR_COUNT = 40
export const MAX_BASEMENT_COUNT = 5

/** Madde 3/6: hem satırdaki yükseklik hem "yeni kat yüksekliği" aynı sınırlara tabi. */
export const MIN_FLOOR_HEIGHT_CM = 200
export const MAX_FLOOR_HEIGHT_CM = 600

export type FloorDirection = 'up' | 'down'

/** Proje açılışındaki tek kat. Üç yerde ayrı ayrı yazılırsa alan ekledikçe ayrışır. */
export function createGroundFloor(): Floor {
  return {
    id: DEFAULT_FLOOR_ID,
    name: DEFAULT_FLOOR_NAME,
    heightCm: DEFAULT_FLOOR_HEIGHT_CM,
    isBasement: false,
  }
}

export function getBasementCount(floors: readonly Floor[]): number {
  return floors.reduce((count, floor) => (floor.isBasement ? count + 1 : count), 0)
}

export function isFloorHeightValid(heightCm: number): boolean {
  return (
    Number.isFinite(heightCm) &&
    heightCm >= MIN_FLOOR_HEIGHT_CM &&
    heightCm <= MAX_FLOOR_HEIGHT_CM
  )
}

export function canAddFloor(floors: readonly Floor[]): boolean {
  return floors.length < MAX_FLOOR_COUNT
}

/** Bodrum iki tavana birden tabi: proje geneli (40) ve bodruma özel (5). */
export function canAddBasement(floors: readonly Floor[]): boolean {
  return canAddFloor(floors) && getBasementCount(floors) < MAX_BASEMENT_COUNT
}

export function getFloorIndex(floors: readonly Floor[], floorId: Id): number {
  return floors.findIndex((floor) => floor.id === floorId)
}

export function getFloorById(floors: readonly Floor[], floorId: Id): Floor | undefined {
  return floors.find((floor) => floor.id === floorId)
}

/** Hizalama referansı olarak gösterilen alt kat. En alttaki katın altı yoktur. */
export function getFloorBelowId(floors: readonly Floor[], floorId: Id): Id | undefined {
  const index = getFloorIndex(floors, floorId)
  if (index <= LOWEST_FLOOR_INDEX) return undefined
  return floors[index - 1].id
}

export function canRemoveFloor(floors: readonly Floor[]): boolean {
  return floors.length > MIN_FLOOR_COUNT
}

/**
 * Silinen kat aktifken hangi kat aktif olur: önce altındaki, o yoksa üstündeki.
 * Aşağı düşmek yukarı zıplamaktan az şaşırtıyor — kullanıcı bina içinde bir kat
 * inmiş olur.
 */
export function getFloorIdAfterRemoval(floors: readonly Floor[], removedId: Id): Id | undefined {
  const index = getFloorIndex(floors, removedId)
  if (index < 0) return undefined

  const below = floors[index - 1]
  const above = floors[index + 1]
  return below?.id ?? above?.id
}

/**
 * Yeni katın dizideki yeri: normal kat en üste (dizinin sonu), bodrum en alta
 * (dizinin başı). Bina yukarı doğru büyür, bodrum aşağı doğru kazılır.
 */
export function getFloorInsertIndex(floors: readonly Floor[], isBasement = false): number {
  return isBasement ? LOWEST_FLOOR_INDEX : floors.length
}

const ORDINAL_FLOOR_NAME_PATTERN = /^(\d+)\. Kat$/
const ORDINAL_BASEMENT_NAME_PATTERN = /^(\d+)\. Bodrum Kat$/
const FIRST_BASEMENT_NAME = 'Bodrum Kat'

/**
 * Yeni kat adı: var olan en yüksek "N. Kat" numarasının bir fazlası. Kat sayısına
 * bakılmaz — zemin ve bodrum katları da dizide olduğu için sayı hemen kayardı.
 * Kullanıcı adı zaten değiştirebilir; bu yalnız makul bir başlangıç.
 */
export function getNextFloorName(floors: readonly Floor[]): string {
  let highest = 0
  for (const floor of floors) {
    const match = ORDINAL_FLOOR_NAME_PATTERN.exec(floor.name.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `${highest + 1}. Kat`
}

/**
 * İlk bodrum sade "Bodrum Kat"; ikincisinden itibaren numaralanır. Tek bodrumlu
 * binada "1. Bodrum Kat" demek gereksiz bir numara okutur.
 */
export function getNextBasementName(floors: readonly Floor[]): string {
  const hasFirst = floors.some((floor) => floor.name.trim() === FIRST_BASEMENT_NAME)
  if (!hasFirst) return FIRST_BASEMENT_NAME

  let highest = 1
  for (const floor of floors) {
    const match = ORDINAL_BASEMENT_NAME_PATTERN.exec(floor.name.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return `${highest + 1}. ${FIRST_BASEMENT_NAME}`
}

/**
 * Ad çakışması: kat adı kullanıcının katları ayırt etme yolu, aynı ad iki katta
 * durum çubuğunu okunamaz yapar. Türkçe büyük/küçük harf tuzağına girmemek için
 * karşılaştırma yalnız boşluk kırpar — bkz. knowledge/turkish-collation.md.
 */
export function isFloorNameTaken(
  floors: readonly Floor[],
  name: string,
  exceptFloorId?: Id,
): boolean {
  const trimmed = name.trim()
  return floors.some((floor) => floor.id !== exceptFloorId && floor.name.trim() === trimmed)
}

export function isFloorNameValid(name: string): boolean {
  return name.trim().length > 0
}

/**
 * Bodrumlar dizinin başında, normal katlar arkasında — bu ayrım kotun işaretini
 * belirlediği için sıralama onu BOZAMAZ (madde 9: "bodrum katlar zemin katın
 * üzerine taşınamaz"). Kısıtı taşıma yönüne değil sonuç dizisine bakarak
 * denetliyoruz: sürükle-bırak katı herhangi bir indekse atabiliyor, yön bazlı
 * kontrol yalnız komşu takasını yakalardı.
 */
function isFloorOrderValid(floors: readonly Floor[]): boolean {
  let hasSeenNonBasement = false
  for (const floor of floors) {
    if (floor.isBasement && hasSeenNonBasement) return false
    if (!floor.isBasement) hasSeenNonBasement = true
  }
  return true
}

/**
 * Katı verilen indekse taşır. Sıra değişmiyorsa ya da bodrum/normal ayrımını
 * bozuyorsa AYNI diziyi döndürür (yeni referans değil): çağıran `===` ile
 * "değişiklik olmadı"yı anlar ve boş bir geri alma adımı üretmez.
 */
export function reorderFloorInList<T extends Floor>(
  floors: readonly T[],
  floorId: Id,
  targetIndex: number,
): readonly T[] {
  const index = getFloorIndex(floors, floorId)
  if (index < 0 || index === targetIndex) return floors
  if (targetIndex < 0 || targetIndex >= floors.length) return floors

  const reordered = [...floors]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, moved)
  return isFloorOrderValid(reordered) ? reordered : floors
}

/**
 * Bir üstteki / bir alttaki kat (madde 20: "Üst Kata Geç"). Uçta undefined
 * döner — döngüsel geçiş YOK: en üst kattayken bir üste basmak kullanıcıyı
 * bodruma düşürüp bina içindeki yerini kaybettirirdi. Klavye kısayolu YOK
 * (2026-08): kat yalnız yüzen çubuktan ve kat seçiciden değişir.
 */
export function getFloorIdInDirection(
  floors: readonly Floor[],
  floorId: Id,
  direction: FloorDirection,
): Id | undefined {
  const index = getFloorIndex(floors, floorId)
  if (index < 0) return undefined

  return floors[direction === 'up' ? index + 1 : index - 1]?.id
}

/** Bir sıra yukarı/aşağı — klavyeyle sıralama. Kısıtlar reorder ile ortak. */
export function moveFloorInList<T extends Floor>(
  floors: readonly T[],
  floorId: Id,
  direction: FloorDirection,
): readonly T[] {
  const index = getFloorIndex(floors, floorId)
  if (index < 0) return floors

  return reorderFloorInList(floors, floorId, direction === 'up' ? index + 1 : index - 1)
}

/**
 * Kat TİPİ (K168). Üçü de yalnız BİR AD; kat davranışını, yüksekliğini ya da
 * çizimini değiştirmez — kullanıcının kararı bu yönde.
 *
 * ⚠️ Tip AYRI BİR ALANDA saklanmaz, `Floor.name`in kendisidir. Modele alan
 * eklemek kaydedilen JSON'un şemasını değiştirirdi (`core/model.ts` sözleşme);
 * `name` zaten kaydediliyor ve tip adları ile konumsal adlar arasında çakışma
 * yok, bu yüzden tip addan OKUNUYOR.
 */
export type FloorType = 'duplex' | 'penthouse' | 'mezzanine'

export const FLOOR_TYPES: readonly FloorType[] = ['duplex', 'penthouse', 'mezzanine']

/** Menüde okunan ad. Asma katın GERÇEK adı altındaki katı da taşır. */
export const FLOOR_TYPE_LABELS: Record<FloorType, string> = {
  duplex: 'Dubleks',
  penthouse: 'Çatı Katı',
  mezzanine: 'Asma Kat',
}

/** Şerit etiketi: dar daireye tam ad sığmıyor. */
const FLOOR_TYPE_SHORT_LABELS: Record<FloorType, string> = {
  duplex: 'D',
  penthouse: 'Ç',
  mezzanine: 'A',
}

/**
 * ⚠️ Asma kat ÖNEKLE tanınır, tam eşitlikle değil: adı altındaki katı taşıyor
 * (`Asma Kat (Zemin)`, `Asma Kat (1)`), yani sabit bir dize değil.
 */
const MEZZANINE_NAME_PATTERN = /^(\d+\. )?Asma Kat(\s|$)/

export function getFloorType(floor: Floor): FloorType | null {
  const name = floor.name.trim()
  if (name === FLOOR_TYPE_LABELS.duplex) return 'duplex'
  if (name === FLOOR_TYPE_LABELS.penthouse) return 'penthouse'
  if (MEZZANINE_NAME_PATTERN.test(name)) return 'mezzanine'
  return null
}

/**
 * Tip o kata verilebilir mi (kullanıcı kuralı):
 * - `duplex` ve `penthouse` YALNIZ en üst kata,
 * - `mezzanine` zemin ve bodrum DIŞINDA her kata.
 *
 * Asma kat sayısı SINIRSIZ, üst üste de gelebilir: üst üste gelenler
 * numaralanıyor (`Asma Kat (Zemin)`, `2. Asma Kat (Zemin)`), yani adlar
 * çakışmıyor.
 */
export function canAssignFloorType(
  floors: readonly Floor[],
  floorId: Id,
  type: FloorType,
): boolean {
  const index = getFloorIndex(floors, floorId)
  if (index < 0 || floors[index].isBasement) return false

  if (type === 'mezzanine') {
    // Zemin = ilk yer üstü kat; asma kat onun ÜSTÜNDE bir yerde olmalı.
    const groundIndex = floors.findIndex((candidate) => !candidate.isBasement)
    return index > groundIndex
  }
  return index === floors.length - 1
}

export function getAssignableFloorTypes(floors: readonly Floor[], floorId: Id): FloorType[] {
  return FLOOR_TYPES.filter((type) => canAssignFloorType(floors, floorId, type))
}

/**
 * Adların TEK kaynağı (K167 + K168). Aşağıdan yukarı tek geçiş; her kat ya
 * tipinin adını alır ya sıradaki konumsal adını.
 *
 * ⚠️ **Asma kat numara TÜKETMEZ** (kullanıcı kararı): `1. Kat`ı asma kata
 * çevirmek o katı yok etmiyor, yalnız adını değiştiriyor — ve `1. Kat` bir üste
 * kayıyor. Sayaç bu yüzden asma katta ilerlemiyor. Asma katın kendi adı da
 * ALTINDAKİ katın adından okunuyor (`Asma Kat (Zemin)`, `Asma Kat (1)`); aşağıdan
 * yukarı gidildiği için alt komşunun adı o noktada zaten çözülmüş oluyor.
 *
 * Tip yalnız o konumda GEÇERLİYSE korunur; çatı katı aşağı taşınırsa adını
 * kaybedip konumsal adına döner — sessizce yanlış adı taşımaktansa düşürmek
 * doğrusu, kullanıcı yeniden verebilir.
 */
function resolveFloorNames<T extends Floor>(
  floors: readonly T[],
  typeOf: (floor: T) => FloorType | null,
): string[] {
  const basementCount = getBasementCount(floors)
  const names: string[] = []
  /** Aşağıdan yukarı doldurulur: üst üste asma katları saymak için gerekiyor. */
  const isMezzanine: boolean[] = []
  let aboveGroundIndex = 0

  floors.forEach((floor, index) => {
    if (floor.isBasement) {
      const depth = basementCount - index
      names.push(depth === 1 ? FIRST_BASEMENT_NAME : `${depth}. ${FIRST_BASEMENT_NAME}`)
      return
    }

    const type = typeOf(floor)
    const isValid = type !== null && canAssignFloorType(floors, floor.id, type)

    if (isValid && type === 'mezzanine') {
      // Üst üste asma katlar numaralanır ("Bodrum Kat / 2. Bodrum Kat" düzeni):
      // hepsi ALTLARINDAKİ ilk gerçek katın adını taşır, sıra numarasıyla ayrılır.
      let depth = 1
      let below = index - 1
      while (below >= 0 && isMezzanine[below]) {
        depth += 1
        below -= 1
      }

      const suffix = toFloorSuffix(names[below])
      const label = FLOOR_TYPE_LABELS.mezzanine
      names.push(depth === 1 ? `${label} (${suffix})` : `${depth}. ${label} (${suffix})`)
      isMezzanine[index] = true
      return
    }

    // Dubleks/çatı katı gerçek bir kat: numarayı tüketir, yalnız adı farklı.
    const positional = aboveGroundIndex === 0 ? DEFAULT_FLOOR_NAME : `${aboveGroundIndex}. Kat`
    aboveGroundIndex += 1
    names.push(isValid ? FLOOR_TYPE_LABELS[type] : positional)
  })

  return names
}

/** `Zemin Kat` → `Zemin`, `3. Kat` → `3`. Asma katın parantez içi. */
function toFloorSuffix(belowName: string | undefined): string {
  const ordinal = ORDINAL_FLOOR_NAME_PATTERN.exec(belowName ?? '')
  return ordinal ? ordinal[1] : 'Zemin'
}

/** Tipsiz, saf konumsal adlar — karşılaştırma ve test için. */
export function getPositionalFloorNames(floors: readonly Floor[]): string[] {
  return resolveFloorNames(floors, () => null)
}

function withNames<T extends Floor>(floors: readonly T[], names: readonly string[]): readonly T[] {
  if (floors.every((floor, index) => floor.name === names[index])) return floors
  return floors.map((floor, index) => ({ ...floor, name: names[index] }))
}

/** Listeyi yeniden adlandırır; değişen yoksa AYNI diziyi döndürür. */
export function withPositionalNames<T extends Floor>(floors: readonly T[]): readonly T[] {
  return withNames(floors, resolveFloorNames(floors, (floor) => getFloorType(floor)))
}

/**
 * Kata tip verir ya da (`null` ile) konumsal adına döndürür. Verilemeyen tip
 * sessizce reddedilir: AYNI dizi döner.
 */
export function withFloorType<T extends Floor>(
  floors: readonly T[],
  floorId: Id,
  type: FloorType | null,
): readonly T[] {
  if (type !== null && !canAssignFloorType(floors, floorId, type)) return floors

  return withNames(
    floors,
    resolveFloorNames(floors, (floor) => (floor.id === floorId ? type : getFloorType(floor))),
  )
}

/**
 * Sol kenardaki kat şeridinin kısa etiketleri: bodrum `B`, zemin `Z`, üstündekiler
 * `1`, `2`, `3`… Şerit dar ve yuvarlak, kat ADI oraya sığmıyor.
 *
 * Tipli kat sıradaki yerini değil KİMLİĞİNİ gösterir: `D` / `Ç` / `A`. Asma kat
 * numara tüketmediği için üstündeki kat numarasını korur — tam adlarla aynı kural.
 *
 * Dönen dizi girdiyle AYNI sırada (en alt kat başta); şeridin ters çevirmesi
 * görüntüleme kararı, veri burada çevrilmez.
 */
/**
 * PDF kat planı sayfasının antet metni: "Zemin Kat Planı", "1. Kat Planı",
 * "Bodrum Kat Planı", "Dubleks Planı" gibi. `floor.name` zaten TEK adlandırma
 * kaynağıdır (bkz. `resolveFloorNames`); burada yalnız "Planı" eklenir.
 */
export function getFloorPlanTitle(floor: Floor): string {
  return `${floor.name} Planı`
}

export function getFloorShortLabels(floors: readonly Floor[]): string[] {
  const basementCount = getBasementCount(floors)
  let aboveGroundIndex = 0

  return floors.map((floor, index) => {
    if (floor.isBasement) {
      return basementCount === 1 ? 'B' : `B${basementCount - index}`
    }

    const type = getFloorType(floor)
    const isValid = type !== null && canAssignFloorType(floors, floor.id, type)
    if (isValid && type === 'mezzanine') return FLOOR_TYPE_SHORT_LABELS.mezzanine

    const label = aboveGroundIndex === 0 ? 'Z' : String(aboveGroundIndex)
    aboveGroundIndex += 1
    return isValid ? FLOOR_TYPE_SHORT_LABELS[type] : label
  })
}
