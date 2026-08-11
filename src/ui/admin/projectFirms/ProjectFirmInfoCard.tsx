import {
  Building2,
  CreditCard,
  Hash,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react'

import {
  NATIONAL_ID_LENGTH,
  PROJECT_FIRM_MAX_LENGTHS,
  TAX_NUMBER_LENGTH,
  projectFirmFieldId,
} from './projectFirmSchema'
import type { ProjectFirmForm } from './useProjectFirmForm'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { CheckboxField } from '../form/CheckboxField'
import { FormCard } from '../form/FormCard'
import { PhoneField } from '../form/PhoneField'
import { TextField } from '../form/TextField'

/** Belge: zorunlu alanların etiketinin yanında "*" gösterilir. */
const REQUIRED_MARK = '*'

const SECTION_TITLE = 'Firma Bilgileri'

/** Belge madde 26: alan pasifken placeholder sebebini söyler. */
const NATIONAL_ID_LOCKED_PLACEHOLDER = 'Şahıs şirketi seçilince aktif olur'

interface ProjectFirmInfoCardProps {
  form: ProjectFirmForm
}

/**
 * Ekranın ikinci bölümü. Yerleşim mockup'takiyle aynı: etiketler solda sağa
 * hizalı, girdiler sağda, her girdinin içinde solda alanı temsil eden ikon.
 */
export function ProjectFirmInfoCard({ form }: ProjectFirmInfoCardProps) {
  const { values, errors, setValue } = form
  const isSole = values.isSoleProprietorship

  return (
    <FormCard title={SECTION_TITLE} icon={Building2}>
      <TextField
        id={projectFirmFieldId('name')}
        label="Ünvan"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Building2}
        placeholder="Firma ünvanı"
        maxLength={PROJECT_FIRM_MAX_LENGTHS.name}
        value={values.name}
        error={errors.name}
        onChange={(value) => setValue('name', value)}
      />

      <TextField
        id={projectFirmFieldId('accountingCode')}
        label="Muhasebe Cari Kodu"
        layout="horizontal"
        leftIcon={CreditCard}
        placeholder="Cari kodu"
        maxLength={PROJECT_FIRM_MAX_LENGTHS.accountingCode}
        value={values.accountingCode}
        error={errors.accountingCode}
        onChange={(value) => setValue('accountingCode', value)}
      />

      <TextField
        id={projectFirmFieldId('serialNumber')}
        label="Seri No"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Hash}
        placeholder="Seri numarası"
        maxLength={PROJECT_FIRM_MAX_LENGTHS.serialNumber}
        value={values.serialNumber}
        error={errors.serialNumber}
        onChange={(value) => setValue('serialNumber', value)}
      />

      <TextField
        id={projectFirmFieldId('authorizedPerson')}
        label="Yetkili Kişi"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={User}
        placeholder="Ad Soyad"
        maxLength={PROJECT_FIRM_MAX_LENGTHS.authorizedPerson}
        value={values.authorizedPerson}
        error={errors.authorizedPerson}
        onChange={(value) => setValue('authorizedPerson', value)}
      />

      {/* `type="email"` DEĞİL, düz metin: tarayıcının kendi doğrulama balonu
          formun hata dilini ikiye bölerdi (bir alan kırmızı kenarlık + alt
          satır, diğeri tarayıcı balonu). Biçim kontrolü şemada. */}
      <TextField
        id={projectFirmFieldId('email')}
        label="E-mail"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Mail}
        placeholder="ornek@firma.com"
        maxLength={PROJECT_FIRM_MAX_LENGTHS.email}
        value={values.email}
        error={errors.email}
        onChange={(value) => setValue('email', value)}
      />

      <TextField
        id={projectFirmFieldId('taxNumber')}
        label="Vergi No"
        // Şahıs şirketinde zorunluluk T.C. kimlik numarasına geçiyor.
        labelNote={isSole ? undefined : REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Landmark}
        inputMode="numeric"
        placeholder="Vergi numarası"
        maxLength={TAX_NUMBER_LENGTH}
        value={values.taxNumber}
        error={errors.taxNumber}
        onChange={(value) => setValue('taxNumber', value)}
        trailing={
          <CheckboxField
            id={projectFirmFieldId('isSoleProprietorship')}
            label="Şahıs Şirketi"
            value={isSole}
            onChange={form.setSoleProprietorship}
          />
        }
      />

      {/* Belge madde 26: varsayılan olarak PASİF. `isDisabled` (salt okunur
          değil): alan yalnız okunamaz değil, hiç kullanılamaz olmalı. */}
      <TextField
        id={projectFirmFieldId('nationalId')}
        label="Tc Kimlik No"
        labelNote={isSole ? REQUIRED_MARK : undefined}
        layout="horizontal"
        leftIcon={IdCard}
        inputMode="numeric"
        placeholder={isSole ? 'T.C. kimlik numarası' : NATIONAL_ID_LOCKED_PLACEHOLDER}
        maxLength={NATIONAL_ID_LENGTH}
        isDisabled={!isSole}
        value={values.nationalId}
        error={errors.nationalId}
        onChange={(value) => setValue('nationalId', value)}
      />

      <TextField
        id={projectFirmFieldId('address')}
        label="Adres"
        layout="horizontal"
        leftIcon={MapPin}
        placeholder="Firma adresi"
        maxLength={PROJECT_FIRM_MAX_LENGTHS.address}
        value={values.address}
        error={errors.address}
        onChange={(value) => setValue('address', value)}
      />

      <PhoneField
        id={projectFirmFieldId('phoneDigits')}
        label="Telefon 1"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        digits={values.phoneDigits}
        error={errors.phoneDigits}
        onChange={(value) => setValue('phoneDigits', value)}
      />

      <PhoneField
        id={projectFirmFieldId('phone2Digits')}
        label="Telefon 2"
        layout="horizontal"
        leftIcon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        digits={values.phone2Digits}
        error={errors.phone2Digits}
        onChange={(value) => setValue('phone2Digits', value)}
      />
    </FormCard>
  )
}
