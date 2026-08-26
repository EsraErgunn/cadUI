import { cva } from 'class-variance-authority'

/**
 * Yönetici sayfalarının dış genişlik kabı.
 *
 * Üst sınır KADEMELİ: 1920 px'in altında zaten bağlayıcı değil (kabuk ve yan
 * boşluk düşünce içeriğe kalan alan tabana ulaşmıyor), üstünde sabit kalsaydı
 * 2560 px'lik monitörde ve televizyonda liste ortada dar bir şerit olarak kalıp
 * iki yanda yüzlerce piksel ölü alan bırakırdı. Sınır büsbütün kaldırılmıyor:
 * dört sütunlu bir tablo 3500 px'e yayılınca göz satır boyunca hedefi
 * kaybediyor.
 *
 * Kırılım eşikleri `styles/index.css` içindeki `--breakpoint-3xl/4xl`
 * token'larından; burada piksel yazılmıyor.
 */
export const adminPageWidthVariants = cva('mx-auto w-full', {
  variants: {
    /** Sayfanın içeriği: liste/pano tam genişliği kullanır, form okunur kalır. */
    content: {
      list: 'max-w-400 3xl:max-w-560 4xl:max-w-720',
      form: 'max-w-3xl 2xl:max-w-4xl 3xl:max-w-5xl',
      formMedium: 'max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl',
      formWide: 'max-w-5xl 2xl:max-w-6xl 3xl:max-w-7xl',
    },
  },
  defaultVariants: { content: 'list' },
})
