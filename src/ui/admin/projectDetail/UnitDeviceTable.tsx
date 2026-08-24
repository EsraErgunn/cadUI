import { Table2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { formatDecimal, formatInteger } from './projectDetailFormat'
import { flattenUnitDeviceRows } from './unitDeviceRows'
import type { ProjectUnitRow } from '../../../api/projectDetail'
import { EmptyState } from '../EmptyState'
import { EmptyValue } from '../EmptyValue'

const CARD_TITLE = 'Birim / Cihaz Bilgileri'

const TABLE_CAPTION =
  'Birim ve cihaz bilgileri. Bir birimde birden fazla cihaz varsa her cihaz ayrı satırda listelenir, birim bilgileri yalnız ilk satırda görünür.'

const EMPTY_MESSAGE = 'Projeye ait birim/cihaz kaydı bulunamadı.'

/** On dört sütun dar ekrana sığmaz; bu eşiğin altında tablo yatay kaydırılır. */
const TABLE_MIN_WIDTH_CLASS = 'min-w-320'

/**
 * Sütun başlıkları belgedeki SIRAYLA (KK-6). Birim sütunu ölçü değil kimlik
 * taşıyanlar (Abone No, Sayaç) sola dayalı kalıyor: "sayısal sütun" kuralı
 * ÖLÇÜLER için — bir abone numarasını sağa dayamak onu bir miktar gibi
 * gösterirdi.
 */
const NUMERIC_COLUMN_CLASS = 'text-right tabular-nums'

interface ColumnSpec {
  key: string
  label: string
  isNumeric?: boolean
}

const COLUMNS: ColumnSpec[] = [
  { key: 'unit', label: 'Birim' },
  { key: 'subscriberName', label: 'Abone Adı' },
  { key: 'subscriberNo', label: 'Abone No' },
  { key: 'meter', label: 'Sayaç' },
  { key: 'flow', label: 'm³/h', isNumeric: true },
  { key: 'pressure', label: 'mbar', isNumeric: true },
  { key: 'area', label: 'm²', isNumeric: true },
  { key: 'pipeType', label: 'Boru Tipi' },
  { key: 'device', label: 'Cihaz' },
  { key: 'capacity', label: 'Kapasite' },
  { key: 'deviceFlow', label: 'Debi', isNumeric: true },
  { key: 'brand', label: 'Marka' },
  { key: 'model', label: 'Model' },
  { key: 'flue', label: 'Baca' },
]

function Cell({ value, isNumeric = false }: { value: ReactNode; isNumeric?: boolean }) {
  const className = isNumeric ? `px-4 py-3 ${NUMERIC_COLUMN_CLASS}` : 'px-4 py-3'
  const isEmpty = value === null || value === undefined || value === ''

  return <td className={className}>{isEmpty ? <EmptyValue /> : value}</td>
}

/** Alt satırlarda birim hücreleri BOŞ kalır — tire bile konmaz (KK-6). */
function BlankCell({ isNumeric = false }: { isNumeric?: boolean }) {
  return <td className={isNumeric ? `px-4 py-3 ${NUMERIC_COLUMN_CLASS}` : 'px-4 py-3'} />
}

export function UnitDeviceTable({ units }: { units: ProjectUnitRow[] }) {
  const rows = flattenUnitDeviceRows(units)

  return (
    <section aria-label={CARD_TITLE} className="flex flex-col rounded-xl border border-edge bg-surface">
      <h2 className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-ink">
        <Table2 aria-hidden className="size-4 text-ink-muted" />
        {CARD_TITLE}
      </h2>

      {rows.length === 0 ? (
        <EmptyState message={EMPTY_MESSAGE} />
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full ${TABLE_MIN_WIDTH_CLASS} border-collapse text-sm`}>
            <caption className="sr-only">{TABLE_CAPTION}</caption>
            <thead>
              <tr className="border-y border-edge bg-surface-sunken">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted ${
                      column.isNumeric === true ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, unit, device, isFirstOfUnit }) => (
                <tr key={key} className="border-b border-edge last:border-0">
                  {isFirstOfUnit ? (
                    <>
                      <Cell value={unit.unitNumber} />
                      <Cell value={unit.subscriberName} />
                      <Cell value={unit.subscriberNo} />
                      <Cell value={unit.meterLabel} />
                      <Cell value={formatDecimal(unit.flowCubicMeterPerHour)} isNumeric />
                      <Cell value={formatInteger(unit.pressureMbar)} isNumeric />
                      <Cell value={formatInteger(unit.areaSquareMeters)} isNumeric />
                      <Cell value={unit.pipeType} />
                    </>
                  ) : (
                    <>
                      <BlankCell />
                      <BlankCell />
                      <BlankCell />
                      <BlankCell />
                      <BlankCell isNumeric />
                      <BlankCell isNumeric />
                      <BlankCell isNumeric />
                      <BlankCell />
                    </>
                  )}

                  <Cell value={device?.name ?? null} />
                  <Cell value={device?.capacity ?? null} />
                  <Cell value={formatDecimal(device?.flowCubicMeterPerHour ?? null)} isNumeric />
                  <Cell value={device?.brand ?? null} />
                  <Cell value={device?.model ?? null} />
                  <Cell value={device?.flueType ?? null} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
