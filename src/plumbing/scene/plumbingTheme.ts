import type { DischargeLineKind } from '../core/lineKinds'

/**
 * Tesisat katmanının renkleri. Seçim rengi buraya kopyalanmaz —
 * src/scene/sceneTheme.ts → SCENE_COLORS.selection kullanılır.
 */
/** Ölçünün nötr tonu: hattın hiçbir çap rengiyle karışmaz (oda etiketiyle aynı). */
const MEASUREMENT_INK = '#5b6675'

export const PLUMBING_COLORS = {
  /**
   * Soluk mimari referans — seçilemez, salt görsel bağlam. Izgaradan (gridMajor
   * #cbd3e0) belirgin şekilde KOYU olmalı: yakın tonda kaldığında duvarlar
   * ızgara çizgisi sanılıyor.
   */
  architectureGhost: '#94a3b8',
  // Hat renkleri burada DEĞİL: çaptan gelir (core/pipeTypes.ts, K-W2). "Tuvalde
  // sarı = gaz hattı" kuralı bu kararla kalktı.
  /** Sembol yüklenemediğinde çizilen yer tutucu — seçim mavisiyle karışmayan uyarı rengi. */
  assetError: '#dc2626',
  /**
   * Yakıcı cihazı boruya bağlayan kol: çap sınıfından BAĞIMSIZ, hep kırmızı ve
   * kesikli — boru değil, cihazın kısa bağlantısı olduğu ayırt edilsin diye.
   */
  applianceStub: '#ef4444',
  /**
   * Branşmanın yer seviyesi noktasını sayacın giriş portuna bağlayan parça:
   * applianceStub'la AYNI gerekçe (çap sınıfından bağımsız, hep kesikli), ama
   * seçim mavisinden (#2d7ff9) ayrılsın diye daha koyu bir mavi.
   */
  branchStub: '#1d4ed8',
  /**
   * Baca kanalı: koyu nötr. Çap paletiyle, applianceStub kırmızısıyla (#ef4444),
   * seçim mavisiyle (#2d7ff9), snap yeşiliyle (#0aa06e) ve marka sarısıyla
   * çakışmaz. Kanal planın ALTYAPISI — gaz hattı kadar bağırmamalı.
   */
  chimneyStroke: '#4b5563',
  /**
   * Havalandırma kanalı: bacayla aynı biçim, farklı ton. Renk TEK ayırt edici
   * değil — havalandırma ayrıca KESİKLİ çizilir (gri baskıda ve renk körlüğünde
   * de ayrılsın diye, ölçüm çizgisiyle aynı gerekçe).
   */
  ventilationStroke: '#0f766e',
  /** Eleman ad etiketi: nötr koyu mürekkep — hattın çap renkleriyle karışmaz. */
  elementLabelInk: '#374151',
  /**
   * Etiketi elemana bağlayan kesikli kılavuz: sarı istendi ama MARKA sarısı
   * (#FFC107) tuvale giremez (K27) ve açık zeminde okunmaz — koyu amber seçildi.
   */
  elementLabelLeader: '#d97706',
  measurementLabel: MEASUREMENT_INK,
  /**
   * Geçici ölçüm çizgisi yazısıyla AYNI ton: ikisi tek bir işaret. Boru
   * OLMADIĞI kesikli çizilmesinden anlaşılır — renk körlüğü ve gri baskıda
   * renk tek başına ayırt edici değildir.
   */
  measurementLine: MEASUREMENT_INK,
} as const

/** Deşarj türü → kontur rengi. Tek kaynak: kanal ve önizlemesi aynı tablodan okur. */
export const DISCHARGE_STROKE_COLORS: Record<DischargeLineKind, string> = {
  chimney: PLUMBING_COLORS.chimneyStroke,
  ventilationDuct: PLUMBING_COLORS.ventilationStroke,
}
