---
type: decision
date: 2026-08-03
---

# Duvar grafı düzlemseldir: kesişimde ve T birleşiminde düğüm açılır

## Karar

Duvarlar birbirini kesip geçemez. Her düzenlemeden sonra graf **düzlemsel**
hale getirilir: kesişen duvarlar kesişim noktasından, gövdesine başka bir
duvarın ucu değen duvar o noktadan BÖLÜNÜR.

- **T birleşimi:** değen ucun var olan `Point`'i PAYLAŞILIR, yeni nokta
  üretilmez. Aynı yerde iki nokta olsaydı duvarlar kopuk kalır ve mahal
  çevrimi kapanmazdı.
- **Kesişim:** iki duvar da bölünür, ortak TEK yeni `Point` üretilir.
- Bölünen duvarın ilk parçası **kendi id'sini korur**; seçim, açıklık ve geri
  alma o id'ye bakıyor.

Nerede: `core/wallGraph.ts` (saf: nerede bölüneceğini bulur),
`store/architectureSplit.ts` (uygular). `addWall`, `addWallChain`, `movePoint`
ve `moveWall` çağırır — hepsi kendi `set()`'i içinde, yani bölme onu tetikleyen
hareketle TEK geri alma adımı.

## Neden: mahal tespitinin ön koşulu

`core/room.ts` yüz taramasıyla çalışacak ve bu ancak kenarların YALNIZ
düğümlerde buluştuğu bir grafta doğrudur. Kesişip geçen duvarlar bu koşulu
bozar; oda algoritması onları görmez ve kapalı görünen alan kapanmaz.

## Açıklıklar: bölme reddedilir, açıklık kaybolmaz (K24)

Bölme noktası bir kapı/pencerenin İÇİNE düşüyorsa o bölme **yapılmaz**.
Açıklık silinmez, kaydırılmaz — K13'ün "geçersiz yerleştirme reddedilir"
kuralının aynısı.

Kesişimin bir tarafı reddedilirse **öbür tarafı da düşer**: yoksa bir duvar
bölünür, diğeri bölünmez ve ortada hiçbir şeye bağlanmayan bir düğüm kalır.

Reddedilmeyen bölmelerde açıklık kendisini İÇEREN parçaya taşınır ve
`offsetCm` o parçanın başına göre yeniden hesaplanır.

Sonucu: kapının üstünden geçen bir duvar orada düğüm AÇMAZ, dolayısıyla o
noktada oda çevrimi kapanmaz. Kullanıcıya bunu anlatan bir uyarı henüz yok.

## Bilinen sınırlar

- **Üst üste binen (kolineer) duvarlar bölünmez.** `getInteriorCrossing`
  paralel doğrularda undefined döner. Ayrı bir vaka, henüz ele alınmadı.
- **Uca MIN_WALL_LENGTH_CM'den yakın değme bölme üretmez** — güdük duvar
  oluşmasın diye. O mesafe zaten gözle köşeden ayırt edilemiyor, ama
  topolojik olarak bağlanmamış olur.
- **Bölünme geri BİRLEŞMEZ.** Duvarlar ayrılınca parçalar ayrı kalır
  (bilinçli: öngörülür davranış). Tekrarlanan taşımalarda parça birikir;
  ileride "seçili iki parçayı birleştir" komutu gerekebilir.
- **Maliyet duvar sayısında karesel.** Çizim ölçeğinde sorun değil; büyürse
  rbush ile aday daraltma gerekir (geometry SKILL'i).
