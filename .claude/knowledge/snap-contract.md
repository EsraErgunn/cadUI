# convention: Snap noktaları ve duvar↔açıklık fonksiyon sözleşmesi

**Sabit aralıklı bölüm noktası YOK.** "Her 2 metrede bir snap noktası" fikri
elendi: 11.65 m'lik duvarda son parça artık kalır, hizalama rastgeleleşir.

**getSnapPoints(wallId): Point[]** yalnız geometrik olarak anlamlı noktaları
döndürür: iki uç, orta nokta, diğer duvarlarla kesişimler. Bu noktaların dışında
kalan her yer serbesttir — imleç yakınsa yakalanır, değilse tıklanan yer duvar
üzerine izdüşürülür.

**Tek yerde yaşar:** hem duvar çizimi (useWallTool) hem açıklık yerleştirme
(useOpeningTool) aynı fonksiyonu tüketir. İki tarafta ayrı ayrı hesaplanırsa
davranışlar zamanla ayrışır.

## Karşılıklı sözleşme

Mimari (B) iki alt-faya bölündü: **duvar altyapısı** (wall/room/snap) ve
**açıklık + nesne etkileşimi** (opening/seçim/özellik paneli). İkisi de B'nin
dosyalarına dokunur, sınır bu fonksiyonlardır.

Duvar altyapısı → açıklık tarafına:
- `getSnapPoints(wallId): Point[]`
- `getPlacementRange(wallId): { minOffsetCm, maxOffsetCm }` (köşe payı dahil)
- `selectWallById`, `selectPointById`, `selectWallsOnFloor`, `selectWallsAtPoint`

Açıklık tarafı → duvar altyapısına:
- `getOccupiedRanges(wallId): [startCm, endCm][]` — duvar çizerken/böler ken
  açıklığın üstünden geçmemek için.

## Veri yapısı: dizi, Record değil

`points: Point[]`, `walls: Wall[]`. Record<Id, Wall> cazip görünür (O(1) erişim)
ama id'ler tamsayı (knowledge/id-scheme.md) ve JS obje anahtarları string'e
çevrilir → JSON'a `{"1": …}` diye yazılır, round-trip testi bunu yakalar.
Ayrıca CLAUDE.md kural 4: store'un şekli kaydedilecek JSON'un şekliyle aynıdır.
Hızlı erişim ihtiyacı selector ile çözülür, veri yapısı değiştirilerek değil.

**Alan adları:** `p1Id` / `p2Id` (startPointId/endPointId DEĞİL), id'ler tamsayı.
