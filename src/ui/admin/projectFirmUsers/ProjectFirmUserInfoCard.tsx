import { AtSign, KeyRound, Phone, User, UserCircle } from 'lucide-react'

import { projectFirmUserFieldId } from './projectFirmUserSchema'
import type { ProjectFirmUserForm } from './useProjectFirmUserForm'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { FormCard } from '../form/FormCard'
import { PasswordField } from '../form/PasswordField'
import { PhoneField } from '../form/PhoneField'
import { SwitchField } from '../form/SwitchField'
import { TextField } from '../form/TextField'

const SECTION_TITLE = 'Kullanıcı Bilgileri'

/** Belge: zorunlu alanların etiketinin yanında "*" gösterilir. */
const REQUIRED_MARK = '*'

/** Belge madde 12 / KK-15: kayıttan sonra kullanıcı adı değiştirilemez. */
const USERNAME_READONLY_HINT = 'Kullanıcı adı oluşturulduktan sonra değiştirilemez.'

const USERNAME_HINT = 'Ad soyaddan üretilir; kaydetmeden önce değiştirebilirsiniz.'

/** Belge madde 13 / KK-25. */
const PASSWORD_UPDATE_HINT = 'Boş bırakılırsa şifre değişmez.'

interface ProjectFirmUserInfoCardProps {
  form: ProjectFirmUserForm
}

/**
 * Ekranın birinci bölümü. Alanlar mockup'taki gibi yatay: etiket solda,
 * girdi sağda.
 */
export function ProjectFirmUserInfoCard({ form }: ProjectFirmUserInfoCardProps) {
  const { values, errors, isUpdate, setValue } = form

  return (
    <FormCard title={SECTION_TITLE} icon={User}>
      <TextField
        id={projectFirmUserFieldId('email')}
        label="Email"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        type="email"
        leftIcon={AtSign}
        placeholder="ornek@firma.com"
        value={values.email}
        error={errors.email}
        onChange={(value) => setValue('email', value)}
      />

      <PhoneField
        id={projectFirmUserFieldId('phoneDigits')}
        label="Telefon"
        layout="horizontal"
        leftIcon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        digits={values.phoneDigits}
        error={errors.phoneDigits}
        onChange={(digits) => setValue('phoneDigits', digits)}
      />

      <TextField
        id={projectFirmUserFieldId('fullName')}
        label="Adı Soyadı"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={User}
        placeholder="Ad Soyad"
        value={values.fullName}
        error={errors.fullName}
        onChange={(value) => setValue('fullName', value)}
      />

      <TextField
        id={projectFirmUserFieldId('username')}
        label="Kullanıcı Adı"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={UserCircle}
        placeholder="kullanici.adi"
        value={values.username}
        hint={isUpdate ? USERNAME_READONLY_HINT : USERNAME_HINT}
        error={errors.username}
        // Salt okunur, `disabled` DEĞİL: alan odaklanabilir ve kopyalanabilir
        // kalmalı — kullanıcı adı destek konuşmalarında okunan bir bilgi.
        isReadOnly={isUpdate}
        onChange={(value) => setValue('username', value)}
      />

      <PasswordField
        id={projectFirmUserFieldId('password')}
        label="Şifre"
        labelNote={isUpdate ? undefined : REQUIRED_MARK}
        layout="horizontal"
        leftIcon={KeyRound}
        placeholder="••••••••"
        value={values.password}
        hint={isUpdate ? PASSWORD_UPDATE_HINT : undefined}
        error={errors.password}
        onChange={(value) => setValue('password', value)}
      />

      <SwitchField
        id={projectFirmUserFieldId('isActive')}
        label="Aktif"
        layout="horizontal"
        value={values.isActive}
        onChange={(value) => setValue('isActive', value)}
      />
    </FormCard>
  )
}
