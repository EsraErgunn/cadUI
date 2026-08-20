---
type: gotcha
date: 2026-08
---

# Cihazın eklentileri: kol, kanal ve refakatçi vana

`nearestLine` yerleştirmesi (yakıcı cihazlar) TEK bir eleman yazmaz. Üç şey
doğar:

1. Cihazın kendisi
2. Cihazı boruya bağlayan **kol** — ayrı bir `InstallationLine`
   (`kind: 'applianceStub'`)
3. Kolun boruya değdiği düğüme oturan **otomatik vana**

## Silmede iki ayrı tuzak

⚠️ **Kol, cihazla birlikte gitmeli.** Boru bağımsız bir varlıktır (elemanı
silinince ucu serbestleşir, kendisi kalır), kol değildir: araç paletinde bile
yok, yalnız yerleştirmede doğuyor, kullanıcı elle çizemiyor. Kalırsa ekranda
sahipsiz kırmızı kesikli bir parça olur. Baca/havalandırma kanalıyla AYNI
kategori — bu yüzden toplayıcı ortak: `core/attachmentLinks.ts` →
`collectAttachmentLineIdsForElements` (eski adı `collectDischargeLineIds…`).

⚠️ **Vana kolun ÜSTÜNDE DEĞİL.** `placeElementWithStub` onu ANA BORUNUN uç
düğümüne yazıyor (`endPoint.inlineElementId`) çünkü vana boruda olmalı (K15).
`applyRemoval`'ın "silinen hattın armatürleri de gider" taraması onu görmez;
`collectCompanionValveIdsForLines` gerekti. Kolun `{kind:'line'}` bağlantısı
hangi noktaya tutunduğunu söyler, vana o noktadadır.

Toplayıcı YALNIZ `ATTACHED_VALVE_TYPE` alır: kullanıcı o düğüme filtre kiti ya
da izolasyon koyduysa o kendi kararıdır, cihazla silinmez.

## Aynı yapı doğrulamayı da yanıltmıştı

Hata6 (hat sonlandırma) bu şekli bilmediği için ocakla bitirilmiş hattı
"bağlantısız uç" sayıyordu: bağlantıların İKİSİ de kola yazılıyor, ana borunun
ucunda kayıt yok. Bkz. knowledge/validation-rules.md → kavşak notu.

**Ders:** `nearestLine` ile konan bir elemanın izini süren her kod, kaydın üç
parçaya dağıldığını bilmek zorunda. Test yazarken şekli VARSAYMA — gerçek
yerleştirmenin ürettiğini kur (`applianceRemoval.test.ts` böyle yapıyor).

## Sayaç yolu farklı

`placeElementAtLineEnd` (`lineEnd` kipi, sayaç) ayrı bir kol üretmez ve
bağlantıyı hattın KENDİ ucuna yazar — bu tuzakların hiçbirini taşımaz.
