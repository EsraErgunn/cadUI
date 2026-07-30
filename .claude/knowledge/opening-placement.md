# gotcha: Açıklık (kapı/pencere) yerleştirme

**Sorun 1 — offsetCm neyi ölçüyor:** Açıklığın sol kenarı mı, ortası mı? İki
taraf farklı varsayarsa açıklık ekranda yarım genişlik kayar; hata sessizdir,
sığma kontrolü de yanlış sınırla çalışır.

**Doğru:** `offsetCm` açıklığın **ORTASINI** ölçer (duvarın p1 ucundan itibaren).
Sığma: `offset - width/2 >= minOffsetCm` ve `offset + width/2 <= maxOffsetCm`.
Böylece "duvarın tam ortasına yerleştir" genişlikten bağımsız olur.

**Sorun 2 — duvar bölünüyor mu:** "Kapı duvarı böler, silinince duvar birleşir"
yaklaşımı taşıma/silme sırasında iki Wall kaydını sürekli yeniden hesaplamayı
gerektirir ve p1Id/p2Id referanslarını çoğaltır.

**Doğru:** Duvar BÖLÜNMEZ. Açıklık, tek parça duvarın üzerinde `wallId + offsetCm`
ile duran bir "delik"tir. Silinince yapılacak bir şey yoktur; taşınınca yalnız
offsetCm değişir. (Aynı şey domain-model SKILL'inde de yazılı.)

**Köşe payı:** Duvarın bir ucu başka duvarla birleşiyorsa o uçtan itibaren
birleşen dik duvarın **kalınlığı** kadar mesafede açıklık olamaz — köşede duvar
kütlesi var, kapı oraya sığmaz. Uç boştaysa pay yok. Birden çok duvar
birleşiyorsa en kalını esas alınır. Sınırları `getPlacementRange(wallId)` verir.

**Dosya:** core/opening.ts (sığma/çakışma), core/wall.ts (köşe payı),
scene/useOpeningTool.ts (yerleştirme etkileşimi).
