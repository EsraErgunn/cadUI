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

Aynı hastalık iki yerde çıktı, ikisi de sürüklemede:

- **K99 — duvar çizgisi.** `Wall` uçlarını `pointIndex`'ten çözüyordu;
  `pointIndex` sürükleme boyunca her kare yeniden kuruluyor
  (`useArchitecturePoints` sürüklenen köşeleri geçici konumla döndürür). Prop
  NESNE'den SAYI'ya çevrildi (`p1x/p1y/p2x/p2y`).
- **K100 — oda dolgusu.** `RoomShape` `toFillPositions(fillCorners)`'ı JSX
  içinde çağırıyordu; her render yeni `Float32Array`. Tampon artık poligonun
  KOORDİNAT DEĞERLERİNDEN üretilen anahtara göre `useMemo`'lu
  (`useStableFillPositions`).

⚠️ "Son değeri ref'te sakla" deseni bu projede KULLANILAMAZ: `react-hooks/refs`
render sırasında ref erişimini HATA sayıyor. Çözüm değer anahtarı + `useMemo`.

⚠️ drei `<Line>` geometriyi `points` dizisinin KİMLİĞİNE göre kuruyor: dizi
değişince yeni `LineGeometry` + GPU tampon yüklemesi + eskisinin imhası. Sahnede
`<Line>` kullanan her yer aynı tuzağa açık (AreaObject, Beam, tesisat katmanı).
Aynısı r3f `<bufferAttribute args={[...]}>` için de geçerli.

## Ölçüm nasıl alınır

Kare süresi dev kipinde GÜVENİLMEZ — oturum kısıtlanınca boş sondaj bile 93 ms
verdi ve sayılar koşudan koşuya 20 kat oynadı. Karşılaştırmayı **`bufferData`
sayısına** dayandır, o deterministik.

Tarayıcı konsolunda `WebGLRenderingContext.prototype.bufferData` ve
`drawElements`/`drawArrays` sarılıp kare başına sayılır. Sürükleme
`architectureUiStore.setDraggingWall` her kare güncellenerek taklit edilebilir
(gerçek jestin ürettiği veri akışının aynısı). Uzun kayıtlar `javascript_tool`
zaman aşımına takılır: sonucu `window.__last`'a yazıp ayrı çağrıyla oku.

Sentetik plan üretmek için dev kipinde store'a doğrudan erişilebiliyor:
`import('/src/store/cadStore.ts')`. Odaların doğması için `setState` yetmez,
gerçek bir yazım yolundan geçmek gerekir (`moveWall(id, 0, 1)` + geri).

Bir katmanın payını bulmak için onu kaldırıp taban ölç: `setState({ rooms: [] })`
→ yüz eşleşmesi kalmaz, dolgu ve etiket çizilmez.

## Ölçülmüş sayılar (220 duvar / 100 oda, tek duvar sürüklenirken)

| `bufferData` / kare | değer |
|---|---|
| K99 öncesi | 1223,2 |
| K99 sonrası | 144,7 |
| K100 sonrası | 67,4 |
| odalar hiç yokken (taban) | 42,3 |

K99 ayrıca ortalama kareyi 156 ms → 41 ms getirmişti (o turda tarayıcı sağlıklıydı).

## Sorun OLMAYANLAR — ölçüldü, uğraşma

- **Ölçü yazıları.** Görünüm ▸ Ölçüler açık/kapalı `bufferData` farkı YOK
  (43,1 / 43,2). Sadece çizim çağrısı artıyor (+34,6), kare süresinde ölçülebilir
  etki yok. troika yalnız konum değişince tampon yüklemiyor.
- **Oda tespiti ve etiket hesapları.** 420 duvarda `findRoomFaces` 0,40 ms,
  `getWallDimensionAnnotations` 0,27 ms, `getCornerAngleAnnotations` 0,21 ms.
  İkincisi ve üçüncüsü `useMemo`'suz koşuyor ve öyle kalabilir.
- Yazım tarafında tek gerçek maliyet `findWallSplits` (O(N²), 840 duvarda 85 ms)
  ama o JEST başına — belirtisi "bıraktığımda donuyor", "sürüklerken kasıyor" değil.

## Sıradaki hedefler

- Çizim çağrısı hâlâ ~345/kare. Normal tonlu duvarlar tek `<Line segments>`te
  toplanabilir (hover/seçili olanlar ayrı kalır) → ~3 çağrı.
- `Wall.tsx`'te `frustumCulled={false}`: ekran dışındaki duvarlar da çiziliyor.
  Kapsül sınırları taştığı için kapatılmış; doğrusu `boundingSphere`'i kalınlık
  kadar şişirip kırpmayı geri açmak.
- Kalan 42,3 taban `bufferData`: ızgara ve diğer katmanlar, henüz incelenmedi.
