import { Save } from 'lucide-react'

import { formatVersionTimestamp, getVersionLabel } from './versionFormat'
import type { ProjectVersionListItem } from '../../api/projects'

type VersionRowProps = {
  version: ProjectVersionListItem
  isCurrent: boolean
  isLoading: boolean
  isDisabled: boolean
  onSelect: () => void
}

/**
 * Yüklü sürüm de TIKLANABİLİR kalıyor: aynı sürümü yeniden yüklemek,
 * kaydedilmemiş değişiklikleri atıp son kayda dönmenin tek yolu.
 */
export function VersionRow({ version, isCurrent, isLoading, isDisabled, onSelect }: VersionRowProps) {
  const label = getVersionLabel(version.label)
  const timestampText = formatVersionTimestamp(version.createdAt)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={isDisabled}
        aria-current={isCurrent ? 'true' : undefined}
        // Ad ELLE kuruluyor: görünen metin "tarih | etiket" ve aradaki ayraç
        // aria-hidden — hesaplanan ad iki parçayı boşluksuz birleştiriyor
        // ("14:30test1"), ekran okuyucu tek kelime gibi okurdu.
        aria-label={label === undefined ? timestampText : `${timestampText}, ${label}`}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors
          disabled:cursor-not-allowed disabled:text-canvas-overlay-ink-muted ${
            isCurrent
              ? 'bg-canvas-overlay-edge/40 text-canvas-overlay-ink-strong'
              : 'text-canvas-overlay-ink enabled:hover:bg-canvas-overlay-edge/25'
          }`}
      >
        <Save size={16} strokeWidth={1.8} aria-hidden className="shrink-0" />
        <span className="shrink-0 tabular-nums">{timestampText}</span>
        {label !== undefined && (
          <>
            {/* Ayraç salt görsel: ekran okuyucu "dikey çizgi" diye okumasın. */}
            <span aria-hidden className="text-canvas-overlay-ink-muted">
              |
            </span>
            <span className="truncate">{label}</span>
          </>
        )}
        {isLoading && (
          <span className="ml-auto shrink-0 pl-2 text-xs text-canvas-overlay-ink-muted">
            Yükleniyor…
          </span>
        )}
      </button>
    </li>
  )
}
