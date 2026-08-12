import {
  ClipboardList,
  FileText,
  Files,
  History,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

/**
 * Sekmeler. Gereksinim belgesi burada kendisiyle çelişiyordu: metin "sekiz
 * sekme" deyip BEŞ isim sayıyor, KK-3 altı isim sayıyor, mockup sekiz gösteriyor.
 *
 * Karar (K50, 2026-08-12'de daraltıldı): ekran belge metnindeki BEŞ sekmeden
 * oluşuyor. "Proje Planı", "Katı Model" ve "Gaz Açma" kapsam dışı — çizime
 * detay ekranından değil, başlıktaki "Çizim Editöründe Aç" ile giriliyor;
 * plan için ayrı bir görüntüleyici tutmak aynı çizimin iki ayrı çizim yolunu
 * bakımda tutmak demekti.
 */
export const PROJECT_DETAIL_TAB_KEYS = [
  'bilgi',
  'gecmis',
  'evrak',
  'police',
  'islem',
] as const

export type ProjectDetailTabKey = (typeof PROJECT_DETAIL_TAB_KEYS)[number]

export const DEFAULT_PROJECT_DETAIL_TAB: ProjectDetailTabKey = 'bilgi'

export interface ProjectDetailTab {
  key: ProjectDetailTabKey
  label: string
  icon: LucideIcon
}

export const PROJECT_DETAIL_TABS: ProjectDetailTab[] = [
  { key: 'bilgi', label: 'Proje Bilgileri', icon: FileText },
  { key: 'gecmis', label: 'Proje İşlem Geçmişi', icon: History },
  { key: 'evrak', label: 'Proje Evrakları', icon: Files },
  { key: 'police', label: 'Poliçe Bilgileri', icon: ShieldCheck },
  { key: 'islem', label: 'Proje İşlemleri', icon: ClipboardList },
]

export function isProjectDetailTabKey(value: string | null): value is ProjectDetailTabKey {
  return PROJECT_DETAIL_TAB_KEYS.some((key) => key === value)
}
