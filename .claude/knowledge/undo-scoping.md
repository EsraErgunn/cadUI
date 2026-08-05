# Geri al/yinele kapsamı: görünüme göre ayrık geçmiş

Tür: `gotcha` · 2026-08 · İlgili: K25 (docs/kararlar.md)

## Tuzak

İki geçmiş var ve ikisi de birbirinden habersiz:

- Mimari veri → `cadStore`'un zundo sarmalayıcısı, izlenen alanlar
  `store/history.ts`'teki `partializeProjectState`.
- Tesisat verisi → `plumbing/store/plumbingHistory.ts`'teki ayrı ayna
  (`installationElements` cadStore'un izlenen alanlarında DEĞİL).

Her katman kendi Ctrl+Z dinleyicisini `window`'a bağlarsa tek tuş vuruşu ikisine
birden düşer ve iki geçmiş aynı anda geri sarılır. Kimse hata vermez; kullanıcı
tesisatta bir sembolü geri alırken duvarının da değiştiğini sonra fark eder.

## Kural

Klavye kısayolu için TEK `window` dinleyicisi var: `pages/useEditorShortcuts.ts`.
Yeni bir katman (izometrik, ölçüm, vb.) kendi undo'sunu getirdiğinde oraya bir
dal eklenir, yeni bir dinleyici kurulmaz.

Hedef geçmiş `uiStore.activeViewId` ile seçilir ve tuş anında `getState()` ile
okunur — abonelik kurulursa görünüm her değiştiğinde effect yeniden çalışır,
dinleyici sökülüp kurulur.

Ctrl+S bilerek görünümden bağımsızdır: kayıt tüm projeyi kapsar.

## Bilinen sınırlar (varsayarak kod yazma)

- Menüdeki "Geri Al/Yinele" hâlâ koşulsuz `undoProject`; `useCanUndo/useCanRedo`
  yalnız mimari geçmişi okur. Tesisat geçmişinin React hook'u yok.
- `nextUniqueId` ve `revision` mimari geçmişte izleniyor, tesisat eklemesi
  ikisini de artırıyor → her tesisat işlemi mimari geçmişe "boş" bir adım
  bırakır. Mimaride Ctrl+Z o adımda görünürde hiçbir şey yapmaz.
  Düzeltmek `history.ts`'in izlenen alan listesine dokunmayı gerektirir.

## Kısayolların gösterimi

Palet altındaki soru işareti iki palette de aynı bileşen: `ui/ShortcutHint.tsx`
(başlık + liste prop olarak gelir, liste boşsa "henüz eklenmedi" yazar).
Listeler saf veri olarak core'da: tesisat `plumbing/core/plumbingShortcuts.ts`,
mimari `core/shortcuts.ts` (`ARCHITECTURE_SHORTCUTS` — TODO(Enfal), şimdilik
boş). Yeni kısayol eklerken ilgili listeyi güncelle; yoksa tuş çalışır ama ipucu
sessizce eksik kalır.
