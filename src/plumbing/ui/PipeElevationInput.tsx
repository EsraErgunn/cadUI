import { useState } from 'react'

import { commitDraftElevationTo } from '../store/pipeElevationActions'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/**
 * Boru çizerken kotu SAYIYLA girmenin yolu (K102) — hedef kesin bir değer
 * (ör. 180) ise bu şerit hızlı bir giriş yolu sağlar. `OpeningToolOptions` ile
 * aynı desen: yazarken store'a yazılmaz (rakamlar eski değerin üstüne
 * eklenmesin diye), Enter/blur'da tek commit.
 *
 * Yalnız aktif bir `pipe` taslağı VARKEN görünür — hedefi olmayan bir kutuyu
 * göstermek kafa karıştırırdı.
 */
export function PipeElevationInput() {
  const elevationCm = usePlumbingUiStore((state) =>
    state.draftLine?.kind === 'pipe' ? state.draftLine.elevationCm : undefined,
  )

  const [draftText, setDraftText] = useState(String(elevationCm ?? 0))
  const [syncedFrom, setSyncedFrom] = useState(elevationCm)

  if (syncedFrom !== elevationCm) {
    setSyncedFrom(elevationCm)
    setDraftText(String(elevationCm ?? 0))
  }

  if (elevationCm === undefined) return null

  const commit = () => {
    const nextCm = Number.parseFloat(draftText)
    if (!Number.isFinite(nextCm)) {
      setDraftText(String(elevationCm))
      return
    }

    // Aynı değer ya da geçersiz hedef sessizce no-op — panelin aksine burada
    // "reddedildi" diye ayrı bir uyarıya gerek yok, kutunun kendisi son
    // yazılmış kotu her zaman geri yansıtıyor (syncedFrom).
    commitDraftElevationTo(nextCm)
  }

  return (
    <div className="absolute left-3 top-12 flex items-center gap-2 rounded-md border border-edge bg-surface/95 px-2 py-1">
      <label
        className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
        htmlFor="pipe-elevation"
      >
        Kot (cm)
      </label>
      <input
        className="w-20 rounded border border-edge bg-surface px-1 py-0.5 text-sm text-ink"
        id="pipe-elevation"
        type="number"
        value={draftText}
        onChange={(event) => setDraftText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
        }}
      />
    </div>
  )
}
