import { useState } from 'react'

import {
  getAxisDirectionLabel,
  getDraftAxisDirection,
  getDraftElevationSign,
} from '../core/draftKeyboard'
import { commitDraftAxisLength } from '../store/lineStepActions'
import { commitDraftElevationBy } from '../store/pipeElevationActions'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/**
 * Klavyeyle çizimin TEK sayısal kutusu (kullanıcı isteği, 2026-08). Ok tuşu
 * bir ekseni kilitler ve kutu uzunluk sorar; `+`/`-` kotu kilitler ve kutu
 * yükselme/alçalma miktarını sorar. İki kip tek bileşende: aynı yerde,
 * aynı biçimde, aynı Enter/Esc sözleşmesiyle çıkarlar — ayrı iki kutu
 * olsaydı ikisi aynı anda görünebilir ve odak yarışırdı.
 *
 * Yazarken store'a YAZILMAZ (`OpeningToolOptions` ile aynı desen: rakamlar
 * eski değerin üstüne eklenmesin), Enter'da tek commit. Esc kutuyu kapatır
 * ama taslağı BIRAKMAZ — çizim sürer, kullanıcı fareyle devam edebilir.
 *
 * Odak kutuya `autoFocus` ile gelir: tuşa basan kullanıcı ayrıca tıklamak
 * zorunda kalmasın. Odak kutudayken `isTypingTarget` sahnedeki kısayolları
 * susturur (`useLineTool`), yani rakam yazmak yeni bir kip açmaz.
 */
export function DraftKeyboardInput() {
  const input = usePlumbingUiStore((state) => state.draftKeyboardInput)
  const isPipeDraft = usePlumbingUiStore((state) => state.draftLine?.kind === 'pipe')
  const setDraftKeyboardInput = usePlumbingUiStore((state) => state.setDraftKeyboardInput)
  const [valueText, setValueText] = useState('')
  const [syncedFrom, setSyncedFrom] = useState(input?.mode)

  // Yalnız KİP değişince (uzunluk ↔ kot) boşalır. Yön/işaret değişimi sayıyı
  // KORUR: kullanıcı yanlış oka bastığını yazdıktan sonra fark edebiliyor,
  // ikisi de cm — yeniden yazdırmak gereksiz bir ceza olurdu.
  if (syncedFrom !== input?.mode) {
    setSyncedFrom(input?.mode)
    setValueText('')
  }

  if (!input) return null

  const label =
    input.mode === 'length'
      ? `${getAxisDirectionLabel(input.direction)} — Uzunluk (cm)`
      : `${input.sign === 1 ? 'Yukarı' : 'Aşağı'} — Kot (cm)`

  const commit = () => {
    const valueCm = Number.parseFloat(valueText)
    // Geçersiz/boş girdi kutuyu kapatmaz: kullanıcı yazmayı sürdürebilsin.
    if (!Number.isFinite(valueCm) || valueCm <= 0) return

    const isWritten =
      input.mode === 'length'
        ? commitDraftAxisLength(input.direction, valueCm)
        : commitDraftElevationBy(valueCm * input.sign)
    if (isWritten) setDraftKeyboardInput(null)
  }

  return (
    <div className="absolute left-3 top-12 flex items-center gap-2 rounded-md border border-edge bg-surface/95 px-2 py-1">
      <label
        className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
        htmlFor="draft-keyboard-input"
      >
        {label}
      </label>
      {/* `type="number"` DEĞİL (bilinçli): odak kutudayken ok tuşları sayıyı
          artırıp azaltırdı, oysa burada okun işi YÖNÜ DEĞİŞTİRMEK — kullanıcı
          yanlış oka basınca Esc'leyip yeniden başlamak zorunda kalmasın.
          Sayısal klavye `inputMode` ile geliyor. */}
      <input
        autoFocus
        className="w-24 rounded border border-edge bg-surface px-1 py-0.5 text-sm text-ink"
        id="draft-keyboard-input"
        type="text"
        inputMode="decimal"
        value={valueText}
        onChange={(event) => setValueText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
            return
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setDraftKeyboardInput(null)
            return
          }

          // Kutu açıkken yön değiştirme: tuş sahneye ulaşamıyor
          // (`isTypingTarget` orada susturuyor), bu yüzden kip burada kurulur.
          const direction = getDraftAxisDirection(event.key)
          if (direction) {
            event.preventDefault()
            setDraftKeyboardInput({ mode: 'length', direction })
            return
          }
          // Kot yalnız `pipe` taslağında iki uçlu tutuluyor; branşmanda kutuyu
          // açmak yazılamayacak bir değer sormak olurdu.
          const sign = getDraftElevationSign(event.key)
          if (sign && isPipeDraft) {
            event.preventDefault()
            setDraftKeyboardInput({ mode: 'elevation', sign })
          }
        }}
      />
    </div>
  )
}
