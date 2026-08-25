# decision: Kat sırası dizinin kendisidir, `order` alanı yok

**Karar:** `ProjectData.floors` dizisinin SIRASI kat sırasıdır. Dizinin başı
(`index 0`) en ALT kat, indeks arttıkça yukarı çıkılır. `Floor` üzerinde `order`
veya `level` diye bir alan YOKTUR.

**Neden:** İki yerde tutulan sıra (dizi + alan) zamanla ayrışır ve JSON'a
kaydedilecek fazladan bir alan girer. Sıralama zaten yalnız kat yönetiminde
değişiyor ve `moveFloorInList` tek yerde yapıyor.

**Sonucu:** "Alt kat gölgesi" (KK-13) `index - 1`'dir — `getFloorBelowId`.
En alt katın altı yoktur, `undefined` döner.

**İki görüntü yönü, ikisi de bilerek:**

- **"Katlar" penceresi** listeyi EN ÜST kat başta gösterir (`reverse()`):
  kullanıcı binayı kesitten okuyor.
- **Kat şeridi** (`ui/canvas/FloorRail.tsx`, sahnenin sol üstü) da EN ÜST kat
  başta dizer — aynı kesit okuması.

Veri yapısı hiçbiri için çevrilmez; `reverse()` yalnız çizim anında.

⚠️ **Kat ŞERİDİ K166 ile GERİ GELDİ** (K55te silinmişti) ama bu sefer DİKEY ve
sahnenin sol üstünde, sol paletin hemen yanında. Kat geçişinin ana yolu burası;
`FloorSelect` açılırındaki kat LİSTESİ bu yüzden kalktı, orada yalnız "Kat
Yönetimi" ve "Kat Kopyalama" maddeleri var. Aynı listenin iki yerde durması
gereksizdi ve geçiş için önce menü açtırmak her değişime bir tıklama ekliyordu.
`FloorSelect` düğmesinin kendisi duruyor: şerit kısa etiket gösteriyor, TAM ad
orada okunuyor.

⚠️ Şeridin etiketi kat ADINDAN değil SIRADAN türer (`getFloorShortLabels`):
bodrum `B`, zemin `Z`, üstü `1`/`2`/`3`. Daire dar, ad serbest metin ve "Asma
Kat" sıradaki yerini söylemiyor; tam ad ipucunda ve erişilebilir adda. Çok
bodrumda numara eklenir ve AŞAĞI indikçe artar (`B1` zeminin hemen altı).

⚠️ Kaydırma çubuğu GİZLİ (`styles/floorRail.css`, kullanıcı kararı) ama
kaydırmanın kendisi çalışıyor; aktif kat `scrollIntoView` ile görünür tutulur.
⚠️ Sarmalayıcı `pointer-events-none`: şeridin boş dikey alanı tuvalin
tıklamasını yutmamalı. Şerit açılır/kapanır, kat ikonlu düğme sol üstte SABİT.

Geçiş ANINDA uygulanır (seçici, menü, Page Up/Down); yalnız "Katlar" penceresi
içindeki aktif kat değişikliği "Uygula"yı bekler — pencere taslak üzerinde
çalışıyor, bkz. [floor-plan-draft](./floor-plan-draft.md).

Kat geçişi DÖNGÜSEL DEĞİL (`getFloorIdInDirection` uçta `undefined` döner): en
üst kattayken Page Up ile bodruma düşmek kullanıcının bina içindeki yerini
kaybettirir.

## Bodrum ayrımı sıranın KISITIDIR, etiket değil

