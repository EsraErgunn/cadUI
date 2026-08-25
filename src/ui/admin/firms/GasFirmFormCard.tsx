import { useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { GasFirmFormFields } from './GasFirmFormFields'
import { gasFirmFieldId, type GasFirmFormValues } from './gasFirmSchema'
import { useGasFirmForm } from './useGasFirmForm'
import { GAS_FIRM_QUERY_ROOTS } from '../../../api/adminFirms'
import { ConfirmDialog } from '../ConfirmDialog'
import { NoticeBar } from '../NoticeBar'
import { GAS_DISTRIBUTION_FIRMS_PATH } from '../adminNavItems'
import { ADMIN_FORM_ACTION_WIDTH, adminButtonVariants, formCardVariants } from '../adminVariants'

const CANCEL_TITLE = 'Kaydedilmemiş değişiklikler var'
/** Belge ve KK-12'deki onay metni, birebir. */
const CANCEL_DESCRIPTION = 'Yapılan değişiklikler kaydedilmeden çıkılacaktır.'

interface GasFirmFormCardProps {
  firmId: number | null
  initialValues: GasFirmFormValues
  formLabel: string
}

export function GasFirmFormCard({ firmId, initialValues, formLabel }: GasFirmFormCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  const form = useGasFirmForm({ firmId, initialValues })
  const { focusField, clearFocusRequest } = form

  // Doğrulama başarısızsa odak İLK hatalı alana taşınır (belge + KK-8). İstek
  // tek seferlik olduğu için okunduktan hemen sonra temizlenir.
  useEffect(() => {
    if (focusField === null) return

    document.getElementById(gasFirmFieldId(focusField))?.focus()
    clearFocusRequest()
  }, [focusField, clearFocusRequest])

  const goToList = (savedFirmId?: number) => {
    void navigate(GAS_DISTRIBUTION_FIRMS_PATH, {
      state: savedFirmId === undefined ? undefined : { savedFirmId },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const savedId = await form.submit()
    if (savedId === null) return

    // Liste taze veriyle açılmalı: yeni kayıt toplam adede ve listeye yansısın (KK-10).
    // Firma listesini önbelleğe alan HER kök düşürülüyor: kayıt yalnız liste
    // sayfasında değil, proje firması yetkilendirmesindeki ve gaz dağıtım
    // kullanıcısı formundaki açılırlarda da görünmeli.
    for (const root of GAS_FIRM_QUERY_ROOTS) {
      void queryClient.invalidateQueries({ queryKey: [root] })
    }
    void queryClient.invalidateQueries({ queryKey: ['gasFirmNextNo'] })
    goToList(savedId)
  }

  const handleCancel = () => {
    // Hiçbir alana dokunulmadıysa onay sormak gereksiz sürtünme.
    if (!form.isDirty) {
      goToList()
      return
    }
    setIsCancelConfirmOpen(true)
  }

  return (
    <>
      {form.submitError !== null && (
        <NoticeBar tone="error" message={form.submitError} onDismiss={form.clearSubmitError} />
      )}

      <form noValidate aria-label={formLabel} onSubmit={(event) => void handleSubmit(event)}>
        {/* `fieldset` gönderim sürerken TÜM alanları tek hamlede kilitler: alanlar
            açık kalsaydı istek uçarken yapılan değişiklik kaydedilmeden listeye
            dönülürdü. `min-w-0` şart — tarayıcı varsayılanı `min-content`. */}
        <fieldset disabled={form.isSubmitting} className={formCardVariants({ className: 'min-w-0' })}>
          <GasFirmFormFields form={form} />

          {/* Mockup: kartın sağ alt köşesinde solda İptal, sağda Kaydet. */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={adminButtonVariants({ tone: 'secondary', className: ADMIN_FORM_ACTION_WIDTH })}
            >
              İptal
            </button>
            <button
              type="submit"
              aria-busy={form.isSubmitting}
              className={adminButtonVariants({ tone: 'primary', className: ADMIN_FORM_ACTION_WIDTH })}
            >
              <Save aria-hidden className="size-4" />
              {form.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </fieldset>
      </form>

      {isCancelConfirmOpen && (
        <ConfirmDialog
          title={CANCEL_TITLE}
          description={CANCEL_DESCRIPTION}
          confirmLabel="Listeye dön"
          cancelLabel="Formda kal"
          onConfirm={() => goToList()}
          onCancel={() => setIsCancelConfirmOpen(false)}
        />
      )}
    </>
  )
}
