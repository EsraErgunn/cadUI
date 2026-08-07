# decision + gotcha: Port bağlantısı (hat ucu ↔ eleman)

## Doluluk TÜRETİLİR, saklanmaz

Bir portun dolu olup olmadığı yalnız `installationConnections`'tan okunur
(`core/portSnap.ts` → `isPortOccupied`). Eleman üzerinde "bu port dolu" diye ikinci
bir alan **yoktur** (Risk R10): iki kaynak undo, yükleme ve kat silme sonrası
kaçınılmaz olarak ayrışırdı. Aynı şekilde bir hat ucunun bağlı olup olmadığı da
kaydın **varlığından** okunur — serbest uçta kayıt yoktur, `null` bir alan değil.

Bir port en çok BİR bağlantı taşır. Kural iki yerde korunur: araç dolu portu aday
göstermez (`findNearestFreePort` atlar) ve `addLine` yazmadan önce tekrar bakar
(iki ucu aynı porta düşen hat için son savunma).

## Snap yarıçapı piksel tabanlı

`SNAP_RADIUS_PX / zoom` → yakalama uzaklığı ekranda her ölçekte aynı hissedilir.
**Öncelik: port > mevcut boru > ızgara.** Ctrl ızgarayı kapatır ama port/boru
yakalamasını kapatmaz: bağlantı kurmak serbest konumlandırmadan daha güçlü bir
niyettir.

## Mevcut borunun üstüne bağlanmak onu AYIRIR

Hat aracıyla bir borunun üstünde gezerken o boruda dolu bir nokta görünür; oraya
tıklamak yeni hattı orada sonlandırır (ya da başlatır) ve **hedef boruyu o
noktada ikiye ayırır**. Ayırma `core/lineSplit.ts` → `splitLineAtSegment`:

- Yeni hat ÜRETİLMEZ, mevcut hatta bir köşe eklenir ve o parça ikiye bölünür.
- **Mevcut nokta/parça id'lerine dokunulmaz**; bölünen parça kendi id'siyle kısalır,
  yalnız ikinci yarısı yeni id alır. Hepsi yeniden numaralansaydı o boruya bağlı
  kayıtlar sahipsiz kalırdı (kural 6).
- İzdüşüm köşeye `CORNER_SNAP_RATIO` kadar yakınsa **bölme yapılmaz**, var olan
  köşeye bağlanılır — yoksa köşenin dibinde sıfıra yakın bir parça doğardı.

Bölme ile hat yazımı **tek `set()`** içinde: tek Ctrl+Z ikisini birden geri alır.
Bu yüzden araç "şu parçayı şurada ayır" isteğini `LineEndAttachment.lineSplit`
olarak taşır ve çözüm store'da yapılır — araç doğacak nokta id'sini bilemez.

**Bilinen sınır:** bir hattın iki ucu da aynı borunun aynı parçasına düşerse
ikinci bölme, birincinin kaydırdığı parça indeksine bakar; geçersiz bulunup
atlanır. Kayıt bozulmaz, yalnız o uç serbest kalır.

Arama önce elemanın dönmüş kutusuyla kaba eler, sonra port mesafesine bakar;
karşılaştırma mesafe **kareleri** üzerinden yapılır (kare kök yok, Bölüm 15).

## Bağlı eleman taşınınca hat ucu birlikte gelir

`moveElements` aynı `set()` içinde bağlı hat ucunu da kaydırır. Port dünya konumu
yeniden hesaplanmaz, **aynı kayma** uygulanır — taşımada açı ve ölçek değişmediği
için sonuç birebir aynıdır ve store'un sembol metadata'sına (scene katmanı)
ihtiyacı olmaz. **Döndürme/ölçekleme eklenirse burası `getPortWorldPosition` ile
yeniden türetmeye çevrilmelidir**, yoksa uç portun eski yerinde kalır.

Eleman silinince bağlantı düşer, **hat kalır** ve ucu serbestleşir. Kayıt kalsaydı
port sonsuza dek dolu görünür, uç da hayalet bir elemana bağlı sayılırdı.
Kat silmede aynı temizlik `store/floorOps.ts`'te ve silinenlerden **önce** toplanır.

## Görsel ayrım biçimden gelir, yalnız renkten değil

- Boş port: içi boş halka (mavi) · Dolu port: **içi dolu daire** (nötr gri)
- Yakalanan port: dışına yeşil vurgu **halkası** — "buraya bağlan"
- Yakalanan boru noktası: yeşil dolu **nokta** — "boruyu burada ayır"
- Bağlı hat ucu: dolu daire · Serbest uç: içi boş halka

Vurgu halkasının konumu **React durumu değil**: imleç her kıpırdadığında ağaç
yeniden kurulmasın diye `useFrame` içinde doğrudan mesh'e yazılır.

## Bilinen sapma: tüm portlar mount ediliyor

Plan "yalnız imlece yakın elemanların portları mount edilir" diyordu. Uygulamada
hat aracı etkinken aktif kattaki **tüm** elemanların portları çiziliyor: eleman
sayısı onlarla ölçülüyor, geometri/material paylaşılıyor ve yakınlık her karede
hesaplansaydı mount/unmount dalgalanırdı. Eleman sayısı yüzleri geçerse önce
burası daraltılır (Bölüm 15, spatial index).

## Henüz yok

`InstallationEndpointTarget`'ın `line` çeşidi (hattın başka bir hatta bağlanması)
tipte tanımlı ama **kullanılmıyor** — branşmanın ana hatta bağlanması sonraki bir
işin konusu. Kod bu yüzden `target.kind !== 'port'` durumunu sessizce atlar.
