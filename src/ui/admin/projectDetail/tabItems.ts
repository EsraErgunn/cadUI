import {
  Box,
  ClipboardList,
  FileText,
  Files,
  Flame,
  History,
  Map,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

/**
 * Sekmeler. Gereksinim belgesi burada kendisiyle çelişiyordu: metin "sekiz
 * sekme" deyip beş isim sayıyor, KK-3 altı isim sayıyor, mockup sekiz gösteriyor.
 * Karar (K50): İÇERİĞİ olan altı sekme KK-3'ün listesi; mockup'taki "Katı Model"
 * ve "Gaz Açma" şeritte görünür ama seçilemez — sekiz sekmelik görsel korunur,
 * olmayan içerik uydurulmaz.
 */
export const PROJECT_DETAIL_TAB_KEYS = [
  'bilgi',
  'plan',
  'gecmis',
  'evrak',
  'police',
  'islem',
] as const

export type ProjectDetailTabKey = (typeof PROJECT_DETAIL_TAB_KEYS)[number]

/**
 * İçeriği bu sürümde yazılmayan sekmeler. Anahtarları yalnız tip olarak
 * gerekiyor (şeritte göründükleri hâlde seçilemedikleri için URL'e hiç
 * yazılmıyorlar), o yüzden dizi değil doğrudan birleşim.
 */
type ComingSoonTabKey = 'model' | 'gazAcma'

/** Şeritte duran her maddenin anahtarı; seçilebilir olanlar alt kümesi. */
export type TabStripKey = ProjectDetailTabKey | ComingSoonTabKey

export const DEFAULT_PROJECT_DETAIL_TAB: ProjectDetailTabKey = 'bilgi'

export interface ProjectDetailTab {
  key: TabStripKey
  label: string
  icon: LucideIcon
  /** İçeriği bu sürümde yazılmadı: şeritte görünür, seçilemez. */
  isComingSoon?: boolean
}

/** Sıra mockup'tan; "Katı Model" ve "Gaz Açma" aradaki yerlerinde duruyor. */
export const PROJECT_DETAIL_TABS: ProjectDetailTab[] = [
  { key: 'bilgi', label: 'Proje Bilgileri', icon: FileText },
  { key: 'plan', label: 'Proje Planı', icon: Map },
  { key: 'model', label: 'Katı Model', icon: Box, isComingSoon: true },
  { key: 'gecmis', label: 'Proje İşlem Geçmişi', icon: History },
  { key: 'evrak', label: 'Proje Evrakları', icon: Files },
  { key: 'police', label: 'Poliçe Bilgileri', icon: ShieldCheck },
  { key: 'gazAcma', label: 'Gaz Açma', icon: Flame, isComingSoon: true },
  { key: 'islem', label: 'Proje İşlemleri', icon: ClipboardList },
]

export function isProjectDetailTabKey(value: string | null): value is ProjectDetailTabKey {
  return PROJECT_DETAIL_TAB_KEYS.some((key) => key === value)
}
