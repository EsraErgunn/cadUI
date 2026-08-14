import { Check, ShieldCheck } from 'lucide-react'

import { POLICY_STEPS, type PolicyStep } from './policySchema'
import { stepCircleVariants, stepLabelVariants } from './policyVariants'
import { ADMIN_CHECKBOX } from '../adminVariants'

/**
 * Adım adları (gereksinim 14). Anahtarlar `policySchema.ts`'te: bu dosya bileşen
 * dışında bir şey dışa aktaramıyor (react-refresh), o yüzden etiketler burada
 * yerel kalıyor — sözlük tipi, adım eklenince derleme hatası verir.
 */
const STEP_LABELS: Record<PolicyStep, string> = {
  method: 'Poliçe Yöntemi',
  firm: 'Poliçe Firması',
  info: 'Poliçe Bilgileri',
  summary: 'Poliçe Özeti',
  done: 'Poliçe Tamamlandı',
}

const METHOD_DESCRIPTION = 'Poliçe bilgilerini elle girerek oluşturun'

/**
 * Sonuç metni GEÇİCİ: gereksinim belgesi "sürecin sonraki aşamasını açıklayan
 * metin" diyor ama metnin kendisini vermiyor. Buradaki cümle Esra'dan alındı,
 * ANALİST ONAYI BEKLENİYOR — uydurulmuş bir metin değil, onaylanmamış bir metin.
 * TODO(esra): nihai metin analistten alınacak (docs/api-eksikleri-policeler.md).
 */
const DONE_MESSAGE =
  "Poliçe kaydedildi ve projeyle ilişkilendirildi. Poliçe bilgilerini Proje Detayı ekranındaki 'Poliçe Bilgileri' sekmesinden görüntüleyebilirsiniz."

/**
 * Yöntem adımı (gereksinim 15). Tek seçenek var ve seçili geliyor; yine de bir
 * radyo GRUBU, çünkü sigorta şirketi servisleri üzerinden otomatik poliçe
 * ileride eklenecek — o gün yalnız ikinci bir `label` yazılacak.
 */
export function PolicyMethodStep() {
  return (
    <fieldset className="max-w-md">
      <legend className="sr-only">Poliçe yöntemi</legend>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-admin-primary bg-admin-primary/5 p-4">
        <input type="radio" name="policy-method" value="manual" defaultChecked className={ADMIN_CHECKBOX} />
        <span className="flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck aria-hidden className="size-4" />
            Manuel Poliçe
          </span>
          <span className="mt-1 block text-sm text-ink-muted">{METHOD_DESCRIPTION}</span>
        </span>
      </label>
    </fieldset>
  )
}

/** Sonuç adımı (gereksinim 19). Onay ikonunun YEŞİL zemini, mockup'ın yeşil
    vurgularından tek istisna: `success` token'ı bu iş için var. */
export function PolicyDoneStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-success text-success-ink">
        <Check aria-hidden className="size-7" />
      </span>
      <p className="text-base font-semibold text-ink">Poliçe Tamamlandı</p>
      <p className="max-w-xl text-sm text-ink-muted">{DONE_MESSAGE}</p>
    </div>
  )
}

type StepTone = 'upcoming' | 'current' | 'done'

function toneOf(index: number, currentIndex: number): StepTone {
  if (index < currentIndex) return 'done'
  return index === currentIndex ? 'current' : 'upcoming'
}

export function PolicyStepper({ step }: { step: PolicyStep }) {
  const currentIndex = POLICY_STEPS.indexOf(step)

  return (
    <nav aria-label="Poliçe oluşturma adımları">
      <ol className="flex list-none items-start">
        {POLICY_STEPS.map((key, index) => {
          const tone = toneOf(index, currentIndex)

          return (
            <li
              key={key}
              // `after`: bir sonraki dairenin merkezine uzanan bağlantı çizgisi.
              // Daire `z-10` olduğu için çizgi altından geçer.
              className="relative flex flex-1 flex-col items-center gap-2 px-1 text-center
                after:absolute after:left-1/2 after:top-4 after:h-px after:w-full after:bg-edge
                last:after:hidden"
            >
              <span
                className={stepCircleVariants({ tone })}
                aria-current={tone === 'current' ? 'step' : undefined}
              >
                {tone === 'done' ? <Check aria-hidden className="size-4" /> : index + 1}
                {/* Onay işareti numaranın yerini alıyor; ekran okuyucu kullanıcısı
                    kaçıncı adımda olduğunu yine de duysun. */}
                <span className="sr-only">
                  {index + 1}. adım{tone === 'done' ? ' (tamamlandı)' : ''}
                </span>
              </span>

              <span className={stepLabelVariants({ tone })}>{STEP_LABELS[key]}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
