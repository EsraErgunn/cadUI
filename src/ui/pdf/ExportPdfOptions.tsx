import {
  ORIENTATIONS,
  PAPER_SIZE_IDS,
  PDF_SCALE_IDS,
  type Orientation,
  type PaperSizeId,
  type PdfScaleId,
} from '../../core/pdf/paper'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70'

const ORIENTATION_LABELS: Record<Orientation, string> = {
  landscape: 'Yatay',
  portrait: 'Dikey',
}

export type ExportPdfSettings = {
  paper: PaperSizeId
  orientation: Orientation
  scale: PdfScaleId
  /** Belgenin ilk sayfası: künye ve onay kutuları. */
  isCoverVisible: boolean
  /** Kapaktan sonraki sayfa: kat yığını kesiti ve parsel çerçevesi. */
  isSitePlanVisible: boolean
  /** En sondaki sayfa: tesisatın izometrik şeması. */
  isIsometricVisible: boolean
}

type ExportPdfOptionsProps = {
  settings: ExportPdfSettings
  isDisabled: boolean
  onChange: (settings: ExportPdfSettings) => void
}

const GROUP_CLASS = 'flex items-center gap-1 rounded-lg bg-surface-sunken p-1'

/** Seçenek şeridi: her ayar kendi düğme öbeği — açılır liste tek tıkla görünmüyor. */
function Choice<T extends string>({
  label,
  value,
  options,
  labels,
  isDisabled,
  onSelect,
}: {
  label: string
  value: T
  options: readonly T[]
  labels?: Record<T, string>
  isDisabled: boolean
  onSelect: (next: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink">{label}</span>
      <div className={GROUP_CLASS} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={isDisabled}
            aria-pressed={option === value}
            onClick={() => onSelect(option)}
            className={`rounded-md px-3 py-1 text-sm ${FOCUS_RING} ${
              option === value
                ? 'bg-surface font-medium text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            } disabled:opacity-50`}
          >
            {labels ? labels[option] : option}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({
  label,
  isChecked,
  isDisabled,
  onChange,
}: {
  label: string
  isChecked: boolean
  isDisabled: boolean
  onChange: (isChecked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.checked)}
        className={`size-4 rounded border-edge ${FOCUS_RING}`}
      />
      {label}
    </label>
  )
}

export function ExportPdfOptions({ settings, isDisabled, onChange }: ExportPdfOptionsProps) {
  return (
    <div className="space-y-3">
      <Choice
        label="Kağıt Boyutu"
        value={settings.paper}
        options={PAPER_SIZE_IDS}
        isDisabled={isDisabled}
        onSelect={(paper) => onChange({ ...settings, paper })}
      />
      <Choice
        label="Yön"
        value={settings.orientation}
        options={ORIENTATIONS}
        labels={ORIENTATION_LABELS}
        isDisabled={isDisabled}
        onSelect={(orientation) => onChange({ ...settings, orientation })}
      />
      <Choice
        label="Ölçek"
        value={settings.scale}
        options={PDF_SCALE_IDS}
        isDisabled={isDisabled}
        onSelect={(scale) => onChange({ ...settings, scale })}
      />

      <fieldset className="space-y-1">
        <legend className="mb-1 text-sm font-medium text-ink">Sayfalar</legend>
        <Toggle
          label="Kapak sayfası"
          isChecked={settings.isCoverVisible}
          isDisabled={isDisabled}
          onChange={(isCoverVisible) => onChange({ ...settings, isCoverVisible })}
        />
        <Toggle
          label="Vaziyet planı"
          isChecked={settings.isSitePlanVisible}
          isDisabled={isDisabled}
          onChange={(isSitePlanVisible) => onChange({ ...settings, isSitePlanVisible })}
        />
        <Toggle
          label="İzometrik şema"
          isChecked={settings.isIsometricVisible}
          isDisabled={isDisabled}
          onChange={(isIsometricVisible) => onChange({ ...settings, isIsometricVisible })}
        />
      </fieldset>
    </div>
  )
}
