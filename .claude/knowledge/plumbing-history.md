# Tesisat geri alma: cadStore dışında zundo aynası

`cadStore` zundo `temporal` middleware'i ile SARILMADI — global geçmiş (mimari
dahil) `store/history.ts` ile A'nın işi ve o dosya hâlâ boş. Tesisat kendi geri
almasını `plumbing/store/plumbingHistory.ts` içindeki **ayna store** ile alır:

- Ayna yalnız `installationElements` tutar, zundo yalnız aynayı izler.
- Akış TEK YÖNLÜ: `plumbingSlice` her veri değişiminden **sonra**
  `recordPlumbingHistory(get().installationElements)` çağırır. Ayna cadStore'a
  yalnız `undoPlumbing`/`redoPlumbing` ile geri yazılır.
- `plumbingHistory.ts` **cadStore'u import ETMEZ**: cadStore → plumbingSlice →
  plumbingHistory zincirinde çalışma zamanı döngüsü olurdu (bkz. K17,
  `store/projectMeta.ts` yorumu). Undo/redo geri yazılacak diziyi *döndürür*,
  yazmayı slice yapar.

## Tuzak

Tesisat verisini değiştiren yeni bir action `record()` çağırmayı unutursa hata
VERMEZ: geçmişe adım girmez, Ctrl+Z o değişikliği atlar ve bir öncekine döner —
kullanıcıya veri kaybı gibi görünür. Yeni action = `markDirty` + `record` ikilisi.

Geri alma `nextUniqueId`'yi geri SARMAZ (id bir kez üretilir —
[id-scheme](./id-scheme.md)). Proje yüklenince `resetPlumbingHistory` çağrılmalı,
yoksa önceki projenin adımları geri alınabilir kalır.

Global geçmiş devreye girdiğinde bu ayna kaldırılır; o zamana kadar iki geçmiş
aynı anda YAŞAMAMALI (aynı adım iki kez geri alınır).
