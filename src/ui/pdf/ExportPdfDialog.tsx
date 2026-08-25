import { useState } from 'react'

import { ExportPdfOptions, type ExportPdfSettings } from './ExportPdfOptions'
import { useExportPdf } from './useExportPdf'
import type { Id } from '../../core/model'
import {
  DEFAULT_ORIENTATION,
  DEFAULT_PAPER_SIZE,
  DEFAULT_PDF_SCALE,
} from '../../core/pdf/paper'
import type { ProjectSummary } from '../../pages/useProjectSummary'
import { useCadStore } from '../../store/cadStore'
import { DialogShell } from '../controls/DialogShell'
import { dialogActionVariants } from '../controls/buttonVariants'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

const DEFAULT_SETTINGS: ExportPdfSettings = {
  paper: DEFAULT_PAPER_SIZE,
  orientation: DEFAULT_ORIENTATION,
  scale: DEFAULT_PDF_SCALE,
  isCoverVisible: true,
  isSitePlanVisible: true,
  isIsometricVisible: true,
}

type ExportPdfDialogProps = {
  project: ProjectSummary
  onClose: () => void
}

/**
 * "Proje Dosyasını İndir" penceresi.
 *
 * TEK giriş noktası: tek kat / çok kat ayrımı menüden kalktı, kat seçimi burada
 * yapılıyor. İki menü maddesi kullanıcıyı çıktının kapsamına daha pencereyi
 * açmadan karar vermeye zorluyordu; oysa kapsam da bir dışa aktarma ayarı.
 *
 * Üretilen dosya yalnız pafta değil, PROJE DOSYASI: çizim verisi belgeye
 * gömülüyor ve "Proje Dosyasını Aç" onu geri okuyor (core/pdf/projectPayload.ts).
 * Bu yüzden buradaki sayfa/kat seçimleri çıktının GÖRÜNEN kısmını belirliyor;
 * gömülü veri her zaman projenin tamamı.
 */
export function ExportPdfDialog({ project, onClose }: ExportPdfDialogProps) {
  const floors = useCadStore((state) => state.floors)
  const { isExporting, error, exportPdf } = useExportPdf()

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  // Varsayılan olarak TÜM katlar işaretli: kapak ve vaziyet planıyla birlikte
  // çıktı bütün bir proje dosyası, tek kat onun özel hâli.
  const [selectedFloorIds, setSelectedFloorIds] = useState<Id[]>(() =>
    floors.map((floor) => floor.id),
  )

  // Dizide index 0 EN ALT kat; çıktı da ZEMİNDEN YUKARI ilerler, yani dizinin
  // kendi sırası. Listede de aynı sıra görünür — kâğıttaki sırayı gösteriyor.
  const exportFloorIds = floors
    .filter((floor) => selectedFloorIds.includes(floor.id))
    .map((floor) => floor.id)

  const isAllSelected = exportFloorIds.length === floors.length && floors.length > 0

  const handleExport = async () => {
    const isDone = await exportPdf({ settings, floorIds: exportFloorIds, project })
    if (isDone) onClose()
  }

  const toggleFloor = (floorId: Id) => {
    setSelectedFloorIds((current) =>
      current.includes(floorId)
        ? current.filter((id) => id !== floorId)
        : [...current, floorId],
    )
  }

  const toggleAll = () => {
    setSelectedFloorIds(isAllSelected ? [] : floors.map((floor) => floor.id))
  }

  return (
    <DialogShell title="Proje Dosyasını İndir" onClose={onClose}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <ExportPdfOptions settings={settings} isDisabled={isExporting} onChange={setSettings} />

        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-medium text-ink">Katlar</legend>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={isAllSelected}
              disabled={isExporting || floors.length === 0}
              onChange={toggleAll}
              className={`size-4 rounded border-edge ${FOCUS_RING}`}
            />
            Tümü
          </label>
          {floors.map((floor) => (
            <label key={floor.id} className="flex items-center gap-2 pl-5 text-sm text-ink">
              <input
                type="checkbox"
                checked={selectedFloorIds.includes(floor.id)}
                disabled={isExporting}
                onChange={() => toggleFloor(floor.id)}
                className={`size-4 rounded border-edge ${FOCUS_RING}`}
              />
              {floor.name}
            </label>
          ))}
        </fieldset>

        {error !== undefined && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          className={`${dialogActionVariants({ tone: 'cancel' })} ${FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          // Üretim sürerken pasif; hiç sayfa seçilmemişse basılacak belge de yok.
          disabled={
            isExporting ||
            (exportFloorIds.length === 0 &&
              !settings.isCoverVisible &&
              !settings.isSitePlanVisible &&
              !settings.isIsometricVisible)
          }
          className={`${dialogActionVariants({ tone: 'primary' })} ${FOCUS_RING}`}
        >
          {isExporting ? 'Oluşturuluyor…' : 'Oluştur'}
        </button>
      </div>
    </DialogShell>
  )
}
