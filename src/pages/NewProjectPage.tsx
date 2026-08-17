import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { PROJECT_LIST_PATH } from './useCloseEditor'
import { ConfirmDialog } from '../ui/admin/ConfirmDialog'
import { NoticeBar } from '../ui/admin/NoticeBar'
import { PageHeader } from '../ui/admin/PageHeader'
import { ADMIN_HOME_PATH } from '../ui/admin/adminNavItems'
import { adminButtonVariants } from '../ui/admin/adminVariants'
import { NewProjectBuildingCard } from '../ui/admin/projects/NewProjectBuildingCard'
import { NewProjectInfoCard } from '../ui/admin/projects/NewProjectInfoCard'
import { NewProjectInstallationCard } from '../ui/admin/projects/NewProjectInstallationCard'
import { newProjectFieldId } from '../ui/admin/projects/newProjectSchema'
import { useNewProjectForm } from '../ui/admin/projects/useNewProjectForm'
import { useNewProjectLookups } from '../ui/admin/projects/useNewProjectLookups'
import { useIsAdmin } from '../ui/admin/useIsAdmin'

const PAGE_TITLE = 'Yeni Proje'
const PAGE_DESCRIPTION = 'Proje tipi, ısınma tipi ve yetkili mühendis alanları parametriktir'
const CANCEL_TITLE = 'Kaydedilmemiş değişiklikler var'
const CANCEL_DESCRIPTION =
  'Girdiğiniz bilgiler kaydedilmeden proje listesine dönülecek. Devam edilsin mi?'

export function NewProjectPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = useIsAdmin()
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)

  const form = useNewProjectForm({ isAdmin })
  const { focusField, clearFocusRequest, applyProjectTypeOptions } = form

  const lookups = useNewProjectLookups({ isAdmin, projectFirmId: form.values.projectFirmId })

  // Sunucudan gelen tip listesi değişince varsayılan/geçersiz seçim tazelenir.
  useEffect(() => {
    applyProjectTypeOptions(lookups.projectTypes.map((option) => option.id))
  }, [applyProjectTypeOptions, lookups.projectTypes])

  // Doğrulama başarısızsa odak ilk hatalı alana taşınır; istek tek seferlik
  // olduğu için okunduktan hemen sonra temizlenir.
  useEffect(() => {
    if (focusField === null) return

    document.getElementById(newProjectFieldId(focusField))?.focus()
    clearFocusRequest()
  }, [focusField, clearFocusRequest])

  const goToList = (state?: { createdProjectName: string; createdProjectPId: string }) => {
    void navigate(PROJECT_LIST_PATH, { state })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const created = await form.submit()
    if (created === null) return

    // Liste taze veriyle açılmalı: yeni kayıt ilk sayfada görünsün.
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['projectStatusCounts'] })
    goToList({ createdProjectName: form.values.name.trim(), createdProjectPId: created.pId })
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
    <div className="mx-auto flex max-w-320 flex-col gap-5">
      <PageHeader
        breadcrumb={[
          { label: 'Anasayfa', to: ADMIN_HOME_PATH },
          { label: 'Projeler', to: PROJECT_LIST_PATH },
          { label: PAGE_TITLE },
        ]}
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
      />

      {form.submitError !== null && (
        <NoticeBar
          tone="error"
          message={form.submitError}
          onDismiss={form.clearSubmitError}
        />
      )}

      <form
        noValidate
        aria-label={PAGE_TITLE}
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-5"
      >
        {/* Dar ekranda kartlar alt alta iner; geniş ekranda yan yana ve eşit.
            `fieldset` gönderim sürerken içindeki TÜM alanları tek hamlede
            kilitler: alanlar açık kalsaydı istek uçarken yapılan değişiklik
            kaydedilmeden listeye dönülürdü. `min-w-0` şart — fieldset'in tarayıcı
            varsayılanı `min-inline-size: min-content`, ızgarayı taşırıyor. */}
        <fieldset
          disabled={form.isSubmitting}
          className="grid min-w-0 items-start gap-5 lg:grid-cols-3"
        >
          <NewProjectInfoCard form={form} lookups={lookups} isAdmin={isAdmin} />
          <NewProjectBuildingCard form={form} />
          <NewProjectInstallationCard form={form} lookups={lookups} />
        </fieldset>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            disabled={form.isSubmitting}
            onClick={handleCancel}
            className={adminButtonVariants({ tone: 'secondary' })}
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={form.isSubmitting}
            aria-busy={form.isSubmitting}
            className={adminButtonVariants({ tone: 'primary' })}
          >
            <Plus aria-hidden className="size-4" />
            {form.isSubmitting ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
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
    </div>
  )
}
