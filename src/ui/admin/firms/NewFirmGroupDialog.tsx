import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { createFirmGroup, type FirmGroup } from '../../../api/adminFirms'
import { ApiError } from '../../../api/http'
import { AdminDialog } from '../AdminDialog'
import { NoticeBar } from '../NoticeBar'
import { adminButtonVariants } from '../adminVariants'
import { TextField } from '../form/TextField'

const DIALOG_TITLE = 'Yeni Gaz Dağıtım Grubu'

const NAME_FIELD_ID = 'new-firm-group-name'

const NAME_REQUIRED_MESSAGE = 'Grup adı zorunludur.'

/** Ağ/5xx yolu; sunucunun kendi metni varsa o gösterilir. */
const GENERIC_ERROR_MESSAGE = 'Grup kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.'

function describeError(error: unknown): string {
  return error instanceof ApiError && error.message !== '' ? error.message : GENERIC_ERROR_MESSAGE
}

interface NewFirmGroupDialogProps {
  /** Kayıt başarılıysa YENİ grupla çağrılır; çağıran listeyi tazeleyip seçer. */
  onCreated: (group: FirmGroup) => void
  onClose: () => void
}

/**
 * Grup firmasını form ekranını terk etmeden ekler (tek alan: ad).
 *
 * Ayrı bir "grup ekle" ekranı yok ve gerekmiyor: alan tek, akış da gaz dağıtım
 * firması formunun ortasında başlıyor — sayfa değiştirmek girilmiş formu
 * kaybettirirdi.
 */
export function NewFirmGroupDialog({ onCreated, onClose }: NewFirmGroupDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (groupName: string) => createFirmGroup(groupName),
    onSuccess: onCreated,
    // Girilen ad KORUNUR: kullanıcı alanı baştan doldurmasın.
    onError: (cause: unknown) => setSubmitError(describeError(cause)),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const trimmed = name.trim()
    if (trimmed === '') {
      setError(NAME_REQUIRED_MESSAGE)
      return
    }

    mutation.mutate(trimmed)
  }

  return (
    // Açılışta odak ilk odaklanabilir öğeye, yani ad alanına gider (AdminDialog).
    <AdminDialog title={DIALOG_TITLE} onClose={onClose}>
      {submitError !== null && (
        <div className="mt-4">
          <NoticeBar tone="error" message={submitError} onDismiss={() => setSubmitError(null)} />
        </div>
      )}

      <form noValidate aria-label={DIALOG_TITLE} onSubmit={handleSubmit}>
        {/* `fieldset` gönderim sürerken alanı ve düğmeleri tek hamlede kilitler. */}
        <fieldset disabled={mutation.isPending} className="mt-4 flex min-w-0 flex-col gap-4">
          <TextField
            id={NAME_FIELD_ID}
            label="Grup Adı"
            labelNote="*"
            value={name}
            error={error}
            onChange={(value) => {
              setName(value)
              setError(undefined)
            }}
          />

          <div className="mt-1 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={adminButtonVariants({ tone: 'secondary' })}
            >
              İptal
            </button>
            <button
              type="submit"
              aria-busy={mutation.isPending}
              className={adminButtonVariants({ tone: 'primary' })}
            >
              {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </fieldset>
      </form>
    </AdminDialog>
  )
}
