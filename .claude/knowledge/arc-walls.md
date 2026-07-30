# open-question: Yay (arc) duvarlar

**Durum:** KARAR VERİLMEDİ. Varsayarak kod yazma.

Görev tanımı "açıklık yay duvara da yerleştirilebilir, offsetCm eğri boyunca
ölçülür" diyor. `Wall` tipine yay alanı EKLENMEDİ (K14): `model.ts` dört kişilik
sözleşme, alan eklemek serialize + roundtrip + floorClone remap listesini de
bağlıyor. Ayrıca önerilen `arcControlPoint?: Point` duvarın içine koordinat
gömüyordu — "duvar kendi koordinatını taşımaz, ortak Point havuzuna referans
verir" kuralının ihlali. Eklenecekse `arcControlPointId?: Id` biçiminde olmalı.

**Dikiş nerede:** offset ↔ konum dönüşümünün TAMAMI `core/wallPath.ts`'ten
geçer:

- `getWallPathLengthCm(wall, points)` — bugün kiriş uzunluğu, yayda yay uzunluğu
- `getWallFrameAtOffsetCm(wall, points, offsetCm)` — nokta + teğet açısı + birim normal
- `getSnapOffsetsCm`, `snapOffsetCm` — snap noktalarının offset eksenindeki hâli

Açıklık kodu (`core/opening.ts`, `core/openingTool.ts`, `scene/Opening.tsx`) bu
fonksiyonların dışında geometri hesaplamıyor. Yay gelirse bu dosya değişir,
açıklık tarafı değişmez.

**Aynı anda yapılması gereken, kolay ATLANIR:** `core/wall.ts` →
`getPlacementRange` uzunluğu hâlâ `getSegmentLength(ends.p1, ends.p2)` ile
hesaplıyor. Yayda bu KİRİŞ olur, yol uzunluğu değil → maxOffsetCm yanlış çıkar
ve açıklık kodu tamamen doğru olsa bile sığma kontrolü şaşar. Düz duvarda ikisi
eşit olduğu için bugün fark GÖRÜNMÜYOR; hata yay eklendiği gün doğar.

**Ayrıca:** `getOpeningOutline` şimdi 4 köşe döndürüyor. Yay duvarda delik
düzgün görünsün diye eğri boyunca örneklenmiş çoklu köşe gerekir (dörtgen yayı
keser).

**Yayı olmayan sahnede test:** mock sahnedeki 11 numaralı çapraz duvar
(3-4-5, uzunluk tam 500) bu vakanın yer tutucusu — eksen yönü eksenlere paralel
olmadığı için normal/teğet hatalarını yakalar.
