/**
 * Tesisat katmanının renkleri. Seçim rengi buraya kopyalanmaz —
 * src/scene/sceneTheme.ts → SCENE_COLORS.selection kullanılır.
 */
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
  /** Ölçü yazısı: hattın hiçbir çap rengiyle karışmayan nötr ton (oda etiketiyle aynı). */
  measurementLabel: '#5b6675',
} as const
