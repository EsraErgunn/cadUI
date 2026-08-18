/** `requestIdleCallback` yokken ilk boyamanın geçmesi için beklenen süre. */
const PREFETCH_FALLBACK_DELAY_MS = 300

/**
 * Editör parçasına açılan TEK kapı.
 *
 * `router.tsx` onu tembel yüklüyor, proje detay ekranı ise kullanıcı düğmeye
 * basmadan önce indiriyor. İkisi de aynı `import()` ifadesinden geçmeli: ayrı
 * ayrı yazılsaydı biri taşınınca öbürü sessizce başka bir parçayı ısıtırdı.
 */
export function importEditorPage() {
  return import('../pages/EditorPage')
}

/**
 * Editör parçasını arka planda indirir (K101).
 *
 * Ölçüldü: tıklamadan tuvale 2220 ms geçiyordu ve bunun 2129 ms'i SADECE
 * 413 KB'lık parçayı indirmekti; ayrıştırma + WebGL kurulumu + ilk çizim
 * toplam ~90 ms. Parça önceden inmişse aynı geçiş 16 ms sürüyor.
 *
 * Boşta çağrılır: detay ekranının kendi verisi ve ilk boyamasıyla yarışmasın.
 * `requestIdleCallback` yoksa (Safari) kısa bir gecikme aynı işi görür.
 *
 * Sonuç BEKLENMEZ ve hata YUTULUR: bu bir ısıtma, kullanıcının gördüğü hiçbir
 * şey buna bağlı değil. Gerçekten gerektiğinde `router.tsx` aynı modülü tekrar
 * isteyecek ve hata orada — Suspense sınırının içinde — yüzeye çıkacak.
 *
 * Dönen fonksiyon ısıtmayı iptal eder: kullanıcı detaydan hemen çıkarsa
 * boşuna indirme başlatılmasın.
 */
export function prefetchEditorPage(): () => void {
  const warm = () => {
    void importEditorPage().catch(() => undefined)
  }

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(warm)
    return () => window.cancelIdleCallback(handle)
  }

  const timer = window.setTimeout(warm, PREFETCH_FALLBACK_DELAY_MS)
  return () => window.clearTimeout(timer)
}
