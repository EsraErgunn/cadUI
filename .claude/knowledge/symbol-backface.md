# Sembol geometrisi tepe kameradan arka yüzüyle bakar

`symbolLoader.ts` → `bakeToLocalPlanSpace` SVG'nin XY düzlemini `rotateX(+90°)`
ile plan zeminine yatırıyor. Bu döndürme geometrinin ÖN yüzünü (+Z) **−Y**'ye
çeviriyor; tepeden bakan ortografik kamera ise +Y'den bakıyor. Yani kamera her
zaman arka yüzü görüyor.

Sonuç: material `side: FrontSide` (three varsayılanı) kalırsa **sembollerin
tamamı kırpılır**. Hata yok, uyarı yok, boş mesh de yok — yerleştirme store'a
yazar, `SymbolInstance` mount olur, ekranda hiçbir şey görünmez. Aşama 3'te
"yerleştirme çalışmıyor" diye görülen buydu; asıl sorun çizimdeydi.

Bu yüzden `getSharedMaterial` **`side: DoubleSide`** üretir. Yeni bir sembol
material'i (highlight klonu, önizleme klonu, ileride 3B/izometrik) eklenirken
`side` KORUNMALI — `clone()` taşıyor, elle `new MeshBasicMaterial(...)` yazan
kod taşımıyor.

Regresyon testi: `plumbing/scene/__tests__/symbolLoader.test.ts` (hem `side`
hem "normal ±Y ekseninde" invaryantı). Aynı tuzak duvar/açıklık mesh'lerinde
YOK: onlar plan koordinatından doğrudan üretiliyor ve sarım yönü doğru çıkıyor.
