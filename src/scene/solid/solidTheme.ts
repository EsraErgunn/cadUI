import type { AreaObject } from '../../core/model'
import type { RoomUsageType } from '../../core/roomUsage'
import type { SolidPipeSegment, SolidSlab } from '../../core/solidModel'
import { isDischargeKind } from '../../plumbing/core/lineKinds'
import { PIPE_TYPES } from '../../plumbing/core/pipeTypes'
import { isBurnerAppliance } from '../../plumbing/core/symbolMetadata'
import type { InstallationElementType } from '../../plumbing/core/symbolMetadata'
import { DISCHARGE_STROKE_COLORS, PLUMBING_COLORS } from '../../plumbing/scene/plumbingTheme'

/**
 * Katı modelin renkleri. 2B'nin `SCENE_COLORS`u burada kullanılamaz: orada
 * renkler DÜZ (meshBasicMaterial), burada ışık alan yüzeyler var — aynı gri
 * gölgede kararıp okunmaz oluyor, bu yüzden katı model tonları bir tık açık.
 *
 * Marka sarısı #FFC107 buraya da GİRMEZ (CLAUDE.md ürün kuralı) ve seçim mavisi
 * (#2d7ff9) ayrılmış kalır — katı modelde seçim yok, o rengi kimse kullanmaz.
 * Boru renkleri burada DEĞİL: çaptan gelir (`core/pipeTypes.ts`, K-W2).
 */
export const SOLID_COLORS = {
  /** Binanın oturduğu zemin: tuval beyazından ayrılan çok açık nötr. */
  ground: '#e8edf3',
  wall: '#ccd2da',
  /** Tipi VERİLMEMİŞ mahalin döşemesi; duvardan KOYU ki üstten bakışta ayrışsın. */
  slab: '#aeb7c4',
  /** Pencere camı: saydam ve maviye çalan — delik olduğu ilk bakışta okunsun. */
  glazing: '#8fc0e8',
  glazingOpacity: 0.35,
  beam: '#98a1af',
  /** Armatür/sayaç/servis kutusu gövdesi: koyu nötr, boru renkleriyle yarışmaz. */
  fitting: '#5b6675',
  /** Yakıcı cihaz: armatürden koyu — plandaki damga büyüklüğü farkının karşılığı. */
  appliance: '#3f4854',
} as const

/**
 * Alan nesnesi türü → renk. Dördü de kat boyunca yükselen kütleler; ayrım
 * renkten okunuyor çünkü katı modelde etiket yok.
 */
export const SOLID_AREA_COLORS: Record<AreaObject['type'], string> = {
  stairs: '#b9a48c',
  structuralColumn: '#8b939f',
  /** Baca ve kolon havalandırması 2B'deki kanal tonlarının katı karşılığı. */
  flueShaft: '#6b7280',
  columnVentilation: '#4f8a80',
}

/**
 * Mahal kullanım tipi → zemin rengi. Katı modelde etiket yok, mahal ancak
 * renginden okunuyor; tipsiz mahal nötr `SOLID_COLORS.slab`ta kalır (K117 —
 * "Tanımsız" bir tip değil, tipin YOKLUĞU).
 *
 * Record olduğu için listeye yeni bir tip eklenip rengi unutulursa DERLEME
 * kırılır. Tonlar mat ve birbirinden ayrık; marka sarısı (#FFC107) ve seçim
 * mavisi (#2d7ff9) buraya GİRMEZ.
 */
export const SOLID_ROOM_COLORS: Record<RoomUsageType, string> = {
  kitchen: '#d9a074',
  livingRoom: '#c9b79c',
  livingRoomOpenKitchen: '#d3ab86',
  sittingRoom: '#cfc0a6',
  bedroom: '#a9b8d4',
  bathroom: '#8fc7c1',
  toilet: '#7fb3ad',
  hall: '#c2c8d0',
  corridor: '#bcc3cc',
  duplexCorridor: '#aeb6c1',
  boilerRoom: '#c98b7a',
  laundry: '#a8c4a0',
  pantry: '#c4b48a',
  balcony: '#b8d3b0',
  balconyClosed: '#9fc39c',
  /** Merdiven boşluğu, içindeki merdiven kütlesiyle AYNI ton. */
  stairwell: '#b9a48c',
  fireEscape: '#c79a86',
  elevatorShaft: '#98a1af',
  garage: '#9aa3ad',
  storage: '#b0a99e',
  shaft: '#8f97a3',
  workplace: '#b6a7c4',
  apartment: '#bfb2cd',
  shop: '#c8a6b5',
  office: '#adb0c9',
}

export function getSolidSlabColor(slab: SolidSlab): string {
  return slab.usageType ? SOLID_ROOM_COLORS[slab.usageType] : SOLID_COLORS.slab
}

export function getSolidElementColor(type: InstallationElementType): string {
  return isBurnerAppliance(type) ? SOLID_COLORS.appliance : SOLID_COLORS.fitting
}

/**
 * Borunun katı modeldeki rengi — 2B'deki `lineStyle` ile AYNI tabloları okur:
 * gaz hattında çaptan (K-W2), deşarjda türden, kollarda kendi sabit renginden.
 * İkinci bir palet açılmıyor ki plandaki kırmızı boru katı modelde de kırmızı
 * olsun.
 */
export function getSolidPipeColor(segment: SolidPipeSegment): string {
  if (isDischargeKind(segment.kind)) return DISCHARGE_STROKE_COLORS[segment.kind]
  if (segment.kind === 'applianceStub') return PLUMBING_COLORS.applianceStub
  if (segment.kind === 'branchStub') return PLUMBING_COLORS.branchStub
  return PIPE_TYPES[segment.pipeTypeName].colorHex
}
