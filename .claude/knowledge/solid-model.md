# Katı model (3B görünüm)

**Tür:** decision · **Tarih:** 2026-08 · **Karar:** docs/kararlar.md K120

Sahne seçicideki dördüncü düğme: **Katı Model** (`ViewId = 'solid'`,
`core/views.ts`). Çizimin 3B türevi — bina kütlesi, döşemeler, borular ve
tesisat elemanları kat kotlarına oturtulmuş hâlde.

İzometrik düğmesi bununla İLGİSİZ ve hâlâ pasif: o gaz hattının tek parça
şematiği, bu binanın kütlesi. İkisini birbirine karıştırma.

## Değişmezler

- **Store'a alan EKLENMEDİ.** Katı model `core/solidModel.ts`te her değişimde
  yeniden kurulur; oda poligonlarıyla aynı kural (geometri kopyalanmaz).
  Kaydedilen JSON'a hiçbir şey girmedi.
- Geometri `core/`de, çizim `scene/solid/`te. Sahne kendi geometri hesabını
  yapmaz, `buildSolidModel`'in çıktısını çizer.
- Koordinat çevrimi yine yalnız `core/coords.ts` → `planToThree`
  (`scene/solid/solidGeometry.ts` onu çağırır, ikinci bir çevrim yazmaz).
- Renkler tek kaynaktan: boru çapından (`PIPE_TYPES`), deşarj türünden
  (`DISCHARGE_STROKE_COLORS`), kol sabitlerinden (`PLUMBING_COLORS`). Katı model
  ikinci bir boru paleti AÇMAZ — plandaki kırmızı boru burada da kırmızı.

## Tuzaklar

**Duvar kutusu iki uçtan yarım kalınlık UZAR** (`core/solidWall.ts`). 2B'de
duvar yuvarlak uçlu kapsül (K23) ve kavşağı o uç dolduruyor; kutu uzatılmasaydı
her köşede duvar kalınlığı kadar boşluk kalırdı. Bunu "fazlalık" sanıp kısaltma.

**Kamera TAKAS edilir, eklenmez** (`scene/SceneRoot.tsx`). Katı modelde
`Cameras` (ortografik) + `ViewportControls` + `Grid` + `ViewportFocus` HİÇ mount
edilmez; yerine `SolidCamera` (perspektif + yörünge) gelir. İkisi birlikte mount
edilirse ikisi de `makeDefault` olduğu için kazanan mount sırasına kalır.

**Kamera konumu PROP değil.** `SolidCamera` position/target'ı yalnız
`pendingSolidCameraReset` isteğinde ELLE yazar. Prop olarak verilseydi her store
yazımında (görünürlük anahtarı, kat değişimi, çizim düzenlemesi) kullanıcının
döndürdüğü açı başa dönerdi. İsteğin bağımlılık listesi yok: drei kontrolleri
varsayılan kamera değişince yeniden kuruyor, istek hazır olana kadar duruyor.

**İstek, varsayılan kamera BİZİMKİ olana kadar bekler.** `makeDefault`
varsayılanı bir layout effect'te değiştiriyor, yani ilk render'da tuvalin
ortografik kamerası hâlâ varsayılan ve `OrbitControls` ona bağlı. Kontrolün
kamerası kontrol edilmeden yazılırsa konum YANLIŞ kameraya gider, istek silinir
ve perspektif kamera başlangıç noktasında kalır: kullanıcı Katı Model'e İLK
bastığında boş ekran görür, ikincisinde doğru görüntüyü. Bu yüzden `SolidCamera`
`useThree((state) => state.camera)`ya abone (takas burada yeni bir render
doğursun diye) ve isteği ancak `defaultCamera === cameraRef.current` iken
uygular.

**Geometri React'in dışında kuruluyor**, ömrünü `SolidSurface` kapatıyor
(`useEffect` cleanup → `dispose()`). Birleştirilmiş tamponu R3F'in imha
edeceğini varsayma: katı model her kapsam değişiminde baştan kuruluyor, sızıntı
birkaç geçişte fark edilir.

