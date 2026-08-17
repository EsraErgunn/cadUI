import { AtSign, Building2, Hash, MapPin, Phone, Smartphone, User, UserCheck } from 'lucide-react'
import type { FormEvent } from 'react'

import type { ProfileForm } from './useProfileForm'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { NoticeBar } from '../NoticeBar'
import { adminButtonVariants, adminFieldVariants, formCardVariants } from '../adminVariants'
import { PhoneField } from '../form/PhoneField'
import { TextField } from '../form/TextField'

const REQUIRED_MARK = '*'

/** Firma kaydı olmayan kullanıcıda firma alanları boş ve kilitli kalır. */
const NO_FIRM_HINT = 'Bir proje firmasına bağlı olmadığınız için bu alan boş.'

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
 * Alanların sahibi İKİ ayrı kayıt: kullanıcı adı ve Telefon 1 kullanıcıdan,
 * gerisi proje firmasından geliyor (bkz. useProfileForm).
 */
export function ProfileFormCard({ form, username, onSuccess, onCancel }: ProfileFormCardProps) {
  const { values, errors, canEditFirmFields } = form

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void form.submit().then((isSaved) => {
      if (isSaved) onSuccess()
    })
  }

  const firmHint = canEditFirmFields ? undefined : NO_FIRM_HINT

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
          hint="Kullanıcı adı değiştirilemez."
          onChange={() => {}}
        />

        <TextField
          id="profile-serial-number"
          label="Seri No"
          layout="horizontal"
          leftIcon={Hash}
          inputMode="numeric"
          value={values.serialNumber}
          isReadOnly={!canEditFirmFields}
          hint={firmHint}
          error={errors.serialNumber}
          onChange={(value) => form.setValue('serialNumber', value)}
        />

        <TextField
          id="profile-title"
          label="Ünvan"
          labelNote={canEditFirmFields ? REQUIRED_MARK : undefined}
          layout="horizontal"
          leftIcon={Building2}
          value={values.title}
          isReadOnly={!canEditFirmFields}
          hint={firmHint}
          error={errors.title}
          onChange={(value) => form.setValue('title', value)}
        />

        <TextField
          id="profile-contact-person"
          label="Firma Yetkilisi"
          layout="horizontal"
          leftIcon={UserCheck}
          value={values.contactPerson}
          isReadOnly={!canEditFirmFields}
          hint={firmHint}
          error={errors.contactPerson}
          onChange={(value) => form.setValue('contactPerson', value)}
        />

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

        <TextField
          id="profile-address"
          label="Adres"
          layout="horizontal"
          leftIcon={MapPin}
          value={values.address}
          isReadOnly={!canEditFirmFields}
          hint={firmHint}
          error={errors.address}
          onChange={(value) => form.setValue('address', value)}
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

        {canEditFirmFields ? (
          <PhoneField
            id="profile-firm-phone2"
            label="Telefon 2"
            layout="horizontal"
            leftIcon={Smartphone}
            placeholder={PHONE_PLACEHOLDER}
            digits={values.firmPhone2Digits}
            error={errors.firmPhone2Digits}
            onChange={(value) => form.setValue('firmPhone2Digits', value)}
          />
        ) : (
          <TextField
            id="profile-firm-phone2"
            label="Telefon 2"
            layout="horizontal"
            leftIcon={Smartphone}
            value=""
            isReadOnly
            hint={NO_FIRM_HINT}
            onChange={() => {}}
          />
        )}

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
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
          <span className="h-4 w-32 shrink-0 animate-pulse rounded bg-surface-sunken sm:w-36" />
          <span className={adminFieldVariants({ className: 'animate-pulse bg-surface-sunken' })} />
        </div>
      ))}
    </div>
  )
}
