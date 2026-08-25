import { useState } from 'react'

import type { ProjectDocumentRow } from '../../../api/projectDetail'
import { AdminDialog } from '../AdminDialog'
import { NoticeBar } from '../NoticeBar'
import { adminButtonVariants } from '../adminVariants'
import { SelectField } from '../form/SelectField'

const DIALOG_TITLE = 'Evrağın birimini değiştir'
const FIELD_ID = 'project-document-unit'
const PLACEHOLDER = 'Seçiniz'
const NO_UNITS_HINT = 'Bu projede tanımlı birim yok; evrak bir birime bağlanamaz.'
const UNIT_REQUIRED_ERROR = 'Birim seçiniz.'

export interface ProjectDocumentUnitOption {
  id: number
  label: string
}

interface ProjectDocumentUnitDialogProps {
  document: ProjectDocumentRow
  units: ProjectDocumentUnitOption[]
  isSaving: boolean
  error: string | null
  onDismissError: () => void
  onSave: (unitId: number) => void
  onClose: () => void
}

/**
 * Evrağın bağlı olduğu birimi değiştirir.
 *
 * Sunucuda "birimi değiştir" diye TEK bir uç yok; bağ ekleme ve koparma ayrı
 * (`POST|DELETE /api/docs/{id}/units/{unitId}`). Kaydetme sırası çağıranda
 * (`useProjectDocumentActions`), bu bileşen yalnız seçimi topluyor.
 *
 * Seçim TEKİL: sekme evrağı tek birime bağlıyor. Uç çoklu bağı destekliyor ama
 * bu ekranda toplu düzenleme istenmedi — çoğul bir kutu, kullanıcıya burada
 * olmayan bir yetenek vaat ederdi.
 */
export function ProjectDocumentUnitDialog({
  document,
  units,
  isSaving,
  error,
  onDismissError,
  onSave,
  onClose,
}: ProjectDocumentUnitDialogProps) {
  // Tek bağ varsa onunla açılır; çoklu bağda seçim boş başlar — hangisinin
  // "asıl" olduğunu arayüz bilemez ve rastgele biri seçili gösterilemez.
  const [unitId, setUnitId] = useState<string>(
    document.unitIds.length === 1 ? String(document.unitIds[0]) : '',
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSave = () => {
    if (unitId === '') {
      setValidationError(UNIT_REQUIRED_ERROR)
      return
    }
    onSave(Number(unitId))
  }

  return (
    <AdminDialog title={DIALOG_TITLE} onClose={onClose}>
      <p className="mt-1 text-sm text-ink-muted">{document.fileName}</p>

      {error !== null && (
        <div className="mt-4">
          <NoticeBar tone="error" message={error} onDismiss={onDismissError} />
        </div>
      )}

      <div className="mt-4">
        <SelectField
          id={FIELD_ID}
          label="Birim"
          value={unitId}
          options={units.map((unit) => ({ value: String(unit.id), label: unit.label }))}
          placeholder={PLACEHOLDER}
          isDisabled={units.length === 0}
          hint={units.length === 0 ? NO_UNITS_HINT : undefined}
          error={validationError ?? undefined}
          onChange={(value) => {
            setUnitId(value)
            setValidationError(null)
          }}
        />
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || units.length === 0}
          aria-busy={isSaving}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </AdminDialog>
  )
}
