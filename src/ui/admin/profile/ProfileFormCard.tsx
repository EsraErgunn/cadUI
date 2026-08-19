import { AtSign, IdCard, Phone, User } from 'lucide-react'
import type { FormEvent } from 'react'

import type { ProfileForm } from './useProfileForm'
import { NATIONAL_ID_LENGTH } from '../../../core/nationalId'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { NoticeBar } from '../NoticeBar'
import { adminButtonVariants, adminFieldVariants, formCardVariants } from '../adminVariants'
import { PhoneField } from '../form/PhoneField'
import { TextField } from '../form/TextField'

const REQUIRED_MARK = '*'

/**
 * Sunucu numarayı maskeli döndürdüğü için alan BOŞ açılıyor (K103); boşluk
 * "veri kayboldu" gibi okunmasın diye sebebi yazıyor. Değer zorunlu: gövde
 * numarayı taşımak zorunda ve maskeli metin geri gönderilemiyor.
 */
const NATIONAL_ID_HINT =
  'Güvenlik gereği mevcut numara gösterilmiyor; kaydetmek için yeniden girin.'

interface ProfileFormCardProps {
  form: ProfileForm
  /** Salt okunur; `PUT /api/users/{id}` gövdesinde kullanıcı adı yok. */
  username: string
  /** YALNIZ iki uç da başarılıyken çağrılır; kısmi başarıda çağrılmaz. */
  onSuccess: () => void
  onCancel: () => void
}

/**
 * Kişi Bilgileri formu: etiket solda, girdi sağda (`layout="horizontal"`).
 * `sm` altında etiket girdinin ÜSTÜNE iner — `fieldFrameVariants` bunu tek
 * yerde yapıyor, kart ayrıca kırılım tanımlamıyor.
 *
 * Alanların sahibi İKİ ayrı kayıt: kullanıcı adı, Email ve Telefon 1
 * kullanıcıdan, T.C. kimlik no proje firmasından geliyor (bkz. useProfileForm).
 */
export function ProfileFormCard({ form, username, onSuccess, onCancel }: ProfileFormCardProps) {
  const { values, errors, isSoleProprietorship } = form

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void form.submit().then((isSaved) => {
      if (isSaved) onSuccess()
    })
  }

  return (
    <form noValidate aria-label="Kişi bilgileri" onSubmit={handleSubmit}>
      {form.submitNotice !== null && (
        <div className="mb-4">
          <NoticeBar
            tone={form.submitNotice.tone}
            message={form.submitNotice.message}
            onDismiss={form.clearSubmitNotice}
          />
        </div>
      )}

      {/* `fieldset` gönderim sürerken tüm alanları tek hamlede kilitler. */}
      <fieldset disabled={form.isSubmitting} className={formCardVariants({ className: 'min-w-0' })}>
        {/* Kullanıcı adı düzenlenemiyor: sunucu güncelleme gövdesinde bu alanı
            almıyor. Kalem yerine salt okunur girdi gösteriliyor — düzenlenebilir
            görünüp kaydedilmemesi kullanıcıyı yanıltırdı. */}
        <TextField
          id="profile-username"
          label="StarCAD Mobile Kullanıcı Adı"
          layout="horizontal"
          leftIcon={User}
          value={username}
          isReadOnly
          onChange={() => {}}
        />

        {/* YALNIZ şahıs firmasında: tüzel firmada alan gövdeye `null` gidiyor
            ve ekranda göstermek, kullanılmayacak bir alan sormak olurdu (§10). */}
        {isSoleProprietorship && (
          <TextField
            id="profile-national-id"
            label="Tc Kimlik No"
            labelNote={REQUIRED_MARK}
            layout="horizontal"
            leftIcon={IdCard}
            inputMode="numeric"
            maxLength={NATIONAL_ID_LENGTH}
            value={values.nationalId}
            hint={NATIONAL_ID_HINT}
            error={errors.nationalId}
            onChange={(value) => form.setValue('nationalId', value)}
          />
        )}

        {/* Email KULLANICININ e-postası (`PUT /api/users/{id}`): firma kaydı
            olmasa da düzenlenebilir. Firmanın kendi e-postası bu ekranda
            kullanılmıyor, okunduğu gibi geri gönderiliyor. */}
        <TextField
          id="profile-email"
          label="Email"
          type="email"
          layout="horizontal"
          leftIcon={AtSign}
          value={values.email}
          error={errors.email}
          onChange={(value) => form.setValue('email', value)}
        />

        {/* Telefon 1 KULLANICININ kendi telefonu: firma kaydı olmasa da
            düzenlenebilir, çünkü `PUT /api/users/{id}` gövdesinde `phone` var. */}
        <PhoneField
          id="profile-user-phone"
          label="Telefon 1"
          layout="horizontal"
          leftIcon={Phone}
          placeholder={PHONE_PLACEHOLDER}
          digits={values.userPhoneDigits}
          error={errors.userPhoneDigits}
          onChange={(value) => form.setValue('userPhoneDigits', value)}
        />

        {/* Dar ekranda düğmeler alt alta ve tam genişlik: 320 px'de yan yana
            iki düğme sıkışıyordu. */}
        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={adminButtonVariants({ tone: 'secondary', className: 'justify-center' })}
          >
            İptal
          </button>
          <button
            type="submit"
            aria-busy={form.isSubmitting}
            className={adminButtonVariants({ tone: 'primary', className: 'justify-center' })}
          >
            {form.isSubmitting ? 'Kaydediliyor…' : 'Güncelle'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}

/** Girdi yüksekliğini koruyan iskelet; veri gelene kadar kart zıplamasın. */
export function ProfileFormSkeleton() {
  return (
    <div className={formCardVariants({ className: 'min-w-0' })} aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
          <span className="h-4 w-32 shrink-0 animate-pulse rounded bg-surface-sunken sm:w-36" />
          <span className={adminFieldVariants({ className: 'animate-pulse bg-surface-sunken' })} />
        </div>
      ))}
    </div>
  )
}
