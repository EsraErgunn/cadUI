import { useEffect, useRef, useState } from 'react'

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '../useDebouncedValue'

/**
 * Arama kutusunun taslak metni ile URL'deki UYGULANMIŞ sorguyu eşitler.
 *
 * Neden bileşende state var (CLAUDE.md "kopya state tutulmaz" kuralının bilinçli
 * istisnası): URL yalnız uygulanmış sorgunun sahibi. Kullanıcının henüz durulmamış
 * yazımı sorgu değildir; her tuş vuruşunu adrese yazmak hem geçmişi doldurur hem
 * de binlerce kaydı gereksiz yere yeniden taratır.
 *
 * Neden `key` ile yeniden kurmak yerine ref: gaz dağıtım firmaları ekranı kutuyu
 * `key={nameQuery}` ile sıfırlıyor, ama orada arama Enter'a basınca uygulanıyor.
 * Burada sorgu yazarken uygulandığı için aynı numara kutuyu her 300 ms'de
 * yeniden kurar ve KULLANICI ODAĞI KAYBEDERDİ.
 *
 * `lastAppliedRef` iki yönü ayırır:
 * - taslak durulup değiştiyse → URL'e yaz (kullanıcı yazdı),
 * - URL kendiliğinden değiştiyse → taslağı ona eşitle (çip kaldırma, geri tuşu).
 */
export function useDebouncedSearchDraft(
  appliedQuery: string,
  onApply: (value: string, shouldReplace?: boolean) => void,
): { draft: string; setDraft: (value: string) => void } {
  const [draft, setDraft] = useState(appliedQuery)
  const debouncedDraft = useDebouncedValue(draft, SEARCH_DEBOUNCE_MS)
  const lastAppliedRef = useRef(appliedQuery)

  // URL DIŞARIDAN değişti: çip kaldırıldı ya da geri tuşuna basıldı.
  useEffect(() => {
    if (appliedQuery === lastAppliedRef.current) return
    lastAppliedRef.current = appliedQuery
    setDraft(appliedQuery)
  }, [appliedQuery])

  // Taslak duruldu: sorguyu uygula. `shouldReplace` → geçmişte tek kayıt kalır.
  useEffect(() => {
    if (debouncedDraft === lastAppliedRef.current) return
    lastAppliedRef.current = debouncedDraft
    onApply(debouncedDraft, true)
  }, [debouncedDraft, onApply])

  return { draft, setDraft }
}
