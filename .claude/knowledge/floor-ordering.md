# decision: Kat sırası dizinin kendisidir, `order` alanı yok

**Karar:** `ProjectData.floors` dizisinin SIRASI kat sırasıdır. Dizinin başı
(`index 0`) en ALT kat, indeks arttıkça yukarı çıkılır. `Floor` üzerinde `order`
veya `level` diye bir alan YOKTUR.

**Neden:** İki yerde tutulan sıra (dizi + alan) zamanla ayrışır ve JSON'a
kaydedilecek fazladan bir alan girer. Sıralama zaten yalnız kat yönetiminde
değişiyor ve `moveFloorInList` tek yerde yapıyor.

**Sonucu:** "Alt kat gölgesi" (KK-13) `index - 1`'dir — `getFloorBelowId`.
En alt katın altı yoktur, `undefined` döner.

**Görüntü ters:** Hem Kat Yönetimi diyaloğu hem sekme şeridi listeyi EN ÜST kat
başta gösterir (kullanıcı binayı kesitten görüyor). Çeviri yalnız görüntü
katmanındadır (`[...floors].reverse()`); veri yapısı görüntü için çevrilmez.

## Kat geçişi geçmişe adım YAZMAZ

`activeFloorId` hem `ProjectData`'da hem zundo anlık görüntüsünde DURUR ama
`areProjectStatesEqual` onu KARŞILAŞTIRMAZ (`store/history.ts`).

- Sekmeye tıklamak çizim verisini değiştirmez → `revision` artmaz → adım yazılmaz.
  Yoksa Ctrl+Z kullanıcıyı başka kata ışınlardı.
- Kat silme `activeFloorId`'yi kaydırır ama `markDirty` çağırdığı için zaten
  kaydediliyor; geri alındığında alan anlık görüntüden eski değerine döner.

Yani alanın anlık görüntüde durması ile karşılaştırmaya girmesi AYRI şeyler.
Yeni bir "veri değiştirmeyen ama kaydedilen" alan eklenirse aynı ayrım yapılır.

## Kat silmenin sırası

`removeFloorFromDraft` (`store/floorOps.ts`) önce açıklıkları, sonra duvarları,
en sonda noktaları siler. Ters sırada duvar gittiğinde açıklığın hangi kata ait
olduğu ANLAŞILAMAZ — `Opening` `floorId` taşımıyor, katı duvarından türetiliyor
(K9, bkz. [opening-placement](./opening-placement.md)).

Tesisat elemanlarının temizliği de aynı fonksiyonda: kendi slice'ında bırakılsaydı
kat silme iki ayrı action olur ve tek Ctrl+Z ile geri alınamazdı.

## Ad çakışması

Aynı ad iki katta kabul edilmez (`isFloorNameTaken`) — kat adı kullanıcının
katları ayırt etme yolu, durum çubuğu ve sekme şeridi onu gösteriyor.
Karşılaştırma yalnız boşluk kırpar, `toLowerCase()` UYGULAMAZ:
bkz. [turkish-collation](./turkish-collation.md).

Yeni kat adı kat SAYISINDAN türetilmez, var olan en yüksek "N. Kat"
numarasından türetilir (`getNextFloorName`) — bodrum ve zemin katları da dizide
olduğu için sayıya bakmak numarayı hemen kaydırırdı.

**Dosya:** core/floors.ts (saf) · store/floorOps.ts (draft) · store/floorSlice.ts
(action) · ui/FloorManagementDialog.tsx · ui/FloorTabs.tsx ·
scene/FloorBelowGhost.tsx
