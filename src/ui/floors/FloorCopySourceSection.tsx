import {
  formatArchitectureCounts,
  formatInstallationCounts,
  formatVerticalAxisCounts,
} from './floorCountText'
import { FLOOR_FOCUS_RING } from './floorVariants'
import type { FloorContentCounts } from '../../core/floorContent'
import type { Floor, Id } from '../../core/model'

type FloorCopySourceSectionProps = {
  floors: readonly Floor[]
  sourceFloorId: Id
  counts: FloorContentCounts
  onChange: (floorId: Id) => void
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

/**
 * Kaynak kat ve içeriğinin özeti (madde 15). Özet SAYILARLA: "kopyalanacak"
 * dediğimiz şeyin ne kadar olduğunu görmeden hedef seçmek kör bir işlem.
 *
 * "Düşey" satırı alan nesnesi sayımından geliyor ve mimarinin İÇİNDE de
 * sayılıyor — çift yazım değil, vurgu: baca şaftı ile kolon havalandırması
 * katlar arasında aynı hizada aranan tek nesne türü, kullanıcı hedef seçmeden
 * önce kaynakta olup olmadığını görmeli.
 */
export function FloorCopySourceSection({
  floors,
  sourceFloorId,
  counts,
  onChange,
}: FloorCopySourceSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="border-b border-edge pb-1 text-xs uppercase tracking-wide text-ink-muted">
        Kaynak kat
      </h3>
      <select
        aria-label="Kaynak kat"
        value={sourceFloorId}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`w-56 rounded-md border border-edge bg-surface px-2 py-1 text-sm text-ink ${FLOOR_FOCUS_RING}`}
      >
        {[...floors].reverse().map((floor) => (
          <option key={floor.id} value={floor.id}>
            {floor.name}
          </option>
        ))}
      </select>

      <dl className="space-y-1 rounded-md border border-dashed border-edge px-3 py-2 text-sm">
        <SummaryRow label="Mimari" value={formatArchitectureCounts(counts)} />
        <SummaryRow label="Tesisat" value={formatInstallationCounts(counts)} />
        <SummaryRow label="Düşey" value={formatVerticalAxisCounts(counts)} />
      </dl>
    </section>
  )
}
