import { X } from 'lucide-react'

import type { DocumentType } from '../../../api/documentTypes'
import { adminFieldVariants, adminIconButtonVariants } from '../adminVariants'
import { UnitCheckboxList, type UnitOption } from './UnitCheckboxList'
import type { UploadRow, UploadRowErrors } from './useDocumentUpload'

const TYPE_PLACEHOLDER = 'Evrak Tipi Seç'

interface UploadedDocumentRowProps {
  row: UploadRow
  documentTypes: DocumentType[]
  units: UnitOption[]
  errors: UploadRowErrors | undefined
  onTypeChange: (docTypeCodeId: number | null) => void
  onUnitsChange: (unitIds: number[]) => void
  onRemove: () => void
}

/**
 * Yüklenen tek dosyanın satırı: evrak tipi, dosya adı, birimler ve kaldırma.
 *
 * Dosya adının yanında ROZET YOK (kapsam dışı) — dosya tipi bilgisi zaten
 * uzantıda ve "Evrak Tipi" sütununda duruyor.
 */
export function UploadedDocumentRow({
  row,
  documentTypes,
  units,
  errors,
  onTypeChange,
  onUnitsChange,
  onRemove,
}: UploadedDocumentRowProps) {
  const typeFieldId = `upload-${row.key}-type`
  const typeErrorId = `${typeFieldId}-error`
  const typeError = errors?.docType

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-edge bg-surface p-4 md:flex-row md:items-start">
      <div className="flex min-w-56 flex-col gap-1">
        <label htmlFor={typeFieldId} className="text-xs font-medium text-ink-muted">
          Evrak Tipi
        </label>
        <select
          id={typeFieldId}
          value={row.docTypeCodeId === null ? '' : String(row.docTypeCodeId)}
          aria-describedby={typeError === undefined ? undefined : typeErrorId}
          onChange={(event) =>
            onTypeChange(event.target.value === '' ? null : Number(event.target.value))
          }
          className={adminFieldVariants({
            tone: typeError === undefined ? 'plain' : 'invalid',
            className: 'pr-8',
          })}
        >
          <option value="">{TYPE_PLACEHOLDER}</option>
          {documentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        {typeError !== undefined && (
          <p id={typeErrorId} role="alert" className="text-xs text-danger-ink">
            {typeError}
          </p>
        )}
      </div>

      <p className="min-w-0 flex-1 break-words pt-6 text-sm font-medium text-ink">
        {row.fileName}
      </p>

      <UnitCheckboxList
        idPrefix={`upload-${row.key}`}
        units={units}
        selected={row.unitIds}
        error={errors?.units}
        onChange={onUnitsChange}
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label={`${row.fileName} dosyasını listeden kaldır`}
        className={adminIconButtonVariants({ className: 'md:mt-5' })}
      >
        <X aria-hidden className="size-4" />
      </button>
    </li>
  )
}