**Geometri RENK BAŞINA birleşiyor** (`solidGrouping.ts` → `groupByColorHex`):
malzeme geometriye değil mesh'e ait, iki renk aynı tampona giremiyor.

## Zemin MAHALE göre renkli

Döşemenin rengi `Room.usageType`ten geliyor (`scene/solid/solidTheme.ts` →
`SOLID_ROOM_COLORS`, Record olduğu için yeni tip eklenip rengi unutulursa
derleme kırılır). Katı modelde etiket yok; mahal ancak renginden okunuyor.

Mahal kimliği 2B'dekiyle AYNI yoldan kuruluyor: `getWallSetKey` (duvar KÜMESİ,
sıra değil). İkinci bir eşleştirme kuralı yazma. Tipi verilmemiş mahal nötr
`SOLID_COLORS.slab`ta kalır — varsayılan tip UYDURULMAZ (K117).

Döşemeler bu yüzden tek tampon değil RENK BAŞINA bir tampon
(`core/solidSlab.ts` + `groupByColorHex`).

## Alan nesnesi kutu DEĞİL (`core/solidAreaObject.ts`)

Dördü de kat yüksekliğince yükselir ama biçimleri ayrı — plandaki sembolle aynı
biçim, çünkü kutu olarak çizildiklerinde merdiven boşluğu dolu bir blok, baca
şaftı da kör bir prizma gibi görünüyordu.

| Tip | Katı biçim |
|---|---|
| `stairs` | basamak basamak yükselen kol; rıht sayısı planla AYNI (`getStairTreadCount`), iniş yönü yerel −y |
| `flueShaft` | içi BOŞ boru; dış çap plandaki çemberle aynı (`FLUE_SHAFT_CIRCLE_RATIO`) |
| `columnVentilation` | dolu silindir; çapı plandaki çemberle aynı |
| `structuralColumn` | tek kutu (kolon zaten dolu) |

Yerel eksende **width = x, length = y** (`areaObject.ts`), `SolidBox`ta ise
`lengthCm` three'nin X'i: ikisi arasındaki TAKAS `solidAreaObject.ts`te tek
noktada yapılıyor. Atlanırsa 120×200 bir boşluk 200×120 çizilir — kare
nesnelerde fark edilmez, merdivende hemen görünür.

Dönel biçimler kutu öbekleriyle AYNI tamponda birleşemez: `mergeGeometries`
indeksli ve indekssiz geometriyi bir arada kabul etmiyor. Bu yüzden şaftlar
`createCylindersGeometry` ile ayrı çiziliyor ve dolusu da boşu da aynı yoldan
(çember şeklinin çıkarılması) üretiliyor.

## Modelde olmayan, GÖSTERİM için yazılan ölçüler

Bunlar modele YAZILMAZ, JSON'a girmez. Gerçek alan eklenirse yerlerini alırlar.

| Sabit | Yer | Neden model taşımıyor |
|---|---|---|
| `DOOR_HEIGHT_CM` (210) | `core/solidWall.ts` | `Opening` yükseklik taşımıyor (K9) |
| `WINDOW_SILL_HEIGHT_CM` (90) / `WINDOW_HEIGHT_CM` (140) | `core/solidWall.ts` | aynı |
| `BEAM_DEPTH_CM` (40) | `core/solidModel.ts` | `Beam` yükseklik taşımıyor |
| `ELEMENT_DEPTH_CM` (40) | `core/solidInstallation.ts` | sembol 2B bir damga |
| `FLUE_SHAFT_INNER_RATIO` (0.78) | `core/solidAreaObject.ts` | şaftın et kalınlığı modelde yok |

Eleman AYAK İZİ bu listede değil: uydurulmuyor, sembolün kendi `bounds`undan
geliyor (`getSymbolLocalBounds` × `element.scale`).

## Bilinen sınır

Kotu olmayan hat türleri (`chimney`, `ventilationDuct`, `applianceStub`) kat
tabanında DÜZ çiziliyor — modelde o kot yok ve varsayılmadı, baca düşeyde
yükselmiş görünmez. Kot alanı eklenirse `core/solidInstallation.ts` içindeki
`getLineElevationsCm` tek noktadan düzelir. Bu konuda varsayım kodlama.
