# decision: köşe açısı etiketleri

Tür: `decision` · 2026-08 · İlgili: K77 (docs/kararlar.md)

## Hesap

`core/cornerAngles.ts` → `getCornerAngleAnnotations`:

1. Her duvar İKİ köşesine birer "kol" ekler; kolun yönü köşeden komşuya bakar.
2. Koller yön açısına göre SIRALANIR.
3. Ardışık çiftlerin arası ölçülür (0..360'a indirgenerek). Toplamları 360°.

Sıralama şart: onsuz "komşu kol" tanımsız kalır ve üç kollu bir birleşimde
hangi ikisinin ölçüleceği duvarların çizim sırasına düşer.

**Açıortay** ilk kolu açının yarısı kadar döndürerek bulunur. Yön vektörlerini
toplamak da açıortay verir ama 180°'ye yakın açıda toplam sıfıra gider ve yön
kaybolur — T birleşimlerinin tamamı o durumda.

## Geometrik işaret (K78)

`getCornerAngleMarkerPoints` açının altına çizilecek şekli verir; sahne yalnız
`<Line>` ile çizer (geometrinin testi ekransız yazılabilsin diye core'da).

- **Dik açı → KARE** (üç nokta, iki çizgi). Tolerans 0.5°: trigonometriden
  89.9999 çıkıyor, toleranssız her dik köşe yay olarak çizilirdi.
- **Diğerleri → daire dilimi YAYI**, 6°'de bir kırılarak. Nokta sayısı açıyla
  büyür.

Yarıçap çağırandan gelir ve ekran-sabittir (`px / zoom`); yazı işaretin dışında
kalır (16 px yarıçap, 30 px yazı uzaklığı). `frustumCulled={false}` şart — yay
her karede yeniden üretiliyor, eski sınır kutusu işareti kaybettirebilir.

## Kurallar

- İki kollu köşede ters açı (360−x) YAZILMAZ: aynı köşeyi öbür yandan ölçer,
  yeni bilgi yok, sayı adedini ikiye katlar. Üç+ kolda hepsi yazılır.
- Yazı duvara paralel DÖNMEZ (ölçü yazısının aksine): açı iki duvara birden
  ait, birine hizalamak öbürüne yanlış bakar.
- Varsayılan KAPALI (`uiStore.isCornerAnglesVisible`). Diğer ölçü
  anahtarlarından bağımsız. Kapalıyken sürükleme sırasında düzenlenen köşeler
  için yine çizilir.
- Sıfır boy duvar kol EKLEMEZ — `atan2(0, 0)` sessizce 0 döndürüp olmayan bir
  yön uyduruyor.

## Bilinen sınır

İki kollu İÇBÜKEY köşede yazılan sayı odanın içindeki açı (270°) değil,
dışarıdaki tümleyeni (90°). Aynı geometri, öbür yandan ölçülmüş. Oda tarafını
seçmek `findRoomFaces` yüzlerine bakmayı gerektirir — `buildWallInteriorPoints`
(K75) aynı altyapıyı zaten kuruyor, gerekirse oradan genişletilir.
