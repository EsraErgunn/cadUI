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
ile duran bir "delik"tir. Yerleştirme = yeni bir `Opening` nesnesi eklemek;
taşıma = TEK alanı (`offsetCm`) güncellemek; silme = nesneyi kaldırmak. Hiçbir
adımda yeni `Point` veya `Wall` ÜRETİLMEZ, birleştirme/temizlik gerekmez.
(Aynı şey domain-model SKILL'inde de yazılı.)

**Köşe payı:** Duvarın bir ucu başka duvarla birleşiyorsa o uçtan itibaren
birleşen dik duvarın **kalınlığı** kadar mesafede açıklık olamaz — köşede duvar
kütlesi var, kapı oraya sığmaz. Uç boştaysa pay yok. Birden çok duvar
birleşiyorsa en kalını esas alınır. Sınırları `getPlacementRange(wallId)` verir.
Açıklık tarafı bunu YENİDEN HESAPLAMAZ, dönen aralığa uyar.

**Sorun 3 — geçersiz yerleştirmede ne olur:** "En yakın geçerli yere kaydır"
sessiz bir kaymadır: kullanıcının bıraktığı yer ile açıklığın durduğu yer
farklılaşır.

**Doğru:** REDDEDİLİR, kaydırılmaz (K13). Hayalet uyarı renginde çizilir,
bırakma hiçbir şey yapmaz. Uç uca **değen** açıklıklar çakışma sayılmaz
(`a.end <= b.start`) — yan yana iki kapı meşru. Reddedilen ekleme
`nextUniqueId`'yi de harcamaz.

**Sürükleme:** store'a sürükleme boyunca YAZILMAZ; yalnız pointer-up'ta tek
`moveOpening` → tek `markDirty` → tek Ctrl+Z. Tutma farkı (`grabDeltaCm`)
korunur, yoksa açıklık tutulduğu an ortası imlece zıplar (120 cm pencerede 60 cm).

**Hangi duvarın üstündeyiz:** `resolveSnap` bu iş için YETMEZ — köşede
`kind:'point'` dönüp `wallId` vermez ve 10 px eşiği kalınlığı bilmez (%300
zoom'da eşik 3.3 cm iken 20 cm duvarın yarım bandı 10 cm, aradaki bant ölü
kalır). Duvarı `findWallUnderPoint` (kalınlığa duyarlı) seçer, duvar ÜZERİNDEKİ
yeri `getSnapOffsetsCm` + `snapOffsetCm` belirler.

**Sığmayan açıklık silinir:** Duvar silinince veya açıklık sığmayacak kadar
kısalınca kaldırılır (K16) — sahipsiz `wallId` bırakılırsa floorClone'un remap
assertion'ı sonradan patlar.

**Dosya:** core/opening.ts (sığma/çakışma/temizlik/dış çizgi),
core/wallPath.ts (offset ↔ konum, snap offsetleri — yay dikişi),
core/openingTool.ts (saf önizleme kararı), core/wall.ts (köşe payı),
scene/useOpeningTool.ts (jest makinesi), scene/Opening.tsx (çizim),
store/architectureSlice.ts (action + selector),
store/architectureUiStore.ts (seçim + sıradaki genişlik),
ui/OpeningToolOptions.tsx (genişlik şeridi).
