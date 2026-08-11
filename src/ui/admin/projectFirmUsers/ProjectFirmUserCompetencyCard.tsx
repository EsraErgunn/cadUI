import { useQuery } from '@tanstack/react-query'
import { CircleAlert, Plus, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { ProjectFirmUserCompetencyRow } from './ProjectFirmUserCompetencyRow'
import { COMPETENCY_ERRORS, type CompetencyDraft } from './projectFirmUserCompetencies'
import { getCompetencyGasFirms } from '../../../api/projectFirmUsers'
import { ConfirmDialog } from '../ConfirmDialog'
import { adminButtonVariants } from '../adminVariants'
import { FieldError } from '../form/FieldError'
import { FormCard } from '../form/FormCard'

const SECTION_TITLE = 'Kullanıcı Yetkinlikleri'

const COLUMN_LABELS = [
  'Gaz Dağıtım Firması',
  'Proje Firması',
  'Yetki',
  'GDF Kayıt No',
  'Aktif',
]

const ERROR_ID = 'project-firm-user-competency-error'

const DELETE_TITLE = 'Yetki satırı silinecek'
const DELETE_DESCRIPTION = 'Bu yetki satırı formdan kaldırılacaktır.'

const HEADER_CLASS = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted'

interface ProjectFirmUserCompetencyCardProps {
  competencies: CompetencyDraft[]
  competencyError: string | null
  duplicateKeys: number[]
  onAdd: () => void
  onChange: (key: number, patch: Partial<CompetencyDraft>) => void
  onRemove: (key: number) => void
}

/**
 * Ekranın ikinci bölümü: bilgilendirme + "Yeni Yetkinlik Ekle" + yetki tablosu.
 *
 * Silme onayı BURADA yönetiliyor, satırda değil: her satır kendi diyaloğunu
 * kursaydı üç satırlık formda üç diyalog bileşeni birden dururdu.
 */
export function ProjectFirmUserCompetencyCard({
  competencies,
  competencyError,
  duplicateKeys,
  onAdd,
  onChange,
  onRemove,
}: ProjectFirmUserCompetencyCardProps) {
  const [pendingRemovalKey, setPendingRemovalKey] = useState<number | null>(null)

  const { data: gasFirms } = useQuery({
    queryKey: ['competencyGasFirms'],
    queryFn: ({ signal }) => getCompetencyGasFirms(signal),
  })

  return (
    <FormCard title={SECTION_TITLE} icon={ShieldCheck}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Amber yalnız SOL KENARLIK ve ikonda: `warning` token'ı metin rengi
            olarak sınanmadı (knowledge/theming.md). */}
        <p className="flex items-center gap-2 rounded-lg border border-edge border-l-4 border-l-warning bg-surface-sunken px-3 py-2 text-sm text-ink">
          <CircleAlert aria-hidden className="size-4 shrink-0 text-warning" />
          {COMPETENCY_ERRORS.required}
        </p>

        <button
          type="button"
          onClick={onAdd}
          className={adminButtonVariants({ tone: 'primary', size: 'sm' })}
        >
          <Plus aria-hidden className="size-4" />
          Yeni Yetkinlik Ekle
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-edge">
        <table className="w-full min-w-200 border-collapse text-sm">
          <caption className="sr-only">
            Kullanıcının yetki satırları. Her satır bir gaz dağıtım firması ve proje firması
            ikilisini tanımlar.
          </caption>
          <thead>
            <tr className="border-b border-edge bg-surface-sunken">
              {COLUMN_LABELS.map((label) => (
                <th key={label} scope="col" className={HEADER_CLASS}>
                  {label}
                </th>
              ))}
              {/* İşlem sütununun görünür başlığı yok; ekran okuyucu için ad şart. */}
              <th scope="col" className={HEADER_CLASS}>
                <span className="sr-only">İşlem</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {competencies.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMN_LABELS.length + 1}
                  className="px-3 py-8 text-center text-ink-muted"
                >
                  Henüz yetki eklenmedi. "Yeni Yetkinlik Ekle" ile başlayın.
                </td>
              </tr>
            ) : (
              competencies.map((row, index) => (
                <ProjectFirmUserCompetencyRow
                  key={row.key}
                  row={row}
                  rowNumber={index + 1}
                  gasFirms={gasFirms ?? []}
                  isDuplicate={duplicateKeys.includes(row.key)}
                  onChange={(patch) => onChange(row.key, patch)}
                  onRemove={() => setPendingRemovalKey(row.key)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {competencyError !== null && <FieldError id={ERROR_ID}>{competencyError}</FieldError>}

      {pendingRemovalKey !== null && (
        <ConfirmDialog
          title={DELETE_TITLE}
          description={DELETE_DESCRIPTION}
          confirmLabel="Sil"
          cancelLabel="Vazgeç"
          confirmTone="danger"
          onConfirm={() => {
            onRemove(pendingRemovalKey)
            setPendingRemovalKey(null)
          }}
          onCancel={() => setPendingRemovalKey(null)}
        />
      )}
    </FormCard>
  )
}
