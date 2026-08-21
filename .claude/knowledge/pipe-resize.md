# Boy düzenlemesi ucundaki ağı ÖTELER (K128)

2026-08, kullanıcı isteği. Özellik panelindeki **Boy (cm)** alanı borunun bitiş
ucunu kaydırınca, o ucun ötesindeki her şey **aynı kaymayla ötelenir**: dirsek
(köşe), üstündeki vana, devam boruları ve onlara bağlı elemanlar. Hiçbiri
gerilmez.

Öncesinde: yalnız o köşedeki kaynaklı uçlar hedefe taşınıyordu, devam borusu
karşı ucundan tutulu kaldığı için **esniyordu**; üstelik yayılım bir port
çapasına değerse işlem **tümüyle reddediliyordu** (uzunluk hiç değişmiyordu).

## Köşe sürüklemesinden FARKLI bir kural

`core/moveTargets.ts` (seçim taşıma): seçim rijit gider, aradaki borular ESNER,
taşınmayan bir elemanın portu yayılımı DURDURUR.

`core/resizeTargets.ts` (boy düzenleme): boyu değişen boru dışında hiçbir şey
esnemez, **port çapası yayılımı durdurmaz** — boru esnemediği için elemanın
yerinde kalması ağı koparırdı. İki dosya bilerek ayrı; birleştirme denemeden
önce bu farkı oku.

## Yayılım

Kararlı hâle gelene kadar tekrarlanan dört kural:

1. Hat-hat kaynağı **iki yönlü** okunur (`lineCornerLink.ts` gerekçesi).
2. Porta oturan uç kayıyorsa eleman, eleman kayıyorsa uç kayar.
3. Düğümün üstündeki armatür düğümüyle gelir.
4. Boyu değişen hat DIŞINDA bir hattın herhangi bir noktası kayıyorsa o hat
   **bütünüyle** kayar ve kot farkını da alır.

## İki durak

- **Boyu değişen hattın öteki noktaları sabit**: başlangıç ucu yerinde kalır,
  yayılım üstünden geçmez. Yoksa bir çevrim borunun kendi başını kaydırırdı.
- **`FloorPipeLink` ucu taşıyan hat rijit ötelenmez** (K104: linkin `position`'ı
  ve karşı kattaki eşi burada kayamaz). Kaynaklı ucu gelir, bağlı ucu kalır —
  o boru ESNER ve öteleme orada biter. Bilinen sınır, testte yazılı.

## Kot da ötelenir

Bütünüyle ötelenen boruların `startHeightCm`/`endHeightCm`'i delta kadar kayar.
Saf yatay boruda delta 0'dır (fark yok); eğik boru kısalınca kotu da değiştiği
için ağın geri kalanı taşınmasa 3B'de kopardı.

Nerede: `src/plumbing/core/resizeTargets.ts`,
`src/plumbing/store/plumbingSlice.ts` → `resizePipeEnd`,
`src/plumbing/ui/properties/PipePropertiesPanel.tsx`.
