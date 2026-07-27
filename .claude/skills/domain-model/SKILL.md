---
name: domain-model
description: starcad çizim veri modeliyle (Point/Wall/Opening/Room/Node/Pipe/Fitting/Equipment/Riser/ServiceBox, core/model.ts) çalışırken oku. Model tipi eklerken/değiştirirken, kat kopyalarken, id üretirken, serialize/validate yazarken gerekli. Bu kuralları ihlal eden kod sessizce bozar.
---

# starcad — Veri Modeli

`core/model.ts` dört kişi arasındaki sözleşmedir. Buradaki her yapı bir
gereksinimi doğrudan karşılar; "kolayına" bir alternatif seçmek o gereksinimi bozar.

## Neden Point havuzu (en sık kaçırılan yer)

Duvar KENDİ koordinatını taşımaz. Ortak bir `Point[]` havuzu vardır; duvar
`p1Id` / `p2Id` ile o havuza referans verir.

Cazip ama YANLIŞ olan: `Wall { x1, y1, x2, y2 }`. Neden yanlış:
- İki duvar bir köşeyi paylaşıyorsa, köşeyi taşımak için İKİ duvarı da elle
  güncellemen gerekir. Biri unutulur, duvarlar ayrılır.
- Oda tespiti (core/room.ts) duvarların uç uca bağlı olmasına dayanır. Ayrı
  koordinatlarda "aynı nokta" kayan-nokta hatasıyla "neredeyse aynı" olur ve
  çevrim kapanmaz.

Kural: köşe hareketi = tek `Point` günceller, ona bağlı tüm duvarlar otomatik gelir.

## Opening yalnız duvara bağlıdır

`Opening` (kapı/pencere) mutlak koordinat TUTMAZ. `wallId` + `offset` (duvarın
p1 ucundan uzaklık) tutar. Böylece duvar taşınınca açıklık kendiliğinden taşınır
— ekstra kod yok. Duvarsız açıklık temsil edilemez; bu bilinçlidir (gereksinim:
"kapı/pencere yalnız duvar üzerine").

## Boru bir GRAFİKTİR, çizgi listesi değil

`Node` (düğüm) + `Pipe` (fromNodeId → toNodeId). "Cihaza bağlanmamış boru ucu"
uyarısı bu grafik üzerinde hesaplanır: derecesi 1 olan ve ucunda cihaz/vana/
servis kutusu bulunmayan düğüm = bağlanmamış uç.

Boru çizerken mevcut bir düğüme snap yaptıysan YENİ düğüm üretme — var olanın
id'sini kullan. Aksi halde aynı noktada iki ayrı düğüm olur, grafik kopuk görünür
ve yanlış uyarı üretir.

Vana/sayaç (`Fitting`) boru üzerinde `t` (0..1 oran) ile durur, mutlak konumla
değil. Böylece boru uzayınca eleman hat üzerinde kalır, havada asılı kalmaz.

## Tekillik yapıdan gelir

`ServiceBox` kökte TEK nesnedir (dizi DEĞİL). "Projede yalnız bir servis kutusu"
kuralı böylece doğrulama koduna gerek kalmadan sağlanır. Diziye çevirme.

## Kolon (Riser) kat kopyalamada KLONLANMAZ

`Riser` kat dışında, projenin kökündedir ve `fromFloorId → toFloorId` aralığını
kapsar. Kat çıkma (kopyalama) sırasında doğru davranış: kolonu klonlamak DEĞİL,
`toFloorId`'yi yeni kata uzatmaktır. Klonlarsan aynı düşey hatta iki boru olur;
2B'de üst üste bindiği için görünmez, izometrikte ve malzeme dökümünde metraj
iki katına çıkmış olarak ortaya çıkar.

## id kuralları

- Kalıcı id: proje bazlı **artan tamsayı** (`nextUniqueId`) — `crypto.randomUUID()`
  DEĞİL. Neden: round-trip kabul testi (docs/sample-project.json yükle→serileştir→
  bit-bit aynı) WebCAD JSON formatındaki id şemasına dayanıyor; UUID'ye geçilirse
  test artık gerçek formatla karşılaştırma yapmaz. Bkz. `knowledge/id-scheme.md`.
- Bir kez üretilir, ASLA yeniden üretilmez. (Yeniden üretmek undo geçmişini ve
  sürüm karşılaştırmasını bozar.)
- Dizi indeksini id gibi kullanma. React key olarak da id kullan, indeks değil —
  ortadaki bir nesne silinince indeks kayar, R3F yanlış mesh'i yeniden kullanır.

## Kat kopyalama = iki geçişli id yeniden eşleme (en kritik algoritma)

`core/floorClone.ts`. "Kopya bağımsız olmalı" gereksinimi burada kolayca bozulur.
Nesneler birbirine id ile bağlı: Opening→wallId, Room→wallIds, Pipe→node id'leri,
Fitting→pipeId, Equipment→roomId+portNodeId, Wall→p1Id/p2Id.

Naif derin kopya (JSON.parse(JSON.stringify)) referansları KAYNAK katın id'lerine
bırakır ve HATA VERMEZ. Sonra alt kattaki duvarı taşırsın, üst kattaki kapı da
oynar. Doğru yöntem:

1. Kaynak kattaki her nesne için `eskiId → yeniId` haritası çıkar.
2. Derin kopyada HER referans alanını haritadan geçir. Haritada olmayan bir id
   ile karşılaşırsan sessizce geçme — HATA FIRLAT. Bu assertion, modele yeni bir
   referans alanı ekleyip remap listesine yazmayı unuttuğun gün seni yakalayan
   tek şeydir.

Bir duvarı silince ona bağlı Point başka duvar kullanmıyorsa sahipsiz kalır —
temizle, yoksa JSON şişer ve roundtrip testi çöp veriyle dolar.

## Birim ve koordinat

- Birim: santimetre. Uzunluk cm, açı derece.
- Plan (x,y) ↔ Three (x,-z), elevation→y dönüşümü SADECE core/coords.ts'te.
  Model saf plan koordinatı tutar; sahne dönüşümü asla model'e sızmaz.

## Erişim modeli: henüz kesinleşmedi

Proje erişiminin tek-sahip mi çoklu-rol mü olacağı açık soru — bkz.
`knowledge/access-control.md`. Bu modele bağlı alan (ör. paylaşım/rol tablosu)
eklerken varsayım yapıp model.ts'e kod yazma, önce netleştir.

## Değişiklik yaparken

- model.ts'e alan eklemek = sözleşmeyi değiştirmek. Dört kişiyi de etkiler,
  serialize + roundtrip testi + floorClone remap listesi güncellenmeli.
- Yeni referans alanı eklediysen floorClone'daki remap listesine EKLE, yoksa
  kat kopyalama sessizce bozulur.
