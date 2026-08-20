# İzometrik görünüm

Editörün üçüncü görünümü (`ViewId = 'isometric'`). Çizimden OTOMATİK üretilir,
tüm katları tek parça gösterir. Kod: `src/isometric/` (`plumbing/` deseninin
aynası: `core/` + `scene/` + `store/` + `ui/`).

Adım adım ilerleyiş ve elle kontrol listeleri: repo kökündeki
`izometrik-adimlari.md`. Kararlar: `docs/kararlar.md` K115–K119.

## Kapsam

Yalnız TESİSAT çizilir (boru + elemanlar + etiketler). Mimari HİÇ çizilmez.
Aktif kat kavramı YOKTUR — tüm katlar aynı anda.

## İzdüşüm — işaretleri değiştirmeden önce oku

```
M₃(α, β) = Rx(α) · Ry(β) · Rx(π)        varsayılan α = 40°, β = 60°

right   = −M₃ satır 1
up      = −M₃ satır 2
forward = −M₃ satır 3
```

İlk iki çarpan WebCAD'in `getIsometryTransform3x3`'ü ile birebir aynı
(`izometrik.md`, derlenmiş bundle). `Rx(π)` bizim eksen düzenimize geçiş.

**Üç eksi tesadüf değil.** WebCAD'in tuval çerçevesi SOL ELLİ: x doğuya, y
AŞAĞI (hem kotta hem plan y'sinde, EaselJS düzeni), z güneye. Bizim three
uzayımız sağ elli. Satırlar olduğu gibi alınırsa kamera yerin ALTINDA kalır:
kot ekranda yukarı gider ama derinlik ters döner ve **alt kat üst katı örter**.

⚠️ "Sadeleştirme" niyetiyle eksileri atma. İki aday sayısal olarak
karşılaştırılıp seçildi; testi var (`kamera her zaman YUKARIDA durur`,
`yüksek kot kameraya daha YAKIN olur`).

**Bedava gelen özellik:** `Rx(α)·Ry(β)`'nın 1. satırı yapı gereği
`(cosβ, 0, −sinβ)` — y bileşeni her zaman sıfır. Kot ekseni HER açıda ekranda
tam dikey kalır.

İzdüşüm ayrıca hesaplanmaz, KAMERA o yöne çevrilir: ortografik kamerada ikisi
aynı görüntüyü verir ve kamera yolunda sahne gerçek derinlik testiyle çizilir.

## Kot zinciri

```
mutlakKot = getFloorElevationsCm(floors)[katIndex]      // core/floorElevation.ts
          + getIsometricLineElevationsCm(...)[i]        // isometric/core
          + katIndex · explodedGapCm                    // yalnız görsel
```

`explodedGapCm` (katları aralıklandırma) modele YAZILMAZ, metraja girmez.
Zemin kat referans: aralık açılınca bodrumlar aşağı, üst katlar yukarı gider.

Kot alanı tür başına ayrı yerde duruyor (`pipe`/`chimney` iki uçlu, `branch`
tek değer). `isometricElevation.ts` bu ayrımı TEK yerde topluyor — hem sahne
geometrisi hem etiket boyu oradan okuyor, iki kopya olsaydı çizilen gövde ile
yazan boy ayrışırdı.

## Elle yerleştirmeler (izometriğe özel, plan çizimini BOZMAZ)

| Alan | Nerede | Ne |
|---|---|---|
| `isometricOffsetCm` | `InstallationLinePoint` | sürüklenen noktanın kendi kayması |
| `inheritedIsometricOffsetCm` | `InstallationLinePoint` | önceki noktadan miras — dal bütün kayar |
| `isometricLabelOffsetCm` | `InstallationElement`, `InstallationLine` | etiketin izometrikteki yeri |

Yayılım: sürüklenen nokta kendi kaymasını, ondan SONRAKİLER mirası alır,
öncekiler dokunulmaz. İki alan neden ayrı: dal kaydırıldıktan sonra içindeki
tek bir nokta ayrıca oynatılabilsin.

⚠️ Hepsi OPSİYONEL ve sıfıra dönen alan SİLİNİR — `docs/sample-project.json`
bit-bit round-trip testi "yoktan var edilmiş alan"ı yakalar. zod `.default()`
VERMEZ.

⚠️ Yayılım şimdilik TEK hattın içinde. Bir gövdeye bağlı ayrı
`InstallationLine` dalları henüz birlikte kaymıyor (TODO, `isometricOffset.ts`).

## Kamera ve girdi

- İzometrikte plan kamerası, `ViewportControls` ve `Grid` **hiç mount edilmez**:
  iki kamera da `makeDefault` yazıyor, birlikte olsalar kazanan mount sırasına
  kalırdı.
- `CAMERA_HEIGHT_CM` **kullanılmaz** — o sabit drei `<Line worldUnits>`
  shader'ına bağlı ve yalnız plan kamerasının sözleşmesi (capsule-walls.md).
- `cameraViewport.ts` ve `useViewportControls.ts`'e DOKUNULMAZ.
- `useCameraZoomTracker` HER görünümde mount edilir (SceneRoot'ta dalın
  dışında): ekran-sabit boy `px / zoom` ile hesaplanıyor, izometrik etiketler de
  onu okuyor.
- Kilitli kip = teknik çizim (sabit α/β, sürükleme dal ayırır / etiket taşır).
  Kilit açık = drei `<OrbitControls>` kamerayı DEVRALIR; buradan kameraya hiç
  dokunulmaz, iki taraf aynı kareyi yazsaydı kamera titrerdi. Sürükleyerek
  düzenleme serbest kipte KAPALI — aynı jest kamerayı döndürüyor.

## `layers.ts` bu görünümde GEÇERSİZ

`RENDER_ORDER` + mikro-elevation (`WALL_ELEVATION_CM` 0, `HANDLE_ELEVATION_CM`
0.3) tepeden bakan kameranın z-fighting çözümü. İzometrikte o mikro farklar
GÖRÜNÜR hâle gelir. Derinlik gerçek geometriyle çözülür: segment başına
silindir + dirseklerde küre (`IsometricTube`). drei `<Line>` gövde için
kullanılmaz (aynı `worldUnits` gerekçesi + düz çizgi örtüşme vermez).

## Etiketler

- Metin `core/isometricLabels.ts`'te (testli), yerleşim `scene/`de.
- Varsayılan yer IŞINSAL: çizimin merkezinden dışarı. Sabit bir cm değeri iki
  yönden de yanlıştı — küçük dairede yazı borunun üstüne biniyor, büyük binada
  fark edilmiyordu; üstelik tüm etiketler aynı yöne kaçıp birbirini örtüyordu.
- drei `<Text>` troika'nın font indirmesiyle ASKIYA ALINIR → etiketler KENDİ
  `<Suspense>`'inde. Sarılmasaydı askıya alma izometrik kamerayı da söker,
  `makeDefault` geri alınır ve çerçeveleme sıfırlanırdı.
- Font repodan (`/fonts/roboto-regular.woff`): verilmezse troika Google Fonts'a
  gider ve istek düşünce hata vermeden 0 piksel çizer.
- Sürükleme hedefi yazının arkasında GÖRÜNMEZ bir dikdörtgen — troika'nın kendi
  ışın testi yalnız glyph'lere değiyor, harf aralarında sürükleme kopuyordu.
- Sürükleme PENCEREYİ dinler, mesh'i değil: imleç dışarı çıkınca R3F olayları
  kesilir ve etiket parmağın altında kalırdı. Ekran pikseli → cm doğrudan
  zoom'la (zoom = piksel/cm); ekranın y'si aşağı büyüdüğü için işaret ters.

## Semboller

Mevcut SVG sembolleri BILLBOARD olarak çizilir (kameraya dönük), izdüşüme
girmez — referans çıktıda da semboller dik ve okunur. Plandaki `angleDeg`
dönüşü BİLEREK uygulanmaz: billboard zaten kameraya çeviriyor, üstüne plan
açısı eklenirse sembol ekranda eğilip okunmaz olur.

## Geri al/yinele

İzometrik TESİSAT aynasına yazar (`plumbingHistory`), tesisat görünümüyle aynı
dalda — `activeViewHistory.ts`. Her izometrik düzenleme `installationLines`/
`Elements` üstünde çalışıyor; proje geçmişine bağlansaydı Ctrl+Z en son çizilen
DUVARI geri alırdı.

## Cam paneller (HUD)

`--color-glass*` token'ları `.dark`'ta EZİLMEZ — `canvas-overlay` ile aynı
gerekçe: izometrik tuval iki temada da açık nötr gri. Saydamlık token
DEĞERİNİN içinde; `bg-glass/70` gibi bir değiştirici saydamlığı ikinci kez
çarpar ve paneli yok eder. `backdrop-blur` şart: yarı saydamlık tek başına,
arkasından boru geçince yazıyı okunmaz yapıyor.

Çap renk örneği SVG `fill` ÖZNİTELİĞİ ile veriliyor: renkler çalışma zamanında
geliyor, Tailwind sınıfı üretilemez ve `style={{...}}` yasak. `fill` bir sunum
özniteliği, satır içi CSS değil.

## Bilinen boşluklar

- **DN çap tablosu uyuşmazlığı**: WebCAD `DN25.radius = 2.69`, bizde
  `DN25.outerDiameterCm = 3.37` (2.69 bizde DN20). BİZİM tablomuz kullanılıyor.
- **`efficiency` (verim) alanı yok** — referans çıktıdaki "Verim: %90" satırı
  yazılamıyor, etiket o satırı atlıyor.
- **Hidrolik yok**: m³/h kapasite, basınç kaybı, kritik hat modelde hiç yok;
  hat etiketi kapasitesiz.
- **Elemanın kendi izo kaydırması** (`isometricPosition`) modele girmedi.
- **`hiddenInIsometry`** (izometride gizleme) modele girmedi.
- **PDF/izometrik çıktı** hiç açılmadı.
- 3B (katı) görünüm KAPSAM DIŞI; `src/threeD/` açılmadı.
