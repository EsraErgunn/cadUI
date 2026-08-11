import { cva } from 'class-variance-authority'

/**
 * "Kullanıcı Tipi" etiketi (KK-8): Firma Mühendisi TURKUAZ, Firma Yetkilisi YEŞİL.
 *
 * Renkler token'dan: turkuaz `accent`, yeşil `success` — ikisi de iki temada
 * sınanmış. Yeni bir yeşil token EKLENMEDİ, `success` zaten vardı.
 *
 * Zemin tonu `/15`, metin tam token: dolgunun üstüne beyaz yazan bir rozet
 * koyu temada okunmuyordu. Bilgi renge BAĞLI değil, etiket metni zaten yazıyor.
 *
 * `adminVariants.ts` yerine burada: o dosya 200 satır sınırına dayandı ve bu
 * varyant tek ekrana ait (CLAUDE.md → Klasör sözleşmesi: ekrana özel parça
 * ekranın klasöründe durur, ikinci ekran isteyince köke taşınır).
 */
export const authorityChipVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        engineer: 'bg-accent/15 text-accent-ink',
        authorizedPerson: 'bg-success/15 text-success',
      },
    },
    defaultVariants: { tone: 'engineer' },
  },
)
