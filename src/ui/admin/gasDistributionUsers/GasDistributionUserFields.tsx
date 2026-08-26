import { AtSign, Factory, KeyRound, Phone, User, UserCircle } from 'lucide-react'

import {
  gasDistributionUserFieldId,
  type GasDistributionUserErrors,
  type GasDistributionUserField,
  type GasDistributionUserFormValues,
} from './gasDistributionUserSchema'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { FormCard } from '../form/FormCard'
import { PasswordField } from '../form/PasswordField'
import { PhoneField } from '../form/PhoneField'
import { SelectField, type SelectFieldOption } from '../form/SelectField'
import { TextField } from '../form/TextField'

const SECTION_TITLE = 'Kullanıcı Bilgileri'

/** Zorunlu alanların etiketinin yanında "*" gösterilir (diğer formlarla aynı). */
const REQUIRED_MARK = '*'

interface GasDistributionUserFieldsProps {
  values: GasDistributionUserFormValues
  errors: GasDistributionUserErrors
  firmOptions: SelectFieldOption[]
  /**
   * Güncelleme modunda kullanıcı adı ve şifre alanları ÇİZİLMEZ: `UserUpdateDto`
   * ikisini de almıyor. Pasif göstermek yerine hiç çizilmiyor — düzenlenemeyen
   * ama görünen bir alan, kaydedilecekmiş gibi okunur.
   */
  isUpdate?: boolean
  onChange: (field: GasDistributionUserField, value: string) => void
}

/**
 * Mockup'taki yerleşim: etiketler solda, girdiler sağda, girdinin İÇİNDE solda
 * alanı temsil eden ikon (`layout="horizontal"`).
 *
 * SIRA proje firması kullanıcısı formuyla AYNI — önce kim olduğu, sonra hangi
 * firmaya bağlandığı, en sonda iletişim. İki ekran aynı işi yapıyor, alan
 * sırasının ayrışması kullanıcıyı her geçişte yeniden okumaya zorlardı.
 * Kullanıcı adı ve şifre ayrı ayrı koşullu: güncellemede ikisi de çizilmiyor
 * ama aralarına e-posta giriyor.
 */
export function GasDistributionUserFields({
  values,
  errors,
  firmOptions,
  isUpdate = false,
  onChange,
}: GasDistributionUserFieldsProps) {
  return (
    <FormCard title={SECTION_TITLE} icon={User}>
      <TextField
        id={gasDistributionUserFieldId('fullName')}
        label="Adı Soyadı"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={User}
        placeholder="Ad Soyad"
        value={values.fullName}
        error={errors.fullName}
        onChange={(value) => onChange('fullName', value)}
      />

      {/* Sunucu GÜNCELLEMİYOR (`UserUpdateDto`). */}
      {!isUpdate && (
        <TextField
          id={gasDistributionUserFieldId('username')}
          label="Kullanıcı Adı"
          labelNote={REQUIRED_MARK}
          layout="horizontal"
          leftIcon={UserCircle}
          placeholder="kullanici.adi"
          value={values.username}
          error={errors.username}
          onChange={(value) => onChange('username', value)}
        />
      )}

      <TextField
        id={gasDistributionUserFieldId('email')}
        label="Email"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        type="email"
        leftIcon={AtSign}
        placeholder="ornek@firma.com"
        value={values.email}
        error={errors.email}
        onChange={(value) => onChange('email', value)}
      />

      {/* Şifre için ayrı bir uç var (`POST /api/users/{id}/reset-password`) ve
          onun ekranı yok; güncellemede alan hiç çizilmiyor. */}
      {!isUpdate && (
        <PasswordField
          id={gasDistributionUserFieldId('password')}
          label="Şifre"
          labelNote={REQUIRED_MARK}
          layout="horizontal"
          leftIcon={KeyRound}
          placeholder="••••••••"
          value={values.password}
          error={errors.password}
          onChange={(value) => onChange('password', value)}
        />
      )}

      <SelectField
        id={gasDistributionUserFieldId('gasFirmId')}
        label="Gaz Dağıtım Firması"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Factory}
        placeholder="Seçiniz"
        options={firmOptions}
        value={values.gasFirmId}
        error={errors.gasFirmId}
        onChange={(value) => onChange('gasFirmId', value)}
      />

      <PhoneField
        id={gasDistributionUserFieldId('phoneDigits')}
        label="Telefon"
        layout="horizontal"
        leftIcon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        digits={values.phoneDigits}
        error={errors.phoneDigits}
        onChange={(digits) => onChange('phoneDigits', digits)}
      />
    </FormCard>
  )
}
