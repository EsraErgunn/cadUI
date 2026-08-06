import { useQuery } from '@tanstack/react-query'
import { AlignLeft, Building2, Hash, MapPin, Network, Phone, User } from 'lucide-react'
import { useMemo } from 'react'

import {
  GAS_FIRM_MAX_LENGTHS,
  GAS_FIRM_NAME_CASE_HINT,
  gasFirmFieldId,
} from './gasFirmSchema'
import type { GasFirmForm } from './useGasFirmForm'
import { getFirmGroups } from '../../../api/adminFirms'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { PhoneField } from '../form/PhoneField'
import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

/** Belge: zorunlu alanların etiketinin yanında "*" gösterilir. */
const REQUIRED_MARK = '*'

/** Grup firması seçilmemiş hâlin metni (mockup'taki varsayılan). */
const NO_GROUP_LABEL = '—'

interface GasFirmFormFieldsProps {
  form: GasFirmForm
}

/**
 * Mockup'taki yerleşim: etiketler solda sağa hizalı, girdiler sağda, her
 * girdinin İÇİNDE solda alanı temsil eden ikon (`layout="horizontal"`).
 */
export function GasFirmFormFields({ form }: GasFirmFormFieldsProps) {
  const { values, errors, setValue } = form

  // Belge: liste alfabetik sıralanır ve yeni grup tanımlandıkça güncellenir —
  // bu yüzden sabit dizi gömülmüyor, sunucudan geliyor.
  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })
  const groupOptions = useMemo(
    () =>
      [...(groups ?? [])]
        .sort((left, right) => left.localeCompare(right, 'tr'))
        .map((name) => ({ value: name, label: name })),
    [groups],
  )

  return (
    <>
      <TextField
        id={gasFirmFieldId('dfirmNo')}
        label="Firma No"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Hash}
        inputMode="numeric"
        placeholder="Örn. 115"
        value={values.dfirmNo}
        // Güncelleme ekranında salt okunur (belge + KK-11).
        isReadOnly={form.isUpdateMode}
        error={errors.dfirmNo}
        onChange={(value) => setValue('dfirmNo', value)}
      />

      <TextField
        id={gasFirmFieldId('name')}
        label="Firma Adı"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Building2}
        placeholder="Firma adını giriniz"
        maxLength={GAS_FIRM_MAX_LENGTHS.name}
        value={values.name}
        // Yalnız hatırlatma: girdi otomatik büyütülmüyor, veri değişmiyor.
        hint={GAS_FIRM_NAME_CASE_HINT}
        error={errors.name}
        // Benzer kayıt uyarısı: engellemeyen bilgi, hata DEĞİL.
        warning={form.nameWarning ?? undefined}
        onChange={(value) => setValue('name', value)}
        // Sorgu alandan ÇIKINCA atılır, her tuş vuruşunda değil.
        onBlur={() => void form.checkSimilarNames()}
      />

      <SelectField
        id={gasFirmFieldId('groupName')}
        label="Grup Firması"
        layout="horizontal"
        leftIcon={Network}
        placeholder={NO_GROUP_LABEL}
        options={groupOptions}
        value={values.groupName}
        error={errors.groupName}
        onChange={(value) => setValue('groupName', value)}
      />

      <TextField
        id={gasFirmFieldId('description')}
        label="Açıklama"
        layout="horizontal"
        leftIcon={AlignLeft}
        placeholder="Opsiyonel açıklama"
        maxLength={GAS_FIRM_MAX_LENGTHS.description}
        value={values.description}
        error={errors.description}
        onChange={(value) => setValue('description', value)}
      />

      <TextField
        id={gasFirmFieldId('contactPerson')}
        label="Yetkili Kişi"
        layout="horizontal"
        leftIcon={User}
        placeholder="Ad Soyad"
        value={values.contactPerson}
        error={errors.contactPerson}
        onChange={(value) => setValue('contactPerson', value)}
      />

      <TextField
        id={gasFirmFieldId('address')}
        label="Adres"
        layout="horizontal"
        leftIcon={MapPin}
        placeholder="Firma adresi"
        maxLength={GAS_FIRM_MAX_LENGTHS.address}
        value={values.address}
        error={errors.address}
        onChange={(value) => setValue('address', value)}
      />

      {/* Görüntü maskeli, durum ham rakam. Maskeden sonra imleci geri
          konumlandırmak girdinin DOM düğümüne erişmeyi gerektirdiği için
          `TextField` değil `PhoneField` kullanılıyor. */}
      <PhoneField
        id={gasFirmFieldId('phoneDigits')}
        label="Telefon"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        digits={values.phoneDigits}
        error={errors.phoneDigits}
        onChange={(value) => setValue('phoneDigits', value)}
      />
    </>
  )
}
