import type { AreaObjectStrokeRole } from '../core/areaObjectGeometry'
import { DEFAULT_WALL_THICKNESS_CM } from '../core/wall'

/**
 * Konturun ekranda inebileceği en ince değer (px).
 *
 * Altına düşen çizgi pikselin yalnız bir kesrini kaplıyor ve düz renk yerine
 * GRİ okunuyor — kullanıcının "uzaklaşınca silikleşiyor" dediği şey bu.
 *
 * Duvarın `MIN_WALL_WIDTH_PX`'i (3) burada KULLANILMAZ: o değer kapsül
 * uçlarının kavşakta üst üste binmesinden doğuyor (`wallStyle.ts`). Konturda
 * öyle bir sorun yok ve 3 px, en uzak zoom'da 2,5 cm'lik ayrıntı çizgisini
 * 20 cm'lik duvarla aynı kalınlığa çıkarırdı.
 */
export const MIN_ARCHITECTURE_STROKE_PX = 1.5

/**
 * Kontur kalınlığı cm → EKRAN PİKSELİ.
 *
 * ⚠️ `worldUnits` KULLANILMAZ — iki ayrı soluklaşmanın da sebebi oydu:
 *
 * 1. **Ekran kenarlarına doğru incelme.** `worldUnits` shader'ı göz ışınlarının
 *    tek noktadan çıktığını varsayıyor (perspektif). Kameramız ortografik,
 *    ışınlar paralel ve kamera 100.000 cm yukarıda; fragment hesabı bu
 *    büyüklükte float32 hassasiyetini yiyor. Duvarda aynı tuzağa düşülmüş ve
 *    piksel yoluna geçilerek çözülmüştü (`wallStyle.ts`), alan nesnesiyle
 *    kiriş o düzeltmenin dışında kalmıştı.
 * 2. **Uzaklaşınca kaybolma.** cm sabit tutulunca çizgi zoom ile birlikte
 *    küçülüyor; en uzak zoom'da (0,1) 5 cm yalnız 0,5 px eder. Piksel yolunda
 *    kalınlığı biz `cm × zoom` ile veriyoruz ve alt sınırı dayatabiliyoruz.
 *
 * Görünen boyut değişmiyor: `cm × zoom` tam olarak `worldUnits`in çizmesi
 * gereken kalınlık. Kesik ölçüleri (`dashSize`/`gapSize`) bu değişimden
 * ETKİLENMEZ — onlar çizgi boyunca ölçülüyor ve birimleri her hâlükârda cm.
 */
export function getArchitectureStrokeWidthPx(widthCm: number, zoom: number): number {
  return Math.max(widthCm * zoom, MIN_ARCHITECTURE_STROKE_PX)
}

/**
 * Alan nesnesi: gövde (dış hat) KALIN, ayrıntı (basamak/ok/çember) İNCE.
 *
 * İkisi de İNCELTİLDİ (kullanıcı isteği): duvar koyulaşınca (K151) kolon/şaft/
 * merdiven konturu planda duvarla yarışır oldu — nesne yapı değil, yapının
 * içindeki bir eleman.
 *
 * Kalınlıklar duvardan TÜRETİLİR ki varsayılan duvar değişince oran korunsun.
 * Gerçek nesne ve tesisat görünümündeki hayaleti AYNI sabitleri okur; iki
 * dosyada ayrı ayrı yazıldıklarında biri değiştirilip öteki unutuluyordu.
 */
export const AREA_OBJECT_STROKE_WIDTHS_CM: Record<AreaObjectStrokeRole, number> = {
  body: DEFAULT_WALL_THICKNESS_CM / 6,
  detail: DEFAULT_WALL_THICKNESS_CM / 11,
}

/**
 * Kiriş konturu alan nesnesinin gövdesinden İNCE (kullanıcı isteği: "bir tık
 * inceltilmeli"). Alan nesnesi inceltilince (K152) kiriş de aynı oranda inceltildi:
 * ikisi eşitlenirse bu kural sessizce kaybolurdu. Eskiden ikisi de duvarın
 * dörtte biriydi ve kiriş planda gereğinden ağır duruyordu — kesitin dışında kalan bir eleman, üstünden geçtiği
 * duvarı bastırmamalı.
 */
export const BEAM_STROKE_WIDTH_CM = DEFAULT_WALL_THICKNESS_CM / 8

/**
 * Kesik çizginin boy/boşluk ölçüleri (cm). Duvar kalınlığına oranlanıyor: sabit
 * yazılsaydı 20 cm'lik bir kirişte kesikler gövdeden uzun görünürdü.
 */
export const BEAM_DASH_SIZE_CM = DEFAULT_WALL_THICKNESS_CM
export const BEAM_GAP_SIZE_CM = DEFAULT_WALL_THICKNESS_CM * 0.6
