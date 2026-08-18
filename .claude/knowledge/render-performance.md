# Render performansı (mimari sahne)

## React Compiler AÇIK — elle memo yazmadan önce oku

`vite.config.ts` → `babel({ presets: [reactCompilerPreset()] })`. Derleyici
bileşenleri otomatik memoize ediyor, yani **`useMemo`/`React.memo` çoğu yerde
gereksiz**. Ne yaptığını görmek için dev sunucudan derlenmiş çıktıyı oku:

```bash
curl -s http://localhost:5173/src/scene/Wall.tsx | head -80
```

Çıktıda `const $ = _c(21)` ve `if ($[1] !== pointIndex || $[2] !== wall)`
biçiminde önbellek kontrolleri görürsün — anahtarların ne olduğu oradan okunur.

## Asıl kural: anahtarın ne sıklıkta değiştiği

Derleyici önbelleği ona verdiğin anahtarlar kadar iyi. **Kare başına kimliği
değişen tek bir prop, o bileşendeki tüm önbelleklemeyi etkisiz bırakır.**

K99'un vakası: `Wall` uçlarını `pointIndex`'ten çözüyordu; `pointIndex`
sürükleme boyunca her kare yeniden kuruluyor (`useArchitecturePoints`
sürüklenen köşeleri geçici konumla döndürür). Uçları hiç oynamayan duvarların
geometrisi de her karede yeniden yükleniyordu. Çözüm prop'u NESNE'den SAYI'ya
çevirmek oldu (`p1x/p1y/p2x/p2y`).

⚠️ drei `<Line>` geometriyi `points` dizisinin KİMLİĞİNE göre kuruyor: dizi
değişince yeni `LineGeometry` + GPU tampon yüklemesi + eskisinin imhası. Sahnede
`<Line>` kullanan her yer aynı tuzağa açık (AreaObject, Beam, tesisat katmanı).

## Ölçüm nasıl alınır

Kare süresi dev kipinde oynak; karşılaştırmayı **`bufferData` sayısına** dayandır,
o deterministik. Tarayıcı konsolunda `WebGLRenderingContext.prototype.bufferData`
ve `drawElements`/`drawArrays` sarılıp kare başına sayılır; sürükleme
`architectureUiStore.setDraggingWall` her kare güncellenerek taklit edilebilir
(gerçek jestin ürettiği veri akışının aynısı).

Sentetik plan üretmek için dev kipinde store'a doğrudan erişilebiliyor:
`import('/src/store/cadStore.ts')`. Odaların doğması için `setState` yetmez,
gerçek bir yazım yolundan geçmek gerekir (`moveWall(id, 0, 1)` + geri).

## Ölçülmüş sayılar (220 duvar / 100 oda, tek duvar sürüklenirken)

| | K99 öncesi | K99 sonrası |
|---|---|---|
| `bufferData` / kare | 1223,2 | 143,0 |
| ortalama kare | 156,3 ms | 41,5 ms |
| çizim çağrısı / kare | 379,1 | 379,1 |

## Sorun OLMAYANLAR — ölçüldü, uğraşma

420 duvarda: `findRoomFaces` 0,40 ms, `getWallDimensionAnnotations` 0,27 ms,
`getCornerAngleAnnotations` 0,21 ms. Bu üçü `useMemo`'suz koşuyor ve öyle
kalabilir; memoize etmek kodu karmaşıklaştırır, kazanç vermez.

Yazım tarafında tek gerçek maliyet `findWallSplits` (O(N²), 840 duvarda 85 ms)
ama o JEST başına, kare başına değil — belirtisi "bıraktığımda donuyor".

## Sıradaki hedefler

- Kalan 143 `bufferData`/kare duvarlardan DEĞİL: oda dolguları, ölçü yazıları,
  diğer katmanlar.
- 379 çizim çağrısı: normal tonlu duvarlar tek `<Line segments>`te toplanabilir
  (hover/seçili olanlar ayrı kalır) → ~3 çağrı.
- `Wall.tsx`'te `frustumCulled={false}`: ekran dışındaki duvarlar da çiziliyor.
  Kapsül sınırları taştığı için kapatılmış; doğrusu `boundingSphere`'i kalınlık
  kadar şişirip kırpmayı geri açmak.
