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

Duvar altyapısı → açıklık tarafına (SAF sürüm, `core/wall.ts` — imzalar
state almaz, argüman alır):
- `getSnapPoints(wall, points, walls): PlanPoint[]`
- `getPlacementRange(wall, points, walls): PlacementRange | undefined` (köşe payı dahil)

Store yüzü (`store/architectureSlice.ts`), yukarıdakileri saran ince selector'lar:
- `selectWallById(state, wallId)`, `selectPointById(state, pointId)`
- `selectWallsOnFloor(state, floorId)`, `selectWallsAtPoint(state, pointId)`
- `selectPlacementRange(state, wallId)`

Açıklık tarafı → duvar altyapısına:
- `getOccupiedRanges(wallId, openings): OpeningSpan[]` — `[startCm, endCm]`
  ikilileri, **startCm'e göre artan**. Duvar çizerken/kısaltırken açıklığın
  üstünden geçmemek için. Store yüzü: `selectOccupiedRanges(state, wallId)`.
- `pruneUnfittableOpenings(openings, walls, points)` / store'da
  `pruneOpeningsOnWalls()` — duvarı silen veya kısaltan HER action bunu
  işini bitirince çağırır (K16).

**Duvarı seçmek snap'in işi DEĞİL.** `resolveSnap` köşede `kind:'point'` dönüp
`wallId` vermez ve px eşiği kalınlığı bilmez. "İmleç hangi duvarın üstünde"
sorusunu `core/wallPath.ts` → `findWallUnderPoint` (kalınlığa duyarlı) yanıtlar;
`getSnapPoints` yalnız duvar ÜZERİNDEKİ yeri belirlemek için tüketilir
(`getSnapOffsetsCm` + `snapOffsetCm`).

⚠️ **Abonelik tuzağı:** `(state, id)` imzalı selector'ların bir kısmı her çağrıda
YENİ dizi/nesne üretir (`selectWallsOnFloor`, `selectWallsAtPoint`,
`selectOpeningsOnWall`, `selectOccupiedRanges`, `selectPlacementRange`).
`useCadStore((s) => selectX(s, id))` biçiminde kullanılırsa `Object.is` her
seferinde false döner ve bileşen sonsuz render olur. Bunlar action/olay içinden
`useCadStore.getState()` ile çağrılan **sorgu yardımcılarıdır**; bileşenler
kararlı `state.walls` / `state.openings` referanslarına abone olup türetir.
(`selectWallById`/`selectPointById`/`selectOpeningById` `find` kullandığı için
dizideki nesnenin kendisini döndürür — onlar abonelik olarak güvenli.)

**Slice ↔ cadStore importu:** slice `cadStore`'dan yalnız `import type` yapar.
Çalışma zamanı yardımcıları (`takeNextId`, `markDirty`) `store/projectMeta.ts`'te
durur; `cadStore`'dan alınırsa import döngüsü oluşur ve `create()` slice'ı
tanımlanmamış bulur (K17).

## Veri yapısı: dizi, Record değil

`points: Point[]`, `walls: Wall[]`. Record<Id, Wall> cazip görünür (O(1) erişim)
ama id'ler tamsayı (knowledge/id-scheme.md) ve JS obje anahtarları string'e
çevrilir → JSON'a `{"1": …}` diye yazılır, round-trip testi bunu yakalar.
Ayrıca CLAUDE.md kural 4: store'un şekli kaydedilecek JSON'un şekliyle aynıdır.
Hızlı erişim ihtiyacı selector ile çözülür, veri yapısı değiştirilerek değil.

**Alan adları:** `p1Id` / `p2Id` (startPointId/endPointId DEĞİL), id'ler tamsayı.