`Floor.isBasement` yalnız satırın zeminini boyayan bir işaret değil: bodrumlar
dizinin başında, normal katlar arkasında durur ve bu bölünme kotun İŞARETİNİ
belirler. Sıralama onu bozamaz (madde 9: "bodrum katlar zemin katın üzerine
taşınamaz").

Kısıt taşıma yönüne değil **sonuç dizisine** bakılarak denetlenir
(`isFloorOrderValid` → `reorderFloorInList`): sürükle-bırak katı herhangi bir
indekse atabiliyor, yön bazlı kontrol yalnız komşu takasını yakalardı.
`moveFloorInList` artık bunun ince bir sarmalayıcısı — iki yol tek kuralı
paylaşır. Kısıt İKİ YÖNLÜ: normal katı bodrumun altına indirmek de reddedilir.

Sınırlar `core/floors.ts`'te: proje geneli 40 kat (bodrumlar DAHİL), ayrıca en
fazla 5 bodrum; kat yüksekliği 200–600 cm. Bodrum iki tavana birden tabidir.

## Kot SAKLANMAZ, kat yüksekliklerinden türetilir

`Floor` kot alanı taşımaz; `core/floorElevation.ts` her gösterimde hesaplar.
Saklansaydı bir katın yüksekliği değişince üstündeki bütün kotları güncellemek
gerekirdi ve biri atlandığında JSON sessizce tutarsız kalırdı — `Opening`'in
`floorId` taşımaması ile aynı gerekçe (K9).

- Sıfır noktası ZEMİN KATIN TABANI = ilk bodrum olmayan kat.
- Zemin kat silinip geriye yalnız bodrum kalırsa referans dizinin ÜSTÜ olur
  (`floors.length`), böylece hiçbir bodrum ±0,00 görünmez.
- Bina yüksekliği bodrumları SAYMAZ — bina zemin üstünde göründüğü kadardır.
- Kot metnindeki işaret elle yazılır (`+3,20` / `±0,00` / `−2,80`):
  `toLocaleString` eksi yerine tire üretir ve sıfıra hiç işaret koymaz, oysa
  `±0,00` "burası referans düzlem" diyen ayrı bir bilgi.

`heightCm`/`isBasement` modele SONRADAN geldi → `serialize.ts` şemasında
`.default()` taşır, yoksa depodaki çizimler HİÇ AÇILMAZDI.

## Kat geçişi geçmişe adım YAZMAZ

`activeFloorId` hem `ProjectData`'da hem zundo anlık görüntüsünde DURUR ama
`areProjectStatesEqual` onu KARŞILAŞTIRMAZ (`store/history.ts`).

- Kat seçiciden kat değiştirmek çizim verisini değiştirmez → `revision` artmaz
  → adım yazılmaz.
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

⚠️ **Kalıcı bir diziye yeni alan eklendiğinde burası da güncellenir.** `rooms` ve
`symbols` bu fonksiyondan SONRA modele girdi ve ikisi de temizlikten atlandı:
kat siliniyor, o kata ait odalar ve semboller `ProjectData`'da kalıyordu. Hata
sessizdi — semboller aktif kat filtresi yüzünden görünmüyor, odalar sahipsiz
`wallId` tutuyordu, ikisi de kaydedilen JSON'a yazılmaya devam ediyordu.

Oda `floorId` TAŞIMAZ (kimliği duvar id kümesi, K31), bu yüzden kata göre değil
**silinen duvar id'lerine göre** süzülür.

## Ad çakışması

Aynı ad iki katta kabul edilmez (`isFloorNameTaken`) — kat adı kullanıcının
katları ayırt etme yolu, durum çubuğu ve kat seçici onu gösteriyor.
Karşılaştırma yalnız boşluk kırpar, `toLowerCase()` UYGULAMAZ:
bkz. [turkish-collation](./turkish-collation.md).

Yeni kat adı kat SAYISINDAN türetilmez, var olan en yüksek "N. Kat"
numarasından türetilir (`getNextFloorName`) — bodrum ve zemin katları da dizide
olduğu için sayıya bakmak numarayı hemen kaydırırdı.

**Dosya:** core/floors.ts + core/floorElevation.ts (saf) · store/floorOps.ts
(draft) · store/floorSlice.ts (action) · ui/FloorManagementDialog.tsx ·
ui/canvas/FloorSelect.tsx · scene/FloorBelowGhost.tsx
