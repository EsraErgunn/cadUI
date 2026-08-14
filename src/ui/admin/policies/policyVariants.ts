import { cva } from 'class-variance-authority'

/**
 * Yalnız poliçe sihirbazında kullanılan varyantlar. `adminVariants.ts`'e
 * KONULMADI: o dosyayı 200 satır sınırının üstüne çıkarıyorlardı ve klasör
 * sözleşmesi "tek ekrana özel parçalar `<ekran>/` altında" diyor
 * (`projectDetailVariants.ts` ile aynı gerekçe). İkinci bir sihirbaz çıkarsa
 * aynı kuralla `admin/` köküne taşınır.
 */

/**
 * Adım göstergesindeki numaralı daire. İçinde bulunulan adım DOLU birincil
 * renkte (en güçlü vurgu), tamamlanan adım aynı rengin soluk zemininde onay
 * işaretiyle duruyor: ikisi de dolu olsaydı "neredeyim" sorusunu yalnız ikonun
 * şekli cevaplardı.
 *
 * Tamamlanan dairenin YAZISI `ink`: birincil renk metin olarak koyu temada
 * yüzeye ~2.9:1 kalıyor (K56).
 */
export const stepCircleVariants = cva(
  'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
  {
    variants: {
      tone: {
        upcoming: 'border-edge bg-surface text-ink-muted',
        current: 'border-admin-primary bg-admin-primary text-admin-primary-ink',
        done: 'border-admin-primary bg-admin-primary/15 text-ink',
      },
    },
    defaultVariants: { tone: 'upcoming' },
  },
)

/** Dairenin altındaki adım adı; bulunulan adım kalın. */
export const stepLabelVariants = cva('text-xs', {
  variants: {
    tone: {
      upcoming: 'text-ink-muted',
      current: 'font-semibold text-ink',
      done: 'text-ink-muted',
    },
  },
  defaultVariants: { tone: 'upcoming' },
})
