import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlignLeft, Building2, Hash, MapPin, Network, Phone, Plus, User } from 'lucide-react'
import { useMemo, useState } from 'react'

import { NewFirmGroupDialog } from './NewFirmGroupDialog'
import { GAS_FIRM_MAX_LENGTHS, gasFirmFieldId } from './gasFirmSchema'
import type { GasFirmForm } from './useGasFirmForm'
import { getFirmGroups } from '../../../api/adminFirms'
import { PHONE_PLACEHOLDER } from '../../../core/phone'
import { adminIconButtonVariants } from '../adminVariants'
import { PhoneField } from '../form/PhoneField'
import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

/** Belge: zorunlu alanların etiketinin yanında "*" gösterilir. */
const REQUIRED_MARK = '*'

/** Seçim yapılmamış hâlin metni; alan zorunlu olduğu için bu hâl kaydedilemez. */
const GROUP_PLACEHOLDER = 'Seçiniz'

const NEW_GROUP_BUTTON_LABEL = 'Yeni gaz dağıtım grubu ekle'

interface GasFirmFormFieldsProps {
  form: GasFirmForm
}

/**
 * Mockup'taki yerleşim: etiketler solda sağa hizalı, girdiler sağda, her
 * girdinin İÇİNDE solda alanı temsil eden ikon (`layout="horizontal"`).
 */
export function GasFirmFormFields({ form }: GasFirmFormFieldsProps) {
  const { values, errors, setValue } = form
  const queryClient = useQueryClient()
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false)

  // Belge: liste alfabetik sıralanır ve yeni grup tanımlandıkça güncellenir —
  // bu yüzden sabit dizi gömülmüyor, sunucudan geliyor. Türkçe sıralama api
  // katmanında (sunucu ÇEDAŞ'ı DOĞUGAZ'dan önce veriyor).
  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })
  // Değer KİMLİK: sunucu grubu adla değil kimlikle alıyor.
  const groupOptions = useMemo(
    () => (groups ?? []).map((group) => ({ value: String(group.id), label: group.name })),
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
        error={errors.name}
        // Benzer kayıt uyarısı: engellemeyen bilgi, hata DEĞİL.
        warning={form.nameWarning ?? undefined}
        onChange={(value) => setValue('name', value)}
        // Sorgu alandan ÇIKINCA atılır, her tuş vuruşunda değil.
        onBlur={() => void form.checkSimilarNames()}
      />

      <SelectField
        id={gasFirmFieldId('groupId')}
        label="Grup Firması"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Network}
        placeholder={GROUP_PLACEHOLDER}
        options={groupOptions}
        value={values.groupId}
        error={errors.groupId}
        onChange={(value) => setValue('groupId', value)}
        action={
          <button
            type="button"
            aria-label={NEW_GROUP_BUTTON_LABEL}
            title={NEW_GROUP_BUTTON_LABEL}
            onClick={() => setIsNewGroupOpen(true)}
            className={adminIconButtonVariants({ className: 'border border-edge' })}
          >
            <Plus aria-hidden className="size-4" />
          </button>
        }
      />

      {isNewGroupOpen && (
        <NewFirmGroupDialog
          onCreated={(group) => {
            // Liste tazelensin ki yeni grup açılır listede görünsün; seçim de
            // hemen ona geçiyor — kullanıcı aynı grubu ikinci kez aramasın.
            void queryClient.invalidateQueries({ queryKey: ['firmGroups'] })
            setValue('groupId', String(group.id))
            setIsNewGroupOpen(false)
          }}
          onClose={() => setIsNewGroupOpen(false)}
        />
      )}

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
