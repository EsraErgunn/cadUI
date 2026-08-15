# Geri al/yinele kapsamı: görünüme göre ayrık geçmiş

Tür: `gotcha` · 2026-08 · İlgili: K25, K70 (docs/kararlar.md)

## Tuzak

İki geçmiş var ve ikisi de birbirinden habersiz:

- Mimari veri → `cadStore`'un zundo sarmalayıcısı, izlenen alanlar
  `store/history.ts`'teki `partializeProjectState`. YALNIZ çizim dizileri;
  `nextUniqueId`/`revision` ortak sayaçlar olduğu için dışarıda (K71) — geçmişe
  yeni alan eklerken "bunu tesisat da değiştiriyor mu?" diye sor.
- Tesisat verisi → `plumbing/store/plumbingHistory.ts`'teki ayrı ayna
  (`installationElements` cadStore'un izlenen alanlarında DEĞİL).

Her katman kendi Ctrl+Z dinleyicisini `window`'a bağlarsa tek tuş vuruşu ikisine
birden düşer ve iki geçmiş aynı anda geri sarılır. Kimse hata vermez; kullanıcı
tesisatta bir sembolü geri alırken duvarının da değiştiğini sonra fark eder.

## Kural

Hangi geçmişe gidileceğini seçen dallanma TEK dosyada: `store/activeViewHistory.ts`
(K70). Çağıranlar — klavye kısayolu, menü, yüzen çubuk — yalnız
`undoActiveView`/`redoActiveView` ve `useCanUndoActiveView`/`useCanRedoActiveView`
kullanır. `undoProject`/`useCanUndo` doğrudan ÇAĞRILMAZ; bu kural bozulduğunda
düğme yanlış geçmişi geri alır (tam olarak K70'te düzeltilen hata). Yeni bir
katman (izometrik, ölçüm, vb.) kendi undo'sunu getirdiğinde dal oraya eklenir.

Klavye kısayolu için ayrıca TEK `window` dinleyicisi var:
`pages/useEditorShortcuts.ts`. Katman kendi dinleyicisini kurarsa tek tuş iki
geçmişe birden düşer.

Hedef geçmiş `uiStore.activeViewId` ile seçilir; imperatif yolda tuş anında
`getState()` ile okunur — abonelik kurulursa görünüm her değiştiğinde effect
yeniden çalışır, dinleyici sökülüp kurulur. Aktiflik hook'ları ise abone olur
(render'ın işi), ve iki geçmişe de KOŞULSUZ abone olur: React hook sırası
dallanamaz.

Ctrl+S bilerek görünümden bağımsızdır: kayıt tüm projeyi kapsar.

## Bilinen sınırlar (varsayarak kod yazma)

- Görünüm geçişi geçmişe YAZILMAZ (K70): geri alma çizim verisini kurtarır,
  gezinmeyi değil — zoom/pan/seçim/aktif kat da aynı gerekçeyle dışarıda.
- Kirli işareti (`revision`) geri ALINMIYOR (K71): kaydedilen noktaya kadar
  geri alınan proje kirli görünmeye devam eder, fazladan bir kaydetme uyarısı
  çıkar. Bilinçli tercih — ters yönü (kaydedilmemiş tesisat işini "temiz"
  göstermek) işi kaybettiriyordu. Doğrusu "şu anki veri kaydedilenle aynı mı"
  karşılaştırması, o ayrı iş.

## Kısayolların gösterimi

Palet altındaki soru işareti iki palette de aynı bileşen: `ui/ShortcutHint.tsx`
(başlık + liste prop olarak gelir, liste boşsa "henüz eklenmedi" yazar).
Listeler saf veri olarak core'da: tesisat `plumbing/core/plumbingShortcuts.ts`,
mimari `core/shortcuts.ts` (`ARCHITECTURE_SHORTCUTS` — TODO(Enfal), şimdilik
boş). Yeni kısayol eklerken ilgili listeyi güncelle; yoksa tuş çalışır ama ipucu
sessizce eksik kalır.
