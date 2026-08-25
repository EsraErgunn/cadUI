# Mimari ve ürün kararları

Her karar: ne, neden, nerede. Yeni karar alınınca buraya satır ekle ve gerekiyorsa
`.claude/CLAUDE.md` ile ilgili SKILL'i güncelle.

---

## 2026-07 · Ekran kabuğu ve canvas altyapısı (issue 1)

### K1 — "%100" = 1 cm başına 1 piksel

R3F'in `<Canvas orthographic>`'i ortografik frustum'u **piksel** cinsinden kurar
(`left = -genişlik/2 … right = genişlik/2`). Böylece `camera.zoom = 1` doğrudan
"1 cm = 1 px" demek olur; %10 → `0.1`, %1000 → `10`. Araya ikinci bir ölçek katmanı
girmiyor.

İkinci ve daha önemli faydası: frustum kameranın konumu etrafında simetrik olduğu
için **viewport merkezi her zaman kameranın baktığı dünya noktasıdır**. Pencere
yeniden boyutlandığında merkezdeki nokta kendiliğinden sabit kalır (KK-6) — telafi
kodu yazmaya gerek yok.

Nerede: `core/viewport.ts`, `scene/Cameras.tsx`.

### K2 — Kameranın döndürmesi ve ekranda "yukarı"

Kamera `rotation = [-π/2, 0, 0]` ile tepeden bakar. Bu döndürme kameranın baktığı
yönü −Y yapar ve ekranda yukarıyı three −Z'ye, yani **plan +Y**'ye denk getirir.
Yazılmazsa kamera −Z'ye bakar ve plan düzlemini kenardan görür — ekran boş görünür.

Nerede: `scene/Cameras.tsx`.

### K3 — Zoom/pan store'da değil, kamerada

Tekerlek ve sürükleme her karede store'a yazsaydı tüm React ağacı 60 fps yeniden
render olurdu. Ayrıca store kuralı "store = kaydedilecek saf veri" — zoom/pan
kaydedilmiyor.

Yan faydası: issue 2.9'un "zoom/pan/araç/görünüm projeyi kirletmez" kuralı bir
kontrol listesi değil, **yapısal garanti** olur — o veri `cadStore`'da olmadığı için
kirletemez.

Nerede: `scene/useViewportControls.ts`, `scene/cameraViewport.ts`.

### K4 — `core/viewport.ts`, `core/coords.ts`'ten ayrı

`coords.ts` durumsuz eksen eşlemesidir (plan ↔ three). Ekran ↔ dünya dönüşümü ise
zoom/pan/viewport boyutunun fonksiyonudur — farklı bir şey. Aynı dosyaya koymak
CLAUDE.md kural 3'ün koruduğu dosyayı şişirir ve "hangi dönüşüm nerede" sorusunu
bulanıklaştırır. `viewport.ts` three import etmez, tamamen saftır.

### K5 — Izgara kademesi tablo ile

```ts
GRID_LEVELS = [
  { minorCm: 50,  majorCm: 100 },   // varsayılan: 50 cm ince, 1 m kalın
  { minorCm: 100, majorCm: 500 },
  { minorCm: 500, majorCm: 2500 },
]
```

Seçim: `minorCm * zoom >= 12 px` sağlayan ilk kademe. Dokümandaki 50 cm → 1 m → 5 m
merdivenini birebir karşılar, magic number bırakmaz.

Kalın çizgi drei `<Line>` ile çiziliyor: three'nin düz `Line`'ında `linewidth` çoğu
platformda çalışmaz, hep 1 px kalır.

Nerede: `core/grid.ts`, `scene/Grid.tsx`, `scene/gridGeometry.ts`.

### K6 — Kirli işaret: revizyon sayacı

`cadStore`'da `revision` + `savedRevision`. Çizim verisini değiştiren her action
`markDirty(draft)` çağırır; başarılı kayıt `markSaved()` ile ikisini eşitler.
`selectIsProjectDirty` farkı okur.

Bu issue'da çizim verisini değiştiren action olmadığı için her zaman `false` döner
(KK-10.5). Sonraki issue'lar yalnız kendi action'larında sayacı artıracak, merkezi
fonksiyona dokunmayacak.

### K7 — Araç/görünüm kimlikleri `core/`'da

`ToolId` ve `ViewId`'yi hem `ui/` (palet) hem ileride `scene/` (araç hook'ları)
okuyacak. ESLint `ui/` ↔ `scene/` importunu karşılıklı engelliyor, ortak nokta `core/`.
İkonlar `ui/tools/toolIcons.ts`'te `Record<ToolId, LucideIcon>` olarak duruyor —
Record olduğu için yeni araç eklenip ikonu unutulursa **derleme kırılır**.

Nerede: `core/tools.ts`, `core/views.ts`.

### K8 — `core/model.ts` şimdilik minimal

domain-model SKILL: "model.ts'e alan eklemek = sözleşmeyi değiştirmek, dört kişiyi
etkiler". Kabuk issue'sunda tüm modeli (Point/Wall/Opening/Room/Node/Pipe/Fitting/
Equipment/Riser/ServiceBox) tek başına tanımlamak bu uyarının tam hedefi. Yalnız
`Id`, `Floor` ve varsayılan kat sabitleri girdi; gerisi kendi issue'sunda ekip
onayıyla eklenecek.

---


## 2026-07 · Yönetici paneli — Gaz Dağıtım Firmaları listesi

### K9 — Liste durumunun tek sahibi URL

Arama/filtre/sıralama/sayfa `useSearchParams` ile URL query param'da tutulur;
bileşende kopya state yok. Bağlantı paylaşılabilir olur, geri tuşu bedavaya
doğru çalışır, iki bileşen aynı filtre için farklı değer gösteremez. Varsayılan
değerler URL'e yazılmaz.

Bunun bir sonucu: üst bardaki "Bölge" ile sayfa içindeki filtre panelindeki
bölge **aynı `region` anahtarını** yazar/okur. İki ayrı parametre olsaydı
kullanıcıya iki bölge alanı görünür ve çelişebilirlerdi.

Nerede: `ui/admin/adminUrlParams.ts`, `ui/admin/useFirmListParams.ts`.

### K10 — Sayfalama sunucu taraflı, istemci dilim yapmaz

Arama, filtre, sıralama ve sayfa hepsi API parametresi olarak gider; 30'luk
sayfa sunucudan gelir. 114 kaydı çekip `slice` etmek bugün çalışır ama kayıt
sayısı büyüdüğünde sessizce yavaşlar — sözleşme baştan doğru kuruldu.
`totalCount` filtre uygulandıktan SONRAKİ toplamdır: başlıktaki "(114)" ve
sayfa sayısı ondan hesaplanır. Filtre/sıra değişince `page` sıfırlanır.

### K11 — Yetki: düz izin listesi, rol modeli yok

`usePermission('firm.create')` → `GET /api/me/permissions` (düz `string[]`).
knowledge/access-control.md hâlâ açık soru olduğu için rol/sahiplik yapısı
BİLEREK modellenmedi; arayüz yalnız "şu izin var mı" diye sorar. Sabit `true`
da yazılmadı — gerçek bir arama, endpoint gelince tek dosya değişir. Liste
gelmeden `false` döner: butonun bir an görünüp kaybolması yanlış beklenti yaratır.

### K12 — Admin kabuğu route ebeveyni

`ui/admin/AdminLayout.tsx` (sol menü + üst bar) `<Outlet/>` ile sayfayı sarar,
sayfanın içine gömülmez — böylece sayfa değişince kabuk yeniden kurulmaz ve
sonraki yönetici ekranları onu kopyalamak zorunda kalmaz. Sol menünün tek
kaynağı `ui/admin/adminNavItems.ts`.

### K13 — Marka sarısı admin arayüzünde serbest

#FFC107 kısıtı **çizim alanına** özgüdür (tuvalde sarı = gaz hattı). Admin
panelinde birincil buton ve aktif sayfa numarası marka sarısıdır; üzerindeki
metin `brand-navy`, okunurluk için. Aktif menü maddesi ve bağlantılar seçim
mavisidir. Yeni token tanımlanmadı, `styles/index.css`'teki mevcut token'lar
kullanıldı.

## 2026-07 · Duvar modeli ve açıklık (kapı/pencere) sözleşmesi

### K9 — Duvar bölünmez; açıklık duvarın üzerinde bir "delik"tir

Görev tanımındaki "kapı duvarı böler, silinince duvar birleşir" ifadesi
uygulanmadı. Bölme yaklaşımında 10 m'lik bir duvar + tek kapı = iki ayrı Wall
kaydı olur; kapı her taşındığında ikisinin de uzunluğu, silindiğinde birleştirme
ve sahipsiz kalan Point'in temizliği gerekir. Referans sayısı artar, kat
kopyalamadaki remap listesi büyür.

Seçilen yol: duvar tek parça kalır, açıklık `wallId + offsetCm` ile onun üstünde
durur. Taşıma = tek alan güncellemesi, silme = hiçbir şey. domain-model
SKILL'indeki "Opening mutlak koordinat tutmaz" kuralıyla da birebir aynı.

Nerede: `core/model.ts`, `core/opening.ts`.

### K10 — `offsetCm` açıklığın ORTASINI ölçer

Sol kenar da ölçülebilirdi; orta seçildi çünkü "duvarın tam ortasına yerleştir"
gibi hizalamalar genişlikten bağımsız olur (`offset = uzunluk / 2`), ve sürükleme
sırasında imleç zaten açıklığın ortasındadır.

Sığma koşulu: `offset - width/2 >= minOffsetCm` ve `offset + width/2 <= maxOffsetCm`.

İki taraf farklı varsayarsa açıklık yarım genişlik kayar ve hata sessizdir —
bu yüzden knowledge/opening-placement.md'ye de gotcha olarak yazıldı.

### K11 — Köşe payı = o uçta birleşen dik duvarın kalınlığı

Önce "kenar boşluğu yok, serbest" denmişti; duvara kalınlık alanı eklenince bu
karar değişti. Duvarlar orta çizgilerine göre çizildiği için köşedeki fiziksel
çakışma kalınlığın yarısı kadardır (20 cm duvar → 10 cm). Tam kalınlık seçildi:
10 cm gerçek çakışma + 10 cm güvenlik payı.

Uç boştaysa pay yok. Birden çok duvar birleşiyorsa en kalını esas alınır.
Sınırları `getPlacementRange(wallId)` döndürür.

### K12 — Snap noktaları sabit aralıklı değil

"Her 2 metrede bir bölüm noktası" fikri elendi: 11.65 m'lik duvarda son parça
artık kalır. `getSnapPoints` yalnız uçları, orta noktayı ve kesişimleri döndürür;
kalan her yer serbesttir. Hesap tek yerde yaşar — duvar çizimi ve açıklık
yerleştirme aynı fonksiyonu tüketir, iki ayrı kopya tutulmaz.

Karşılıklı fonksiyon sözleşmesi knowledge/snap-contract.md'de. Mimari (B) iki
alt-faya bölündüğü için (duvar altyapısı · açıklık ve nesne etkileşimi) bu
fonksiyonlar B'nin kendi içindeki sınırdır.

---

## 2026-07 · Açıklık yerleştirme uygulaması (issue: kapı/pencere aracı)

### K13 — Geçersiz yerleştirme reddedilir, kaydırılmaz

Çakışan ya da sığmayan bir yerleştirmede "en yakın geçerli yere kaydır"
seçeneği elendi: kullanıcının bıraktığı yer ile açıklığın durduğu yer farklı
olurdu ve bu sessiz bir kaymadır — "kapı 2.50 m'de" bilgisi yanlışlanır.
Yerine: hayalet uyarı renginde çizilir, bırakma hiçbir şey yapmaz.

Uç uca **değen** açıklıklar çakışma sayılmaz (`a.end <= b.start`); iki kapının
yan yana durması meşru bir tasarım.

Yazma anı da buna bağlı: sürükleme boyunca store'a hiç yazılmaz, yalnız
pointer-up'ta tek `moveOpening` çağrılır → tek `markDirty`, tek Ctrl+Z.
Reddedilen ekleme `nextUniqueId`'yi de harcamaz; harcasa kaydedilecek JSON
değişir ve proje boşuna kirlenirdi.

Not: `addOpening` bu depoda `takeNextId`/`markDirty`'nin İLK çağıranı, yani
K6'daki "her zaman false döner" kaydı artık geçerli değil.

Nerede: `core/opening.ts`, `store/architectureSlice.ts`, `scene/useOpeningTool.ts`.

### K14 — Yay (arc) duvarlar ertelendi, tek dikişle

Görev tanımı yay duvar istiyordu; `Wall`'a `isArc`/`arcControlPoint` eklenmedi.
Gerekçe: `model.ts` dört kişilik sözleşme ve alan eklemek serialize + roundtrip +
floorClone remap listesini de bağlar. Ayrıca önerilen `arcControlPoint?: Point`
duvarın içine koordinat gömüyordu — "duvar kendi koordinatını taşımaz, Point
havuzuna referans verir" kuralının ihlali.

Yerine tek bir dikiş bırakıldı: offset ↔ konum dönüşümünün tamamı
`core/wallPath.ts`'ten geçer (`getWallPathLengthCm`, `getWallFrameAtOffsetCm`).
Yay kararı verilirse bu dosya değişir, açıklık kodu değişmez.

Açık iş: aynı anda `getPlacementRange`'in uzunluk çağrısı da
`getWallPathLengthCm`'e çevrilmeli — bugün düz duvarda kiriş = yol uzunluğu
olduğu için fark görünmüyor. Bkz. knowledge/arc-walls.md.

### K15 — Genişlik düzenlemesi araç seçenekleri şeridinde

`PropertyPanel.tsx` başka bir issue'nun kapsamında ve boş; genişliğin
düzenlenebilir olması ise bu issue'nun gereği. Şerit (`ui/OpeningToolOptions.tsx`)
kapı/pencere aracı aktifken görünür, seçili açıklık varsa onu, yoksa sıradaki
yerleştirmenin varsayılanını düzenler. Varsayılanlar tip başına ayrı tutulur.

Girdi store'dan doğrudan beslenmiyor, yerel bir metin taslağı tutup blur/Enter'da
işliyor: doğrudan beslenirse her tuş yeniden render edip rakamları eski değerin
üstüne ekliyor (90 + "100" → 90100). Reddedilen genişlikte girdi store'daki
değere geri döner — ekranda yalan bir sayı bırakmamak için.

Seçim `store/architectureUiStore.ts`'te (yeni, ayrı store): kaydedilmez,
geçmişe girmez. `uiStore.ts` D'nin araç/görünüm dosyası, `cadStore` ise seçimi
kaydedip Ctrl+Z ile geri alırdı. Bu store aynı zamanda `scene/` ile `ui/`
arasındaki köprü — eslint ikisinin birbirini import etmesini yasaklıyor.

### K16 — Sığmayan açıklık otomatik silinir

Duvar silinince ya da açıklık sığmayacak kadar kısalınca o açıklık kaldırılır
(`pruneUnfittableOpenings` + `pruneOpeningsOnWalls`). Duvarsız açıklık modelde
temsil edilemez; bırakılsa sahipsiz bir `wallId` referansı kalır ve kat
kopyalamadaki remap assertion'ı sonradan patlar.

Duvar silme/kısaltma fay A'nın action'ı. Gerçek duvar altyapısı geldiğinde
bağlandı: `deleteWall` ve `movePoint` temizliği KENDİ `set()`'leri içinde
çağırıyor, böylece silme/kısaltma + temizlik tek geri alma adımı oluyor.
`pruneOpeningsOnWalls()` dışarıdan çağrılabilir bir action olarak duruyor.
Silinecek bir şey yoksa `markDirty` çağrılmaz — yoksa duvar sürüklemesi her
karede projeyi kirletirdi.

### K17 — `takeNextId`/`markDirty` `store/projectMeta.ts`'e taşındı

Veri slice'ları bu iki yardımcıyı **çalışma zamanında** çağırmak zorunda.
`cadStore.ts`'ten alınca `cadStore → architectureSlice → cadStore` döngüsü
oluştu ve `create()` slice'ı henüz tanımlanmamış buldu
("createArchitectureSlice is not a function"). `floorSlice` bunu hiç yaşamadı
çünkü `cadStore`'dan yalnız **tip** import ediyor (derlemede silinir).

Kural: bir slice `cadStore`'dan yalnız `import type` yapar; paylaşılan çalışma
zamanı yardımcıları `projectMeta.ts`'te durur. `cadStore` geriye dönük uyum için
ikisini yeniden dışa aktarıyor.

### K18 — Başlangıç verisi boş, `nextUniqueId` yine de türetilir

Gerçek duvar çizimi gelince mock sahne seed'i kalktı; store `points/walls/openings`
boş başlıyor ve hazır sahne yalnız TEST verisi
(`store/__tests__/architectureFixture.ts`).

Sayaç buna rağmen `deriveNextUniqueId(INITIAL_ARCHITECTURE_DATA)` ile hesaplanıyor,
`FIRST_FREE_ID` yazılmıyor. Bugün ikisi aynı sonucu veriyor; fark, başlangıç
verisi bir gün boş olmadığında (örnek proje, şablon, açılan dosya) ortaya çıkar:
sabit sayaç var olan bir id'yi ikinci kez üretir ve HATA VERMEZ. Bu daha önce
mock sahnede yaşanmış bir hataydı, türetme onun kalıcı çözümü.


---

## Terminoloji uyarısı: "Kolon" iki farklı şey

- Mimari paletteki **"Kolon Ekle"** = yapısal kolon (kirişle birlikte taşıyıcı).
  Kod adı: `structuralColumn`.
- Araçlar menüsündeki **"Kolon Hattını Sil"** ve CLAUDE.md'deki `Riser` = düşey
  **gaz kolonu**.

İkisi karışırsa yanlış nesne silinir. Kod adları bilerek ayrıldı.

---

## Altyapıda kapatılan boşluklar (issue 1 sırasında)

Bunlar CLAUDE.md'nin varsaydığı ama kurulu olmayan şeylerdi:

| Ne | Durum | Neden önemli |
|----|-------|--------------|
| `strict: true` | tsconfig'lerde **yoktu**, açıldı | Olmadan implicit `any` serbest kalıyordu; CLAUDE.md'nin "`any` kullanılmaz" kuralı fiilen etkisizdi. `src/` boşken açmak bedavaydı. |
| Tailwind | `vite.config.ts`'e ve CSS'e **bağlı değildi**, bağlandı | CLAUDE.md inline `style={{}}` yasaklayıp Tailwind'i zorunlu tutuyor. |
| Vitest | `vitest.config.ts` boştu, `test` script'i yoktu | CLAUDE.md `core/` testlerini zorunlu tutuyor. Yapılandırma `vite.config.ts`'e taşındı — ayrı dosya olsaydı react/tailwind eklentileri testlere uygulanmazdı. |
| `src/core/_tests_/` | Tek alt çizgiydi, `__tests__` yapıldı | geometry SKILL bu adı kullanıyor. |
| ESLint `naming-convention` | Yerel değişkende PascalCase'i yasaklıyordu | `const Icon = TOOL_ICONS[id]` gibi **bileşen** tutan değişken JSX'te büyük harfle başlamak zorunda. CLAUDE.md zaten "bileşen PascalCase" diyor; kural ona hizalandı. |
| `@testing-library/user-event` | Kurulu değildi, eklendi | Menünün `pointerdown` tabanlı dışarı-tıklama davranışını gerçek kullanıcı gibi test etmenin yolu. |

---

## 2026-07 · Tesisat sembol seti: doküman düzeltmeleri ve eksik yakıcı cihazlar

### K13 — Manometre akış-geçişli değil, tek bağlantılı (musluk)

`tesisat_tasarimi_elemanlari_ve_cizim_kurallari.md` § 6 ve § 17 manometreyi "1 bağlantı"
olarak tanımlıyor; eski `SYMBOL_PORT_COUNTS.manometer` ise vana/regülatör gibi
`{input:1, output:1}` akış-geçişli bir eleman varsayıyordu. `{input:1, output:0}` yapıldı —
`stove`'un zaten kullandığı desenin aynısı (tek giriş, çıkış yok). `flowDirection` alanı da
kaldırıldı (akış yönü kavramı yok). Nerede: `src/plumbing/core/symbolMetadata.ts`.

### K14 — 7 sembolün SVG/metadata'sı dokümana göre yeniden çizildi

Regülatör (2 manometre + giriş/çıkış/manometre vanaları), Sayaç (bağlantılar üst bölüme
taşındı + gövde dolu), Süzme Sayaç (sayaçla aynı geometri, dolgusuz), Manometre (ibre/sayı
kaldırıldı, tek musluk + vana), Filtre Kiti (merkeze vana-benzeri bağlantı işareti),
İzolasyon (büyük tek parça yerine topraklama benzeri küçük kelepçe ikonu), Ölçüm Aracı
(yan çubuklar kaldırıldı). Nerede: `src/plumbing/assets/symbols/*`.

### K15 — Yakıcı cihazlar: `stove` tek başına yetmiyordu, 5 tür eklendi

Doküman § 15, altısı da aynı "Ortak Davranış"a (tek gaz girişi, vana cihazda değil boruda)
sahip 6 ayrı yakıcı cihaz tanımlıyor (Ocak, Soba, Şofben, Kombi, Kazan, Diğer), ama kod
yalnızca `stove` (Ocak) içeriyordu — CLAUDE_INSTALLATION_PLAN.md'nin Bölüm 10 kayıt listesi
tek bir jenerik cihaz varsayımıyla yazılmıştı. `spaceHeater` (Soba), `waterHeater` (Şofben),
`combiBoiler` (Kombi), `boiler` (Kazan), `otherAppliance` (Diğer) eklendi — hepsi
`{input:1, output:0}`, `stove` ile birebir aynı port deseni. Palet ikonları için önce kurulu
`lucide-react`'te doğrudan karşılığı olanlar kullanıldı (`Heater`, `Droplets`, `Thermometer`,
`Flame`, `FlameKindling`) — `StoveIcon.tsx` gibi özel bileşen gerekmedi. Nerede:
`src/plumbing/core/symbolMetadata.ts`, `installationTools.ts`, `ui/plumbingToolIcons.ts`,
`assets/symbols/{space-heater,water-heater,combi-boiler,boiler,other-appliance}.*`.

Not: plnr.webcad.com.tr referans istendi ama sayfa girişli bir SPA — herkese açık HTML/JS
çıktısında sembol SVG'si veya component listesi yok, yalnızca menü metinleri görülebildi.
Semboller bu yüzden mevcut ailenin çizgi-sanatı kuralına (`fill:none`, `stroke:#1e293b`,
`stroke-width:2`) sadık, yaygın doğalgaz tesisatı şematik gösterimiyle çizildi — piksel
birebir eşleşme iddiası yok.

### K16 — Sembol test kapsamı: `import.meta.glob`, `node:fs` değil

`src/plumbing/core/__tests__/symbolMetadata.test.ts` ilk yazıldığında `node:fs` ile
`assets/symbols/` taranmıştı; `tsc -b` bunu reddetti çünkü `tsconfig.app.json` (src/'i
kapsayan proje) `types: ["node"]` içermiyor — o yalnızca `tsconfig.node.json`'da var ve o
proje sadece `vite.config.ts`'i kapsıyor. `tsconfig*.json` CLAUDE_INSTALLATION_PLAN.md § 4.3
"kesinlikle dokunulmayacak" listesinde olduğu için tsconfig genişletilmedi; test
`import.meta.glob('*.meta.json', {eager:true})` ile Vite'ın kendi (zaten `vite/client`
tipleriyle kapsanan) mekanizmasına çevrildi. Aynı gerekçeyle statik `import x from
'*.meta.json'` da kullanılmaz (resolveJsonModule yok) — her yerde `import.meta.glob`.

---

## 2026-07 · Aşama 2: Sembol registry ve loader

### K17 — Yükleme senkron: Promise/Suspense yok

Plan Bölüm 9 "yükleme Promise'i cache'lenir, React tarafında use()/Suspense" öneriyordu —
bu, `SVGLoader.load(url, ...)` ile ağ üzerinden (fetch) asenkron yükleme varsayıyordu.
Ama semboller zaten derleme zamanında repoya gömülü (Vite `?raw` import, bkz. Bölüm 9
"Vite ile bundle edilir"); `?raw` + `SVGLoader.parse()` (senkron) ile ağ isteği tamamen
ortadan kalkıyor. `symbolLoader.ts` bu yüzden düz bir `Map` önbelleği kullanır, Promise
yok — daha basit, fetch başarısızlığı/yarış durumu riski yok. `getLoadedSymbol()` senkron
döner. Nerede: `src/plumbing/scene/symbolLoader.ts`.

### K18 — Geometri "bake" dönüşümü: translate + rotateX, tek işlem

SVG'de +Y aşağı / planda +Y yukarı çevrimi VE "çizim düzlemi (XY) → zemin düzlemi (XZ)"
eşlemesi ayrı ayrı değil, TEK `geometry.translate(-originX,-originY,0)` +
`geometry.rotateX(+Math.PI/2)` çifti ile yapılır — cebirsel olarak ikisi denk düşüyor
(ispat: `src/plumbing/scene/__tests__/symbolLoader.test.ts`). Element ölçeği (`scale`)
geometriye GÖMÜLMEZ, SymbolInstance'ın group'unda uygulanır (paylaşılan geometri
instance'lar arası ölçekten bağımsız kalır). `SymbolInstance`'ın `rotation.y = angleDeg *
DEG_TO_RAD` (işaret DEĞİŞTİRİLMEDEN) `ports.ts → getPortWorldPosition`'ın CCW döndürme
matrisiyle birebir aynı yönde döner — türetme ve 90°'lik regresyon testi yukarıdaki test
dosyasında. Bu ikisi ayrışırsa (Risk R1/R2) semboller doğru, portlar aynalanmış görünür.

### K19 — Stroke geometri: `pointsToStroke`, `createShapes`/`toShapes` değil

Sembollerin tamamı `fill="none" stroke="#1e293b"` (çizgi-sanatı) — `SVGLoader.createShapes`/
`ShapePath.toShapes()` yalnız DOLU (fill) şekiller üretir, `fill:none` path'lerde boş dizi
döner. Çizgiler bu yüzden `SVGLoader.pointsToStroke(subPath.getPoints(), strokeStyle)` ile
üretilir (three'nin resmi `webgl_loader_svg` örneğindeki desen). `gas-meter.svg`'nin dolu
gövdesi gibi istisnalar `toShapes()` + `ShapeGeometry` yolundan geçer — path.userData.style
hem `fill` hem `stroke` taşıyabildiği için ikisi BİRLİKTE (ayrık if'lerle) uygulanır.

### K20 — Material paylaşımı: renk başına önbellek, `createFillMaterial`'a değil

`SVGLoader.createFillMaterial`/`createStrokeMaterial` her çağrıda YENİ bir `MeshBasicMaterial`
döner (paylaşmaz). Semboller tek renk kullandığı için (`#1e293b`) `getSharedMaterial(colorHex)`
kendi `Map<string, Material>` önbelleğini tutar — aynı renk her seferinde AYNI material
nesnesini döner. Highlight (Aşama 4) bu paylaşılan material'e YAZMAYACAK, klonlayacak.

### K21 — `pipe.svg` (toolbar-only katalog ikonu): düz kırmızı çizgi, DN25

Diğer semboller çizgi-sanatı ailesindeki `#1e293b` gövde çizimi yerine `pipe.svg` artık
tek bir düz çizgi (`#dc2626`, DN25 için sabit). Boru çeşitleri (çap/renk ayrımı) ileride
eklenecek — şimdilik tek tip. Bu, `PLUMBING_COLORS.gasLine` (`#FFC107`, sahnede gerçek
çizilecek boru rengi, CLAUDE.md "tuvalde sarı = gaz hattı" kuralı) ile KARIŞTIRILMAZ:
`pipe.svg` sahneye hiç yüklenmiyor (yalnız `TOOLBAR_ONLY_SYMBOL_IDS`, `getLoadedSymbol`
sadece `InstallationElementType` yükler) — bu yalnız toolbar/katalog önizleme ikonu,
gerçek boru render rengi kararını değiştirmez. Nerede: `src/plumbing/assets/symbols/pipe.svg`.

---

## 2026-08 · Duvar konturu: poligon kütüphanesi değişimi

### K22 — `martinez-polygon-clipping` yerine `polygon-clipping`

Duvar konturu, duvar dörtgenlerinin birleşiminden (union) çıkıyor. Köşe sürükleme
geldiğinde uygulama üç ayrı geometride DONDU; üçünde de sebep martinez'in sonsuz
döngüye girmesiydi:

1. Gönye uzantısı duvarın boyunu aşınca dörtgen papyona dönüyor (duvar kısaltılınca).
2. Gönye hesabının kayan nokta gürültüsü (`442.40999999999997`) "neredeyse çakışık"
   kenar üretiyor.
3. Tek köşede beş duvar birleşince beş dikdörtgen aynı noktada üst üste biniyor.

İlk ikisi girdi tarafında düzeltildi (gönye duvarın yarı boyuyla da sınırlı;
halkalar birleştirmeden önce 10⁻⁴ cm'e yuvarlanıyor). Üçüncüsü düzeltilemedi:
girdi geçerliydi, kütüphane takılıyordu.

Ölçüm — 300 rastgele 5 duvarlı yelpaze, aynı test:

| Kütüphane | Sonuç |
|---|---|
| martinez | **Kilitleniyor** (sonsuz döngü) |
| polygon-clipping | 275 başarılı, 25 hata fırlattı, 78 ms, **kilitlenme yok** |

Belirleyici fark başarı oranı değil, **başarısızlığın türü**: polygon-clipping
hata fırlatıyor, yani `try/catch` yakalayabiliyor ve kontur birleşmemiş halkalarla
çiziliyor (köşelerde iç çizgi görünür ama uygulama ayakta). Sonsuz döngüyü hiçbir
şey yakalayamaz — senkron kodu kesmenin yolu yok.

martinez tamamen kaldırıldı; iki poligon kütüphanesi taşımamak için `room.ts`'in
mahal alanı hesabı da polygon-clipping kullanacak.

Nerede: `core/wallShape.ts`. Regresyon testleri: `core/__tests__/wallShapeUnion.test.ts`
(üç kilitlenme vakası da orada; yuvarlama kaldırılırsa 2. test kilitlenir).

---

## 2026-08 · Duvar şekli: gönyeli dörtgen → yuvarlak uçlu kapsül

### K23 — Duvar = eksen + yarıçap; kontur ve union kaldırıldı

Gönyeli dörtgen iki şikâyet üretiyordu ve ikisi de yamayla kapanmıyordu:

1. **Dar açıda köşe uzuyor, kalınlık değişiyor.** Gönye kesişimi köşeye doğru
   kaçıyor; miter limit + pah bunu sınırlıyor ama düzeltmiyordu.
2. **3+ duvarın birleştiği kavşakta kopukluk.** `getSingleNeighbour` komşu sayısı
   1 değilse gönye yapamıyor, uç düz kesiliyor, çentik kalıyordu.

Duvar artık `getWallCapsule(wall, points) → { p1, p2, radiusCm }`. Yuvarlak uç
duvarın **uç noktasında merkezli**; o köşede birleşen her duvar aynı `r` yarıçaplı
diski doldurduğu için kavşakta boşluk kalması **geometrik olarak imkânsız** —
kaç duvar, hangi açı olursa olsun. Kalınlık da tanım gereği sabit.

`getWallCapsule` komşulara bakmadığı için imzası `walls` **almaz**; gönye,
miter limit, pah, kendiyle kesişen halka koruması ve union hesabının tamamı
silindi (~230 satır → ~25).

### Union neden gitti

Kontura ihtiyacın tek sebebi köşelerde komşunun içinden geçen iç çizgilerdi.
Referans tasarımda duvar **kontursuz düz renk**; öyle olunca çakışma zaten
görünmüyor. Duvarlar üst üste çizilir, birleşim hesaplanmaz.

Bu, K22'nin bütün sorun sınıfını ortadan kaldırdı: kilitlenme de exception da
artık mümkün değil. `wallShapeUnion.test.ts`'teki üç kilitlenme regresyon vakası
**konusuz kaldığı için** silindi — kaybolmadılar, korudukları kod yok.
`polygon-clipping` bağımlılığı duruyor: `core/room.ts` mahal alanı için kullanacak.

### Nasıl çiziliyor: `<Line worldUnits>`

Duvar başına tek `<Line worldUnits lineWidth={wall.thickness}>`. `worldUnits`,
LineMaterial'ın kapsül shader'ını açıyor: parça, ışının doğru parçasına uzaklığı
yarıçapı aşınca atılıyor. Eğri **analitik** — hiçbir zoom'da köşelenmiyor,
üçgenlenmiş geometri yok, yeni geometri kodu yazılmadı.

Elle kapsül mesh'i (gövde + yelpaze uçlar) alternatifi vardı; ileride duvara
tarama deseni/gölge gerekirse ona geçilir.

### ⚠️ `CAMERA_HEIGHT_CM` düşürülmemeli

`worldUnits` shader'ı ışının gözden çıktığını varsayar (perspektif). Kameramız
ortografik, ışınlar paralel. Hata kamera yüksekliğinin görünür yarı genişliğe
oranıyla ters orantılı: `CAMERA_HEIGHT_CM = 100_000` iken en düşük zoomda bile
~%0,6 (20 cm duvarda 0,01 px). Küçültülürse duvarlar ekran kenarlarına doğru
incelmeye başlar. `scene/Cameras.tsx`'te uyarı var.

### Kabul edilen sonuçlar

- Serbest uçlar yarıçap kadar uzuyor (ölçü etiketi ekseni ölçer, çizilen sınırı değil).
- Dış köşeler yuvarlak, iç köşeler keskin kalıyor.
- Yalnız plan görünümü; 3B/izometrik ayrı extrude geometri yolundan gidecek.
- Açıklıklar etkilenmedi — duvarı kesmiyor, üstüne boyanıyor.

Nerede: `core/wallShape.ts`, `scene/Wall.tsx`. Ayrıntı: `knowledge/capsule-walls.md`.

---

## 2026-08 · Duvar grafı düzlemsel yapılıyor

### K24 — Kesişimde ve T birleşiminde düğüm açılır, duvar bölünür

Mahal tespiti (`core/room.ts`) yüz taramasıyla çalışacak ve bu ancak kenarların
YALNIZ düğümlerde buluştuğu bir grafta doğrudur. Kesişip geçen duvarlar bu
koşulu bozuyordu: ekranda kapalı görünen alan, grafta kapalı değildi.

Artık her düzenlemeden sonra graf düzlemsel hale getiriliyor:

- **T birleşimi** (bir duvarın ucu diğerinin gövdesinde): gövdedeki duvar
  bölünür, değen ucun var olan `Point`'i PAYLAŞILIR. Yeni nokta üretilseydi
  aynı yerde iki nokta olur, duvarlar kopuk kalır ve çevrim kapanmazdı.
- **Kesişim**: iki duvar da bölünür, ortak TEK yeni `Point` üretilir.
- Bölünen duvarın ilk parçası kendi id'sini korur — seçim, açıklık ve geri
  alma o id'ye bakıyor.

Bölme, onu tetikleyen çizim/taşımanın `set()`'i içinde çalışır: tek geri alma
adımı.

### Açıklık çakışması: bölme reddedilir

Bölme noktası bir kapı/pencerenin İÇİNE düşüyorsa o bölme YAPILMAZ. Açıklık
silinmez, kaydırılmaz — K13'ün "geçersiz yerleştirme reddedilir, kaydırılmaz"
kuralının aynısı. Kullanıcının koyduğu veri sessizce kaybolmaz.

Kesişimin bir tarafı reddedilirse öbür tarafı da düşer; yoksa bir duvar
bölünür, diğeri bölünmez ve hiçbir şeye bağlanmayan bir düğüm kalır.

Reddedilmeyen bölmelerde açıklık kendisini İÇEREN parçaya taşınır, `offsetCm`
o parçanın başına göre yeniden hesaplanır.

Bedeli: kapının üstünden geçen duvar orada düğüm açmaz, o noktada oda çevrimi
kapanmaz. Kullanıcıya bunu anlatan uyarı henüz yok.

### K9 ile ilişkisi

K9 "duvar BÖLÜNMEZ" diyordu; o kural AÇIKLIK için geçerli ve değişmedi —
açıklık hâlâ tek parça duvarın üstünde bir delik. K24 topolojik bölmedir,
kesişim/birleşim noktalarında gerçekleşir ve açıklıkla çakıştığında geri adım
atar.

Nerede: `core/wallGraph.ts` (saf), `store/architectureSplit.ts` (uygular).
Bilinen sınırlar (kolineer duvarlar, birleşmeme, karesel maliyet):
`knowledge/wall-graph.md`.

## 2026-08 · Geri al/yinele kısayolu görünüme göre ayrılıyor

### K25 — Ctrl+Z aktif görünümün geçmişine gider, dinleyici TEK

Mimari ve tesisat iki ayrı geçmiş tutuyor: mimari veri `cadStore`'un zundo
sarmalayıcısında (`store/history.ts`), tesisat verisi ayrı bir aynada
(`plumbing/store/plumbingHistory.ts`). Kısayolları da iki ayrı hook bağlıyordu
(`pages/useEditorShortcuts.ts` + `plumbing/scene/usePlumbingShortcuts.ts`) ve
ikisi de `window`'a. Tesisat görünümünde tek Ctrl+Z her iki dinleyiciye birden
düşüyor, iki geçmişi aynı anda bir adım geri alıyordu — kullanıcı tesisatta bir
sembolü geri alırken habersizce bir duvar işlemini de geri alıyordu.

Karar: kısayol dinleyicisi TEK (`pages/useEditorShortcuts.ts`); geri al/yinele
`uiStore.activeViewId`'ye bakıp doğru geçmişe dağıtılır
(`installation` → `undoPlumbing/redoPlumbing`, diğerleri → `undoProject/redoProject`).
Görünüme abone OLUNMAZ, tuş anında `getState()` ile okunur: abonelik her görünüm
değişiminde dinleyiciyi sökülüp kurardı. `usePlumbingShortcuts.ts` silindi.

Ctrl+S görünümden bağımsız: kayıt tüm projeyi kapsıyor.

### Kapanmayan taraf: menü ve ortak sayaçlar

Menü çubuğundaki "Geri Al / Yinele" hâlâ koşulsuz `undoProject` çağırıyor ve
aktiflikleri `useCanUndo/useCanRedo` ile mimari geçmişten geliyor. Tesisat
geçmişi için karşılık gelen bir React hook'u yok — ayrılık şimdilik yalnız
klavye tarafında.

Ayrıca `nextUniqueId` ve `revision` mimari geçmişte izleniyor (`history.ts`),
tesisat eklemesi ikisini de artırıyor: her tesisat işlemi mimari geçmişe içeriği
değişmeyen bir adım bırakıyor. Mimaride Ctrl+Z o adımlarda görünürde hiçbir şey
yapmıyor. Düzeltmesi `history.ts`'in izlenen alanlarına dokunmayı gerektiriyor.

## 2026-08 · Tesisat seçimi: tutma saf geometriyle

### K26 — Eleman tutması R3F ışın olaylarıyla değil, `core/elementPicking.ts` ile

Aşama 4 planı "seçim R3F'in kendi olay sistemiyle (`onPointerDown` +
`stopPropagation`) yapılır" diyordu. Uygulamada saf geometri seçildi.

`DrawSurface` tuvalin DOM olayını dinliyor; R3F de aynı tuvale kendi dinleyicisini
kuruyor. Tek `pointerdown` ikisine birden düşüyor, dolayısıyla "boş alana tıklama
seçimi temizler" kuralı iki dinleyicinin kayıt sırasına bağlı kalırdı — bu sıra
R3F'in mount düzeninin ayrıntısı, sözleşme değil. Tek olay kaynağı (mevcut
`drawSurfaceEvents` veri yolu) bu belirsizliği kaldırıyor; repodaki diğer araçlar
(duvar, açıklık, köşe, yerleştirme) zaten aynı yoldan çalışıyor.

Yan kazanç: tutma sınavı saf fonksiyon, jsdom'da test edilebiliyor. R3F ışını
edilemezdi. Risk R5 (mimari nesnenin yanlışlıkla seçilmesi) da kendiliğinden
kapanıyor: sınav yalnız tesisat elemanları üzerinde dönüyor.

Bedeli: tutma kutusu sembolün `bounds`'u, piksel hassasiyetinde SVG silueti değil.
Küçük semboller için bu zaten istenen davranış (zoom'a bağlı tolerans eklenir).

### Sayaç ve süzme sayaç portları yukarıdaki kolonlara taşındı

İki sembolün gaz bağlantısı çizimde gövdenin yanında değil, yukarı çıkan iki
dikey kolonda. Portlar gövdenin sol/sağ kenarındaydı (`[0,13]`/`[60,13]`); kolon
uçlarına alındı (`[20,-20]`/`[40,-20]`, yön `[0,-1]`). `bounds.min.y` de -20'ye
çekildi — port bounds dışında kalırsa şema doğrulaması uygulamayı açılışta
patlatır, ayrıca seçim çerçevesi kolonları dışarıda bırakırdı.

Açık kalan: asset'lerin `viewBox`'ı hâlâ `[0,0,60,40]`, yani kolonlar viewBox'ın
dışında. Sahnede sorun değil (three viewBox'a bakmaz, kırpma yok) ama SVG bir gün
DOM'da render edilirse kolonlar kesilir.

## 2026-08 · WebCAD referans projesi incelendi

Gerçek bir WebCAD export'u (5 katlı bina, 2 sayaç, kombi + ocak, servis kutusu) alan alan
incelendi. Biçim dökümü `docs/webcad-format.md`; plana yansıyan maddeler
`CLAUDE_INSTALLATION_PLAN.md` → "WebCAD referans projesinden gelen kararlar".

### K27 — Boru çapı örnek başına (varsayılan DN25), renk çapı gösterir

WebCAD her boruya `type: {name, radius, color}` gömüyor; çap boru başına veridir, hat
başına değil. Bizde de öyle olur ve yeni boru **DN25** ile eklenir. Katalog
(`core/pipeTypes.ts`) genişletilebilir tutulur: yeni çap eklemek bir satır olmalı, çap ne
araç kimliğine ne renk seçimine gömülür.

Katalog **DN15, 20, 25, 32, 40, 50, 65, 80, 100** (ekip kararı). Çizim kalınlığı EN 10255
dış çapından gelir (DN15 2.13 cm … DN100 11.43 cm) — `worldUnits` ile çizilen hat gerçek
boru kalınlığında olur. Tam tablo `CLAUDE_INSTALLATION_PLAN.md` → K-W1'de.

**Eksik:** WebCAD renkleri yalnız DN25/32/40/50 için biliniyor (referans projede geçenler);
DN15, 20, 65, 80, 100 renkleri belirlenmedi. Varsayarak doldurulmayacak — o beş çap,
rengi gelene kadar palette seçilebilir olmaz.

Renk çap sınıfından gelir (DN25 kırmızı `255,23,68`, DN32 açık mor, DN40 mavi, DN50 mor).
**Bunun bedeli:** `CLAUDE.md`'nin "tuvalde sarı = gaz hattı" kuralı geçersizleşti. Marka
sarısı çizim alanına hâlâ girmiyor, ama artık gaz hattının işareti de değil. Gerekçe: çıktıyı
okuyan kişi WebCAD çıktısını da okuyor; çapın renkten okunması sektör alışkanlığı.

### K28 — Armatür bir düğümdür, boru üzerinde `t` değil

WebCAD'de vana/sayaç bir `InstalmentPoint`'tir (`inlineApplianceId`) ve boru orada bölünür.
Hidrolik hesap da (kayıplar düğüm başına sayılıyor: `losses.valves`, `losses.elbows`) bu
yapıya dayanıyor. Benimsendi.

`core/model.ts`'teki "Vana/sayaç (`Fitting`) boru üzerinde `t` (0..1) ile" maddesi bununla
çelişiyor. Sözleşme değişikliği olduğu için **A'nın onayı** bekleniyor; Aşama 6 başlamadan
kapatılmalı, sonradan dönerse Aşama 6–7 yeniden yazılır.

### K29 — İzolasyon nesnedir, segment boolean'ı değil

WebCAD'de `Isolation` kendi model dizisi ve `PipeLine.armatures.Isolation` içinde bir
armatür. Benimsendi: `installationTools.ts`'teki `insulation` aracı `segment-toggle`
davranışından `placement`'a döner, `InstallationLineSegment.isInsulated` alanı hiç açılmaz.

### K30 — Round-trip kapsamı: yalnız geometri

WebCAD dosyası hidrolik hesabın sonucunu da saklıyor (`PipeLine.deltaPr/deltaPz/speed/
entryPressure/losses`, üstelik `myParent` her seviyede özyinelemeli gömülü). Bu alanlar
bizde üretilmez, yazılmaz, pass-through da edilmez — bayat hesabı geri yazmak sessizce
yanlış veri üretirdi. Kabul testi "bizim yazdığımızı okuyup aynen geri yazmak"tır.

### Ertelenen: kat kapsamı ve baca

- **Kat.** WebCAD'de tesisatın katı yok; `instalment` kökte tek nesne, yükseklik
  `InstalmentPoint.elevation` (kolon = aynı x,y üstünde artan kot). Bizim `floorId`'li
  yapımız bununla çelişiyor ama şimdilik korunuyor — 3B/kot dönüşümü sonraki bir iş.
- **Baca/havalandırma.** Ayrı graflar (`flueGraph`, `ventilationGraph`, `FluePoint`,
  `Boiler.flueStartPointId`). Yani baca `InstallationLineKind`'a eklenecek bir hat türü
  DEĞİL; `knowledge/linear-symbols.md`'deki dönüşüm planı askıya alındı. "İşlevler"
  başlığına ait, sonraki bir iş.

### Yan bulgu: id evreni konteyner bazlı

Kat 1–4 birebir aynı id'leri taşıyor (Door 42, Wall 5, Point 1…) ve her katın kendi
`nextUniqueId`'si var; `instalment` de ayrı bir evren. Yani id'ler proje genelinde değil
konteyner içinde tekil. Bu, floor-clone kuralımızla ("kopya tümüyle yeni id alır")
çelişiyor — `knowledge/id-scheme.md` ve `floor-clone.md` bu ışıkta gözden geçirilmeli.

### Uyarı: export kişisel veri taşıyor

`GasMeter.subscriberName`, `consumptionPoint`, `boxes[].KutuId`/`KapiKodu`,
`connectionPoint`, `roadNames`, `districtName` gerçek abone ve adres bilgisi. Ham export
repoya konacaksa önce anonimleştirilir.

## 2026-08 · Mahal (oda) tespiti ve çizimi

### K31 — Oda geometri tutmaz, duvar id kümesiyle yaşar

`Room` yalnız `{ id, wallIds, name }`. Poligon her karede duvarlardan türetilir
(`core/room.ts` → `findRoomFaces`, düzlemsel graf yüz taraması, K24'ün üstüne
oturur). Kopyalansaydı duvar oynayınca oda yerinde donar, hata da ekranda
görünmezdi.

`floorId` YOK — duvardan türetilir. `Opening` ile aynı gerekçe (K9): iki yerde
tutulan bilgi zamanla ayrışır.

**Kimlik = tam duvar kümesi eşleşmesi**, eşik/benzerlik yok. Duvar bölününce
küme bölme anında güncellenir, oda aynı odadır, kullanıcının verdiği ad yaşar.
İçinden duvar geçip oda ikiye ayrılırsa eski çevrim yok olur: iki YENİ oda doğar,
ikisi de varsayılan adı alır. "Hangisi eskisinin devamı" sorusunun doğru cevabı
olmadığı için tahmin edilmiyor.

### Dolgu duvarların İÇ yüzüne kadar çizilir

Saydam nesneler three.js'te ayrı geçişte ve opak nesnelerden SONRA çizilir;
`renderOrder` yalnız kendi geçişi içinde sıralar. Bu yüzden `RENDER_ORDER.room`
(10) < `wall` (20) olmasına rağmen oda dolgusu duvarları boyuyordu (duvar
pikselleri 18.354 → 8.917).

Çözüm sıralama değil, **hiç değmemek**: dolgu poligonu her kenardan o kenarı
taşıyan duvarın kalınlığının yarısı kadar içeri çekiliyor
(`core/roomFill.ts` → `insetRoomPolygon`). Köşeler, komşu iki kenarın ötelenmiş
DOĞRULARININ kesişimi; tek tek köşe ötelense kenarlar birbirinden kopardı.

Kapsül duvarın yuvarlak ucu köşe noktasında `r` yarıçaplı bir disk (K23); içeri
çekilmiş köşe köşegen üzerinde `r/sin(θ/2) ≥ r` uzakta kaldığı için diskin de
dışındadır — hiçbir açıda çakışma olmaz.

Reddedilen alternatifler: duvarı da saydam geçişe almak (`Opening.tsx`'e
dokunmayı gerektiriyordu, kapsam dışı), ön-karıştırılmış opak gri (odanın
altındaki ızgara kaybolurdu).

Alan (`areaCm2`) hâlâ duvar MERKEZ EKSENİNDEN ölçülür — küçültme yalnız
çizimdedir. Referans görsel de merkez ekseni kullanıyor.

### Dolgu üçgenlemesi: kulak kırpma, yelpaze değil

Üçgen yelpaze yalnız DIŞBÜKEY poligonda doğrudur. L şeklindeki odada iç köşeyi
kesip poligonun dışına taşan üçgenler üretiyordu. `triangulatePolygon` kulak
kırpma yapıyor: yalnız içeride kalan kulaklar koparıldığı için içbükey odada da
dolgu şeklin dışına çıkmaz.

### Etiket: font repodan gelir, konum en ferah noktadır

drei `<Text>`, font verilmezse troika varsayılanını Google Fonts CDN'inden
çekmeye çalışıyor ve istek düşünce HATA VERMEDEN 0 piksel çiziyordu — etiketin
hiç görünmemesinin sebebi buydu. Font artık repoda:
`public/fonts/roboto-regular.woff` (Apache 2.0, 34 KB), **latin + latin-ext**.
Yalnız latin alt kümesinde `ğ ş İ` yok ve oda adları Türkçe. troika `.woff2`
okumaz.

Etiket çapası ağırlık merkezi DEĞİL, odanın duvarlarından en uzak noktası (en
büyük iç çemberin merkezi). Ağırlık merkezi L odada ya odanın dışına düşüyor ya
da iç köşenin dibine oturup iki satırlık bloğu duvarın üstüne taşırıyordu.

Tasarım: ad büyük harf (`tr-TR` locale — varsayılanı `i → I` üretir, `İ` değil),
altında `m²`, ikisi ortak bir rozetin içinde. Rozet iki yazının BİRLEŞİK
ölçüsünden büyür; sabit kutu uzun adlarda taşardı. Rozet de SAYDAM çizilir —
opak olsaydı oda dolgusundan önceki geçişe düşer ve dolgu üstünü boyardı.

### Oda adı çift tıkla düzenlenir

Odaya çift tık, etiketin yerinde bir input açar. Çift tık ortak jest veri
yolundaki `onPointerDown` akışından türetiliyor — veri yolu yalnız HAM pointer
olayı taşır ve oraya `onDoubleClick` eklemek başka bir fayın dosyasına yazmak
olurdu. Boş ad reddedilir (K13 deseni), aynı ad yazılmaz (boş Ctrl+Z adımı
olmasın), ad değişimi tek geri alma adımıdır.

Kutu drei `<Html>` ile çiziliyor: konumu KAMERAYA bağlı, kamera da `<Canvas>`
dışına taşınamaz. Kritik tuzak — `Html` içeriğini AYRI bir react-dom köküyle
çiziyor ve o kökün olay işleyicisinden yapılan store yazımı R3F ağacını yeniden
çizdirmiyor (kutu ekranda asılı kalıyor, hata yok). Kaydetme/kapanma bu yüzden
native `window` dinleyicisinde.

Odalar hâlâ seçilebilir nesne DEĞİL; çift tık seçimden bağımsız. Genel nesne
seçimi gelince (fay-B2) `editingRoomId` o seçimden türetilebilir.

### Bilinen sınır

Kapının üstünden geçen duvar orada düğüm açmaz (K24 gereği bölme reddedilir),
dolayısıyla o noktada oda çevrimi kapanmaz. Kullanıcıya uyarı henüz yok.

Nerede: `core/room.ts` (yüz taraması), `core/roomIdentity.ts` (kimlik),
`core/roomLabel.ts` (etiket konumu + m²), `core/roomFill.ts` (içeri çekme +
üçgenleme), `store/architectureRooms.ts` (yeniden hesaplama), `scene/Room.tsx`,
`scene/RoomLabel.tsx`.

### K32 — WebCAD `Room.pointIds`'e GEÇİLMEDİ, `wallIds` korunuyor

`knowledge/webcad-json-format.md`'deki açık soruyu kapatan karar. Referans
WebCAD çıktısında oda sınırı nokta id'leriyle (`Room.pointIds`) tutuluyor,
bizimki duvar id'leriyle (K31). İkisi de aynı sonucu doğuruyor gibi
görünüyordu — WebCAD'in `pointIds`'i de duvarların köşe noktaları, yani o da
duvar oynayınca oynuyor — ama üç yerde ayrışıyorlardı ve üçü de `wallIds`
lehine çıktı:

1. **Duvarsız oda.** `pointIds` modelinde oda, onu çevreleyen duvarlar
   silinse de var olmaya devam eder — mahal, mahali tanımlayan gaz
   yönetmeliği açısından anlamsız bir kayıt olarak asılı kalırdı. `wallIds`
   modelinde bu İMKANSIZ: duvar giderse çevrim kopar, oda kendiliğinden düşer.
2. **Nokta havuzunun anlamı.** `pointIds`'e geçmek `Point`'in tanımını "duvar
   köşesi"nden "geometri düğümü"ne genişletirdi. Bugün `getOrphanPointIds`
   (duvarı olmayan nokta = çöp, silinir) ve üç silme yolu (`architectureSlice`,
   `selectionOps` ×2) bu varsayıma dayanıyor; `getJointRadiusCm` de öyle
   (köşedeki en kalın duvarın yarısı — duvarsız noktada tanımsız). Hepsi B2'nin
   dosyaları. Model değişse ripple'ın yarısı başka bir fayın alanına taşardı.
3. **Dışa aktarma zaten ucuz bir çeviri.** `wallIds` → `pointIds` duvarların
   uçlarını sıralamaktan ibaret; WebCAD adaptörü kurulunca tek fonksiyonda
   çözülür, model sözleşmesini değiştirmeyi gerektirmez.

Karar: `Room` `{ id, wallIds, name }` kalıyor. **Duvarsız oda desteklenmiyor**
— sürükle-dikdörtgen aracı (aşağıda) bu yüzden gerçek duvar üretiyor, serbest
poligon değil. **Duvarı silinen oda düşer**, WebCAD'deki gibi asılı kalmaz.

**`centralVentilation` / `topSideOpenable` eklenmedi.** Referansta bu iki alan
var (havalandırma hesabının girdisi — mahal merkezi kanala mı bağlı, üstten
açılabiliyor mu). Menfez aracı yazılınca gerekecek ama şimdiden model
sözleşmesini ikinci kez açmaya değmedi; o işi yazan kişiyle birlikte
kararlaştırılacak.

Dışa aktarma katmanı henüz yazılmadı. Yazılınca dikkat: `findRoomFaces`
köşeleri saat yönünün TERSİNE üretiyor (pozitif işaretli alan, dış yüzü elemek
için), referans WebCAD odası ise saat yönünde — adaptör sırayı çevirmezse
sessizce ters sarımlı bir poligon yazılır, hata vermez.

### K33 — Dikdörtgen oda aracı dört gerçek duvar üretir

Sürükle-dikdörtgen aracı (`scene/useRoomTool.ts`) K32'nin doğrudan sonucu:
duvarsız oda desteklenmediği için araç bir kısayoldur, ayrı bir model değil.
Basılı tut → sürükle → bırak; dört köşe kapalı zincir olarak yazılır
(`store/architectureWallOps.ts` → `appendWallChain`'e eklenen `isClosed`), mahal
kapanan çevrimden K31'in kendi mekanizmasıyla doğar. Elle çizilen oda ile
duvarlardan doğan oda arasında hiçbir davranış farkı yok.

Store'a yalnız BIRAKMA anında yazılır — sürüklerken her karede yazsaydı tek oda
onlarca geri alma adımı bırakırdı.

Köşeler var olan bir köşeye denk geliyorsa `findCornerPointIdAt` ile onun
`pointId`'sine bağlanır, konumla değil — aksi hâlde bitişik iki oda çizildiğinde
ortak kenarda üst üste iki duvar oluşurdu (ekranda görünmez, aynı renk oldukları
için; ama malzeme dökümünde iki kez sayılır, silme de tek kopyayı kaldırırdı).
`appendWall` da aynı gerekçeyle güçlendirildi: iki uç zaten var olan aynı köşe
çiftini bağlıyorsa ikinci duvar hiç YAZILMAZ, var olanı döner — bu, duvar
aracının kendisini de etkileyen bir davranış değişikliği.

### K34 — Kolineer örtüşen duvarlar SPLIT SONRASI birleştirilir

K33'teki `appendWall` koruması yalnız İKİ UCU DA aynı köşeye denk gelen
duvarları yakalıyordu. Bitişik iki oda **farklı boyda** çizilip ortak kenarları
**kısmen** çakışınca (kısa kenar uzun kenarın içine kısmen giriyor) bu koruma
işe yaramıyordu: köşeler tam eşleşmediği için `appendWall` ikisini de ayrı
duvar olarak yazıyor, sonra `splitWallsAtIntersections` her ikisini de kendi
T birleşiminde AYRI AYRI doğru bölüyor — ama ikisi de örtüşen aralık için
birer parça üretiyor, sonuçta aynı iki köşe arasında duran iki AYRI duvar
kalıyordu (bkz. `knowledge/wall-graph.md`, önceki "Bilinen sınırlar"). Tek
taraflı T birleşiminde de (bir duvar öbürünün tamamen İÇİNDE kalırsa) aynı
sonuç çıkıyordu — karşılıklı olması şart değildi.

Çözüm bölme AŞAMASINDA değil, **bölme bittikten sonra**: `mergeDuplicateWallsInDraft`
(`store/architectureSplit.ts`) aktif kattaki tüm duvarları tarar, aynı iki
köşeyi (yön fark etmez) paylaşanları bulur. **İlk çizilen kazanır** — ama
"ilk" parçanın KENDİ id'sine bakılarak değil, `originByWallId` üzerinden bu
turda türediği ORİJİNAL duvarın id'sine bakılarak belirlenir: split'te üretilen
yeni id, split edilmemiş ama sonradan çizilmiş bir duvarınkinden küçük de büyük
de çıkabilir, kendi id'si güvenilir bir sıra göstergesi değildir. Kazananın
kalınlığı/yüksekliği aynen kalır.

Kaybedenin üstündeki açıklık kazanana taşınır (yön tersse `offsetCm` kazananın
uzunluğundan çıkarılıp çevrilir, K10). Kaybedeni sınırında sayan oda kaydı da
kazanana güncellenir — yoksa taze yüz taraması eski kaydı eşleştiremez, "yeni
oda doğdu" sanılır ve kullanıcının verdiği ad kaybolur (K31).

Split hiç olmadığı turlarda bile kontrol çalışır: duplicate önceki bir çağrıda
doğmuş olabilir, o T birleşimleri artık paylaşılan düğümde olduğu için sonraki
turda `findWallSplits` hiçbir yeni split görmez — erken dönüş `mergeDuplicateWallsInDraft`'ı
atlamamalı.

Nerede: `store/architectureSplit.ts`. Testler `store/__tests__/architectureSplit.test.ts`
("kolineer örtüşme") ve `store/__tests__/roomRectangleTool.test.ts` ("FARKLI BOYDA").

### K35 — Açıklığın içinden geçen VEYA onun üstünde başlayan/biten duvar YERLEŞTİRİLEMEZ

K24 yalnız "bölme noktası açıklığın içine düşerse bölme reddedilir" diyordu —
duvarın KENDİSİ yine de yazılıyordu, sadece o noktada düğüm açılmıyordu. Ürün
kararı bundan daha katı: bir kapı/pencere boşluğunun ortasında bir duvar ne
başlayabilir ne bitebilir ne de içinden geçebilir — hiçbiri fiziksel olarak
anlamlı değil. Duvar aracında önizleme lastik bandı olarak kalır, oda
aracında sürükleme hiçbir şey yazmaz — ikisi de sessizce reddeder, K13'ün
"geçersiz yerleştirme reddedilir, kaydırılmaz" deseninin aynısı.

**Aynı doğrultuda (kolineer) devam eden duvar sorun DEĞİL.** Açıklığı taşıyan
duvarın devamı olarak çizilen bir segment ona binmiyor, onu sürdürüyor — kapı
zaten o duvarın üstünde bir delik (K9). `core/wallGraph.ts` → `findBlockingOpening`
bunu bedavaya alıyor: iki segment kolineer/paralel olduğunda `getInteriorCrossing`
zaten `undefined` döner.

**Revizyon: T birleşimi de reddin İÇİNDE.** İlk yazımda "bir duvarın UCU
açıklığın ortasına değerse (orada bitiyor, geçmiyor) bu K24'ün zaten ele
aldığı senaryo, reddetmeye gerek yok" diye düşünülmüştü — YANLIŞ çıktı.
Kullanıcı görsel kanıtla gösterdi: bir duvarın ucunu kapı/pencerenin üstünde
sonlandırmak da (başlatmak da) aynı derecede geçersiz, "geçme" ile "üstünde
durma" ürün açısından aynı kural altında. `isAtEnd(crossing.onA, …)` muafiyeti
kaldırıldı — `getInteriorCrossing` uç değerlerini (0 veya 1) zaten kesişim
sayıyor, ekstra bir ayrım gerekmiyor.

**Bu yalnız YENİ duvar YERLEŞTİRMEYİ kapsar.** Var olan bir duvarı TAŞIYARAK
aynı noktaya getirmek (`movePoint`/`moveWall`) `appendWall`'dan geçmiyor, K24'ün
"bölme reddedilir, duvar silinmez" davranışında kalmaya devam ediyor — kapsam
dışı, kasıtlı olarak dokunulmadı. K24'ün eski testi bu yüzden TAŞIMA senaryosuna
çevrildi (`store/__tests__/architectureSplit.test.ts`).

Kontrol iki katmanda: `store/architectureWallOps.ts` → `appendWall` (STORE
seviyesi son savunma, tek segment reddi — id bile harcanmaz) ve
`scene/useRoomTool.ts` (ÖN kontrol, dört kenardan HERHANGİ biri blokeliyse
`addWallChain` hiç çağrılmaz; `appendWall`'ın kendi reddi yalnız kendi
segmentine karar verir, zincirin tamamına değil — tek kenar reddedilip
diğerleri yazılsaydı yarım bir oda kalırdı). Ortak çekirdek
`core/room.ts` → `findBlockingOpeningInLoop`, kapalı köşe zinciri için.

Nerede: `core/wallGraph.ts`, `core/room.ts`, `store/architectureWallOps.ts`,
`scene/useRoomTool.ts`. Testler `core/__tests__/wallGraph.test.ts`,
`core/__tests__/roomOpeningBlock.test.ts`, `store/__tests__/architectureWallOpeningSync.test.ts`,
`store/__tests__/architectureSplit.test.ts`.

### K36 — Açıklığa çarpan TAŞIMA da reddedilir; bırakılamayan nesne imlece yapışık kalır

K35 yalnız YENİ duvar yerleştirmeyi kapsıyordu, TAŞIMA (köşe veya duvar
sürükleme) kasıtlı olarak dışarıda bırakılmıştı. Kullanıcı geri bildirimiyle
kapsam genişledi: taşınan bir köşe veya duvar, hedef konumda bir açıklığı
kesiyorsa YA DA onun üstünde bitiyorsa, bırakma (`onPointerUp`) da
REDDEDİLMELİ — aynı fiziksel gerekçe (K35), taşıma için de geçerli.

**UX modeli değişti: "bas-sürükle-bırak" yerine "tut, geçersiz yere bırakma
denemesi başarısızsa imlece yapışık kal, geçerli yere TEKRAR TIKLANINCA
bırak".** Bırakma reddedilince `drag`/`grab` state'i SIFIRLANMAZ (`endDrag()`
çağrılmaz) — köşe/duvar imleç konumunu takip etmeye devam eder, çünkü
`onPointerMove` zaten buton durumundan BAĞIMSIZ çalışıyor (native pointermove
davranışı). Kullanıcı GEÇERLİ bir yere gelip TEKRAR TIKLADIĞINDA, o tıklamanın
`onPointerDown`'ı YENİ bir tutma başlatmaz (aktif bir `drag`/`grab` varken
`onPointerDown` erken döner) — karar hep `onPointerUp`'ta verilir, fiziksel
tuş kalkışı hep "bu konumu dene" anlamına gelir.

Esc (`onCancel`) her zaman `drag`/`grab`'i temizler — kullanıcı geçersiz bir
sürüklemede TAKILI KALMAZ, istediği an vazgeçebilir.

**Etki hesabı çekirdeğe çıkarıldı** (`core/wall.ts`), çünkü hook'lar
(`useThree` kullandıkları için R3F/Three.js gerektirir) doğrudan test
edilemiyor — saf kısmı test edilebilir kalsın diye:

- `getPointMoveImpact(pointId, targetPosition, walls, points)`: köşeye bağlı
  HER duvarın (sabit uç → yeni konum) segmentini üretir, taşınan duvarları
  `stationaryWalls`'tan çıkarır — kendi eski hâline göre kontrol etmek
  anlamsız olurdu, onlar zaten hareket eden taraf.
- `getWallMoveImpact(wallIds, dxCm, dyCm, walls, points)`: katı ötelenen
  duvar(lar)ın yeni segmentini üretir, aynı mantık.
- `findBlockingOpeningInSegments`: K35'in `findBlockingOpening`'inin çoklu
  segment hâli — üretilen segmentlerin HERHANGİ biri blokeliyse tüm bırakma
  reddedilir.

**Bilinen sınır — esneyen komşular kapsam dışı.** Duvar taşıma "katı" olduğu
için (`useWallSelectionTool.ts`), paylaşılan köşeyi taşıyan ama kullanıcının
DOĞRUDAN seçmediği komşu duvarlar da şekil değiştirir ("esner"). Bu esneyen
komşuların açıklık çakışması KONTROL EDİLMİYOR — yalnız kullanıcının doğrudan
taşıdığı (seçili) duvarlar/köşe kontrol ediliyor. Kullanıcı bundan bahsetmedi,
kapsam kasıtlı olarak dar tutuldu.

Nerede: `core/wall.ts` (`getPointMoveImpact`, `getWallMoveImpact`),
`core/wallGraph.ts` (`findBlockingOpeningInSegments`), `scene/usePointDragTool.ts`,
`scene/useWallSelectionTool.ts`. Testler `core/__tests__/wallMoveImpact.test.ts`.
Hook seviyesi (React/R3F) test edilmedi — tarayıcıda manuel doğrulanmalı.

### K37 — Özellik paneli artık ÜSTE biniyor, KK-12'nin kardeş-eleman modeli terk edildi

KK-12 kararı özellik panelini çizim alanının flex KARDEŞİ yapmıştı: panel
açılınca tuval daralıyordu, "üzerine binmez" bilinçli bir tercihti. Kullanıcı
geri bildirimi tersini istedi — her nesne seçiminde tuvalin sağa kayması
rahatsız edici, panel bir pencere gibi sağdan kayarak açılıp tuvalin ÜSTÜNE
binmeli, tuvalin genişliğini etkilememeli.

`EditorPage.tsx`'teki orta satır (`Toolbar` + `main` + `PropertyPanel`) artık
`relative`; `PropertyPanel`'in dış kabuğu bu satıra göre `absolute inset-y-0
right-0`, `translate-x-full` (kapalı) ↔ `translate-x-0` (açık) arasında
`transition-transform` ile kayıyor. `main` artık panelin varlığından bağımsız
her zaman tam genişlik.

**Seçim yokken panel artık DOM'dan tamamen düşmüyor.** Eskiden `kind ===
'none'` durumunda `return null` deniyordu (KK-12'nin "kapalıyken DOM üretme"
kararı) — ama kayma animasyonunun oynaması için panelin kapanış anında hâlâ
mevcut olması gerekiyor, `null` dönülürse animasyon hiç görünmeden kaybolur.
Bunun yerine panel her zaman render edilir, kapalıyken `aria-hidden="true"` +
`inert` + `pointer-events-none` ile hem ekran okuyucudan hem klavye/tıklama
sırasından çıkarılır — KK-12'nin asıl kaygısı ("gizli panel odakta kalıyor")
böyle çözülü kalıyor, DOM'da kalması ise ihmal edilebilir bir maliyet (boş bir
`aside`).

Nerede: `pages/EditorPage.tsx`, `ui/PropertyPanel.tsx`. İçerideki tüm
davranış (commit-on-blur, ayrışan değer boş gösterme, toplu yazım tek
Ctrl+Z — bkz. `knowledge/property-panel.md`) değişmedi, yalnız dış kabuk.
Testler `ui/__tests__/PropertyPanel.test.tsx` (mevcut testler güncellenmeden
geçti — `aria-hidden` zaten `queryByRole`'ü filtreliyor).

### K38 — Alan nesnesi (merdiven/kolon/baca şaftı): yeni model, v1 tıkla+panel

PointSymbol'ün (Desen A) bilerek dışarıda bıraktığı "ölçü taşıyan" nesneler
(model.ts satır 71-75 yorumu, Desen B) için yeni bir tip: `AreaObject`, serbest
döndürülebilir dikdörtgen — merkez `(x,y)` + `widthCm`/`lengthCm` + `angleDeg`.
`AreaObjectType`: `stairs` (Merdiven), `structuralColumn` (Kolon — kod adı
bilerek düşey gaz kolonu `Riser`'dan ayrı, bkz. "Terminoloji uyarısı"),
`flueShaft` (Baca Şaftı) — üçü de `core/tools.ts`'te zaten vardı, toolId'lerle
BİREBİR aynı isim kullanıldı (PointSymbolType'ın kendi tool id'leri olması
gibi). Kiriş buraya GİRMEDİ: o çizgisel (x1,y1,x2,y2), ayrı bir model, ayrı iş.

**Çizim etkileşimi v1: tıkla-yerleştir (varsayılan boyut) + sağ panelden
sayısal ayar.** Tuvalde sürükleyerek boyutlandırma/döndürme (resize/rotate
gizmo) kasıtlı olarak DIŞARIDA bırakıldı — kod tabanında hiçbir yerde böyle bir
tutamaç deseni yok (PointSymbol'ün döndürmesi bile sahnede değil, panelde bir
sayısal alan), sıfırdan inşa etmek ayrı bir işti. Kullanıcı bu kapsam
daraltmasını onayladı; tutamaç SONRAKİ bir iş.

**K35/K36 açıklık koruması buraya da uygulandı.** `findBlockingOpeningInSegments`
(K35/K36, `core/wallGraph.ts`) segment-agnostik olduğu için aynen kullanıldı:
`core/areaObject.ts` → `findBlockingOpeningForAreaObject` nesnenin dört kenarını
segment olarak geçiriyor. Yerleştirme, taşıma, boyutlandırma ve döndürme —
dördü de bir kapı/pencerenin içinden geçen sonucu üretirse REDDEDİLİR (id bile
harcanmaz, K13 deseni). **Aynı bilinen sınır miras alındı:** nesnenin kenarı
açıklığı taşıyan duvarla PARALEL ve üst üsteyse (örn. bir kolon duvara tam
yaslanıp kapıyı örtüyor), `getInteriorCrossing` kesişim üretmez, kontrol o
durumu YAKALAMAZ — wall-graph.md'deki "üst üste binen duvarlar" sınırıyla aynı.

**Model sözleşmesine dokunma gerekti.** `core/model.ts` → `ProjectData` "dört
kişi arasındaki sözleşme, izinsiz alan eklenmez" diyor; `model.ts`/`serialize.ts`
bu oturumda sahipsizdi (README/proje notu). `serialize.ts`'e AYNI commit'te
`.default([])` migration + `docs/sample-project.json`'a `"areaObjects":[]`
eklendi — yoksa kabul testi ("bit bit aynı") kırılırdı.

**Seçim/vurgu zincirine yeni bir `'area'` türü girdi.** `core/selection.ts`
(`SelectableKind`), `core/architectureHover.ts` (`ArchitectureTarget`,
sıra: köşe → sembol → **alan nesnesi** → açıklık → duvar), `core/propertyFields.ts`
(`PropertySelectionKind`) — üçü de PointSymbol'ün `'symbol'` dalıyla birebir
aynı desende genişletildi.

**Kat kopyalama (KK-14) ve kat silme de güncellendi.** `core/floorClone.ts` →
`cloneFloorArchitecture` alan nesnelerini de kopyalıyor (yeni id + yeni etiket,
sembolle aynı gerekçe); `store/floorOps.ts` → `removeFloorFromDraft` katı
silinen alan nesnelerini düşürüyor. İkisi de unutulsaydı özellik "çalışıyor
görünüp" kat işlemlerinde sessizce veri kaybederdi.

**Tarayıcıda MANUEL doğrulanmadı** — editör girişi gerçek backend'e login
oluyor, oturumda ayakta değildi. `npm run build`/`lint`/`test:run` yeşil
(placement/selection hook'ları R3F gerektirdiği için testsiz kaldı, K36 ile
aynı sınır).

Nerede: `core/model.ts`, `core/serialize.ts`, `core/areaObject.ts`,
`core/selection.ts`, `core/architectureHover.ts`, `core/propertyFields.ts`,
`core/floorClone.ts`, `store/areaObjectOps.ts`, `store/architectureSlice.ts`,
`store/architectureUiStore.ts`, `store/floorOps.ts`, `store/floorCloneOps.ts`,
`store/selectionOps.ts`, `scene/useAreaObjectTool.ts`,
`scene/useAreaObjectSelectionTool.ts`, `scene/AreaObject.tsx`,
`scene/ArchitectureLayer.tsx`, `ui/properties/AreaObjectProperties.tsx`,
`ui/PropertyPanel.tsx`. Testler `core/__tests__/areaObject.test.ts`,
`core/__tests__/floorClone.test.ts`, `store/__tests__/areaObjectActions.test.ts`,
`ui/__tests__/AreaObjectProperties.test.tsx`.

### K39 — Alan nesnesi çizimi tipe göre farklılaştı, sonra kullanıcı geri bildirimiyle İKİ TUR revize edildi

K38'in ilk çizimi hepsi için aynı düz dikdörtgendi (duvar rengiyle dolu). İlk
revizyonda (K39'un ilk hâli) üçü açık gri dolgu + koyu kontur oldu, merdivene
basamak + DOLU üçgen ok eklendi. Kullanıcıya üç ok stili (ince çizgi / dolu
üçgen / köşegen çizgili) gösterildi, **ince çizgi oku seçti** — sonraki
revizyonda bu ve başka geri bildirimler uygulandı, son hâl şu:

**İçi TAMAMEN ŞEFFAF — hiçbir tip dolgu taşımaz, yalnız çizgi.**
`AreaObjectGeometry.fills` alanı KALDIRILDI, `scene/AreaObject.tsx` artık tek
bir dolgu mesh'i bile üretmiyor, yalnız `<Line>`. Kolon/baca şaftı/merdiven
üçü de sade kontur.

- **Kolon / Baca şaftı:** varsayılan boyut 1m × 1m'e BÜYÜTÜLDÜ (`DEFAULT_AREA_OBJECT_SIZE_CM`,
  eski 25×25/40×40 çok küçüktü). Baca şaftının iç çemberi karenin dış hattıyla
  AYNI kalınlıkta (`role: 'body'`, kullanıcı özellikle istedi — ince "ayrıntı"
  değil).
- **Merdiven:** iniş oku İNCE ÇİZGİ (gövde + V başlık), DOLU üçgen değil.
  Yön **-y (yerel)** ucuna bakıyor: `Cameras.tsx`'te ekranda "yukarı" plan
  +Y'ye denk geliyor, dolayısıyla "aşağı" (iniş yönü) plan -Y — ilk tur
  yanlışlıkla +Y'ye bakıyordu, kullanıcı "aşağı doğru baksın" dedi.

**Renk: duvardan bir tık koyu, çizgiler kalınlaştırıldı.** `ARCHITECTURE_COLORS.areaObjectStroke`
duvar renginden (`#3e4a5a`) koyu bir ton (`#232a34`); gövde çizgisi kalınlığı
1.8→3, ayrıntı 1→1.5 ("daha soft bir tasarım için" — kalın çizgi + boş iç,
ince/dolu çizginin tersi).

**Önizleme artık FARKLI RENK değil, AYNI rengin SAYDAM hâli.** Eskiden
`previewValid` mavisiydi; kullanıcı "yerleştirdiğimde normal hâlini alsın,
önizlemede aynı şeklin bir tık saydamı gözüksün" dedi.
`scene/AreaObject.tsx` artık önizlemede `ARCHITECTURE_COLORS.areaObjectStroke`
ile AYNI rengi, yalnız `opacity: 0.45` ile çiziyor (`transparent` prop'u
drei `<Line>`'a geçiyor).

**Kolon/baca şaftı büyüyünce K35/K36 kontrolünde GERÇEK bir boşluk çıktı.**
`findBlockingOpeningInSegments` yalnız nesnenin KENARLARININ duvarı NEREDE
kestiğine bakıyor; 100cm'lik bir nesne bir kapıyı (90cm) tam ortalarsa kenar
kesişim noktaları (offsetten ±50cm) açıklığın aralığının (±45cm) TAM DIŞINA
düşüyor — nesne kapıyı fiziksel olarak tamamen sarmalıyor ama hiçbir kenar
aralığın İÇİNDE kesişmediği için eski kontrol bunu KAÇIRIYORDU (test bunu
25×25 kolonla YAKALAMAMIŞTI, boyut büyüyünce ortaya çıktı). Düzeltme:
`findBlockingOpeningForAreaObject` artık ikinci bir kontrol de yapıyor —
açıklığın MERKEZ noktası (`getWallFrameAtOffsetCm`) nesnenin içinde mi
(`isPointInAreaObject`). İkisi birlikte de wall-graph.md'deki "üst üste binen
duvarlar" sınırını miras alıyor (bkz. kod yorumu).

**Çizgi kalınlığı `worldUnits`'e çevrildi.** İlk hâl drei `<Line>`'ın piksel-bazlı
(worldUnits yok) kalınlığını kullanıyordu — ekranda sabit piksel genişlik,
yani zoom out'ta nesneye göre ORANTISIZ kalınlaşıyordu. `Wall.tsx`'teki
`worldUnits` + cm cinsinden `lineWidth` deseni kopyalandı (gövde 2.5cm,
ayrıntı 1.2cm) — artık zoom'dan bağımsız sabit fiziksel kalınlık.

**Dosya 200 satırı aştı, ikiye bölündü (kod hijyeni kuralı).** Çizim
fonksiyonları (`getAreaObjectPlanGeometry`, `buildStairTreadLines`,
`buildStairArrowLines`, `buildCirclePoints`, `AreaObjectGeometry`/`Stroke`
tipleri) yeni `core/areaObjectGeometry.ts`'ye taşındı; `core/areaObject.ts`
etiket/geometri-yardımcı/K35-K36 çarpışma mantığında kaldı, `toAreaObjectPlanPoints`
ikisi arasında paylaşılsın diye `export` edildi.

**Tutamaç (resize/rotate gizmo) hâlâ v1 dışı** — kullanıcı iki kez teyit etti.

Nerede: `core/areaObject.ts`, `core/areaObjectGeometry.ts`, `scene/AreaObject.tsx`,
`scene/architectureTheme.ts`. Testler `core/__tests__/areaObject.test.ts`
(etiket/geometri/çarpışma, yeni "geniş nesne kapıyı sarar" testi dahil),
`core/__tests__/areaObjectGeometry.test.ts` (çizim, ayrı dosya).

### K40 — Zoom'da çizgi kalınlığı sabitlendi, ilk yerleştirmede Ctrl da ızgarayı kapatıyor

İki küçük ama gerçek düzeltme, kullanıcı tarayıcıda deneyip fark etti:

**Çizgi kalınlığı artık `worldUnits`.** drei `<Line>` varsayılan olarak
piksel-bazlı kalınlık kullanır (ekranda sabit piksel genişlik) — zoom out'ta
nesneye göre ORANTISIZ kalınlaşıyordu. `Wall.tsx`'teki desen kopyalandı:
`worldUnits` + cm cinsinden `lineWidth` (gövde 2.5cm, ayrıntı 1.2cm) — artık
fiziksel kalınlık zoom'dan bağımsız sabit.

**Ctrl ile ızgara kapatma ilk yerleştirmede de çalışıyor.** Taşırken zaten
vardı (`useAreaObjectSelectionTool.ts`, köşe/duvar sürüklemesiyle aynı jest);
`useAreaObjectTool.ts`'te (tıkla-yerleştir) YOKTU — kullanıcı "ilk yerleştirirken
yapmıyor" dedi. `readPosition` artık `event.ctrlKey`'e bakıyor.

Nerede: `scene/AreaObject.tsx`, `scene/useAreaObjectTool.ts`.

### K41 — Kolon Havalandırması: dördüncü alan nesnesi tipi, yalnız çember

Roadmap notu: "Kolon Havalandırması — WebCAD'de RoofVent{radius,x,y}, basit
nokta+yarıçap." `AreaObjectType`'a `columnVentilation` eklendi — Baca Şaftı'nın
KARESİZ hâli: kullanıcının tarifiyle "baca şaftının ortası", yalnız çember,
kare dış hat yok. Varsayılan boyut 30×30cm (çap ~30cm, RoofVent notuyla aynı
ölçek). Etiket öneki `KH`.

**Bilinen sapma, kaydedildi ama düzeltilmedi.** `model.ts`'in kendi PointSymbolType
yorumu (satır 86-87, K38'den ÖNCE yazılmıştı) Baca Şaftı + Kolon Havalandırması'nı
"Desen C — katlar arası eksen kimliği taşıyor" diye ayrı bir gruba koyuyordu —
Riser gibi kat-bağımsız, kökte duran bir model demek. K39'da Baca Şaftı zaten
basit kat-başı `AreaObject` (Desen B) olarak kuruldu, bu tutarlılıkla Kolon
Havalandırması da aynı yere eklendi. Kat-bağımsız kimlik (Riser gibi
`toFloorId` ile kat kopyalanınca klonlanmama) gerekirse ayrı bir karar ve
muhtemelen model değişikliği gerekir — bugün varsayılmadı, `model.ts`'e bunu
açıklayan bir yorum eklendi.

**Aynı oturumda main'de ayrı bir entegrasyon boşluğu bulundu, düzeltildi.**
`feat/floor-management-dialog` dalı (bu K'dan bağımsız, floor-height-elevation
ile birlikte mergelenmiş) yeni `core/floorContent.ts` eklemiş; `FloorContentSource`
tipi `FloorCloneSource`'u (K38'in `areaObjects` zorunlu kıldığı tip) genişletiyor
ama iki çağıran yer (`floorContent.test.ts`, `ui/floors/useFloorPlanDraft.ts`)
`areaObjects` alanını eklemeyi unutmuş — main derlenmiyordu. `getFloorContent`
o alanı hiç OKUMUYOR bile, yalnız tip yapısı gerektiriyordu; iki yere `areaObjects`
eklemek yetti. Ayrıca `docs/sample-project.json`'da (aynı floor-height-elevation
mergesinden kalma) dosyanın başında/sonunda fazladan boş satır vardı — kabul
testi ("bit bit aynı") ham metni `toBe` ile karşılaştırdığı için bu da
kırmızıydı, dosya tek satıra düzeltildi.

Nerede: `core/model.ts`, `core/serialize.ts`, `core/areaObject.ts`,
`core/areaObjectGeometry.ts`, `core/__tests__/areaObject.test.ts`,
`core/__tests__/areaObjectGeometry.test.ts`, `store/__tests__/areaObjectActions.test.ts`
— ve ilgisiz düzeltmeler: `ui/floors/useFloorPlanDraft.ts`,
`core/__tests__/floorContent.test.ts`, `docs/sample-project.json`.

### K42 — Alan nesnesi aracında SAĞ TIK çizimi bitirir ve seçim aracına döner

Dört alan nesnesi aracı (merdiven/kolon/baca şaftı/kolon havalandırması)
yerleştirdikten sonra AKTİF KALIYOR (arka arkaya ekleme, `usePointSymbolTool`
sözleşmesi). Kullanıcı geri bildirimi: jesti bitirmenin bir yolu yoktu —
tıkladıkça çizmeye devam ediyordu, durdurmak için palete geri gidip Seçim
Aracı'na basmak gerekiyordu.

**Sağ tık artık hem önizlemeyi siler hem paleti `SELECTION_TOOL_ID`'ye
döndürür.** Tesisat tarafındaki `useEscapeToSelectionTool` ile aynı gerekçe:
"bu iş bitti" demek tek jest olmalı, kullanıcı eklediğini hemen seçip
taşıyabilsin.

Sağ tık yerleştirme YAPMAZ: `onPointerUp` zaten `button !== LEFT_BUTTON`
kontrolüyle dönüyordu ve tarayıcıda `contextmenu` `pointerup`'tan SONRA
geliyor — sıralama tesadüfen değil, `DrawSurface.tsx` orta tuş dışındaki her
`pointerup`'ı yayınladığı için ikisi de aynı jestte görülüyor.

**Duvar/oda araçları BİLEREK dokunulmadı.** Onlarda sağ tık zaten zinciri
bitiriyor (`useWallTool` → `endChain`, `useRoomTool` → `endDrag`) ama araç
aktif kalıyor — çok segmentli çizimde kullanıcı arka arkaya duvar zinciri
çiziyor, palete dönmek istemez. Nokta sembolü araçları (pano, aydınlatma vb.)
da aynı sorunu taşıyor ama kapsam dışı bırakıldı; kullanıcı yalnız alan
nesnelerini istedi.

**Test edilmedi (hook seviyesi).** `scene/` altında hiç test yok — hook'lar
`useThree` üzerinden R3F/Canvas bağlamı istiyor (K36'dan beri aynı sınır).
Tarayıcıda doğrulanmalı.

Nerede: `scene/useAreaObjectTool.ts`.

### K43 — Alan nesnesi çizgisi duvarın YARISI kalınlığında; ince değer uzakta görünmez oluyordu

K40 çizgi kalınlığını `worldUnits`'e çevirmişti (cm cinsinden, zoom'la
ölçeklenen) ama değerleri küçük bırakmıştı: gövde 2.5 cm, ayrıntı 1.2 cm.
Zoom 1'de 1 cm = 1 px olduğu için bu, uzaklaşınca PİKSEL ALTINA düşüyordu —
en uzak zoom'da (`ZOOM_MIN = 0.1`) gövde yalnız 0.25 px eder ve nesne
ekrandan kaybolur. Kullanıcı "zoom out yaptıkça görüntüleri kayboluyor" dedi.

Duvar aynı `worldUnits` yolunu kullanıyor ama 20 cm ile çiziliyor ve bu sorunu
yaşamıyor (en uzak zoom'da bile 2 px).

**İki turda ayarlandı.** Önce duvarın yarısına (10 cm) çıkarıldı — kullanıcı
"aşırı kalın" dedi; sonra yarıya indirildi. Son değerler: **gövde
`DEFAULT_WALL_THICKNESS_CM / 4` = 5 cm, ayrıntı `/ 8` = 2.5 cm.** Sabit sayı
yazmak yerine duvar kalınlığından TÜRETİLDİ — varsayılan duvar değişirse
çizgiler onunla orantılı kalsın, ilişki kodda görünsün.

**Bilinen sınır:** en uzak zoom'da (0.1) gövde 0.5 px, ayrıntı 0.25 px eder —
orada solma devam edebilir. Kalınlığı artırmak çözüm değil (kullanıcı zaten
kalın buldu); gerekirse `Wall.tsx`'teki `alphaToCoverage` bu dosyaya da
eklenmeli (sert `discard` yerine kısmi örtme verir). Önizlemedeki `transparent`
malzemeyle etkileşimi doğrulanmadığı için bugün eklenmedi.

Nerede: `scene/AreaObject.tsx`. Test yok (scene/ altı R3F gerektiriyor).
Tarayıcıda ORTA zoom seviyelerinde doğrulandı (nesneler görünür, kalınlık
makul); en uzak zoom ayrıca denenmedi.

### K44 — Alan nesnesine tutamaç: saplı daire DÖNDÜRÜR, köşedeki kare BOYUTLANDIRIR

K38'den beri ertelenen tutamaç (gizmo) eklendi — kod tabanında böyle bir desen
hiç yoktu, sıfırdan kuruldu. Tasarım kullanıcının gönderdiği referans
görselden: üst kenardan çıkan SAPLI DAİRE döndürür, ekranda SAĞ-ALT köşedeki
KARE boyutlandırır. Tutamaçlar yalnız Seçim Aracı'nda ve TEK alan nesnesi
seçiliyken görünür; çoklu seçimde hangi nesnenin boyutlanacağı belirsiz olurdu.

**Boyutlandırmada KARŞI KÖŞE sabit kalır** (kullanıcı seçti; klasik CAD
davranışı). Bunun sonucu şu: merkez de kayar, yani konum ve boyut BİRLİKTE
değişir. Bu yüzden yeni bir `resizeAreaObject(id, {x, y, widthCm, lengthCm})`
action'ı eklendi — var olan `setAreaObjectSize` (panelin kullandığı, merkezi
sabit tutan) yetmezdi: ikisi ayrı ayrı çağrılsaydı tek sürükleme için iki
`markDirty`, yani iki Ctrl+Z adımı olurdu.

Matematik `core/areaObjectHandles.ts` → `resizeAreaObjectFromCorner`: sabit
köşeden imlece giden vektör nesnenin KENDİ eksenine (yerel +x/+y birim
vektörleri) izdüşürülür, böylece döndürülmüş nesnede de kullanıcı kenara
paralel büyütür. Testte döndürülmüş nesnede sabit köşenin gerçekten yerinde
kaldığı doğrulanıyor.

**Tutamaç boyu DÜNYA biriminde (cm), ekran pikselinde değil.** Ekran-sabit
tutamaç daha alışıldık olurdu ama zoom kamerada duruyor (K3), store'da değil —
React bileşeni zoom değişince yeniden RENDER OLMAZ, dolayısıyla ekran-sabit boy
her karede hesaplanamaz. `PointHandle.tsx`'teki köşe vurgusu da aynı sebeple
dünya ölçüsünde. Bedeli: çok uzakta tutamaçlar küçülür (erişim yarıçapı
`getSnapToleranceCm` ile telafi ediliyor), çok küçük nesnede orantısız büyük durur.

**Jest çakışması BEŞ hook'ta ayrı ayrı kapatılmak zorunda kaldı.** Tutamaçlar
gövdenin DIŞINA taşıyor (sap tepede, kare köşede yarı dışarıda) ve aynı
pointerdown'ı bütün mimari araçlar görüyor. Ortak çözüm: `findSelectedAreaObjectHandle`
helper'ı — isabet varsa diğer araç jesti hiç başlatmıyor
(knowledge/gesture-bus-precedence.md deseni: karar geometriyle verilir).

Hangi hook, neden:
- `useAreaObjectSelectionTool` — kare köşede, yarısı gövdenin içinde: aynı
  basışta hem taşıma hem boyutlandırma başlıyordu.
- `useSelectionTool` — döndürme sapı gövdenin DIŞINDA olduğu için hedef
  çözümlemesi "boşluk" diyor ve ÇERÇEVE SEÇİMİ başlıyordu; kullanıcı
  döndürürken ekranda lastik dikdörtgen gördü, bu yüzden fark edildi.
- `useWallSelectionTool`, `usePointSymbolSelectionTool`, `usePointDragTool` —
  tutamaç bir duvarın/sembolün/köşenin üstüne denk gelirse o nesne de aynı
  jestte taşınırdı. Bunlar kullanıcı tarafından bildirilmedi, aynı hata
  sınıfının kalan üyeleri olarak kapatıldı.

⚠️ **Ders:** yeni bir "gövdenin dışına taşan" etkileşim eklerken tek bir
sahiplenme kontrolü yetmez — o pointerdown'ı dinleyen HER hook gözden
geçirilmeli. Tersi sessiz değil ama garip: iki jest aynı anda çalışır.

**Bilinen sınırlar.** (1) Döndürme HER ZAMAN 15°'lik adıma yakalanır —
`rotateAreaObject` panelden de bu kuralla yazıyor, Ctrl burada snap'i
KAPATMIYOR (boyutlandırmada kapatıyor). (2) Tek tutamaç var (sağ-alt);
kullanıcı dört köşe/kenar ortası istemedi. (3) Tarayıcıda tutamaçların
ÇİZİMİ doğrulandı (daire+sap+kare görünüyor, nesne dönünce onlar da dönüyor)
ama sürükleme etkileşimi izole edilemedi — editör aynı anda kullanıcı
tarafından da kullanılıyordu.

Nerede: `core/areaObjectHandles.ts` (yeni), `core/areaObject.ts`
(`MIN_AREA_OBJECT_SIZE_CM` store'dan buraya taşındı — iki taraf da okuyor),
`store/areaObjectOps.ts`, `store/architectureUiStore.ts`,
`scene/useAreaObjectHandleTool.ts` (yeni), `scene/AreaObjectHandles.tsx` (yeni),
`scene/ArchitectureLayer.tsx` ve sahiplenme kontrolü eklenen beş hook:
`useAreaObjectSelectionTool`, `useSelectionTool`, `useWallSelectionTool`,
`usePointSymbolSelectionTool`, `usePointDragTool`.
Testler `core/__tests__/areaObjectHandles.test.ts`,
`store/__tests__/areaObjectActions.test.ts`.

### K45 — Transform kontrolleri WebGL çiziminden DOM overlay'ine taşındı

K44'ün tutamaçları WebGL ile çiziliyordu: büyük mavi daire + kare, dünya
biriminde (zoom'la ölçeklenen). Kullanıcı Figma/CAD tarzı sade bir overlay
istedi: küçük `↻` / `↘` ikonları, hover'da belirginleşme, uygun imleç,
sürüklerken `45°` / `120 × 80 cm` balonu ve **zoom'dan bağımsız sabit piksel
boyu**.

**Neden DOM (drei `<Html>`), neden WebGL değil.** İkon glyph'i, imleç biçimi ve
tooltip WebGL'de ya imkânsız ya da elle çizim işi; DOM'da bedava. `RoomNameEditor`
zaten aynı gerekçeyle `<Html>` kullanıyor (kural 2 orada da esnetilmiş).
Sahne tarafında `<Text>` seçeneği vardı ama repo fontunda `↻`/`↘` glyph'i
garanti değil ve imleç/tooltip yine çözülmezdi.

⚠️ **Overlay `pointer-events: none` — bu ŞART, süs değil.** Tıklama tuvale
ulaşmalı: tutma kararını `useAreaObjectHandleTool` saf geometriyle veriyor
(`findAreaObjectHandleAt`). Overlay olayı yeseydi (a) sürükleme hiç başlamazdı,
(b) drei `<Html>`'in AYRI react-dom kökünden yapılan store yazımı R3F ağacını
tazelemezdi — RoomNameEditor'ın native dinleyiciye kaçmasına sebep olan tuzağın
ta kendisi. Sonuç: hover'ı da overlay kendisi anlayamaz, tuval tarafı
`areaObjectHandleHover` ile yayınlar.

**Konum artık BOUNDING BOX'tan, modelin width/length'inden değil.**
`getAreaObjectLocalBounds` kutuyu `getAreaObjectPlanGeometry`'nin ÜRETTİĞİ
noktalardan okur — tip başına elle yazılmaz, yeni şekil eklendiğinde tutamaçlar
kendiliğinden doğru yere gelir. Kolon havalandırması için gerekliydi: daire
çapı `min(width, length)`, kutuyu modelden türetmek ikonları dairenin görünür
kenarından uzağa düşürüyordu (kullanıcının istediği düzeltme). Kutu nesneyle
birlikte DÖNER (eksen hizalı değil).

**Ekran-sabit boy.** `useCameraZoom` (tepkili zoom) + `px / zoom` çevrimi;
ikon 14 px, görünmez tutma alanı 28 px, kutuya uzaklık 18 px — hepsi zoom'dan
bağımsız. Hook `plumbing/scene/`'den `scene/`'e TAŞINDI (kamera altyapısı
ortak, `cameraViewport.ts` ile aynı yer); tesisattaki eski yol 5 dosyanın
import'unu değiştirmemek için yeniden dışa aktarım olarak bırakıldı.

⚠️ **Bilinen davranış değişikliği:** boyutlandırma artık KUTUYU ölçüyor. Kolon
havalandırmasında genişlik≠uzunluk ise (daire zaten `min`'i kullanıyor) resize
nesneyi kareye indirger — dairenin kullanmadığı fazlalık düşer. Diğer tiplerde
kutu = width×length, davranış birebir aynı.

🐞 **`pointer-events: none` İÇ div'e yazılınca YETMEDİ — tutamaçlar tümüyle
çalışmadı.** drei `<Html>` iki div üretiyor: portala eklenen SARMALAYICI (`el`)
ve içindeki içerik div'i. `transform` propu KAPALIYKEN sarmalayıcının
`cssText`'ine pointer-events hiç yazılmıyor (yalnız `transform` modunda `none`
oluyor) — yani sarmalayıcı varsayılan `auto` ile basışı yutuyor, DrawSurface
pointerdown'ı hiç görmüyordu. Çözüm: `<Html wrapperClass="pointer-events-none">`
— sınıf sarmalayıcıya gider, içerik ondan miras alır. **Ders:** drei `<Html>`
ile olay geçirgenliği isteniyorsa `className` DEĞİL `wrapperClass` kullanılır.

**Tarayıcıda doğrulandı** (yukarıdaki hata düzeltildikten sonra): kesik çizgili
kutu, ikon yerleşimi, ↘ ile boyutlandırma (140×330 → 201×488) ve ↻ ile döndürme
(0° → 270°, 15°'ye yakalanarak) çalışıyor, Ctrl+Z tek adımda geri alıyor.
Sınanmadı: sağ paneli örten konumdaki tutamaç (panel overlay'i çizim alanının
üstüne biniyor, K37 — nesne panelin altında kalırsa ikonlar erişilemez oluyor).

Nerede: `core/areaObjectHandles.ts` (baştan yazıldı),
`scene/AreaObjectHandles.tsx` (baştan yazıldı), `scene/useAreaObjectHandleTool.ts`,
`scene/useCameraZoom.ts` (taşındı), `plumbing/scene/useCameraZoom.ts` (re-export),
`store/architectureUiStore.ts` (`areaObjectHandleHover`) ve `findSelectedAreaObjectHandle`
imzası zoom'a döndüğü için K44'teki beş hook.
Testler `core/__tests__/areaObjectHandles.test.ts` (kutu türetimi ve
piksel-sabit tutma alanı dahil).

### K46 — Alan nesnesinin içi artık ŞEFFAF değil, çok soluk DOLGULU

K39'un "içi tamamen şeffaf" tasarımı kalktı. Sebep kullanıcının bildirdiği
durum: bir kolon duvar KÖŞESİNİN üstüne oturtulduğunda nesnenin tam ortasına
tıklamak kolonu değil altındaki köşeyi tutuyor — içi boş bir nesne "burada bir
şey yok" gibi okunuyordu. Dolgu, gövdenin sahiplendiği alanı görünür kılıyor.

Dolgu gövdenin DIŞ HATTINI izler, tıklanabilir alanı değil: kolon
havalandırmasında ÇEMBER, diğerlerinde dikdörtgen. Geometri
(`getAreaObjectPlanGeometry`) artık `strokes` yanında tek bir `fill` poligonu
döndürüyor — her tipin gövdesi tek dışbükey kapalı biçim olduğu için bir poligon
yetiyor. Üçgenleştirme odadan devralınıyor (`core/roomFill.ts` →
`triangulatePolygon`), ikinci bir kopya yazılmadı. Çemberin kapanış noktası
dolguya girmiyor: yinelenen köşe dejenere üçgen üretirdi.

Renk konturla aynı (`areaObjectStroke` = `areaObjectFill`), opaklık 0.12 —
oda dolgusundan (0.22) belirgin biçimde soluk, altındaki duvar ve ızgara
okunmaya devam ediyor. Hover/seçim tonunda dolgu da o rengi alır. Önizlemede
opaklık ayrıca `PREVIEW_OPACITY` ile çarpılır, yoksa önizleme yerleştirilmiş
nesneden ağır görünürdü.

**Dolgu ayrı bir `renderOrder` katmanı istedi** (`areaObjectFill: 31`,
önizlemede `areaObjectPreviewFill: 69`): konturla aynı sırada kalsaydı OPAK
çizgiler saydam mesh'ten önce çizilir ve dolgu konturun üstünü boyardı — üçünün
de `depthWrite`'ı kapalı, sıralamayı yalnız `renderOrder` belirliyor.

⚠️ **Bu bir görsel düzeltme; asıl şikâyeti (ortadan tutunca köşe tutuluyor)
TAM ÇÖZMEZ.** Hedef çözümlemesinde (`core/architectureHover.ts`) köşe hâlâ alan
nesnesinin ÜSTÜNDE: nesnenin merkezi bir köşeye denk gelirse jest yine köşenin.
Önceliği çevirmek büyük bir merdivenin altında kalan köşeleri erişilemez
yapacağı için karara bağlanmadı — açık soru.

Nerede: `core/areaObjectGeometry.ts` (`fill` alanı), `scene/AreaObject.tsx`,
`scene/architectureTheme.ts`, `scene/layers.ts`.
Testler `core/__tests__/areaObjectGeometry.test.ts`.
Tarayıcıda doğrulandı (merdivenin dolgusu, seçili tonu ve döndürülmüş hâli).

### K47 — Kiriş: çizgisel yeni model, kesik konturlu dikdörtgen, uç tutamaçları

K38'den beri ertelenen kiriş eklendi. Alan nesnesine (`AreaObject`) GİRMEDİ,
söz verildiği gibi ayrı bir model: `Beam { id, floorId, x1,y1,x2,y2,
thicknessCm, label }` — referans formattaki `Beam{x1,y1,x2,y2,width,height}`
ile aynı aile.

**Duvarın `Point` havuzunu KULLANMIYOR, uçlarını kendi taşıyor.** Havuza
girseydi duvar bakımının tamamı kirişleri de görürdü: sahipsiz köşe temizliği
(`getOrphanPointIds`), kesişimde bölme (`splitWallsAtIntersections`), oda çevrimi
(`recomputeRoomsInDraft`). Kirişe açıklık takılmıyor, oda çevirmiyor ve
bölünmesi de istenmiyor — üçü de kirişi sessizce bozardı. Yükseklik alanı da
YOK: duvarın `height`'ı 3B içindi, kiriş 3B'de henüz yok.

**Görünüm: KESİK konturlu dikdörtgen + alan nesnesiyle aynı soluk dolgu**
(kullanıcı isteği). Duvarın kapsülünden (yuvarlak uçlu tek kalın `<Line>`, K23)
bilerek ayrıldı: kesikli bir kontur ancak gerçek bir dikdörtgen çevrimi
çizilerek elde edilir, dolayısıyla kirişin uçları DÜZ. Kalınlık duvarın
varsayılanıyla doğar (`DEFAULT_WALL_THICKNESS_CM`) ama sabit bağlı değil,
panelden değişir. Renk duvarla aynı; kirişi duvardan ayıran tek şey konturun
kesik olması — plan çizimi geleneğinde kiriş kesitin dışında kalan, üstteki
elemandır.

**Katman sırası yeniden numaralandı.** Kiriş açıklığın ÜSTÜNDE (altına düşerse
duvar kütlesi onu yutar ve duvara oturan bir kiriş seçilemez hâle gelir),
sembol ve alan nesnesinin ALTINDA (ikisi de kirişten küçük). Dolgu yine kendi
sırasında (K46'daki gerekçe). Yeni sıra: `opening 30 → beamFill 31 → beam 32 →
pointSymbol 33 → areaObjectFill 34 → areaObject 35 → installationGhost 36`.
Hedef çözümlemesi (`architectureHover`) AYNI sırayı izliyor — ikisi ayrışırsa
vurgu "şunu tutarsın" der, basış başka şeyi tutar.

**Çizim jesti duvarınkiyle aynı ama ZİNCİRSİZ.** İlk sol tık başlangıcı koyar,
ikinci tık kirişi yazar, sonra yeni bir başlangıç gerekir: kirişler duvarlar
gibi kapalı çevrim kurmuyor, zincir kullanıcıya istemediği ikinci kirişi
kazayla çizdirirdi. Sağ tık yarım jesti atıp paleti Seçim Aracı'na döndürür
(K42 sözleşmesi). Snap duvar aracıyla aynı (`resolveSnap`): uç duvar köşesine
ve gövdesine yapışır, Ctrl ızgarayı kapatır.

**Uç tutamaçları K44'ün dersini tekrarladı.** İki uçtaki tutamaç kirişin
gövdesinin İÇİNDE duruyor, yani aynı pointerdown'ı kiriş taşıma da görüyor;
`findSelectedBeamHandle` isabet ederse diğer hook'lar jesti hiç başlatmıyor.
Kontrol yine BEŞ hook'a eklendi (`useAreaObjectSelectionTool`,
`useSelectionTool`, `useWallSelectionTool`, `usePointSymbolSelectionTool`,
`usePointDragTool`) — alan nesnesi tutamacının yanına. Tutamaç boyu ekran
pikselinde sabit (`useCameraZoom`, K45 kuralı).

**Kapsam dışı bırakılanlar.** (1) Grup dönüşümü (KK-11 döndür/aynala) ve Ctrl+D
çoğaltma kirişi KAPSAMIYOR — alan nesnesi de kapsamıyor (`transformOps.ts`
yalnız duvar ve sembol biliyor), yeni tür oraya eklenirken ikisi birlikte
düşünülmeli. (2) Panelde uzunluk SALT OKUNUR: bir sayı hangi ucun oynayacağını
söylemiyor, uzatma tuvalde yapılır. (3) K35/K36 açıklık koruması kirişe
UYGULANMADI: kiriş tavan seviyesinde, kapının üstünden geçmesi normal — o kural
düşey elemanlar (kolon, merdiven) içindi.

Nerede: `core/model.ts` (`Beam`), `core/beam.ts` + `core/beamHandles.ts` (yeni),
`core/serialize.ts`, `core/selection.ts`, `core/architectureHover.ts`,
`core/floorClone.ts`, `core/floorContent.ts`, `core/propertyFields.ts`,
`core/tools.ts`, `store/beamOps.ts` (yeni), `store/architectureSlice.ts`,
`store/architectureData.ts`, `store/architectureUiStore.ts`, `store/cadStore.ts`,
`store/history.ts`, `store/selectionOps.ts`, `store/floorOps.ts`,
`store/floorCloneOps.ts`, `scene/Beam.tsx` + `scene/BeamHandles.tsx` +
`scene/useBeamTool.ts` + `scene/useBeamSelectionTool.ts` +
`scene/useBeamHandleTool.ts` (yeni), `scene/ArchitectureLayer.tsx`,
`scene/layers.ts`, `scene/architectureLayers.ts`,
`ui/properties/BeamProperties.tsx` (yeni), `ui/PropertyPanel.tsx`,
`ui/floors/floorCountText.ts`, `ui/floors/useFloorContentSource.ts`.
Testler `core/__tests__/beam.test.ts`, `core/__tests__/beamHandles.test.ts`,
`store/__tests__/beamActions.test.ts`.

**Tarayıcıda doğrulandı** (kullanıcı tarafından): kesik kontur, dolgu, iki
tıklı çizim ve uçtan uzatma çalışıyor.

### K48 — Taşımanın açıklık koruması İKİ YÖNLÜ oldu (K35/K36'nın sessiz boşluğu)

Kapısı olan bir duvarı sürükleyip kapıyı BAŞKA bir duvarın üstüne bindirmek
engellenmiyordu. Fizik aynı fizik (bir kapı boşluğunun ortasında duvar
duramaz), yalnız roller ters — ve o ters hâli hiç kontrol edilmiyordu.

**Sebep asimetri.** `findBlockingOpeningInSegments` yalnız şunu soruyor: "hareket
eden segment, SABİT bir duvarın açıklığını kesiyor mu". Taşınan duvarın kendisi
`stationaryWalls` listesinden zaten çıkarılmış (haklı olarak — kendi eski
hâliyle kıyaslamak anlamsız), dolayısıyla ONUN açıklıkları hiçbir zaman
sorulmuyordu. Hata sessizdi: kullanıcı kapıyı duvarın içine gömüyor, hiçbir
uyarı çıkmıyordu.

**Çözüm ters yönü de sormak.** `findBlockingOpeningOnMovedWalls` taşınan duvarı
"açıklığı taşıyan" taraf, sabit duvarları "aday" taraf sayıyor —
`getInteriorCrossing`'in argümanları yer değiştirmiş hâli, aynı matematik.
İkisini `findBlockingOpeningForMove` birleştiriyor ve çağıranlar YALNIZ onu
kullanıyor: iki ayrı çağrı bırakılsaydı biri unutulur ve hata yine sessiz olurdu.

⚠️ **Segmentin uç sırası artık anlamlı.** `Opening.offsetCm` duvarın p1 ucundan
ölçülüyor, dolayısıyla taşınan segmentin uçları duvarın `p1Id → p2Id` sırasında
gelmek zorunda. `getPointMoveImpact` eskiden "diğer uç önce" yazıyordu (taşınan
köşe her zaman p2 oluyordu) — ters çevrilmiş bir duvarda açıklık öbür uçta
aranırdı. Tip de bunu söylüyor: `WallEnds` yerine `MovedWallSegment`
(`wallId` + p1/p2), yani açıklığı bulmak için gereken kimlik de segmentle
birlikte taşınıyor.

**Bilinen sınır (K36'dan miras, değişmedi):** köşe taşımada yalnız o köşeye
BAĞLI duvarlar kontrol ediliyor; seçili olmayan ama paylaşılan köşe yüzünden
ESNEYEN komşu duvarlar hâlâ kapsam dışı.

Nerede: `core/wallGraph.ts` (`findBlockingOpeningOnMovedWalls`,
`findBlockingOpeningForMove`), `core/wall.ts` (`MovedWallSegment`,
`getPointMoveImpact` uç sırası), `scene/usePointDragTool.ts`,
`scene/useWallSelectionTool.ts`.
Testler `core/__tests__/wallMoveImpact.test.ts`.

### K49 — Grup dönüşümü ve çoğaltma artık alan nesnesini ve kirişi de kapsıyor

`transformOps.ts` yalnız duvar ve nokta sembolü biliyordu: bir kolon ya da
kiriş seçip döndür/aynala/Ctrl+D'ye basmak HİÇBİR ŞEY yapmıyordu (sessizce
`false` dönüyordu) ve paneldeki düğmeler zaten `hasWall` koşuluyla pasifti.
Kiriş eklenince (K47) borç ikiye katlandı; ikisi tek işte kapatıldı çünkü aynı
dört noktaya (dayanak, dönüşüm, çoğaltma, düğme aktifliği) dokunuyorlar.

**Dayanak (pivot) her türü sayar.** Yalnız kolon seçiliyken sınır kutusu onun
merkezinden kuruluyor; yoksa `getPointsCenter` boş dizi alır, dayanak
bulunamaz ve döndürme hiç çalışmazdı. Kirişin İKİ ucu da giriyor: merkezini
almak uzun bir kirişin kapladığı alanı olduğundan küçük gösterirdi.

**Açı işi türe göre farklı.** Alan nesnesi serbest sembolle aynı: merkez
dönüşümden, `angleDeg` `applyTransformToAngleDeg`'den geçer — yoksa 90° dönen
grubun içinde nesne yer değiştirir ama dik kalır. Kirişin açı ALANI YOK, yönü
iki ucundan türüyor; uçları dönüştürmek açıyı kendiliğinden döndürüyor.

**Çoğaltma ayrı dosyaya çıktı** (`store/duplicateOps.ts`): `transformOps.ts`
dört türle birlikte 330 satırı geçiyordu. Bölme sırasında ortak yardımcı
`collectMovingPointIds` iki dosyanın da işine yarıyordu ve `store/` içinde
bırakılsaydı karşılıklı import → çalışma zamanı döngüsü olurdu (K17'nin aynı
tuzağı); saf hâliyle `core/wall.ts`'e `collectWallPointIds` olarak taşındı.

Etiket taşıyan üç tür (sembol, alan nesnesi, kiriş) kopyada etiketini YENİDEN
üretir ve kopyalar TEK TEK diziye eklenir: sıradaki etiket bir önceki kopyayı
da görmeli, yoksa iki kopya aynı adı alır (KK-10).

**Panel düğmelerinin koşulu değişti:** `hasWall` → "açıklık DIŞINDA bir şey
seçili". Açıklık kendi koordinatını taşımıyor (duvarına offset'le bağlı), yalnız
o seçiliyken dönüşümün uygulanacağı bir koordinat yok — diğer dört tür taşıyor.

⚠️ **Bilinen sınır (yeni değil, artık yazılı): grup dönüşümünde açıklık
koruması ÇALIŞMIYOR.** Ne duvarlar (K35/K36/K48) ne alan nesneleri için. Tek
nesne sürüklemede kontrol var, bu yolda yok: burada duvarın kendisi de
oynayabildiği için "hangi duvara göre" sorusunun tek cevabı yok ve kısmen
uygulanan bir grup dönüşümü tek-Ctrl+Z sözleşmesini bozardı. Kapatılırsa DÖRT
tür için birden kapatılmalı.

Nerede: `store/transformOps.ts`, `store/duplicateOps.ts` (yeni),
`core/wall.ts` (`collectWallPointIds`), `ui/properties/SelectionActions.tsx`.
Testler `store/__tests__/transformAreaObjectBeam.test.ts`.

### K50 — Alan nesnelerine sürüklenebilir AD etiketi (tesisatın desenini devraldı)

Kullanıcı "planda ne olduğu anlaşılsın" dedi ve örnek olarak tesisattaki servis
kutusu etiketini gösterdi. Aynı desen mimari tarafa taşındı: kesikli kılavuz
çizgisiyle nesneye bağlı, sürüklenebilir bir ad etiketi.

**Yazan şey TÜRÜN adı ("Kolon"), nesnenin `label` kodu ("K-01") DEĞİL.**
Kullanıcı seçti; kod tek başına ne olduğunu söylemiyor. Kod panelde duruyor ve
düzenlenebilir kalıyor — ikisi ayrı işler.

**Kapsam üç tür: kolon, baca şaftı, kolon havalandırması.** Merdiven DIŞARIDA
(kullanıcı seçti): iniş oku ve basamakları zaten ne olduğunu söylüyor, etiket
çizimi kalabalıklaştırırdı. Kiriş de dışarıda — kesik konturu onu ayırıyor.
Çizim de tutma sınavı da bu TEK kuraldan (`hasAreaObjectNameLabel`) okur;
ayrışsalar görünmez bir etiket tutulabilir olurdu.

**Kayma nesneye GÖRELİ saklanır** (`AreaObject.labelOffsetCm`, opsiyonel), mutlak
konum değil: nesne taşınınca etiket kendiliğinden birlikte gelir.
`InstallationElement.labelOffsetCm` ile birebir aynı gerekçe. Alan yoksa etiket
varsayılan yerinde (kutunun üstünde) durur, yani eski çizimler ve hiç
dokunulmamış nesneler alansız kalır — `JSON.stringify` undefined'ı atladığı için
bit-bit tur da bozulmaz.

**Varsayılan konum ÇİZİLEN geometrinin dünya kutusundan türer.** Yerel kutu
döndürülüp eksen hizalı kutuya çevriliyor: nesne dönse de yazı dik duruyor,
dolayısıyla payı dünya kutusundan ölçmek gerek. Kolon havalandırmasında kutu
çemberden geliyor (K45'teki `getAreaObjectLocalBounds` yeniden kullanıldı), yani
etiket dairenin görünür kenarına oturuyor.

**Kılavuz kırpması `core/labelLeader.ts`'e TAŞINDI.** `clipLeaderEndToRectCm`
tesisat tarafındaydı (`plumbing/core/elementLabel.ts`) ve mimari onu fay sınırı
yüzünden import edemezdi; ikinci bir kopya yazmak yerine `core/`'a taşınıp eski
yerinden yeniden dışa aktarıldı (`plumbing/scene/useCameraZoom.ts` deseni).
Tesisat tarafındaki çağıranların yolu değişmedi.

**Jest sahipliği yine BEŞ hook'a dokundu (K44 dersi, üçüncü kez).** Etiket
gövdenin DIŞINDA ve kullanıcı onu istediği yere sürükleyebiliyor, dolayısıyla
hedef çözümlemesi orayı "boşluk" sayıyor ve çerçeve seçimi başlıyordu.
`findAreaObjectLabelAt` isabet ederse diğer hook'lar jesti hiç başlatmıyor.
Silgi etikete DEĞMEZ: oradaki basış nesneyi silmek içindir.

Kayma ızgaraya YAKALANMAZ — etiket bir açıklama notudur, çizim geometrisi değil.

⚠️ **Tarayıcıda DOĞRULANMADI:** doğrulama sırasında oturum düştü (giriş ekranı),
kimlik bilgisi girilmedi. Sınanacaklar: yazının okunabilirliği ve ekran-sabit
boyu, kılavuzun yazının altına girmemesi, sürüklemenin akıcılığı, etiketin
nesne taşınırken/boyutlanırken ona yapışık kalması.

Nerede: `core/model.ts` (`labelOffsetCm`), `core/areaObjectLabel.ts` (yeni),
`core/labelLeader.ts` (yeni, taşındı), `core/serialize.ts`,
`plumbing/core/elementLabel.ts` (yeniden dışa aktarım),
`store/areaObjectOps.ts`, `store/architectureUiStore.ts`,
`scene/AreaObjectNameLabels.tsx` + `scene/useAreaObjectLabelTool.ts` (yeni),
`scene/ArchitectureLayer.tsx` ve sahiplenme kontrolü eklenen beş hook.
Testler `core/__tests__/areaObjectLabel.test.ts`,
`store/__tests__/areaObjectActions.test.ts`.

### K51 — Alan nesnesi düzenlemesindeki üç tutarsızlık; köşe önceliği KARARA BAĞLANDI

K44/K45/K46'dan kalan üç bilinen sınır ele alındı. İkisi düzeltildi, biri
kullanıcı kararıyla OLDUĞU GİBİ bırakıldı.

**1) Ctrl artık döndürmede de bir şey yapıyor.** Boyutlandırmada Ctrl ızgarayı
kapatıyordu, döndürmede hiçbir etkisi yoktu — aynı tuş aynı jestte iki farklı
anlama geliyordu. Artık Ctrl 15°'lik yakalamayı kapatıyor.

`rotateAreaObject` üçüncü bir `isSnapEnabled` parametresi aldı (varsayılan
`true`): panel ham değer gönderip yakalanmasını bekliyor (KK-3), tutamaç yolu
ise açıyı önizlemede zaten yakalayıp `false` geçiyor. Bu şart — store ikinci kez
yakalasaydı Ctrl'ün etkisi bırakma anında sessizce silinirdi.

Yakalama kapalıyken açı yine 0-359'a indirgeniyor (`normalizeAngleDeg`,
`core/transform.ts`): -30 ile 330 aynı açı, ikisi ayrı değer olarak saklanırsa
panel farklı sayı gösterir ve "değişti mi" karşılaştırmaları boşuna true döner.

**2) Kolon havalandırmasında panel artık tek "Çap" alanı gösteriyor.** Tip
yalnız çember çiziyor ve çapı `min(genişlik, uzunluk)`; iki ayrı alan varken
kullanıcının girdiği fazlalık HİÇ çizilmiyor, üstelik tutamaçla ilk dokunuşta
sessizce siliniyordu (tutamaç kutusu çizilen geometriden türüyor, çemberde o
kutu KARE — K45). Tek alan ikisine de aynı değeri yazıyor, dolayısıyla
genişlik≠uzunluk durumu artık HİÇ oluşmuyor ve kaybolacak bir değer kalmıyor.

Ayrım `core/areaObject.ts` → `hasAreaObjectRectangleSize`'da, panelde gömülü
tip kontrolü değil. Baca şaftının da çemberi var ama KARE dış hattı da var:
ölçüsü dikdörtgen kalıyor.

**3) Köşe, alan nesnesinin ÜSTÜNDE kalıyor — artık bilinen sınır değil, KARAR.**
Bir kolonun merkezi duvar köşesine denk gelirse tıklama kolonu değil köşeyi
tutuyor. K46'da açık soru olarak bırakılmıştı; kullanıcı "köşe öncelikli kalsın"
dedi. Gerekçe: önceliği çevirmek büyük bir merdivenin ya da kolonun altında
kalan duvar köşelerini erişilemez yapardı — köşe duvar grafının düzenlenebilir
tek yeri, alan nesnesi ise gövdesinin her yerinden tutulabiliyor. K46'nın
dolgusu zaten "burada bir nesne var" sorusunu görsel olarak çözmüştü.

Nerede: `core/transform.ts` (`normalizeAngleDeg`), `core/areaObject.ts`
(`hasAreaObjectRectangleSize`), `store/areaObjectOps.ts`,
`scene/useAreaObjectHandleTool.ts`, `ui/properties/AreaObjectProperties.tsx`.
Testler `core/__tests__/areaObject.test.ts`,
`store/__tests__/areaObjectActions.test.ts`.

Tarayıcıda doğrulandı: panelde "Çap (cm)" alanı görünüyor.

### K52 — K51'in iki eksiği: daire tutamaçla büyümüyordu, Ctrl bırakışta siliniyordu

K51 iki sorunu yarım kapatmış; kullanıcı ikisini de bildirdi.

**1) Kolon havalandırması aşağı çekilince BÜYÜMÜYOR, KAYIYORDU.** K51 paneli tek
"Çap" alanına indirdi ama TUTAMAÇ yolu hâlâ iki ölçüyü ayrı yazıyordu: aşağı
sürükleme yalnız `lengthCm`'i büyütüyor, çap `min(width, length)` olduğu için
daire aynı boyda kalıyor, ama merkez kaydığı için aşağı yürüyordu — panelde
uzunluk artıyor, ekranda daire kayıyordu.

`resizeAreaObjectFromCorner` artık yalnız çap taşıyan tipte iki izdüşümün
BÜYÜĞÜNÜ alıp ikisine de yazıyor: hangi yöne çekilirse çekilsin daire büyür ve
sabit köşeye çapalı kalır. Ayrım yine `hasAreaObjectRectangleSize`'dan, panelle
AYNI kaynaktan.

**2) Bırakma anında değiştirici tuş yeniden okunuyordu.** `handlePointerUp`
şekli `readShape(event)` ile YENİDEN hesaplıyordu, yani karar pointerup'ın
`ctrlKey`'ine bakıyordu. Kullanıcı Ctrl'ü fareden ÖNCE bıraktığında — ki sık
olan sıra bu — serbest döndürdüğü nesne son anda 15°'ye zıplıyordu; K51'in
düzeltmesi ekranda çalışıp yazımda siliniyordu. Aynı şey ızgarasız
boyutlandırmada da oluyordu.

Artık store'a yazılan şey EKRANDA GÖRÜLEN önizlemenin ta kendisi
(`areaObjectHandleDrag.shape`), pointerup'tan türetilen yeni bir hesap değil.
Bu aynı zamanda "hiç hareket etmediyse yazma" kontrolünü de sadeleştirdi:
önizleme yoksa yazacak bir şey de yok.

⚠️ **Ders:** sürüklemeli bir jestte sonuç, son POINTERMOVE'dan gelmeli.
Pointerup'ta yeniden hesaplamak, kullanıcının bıraktığı anda tuş durumu
değişmişse ekranda gördüğünden başka bir sonuç yazar.

Nerede: `core/areaObjectHandles.ts` (`resizeAreaObjectFromCorner`),
`scene/useAreaObjectHandleTool.ts`.
Testler `core/__tests__/areaObjectHandles.test.ts`.

### K53 — Sağ panelin aç/kapa oku kalktı; görünüm değişince panel kapanıyor

**Aç/kapa oku kaldırıldı.** Başlık bir düğmeydi ve içeriği katlıyordu; artık düz
bir `<h2>`. Panel zaten seçim varken açılıp seçim bitince kapanıyor (K37), ikinci
bir aç/kapa durumu kullanıcıya iki farklı "kapalı" hâli öğretiyordu: biri
nesneyi bırakınca, öteki oka basınca. Kullanıcı gereksiz buldu.

**Görünüm değişince panel KAPANIR.** Mimari ↔ tesisat geçişinde açık kalıyordu:
duvar seçiliyken tesisata geçen kullanıcı, o görünümde anlamı olmayan bir duvar
panelini görmeye devam ediyordu.

Kapanma SEÇİMİ BIRAKARAK yapılıyor, paneli ayrıca gizleyerek değil. Panel
seçimin saf bir türevi (K37); "kapalı ama seçim duruyor" gibi ikinci bir durum
iki ayrı doğruluk kaynağı olurdu ve kullanıcı geri döndüğünde panel
kendiliğinden yeniden açılırdı.

⚠️ **Önceki görünüm bir ref'te tutuluyor.** İlk yazımda effect yalnız bağımlılık
dizisine güveniyordu, yani MOUNT anında da seçimi siliyordu. Bugünkü akışta
zararsız görünürdü (editör boş seçimle açılıyor) ama panelin her yeniden
bağlanmasında kullanıcının seçimi sessizce giderdi — mevcut testler bunu
yakaladı.

Tesisat tarafında ayrı bir özellik paneli YOK (`src/plumbing/ui/` yalnız
palet), dolayısıyla "iki yönde de kapansın" tek panelin temizlenmesiyle
karşılanıyor. Tesisatın kendi seçimi (`plumbingUiStore`) C'nin dosyası ve
görünür bir panel açmadığı için dokunulmadı — tesisata bir panel eklenirse aynı
kural oraya da yazılmalı.

Nerede: `ui/PropertyPanel.tsx`.
Testler `ui/__tests__/PropertyPanel.test.tsx` (başlık artık `heading` rolüyle
sorgulanıyor; katlama testi silindi, görünüm değişimi için üç test eklendi),
`ui/__tests__/AreaObjectProperties.test.tsx`,
`ui/__tests__/PointSymbolProperties.test.tsx`.

### K54 — Tuval üstünde yüzen çubuk: çalışma kipi ve çizim yardımcıları

Çizim alanının ALT-ORTASINA Figma tarzı kompakt bir çubuk eklendi:
`[Seç | El] [Geri | Yinele] [↓ | Kat | ↑] [Snap] [Görünüm ▾]`.

**Sınır net: çubuk nesne ÖZELLİĞİ düzenlemez.** O sağ panelin işi (K37/K53);
buradakiler tuvalin çalışma kipi ve çizim yardımcıları. İki yüzeyin işi
karışırsa kullanıcı aynı ayarı iki yerde arar.

Yalnız MİMARİ görünümde mount edilir: tesisatın kendi paleti ve kipleri var.

**El aracı palete GİRMEDİ** (kullanıcı seçti): `core/tools.ts`'teki 22 araç
issue 2.7'nin çizim paleti, el ise bir çizim aracı değil canvas çalışma kipi.
`uiStore.isPanModeActive` olarak yaşıyor ve **Space'in yapışkan hâli** gibi
davranıyor — `DrawSurface`'in yayın bastırması ve `useViewportControls`'un pan
kavraması AYNI yoldan geçiyor, ikinci bir pan uygulaması yazılmadı. Bir çizim
aracı seçmek el modundan otomatik çıkarır: ikisi açıkken sol tuş hem pan hem
çizim yapamaz ve kullanıcı sebebini göremezdi.

⚠️ İmleç biçimi için `uiStore`'a abonelik gerekti: el modu bir DÜĞMEYLE
değişiyor, jestle değil — imleç bir pointer olayı beklemeden güncellenmeli,
yoksa kullanıcı fareyi oynatana kadar eski imleci görür.

**Snap anahtarı yalnız IZGARA yakalamasını kapatır** (kullanıcı seçti).
Uç/köşe/duvar yakalaması etkilenmez: kapansaydı duvarlar köşede birleşmez, oda
çevrimi kapanmaz ve mahal tespiti çalışmazdı. Ctrl'ün anlık kapatması bunun
ÜSTÜNE biner (`isGridSnapEnabled && !ctrlKey`) ve karar tek yerde —
`scene/gridSnapMode.ts`. Beş araç hook'u aynı soruyu soruyor; her biri kendi
`!event.ctrlKey`'ini yazsaydı anahtar eklenirken biri unutulur ve o araçta snap
sessizce açık kalırdı.

**Görünüm açılırı props ile besleniyor**, maddeler bileşene gömülü değil: ölçü/
açı/isim anahtarları kendi aşamalarında eklenecek ve bu bileşen değişmeyecek.
Bu MR'da yalnız Izgara var — ölü anahtar bırakılmadı, her düğme ilk günden
çalışıyor. `MenuDropdown` yeniden kullanılmadı: o `MenuDefinition` sözleşmesine
bağlı ve buraya menü çubuğunun grup/kısayol yapısını taşımak gerekirdi.

**Vurgu rengi SEÇİM rengi, marka sarısı DEĞİL** (`canvasBarVariants.ts`):
çubuk çizim alanının üstünde duruyor ve marka sarısı çizim alanına giremez
(CLAUDE.md ürün kuralı). Menü çubuğunun `chromeButtonVariants`'ı bu yüzden
yeniden kullanılmadı.

### K55 — Kat şeridi kaldırıldı, işini çubuktaki açılır devraldı

Sol üstteki `FloorStrip` (KK-21…KK-23) kaldırıldı: iki ayrı kat kontrolü
tuvalin iki köşesinde duruyordu. Şeridin taşıdığı ve ↓/↑ oklarının
KARŞILAMADIĞI iki bilgi çubuktaki açılıra taşındı — katların tam listesi
(uzak bir kata tek adımda gitmek; oklarla aradaki her kattan geçmek gerekirdi)
ve hangi katın BOŞ olduğu (içi boş halka işareti, şeritten devralındı).

Sıra ALTTAN ÜSTE, yani store dizisinin kendi sırası — şeritteki kuralın aynısı.
"Katlar" penceresi listeyi ters çevirmeye devam eder (orada bina kesitten
okunuyor); iki yön bilerek farklı.

`FloorStrip.tsx` ve testi silindi. `floors/floorVariants.ts` DURUYOR: kat
pencereleri (`FloorCopyDialog`, `FloorManagementDialog`, `AddFloorMenu`) hâlâ
`FLOOR_FOCUS_RING`'i kullanıyor.

**Kabul kriterlerinin karşılığı.** "Kat Yönetimi ve Kat Kopyalama" talebi üç
kriteri şeride yazmıştı; bu karar üçünü aynı biçimde etkilemiyor, kırılım
aşağıda. Şeridi arayan bir göz kontrolü bu üç maddeyi "eksik" diye yazmasın —
KK-21/KK-23 kapsam dışı, KK-22 duruyor.

- **KK-21 — KAPSAM DIŞI.** Şeridin kendisi (yatay düğme dizisi, dolu vurgulu
  aktif kat) yok. Taşıdığı iki bilgi `ui/canvas/FloorSelect.tsx`'te yaşıyor:
  aktif kat açılırın düğmesinde yazıyor, boş katlar açılır listede içi boş
  halkayla ayrılıyor. Katın eklenmesi/silinmesi/adı/sırası değişince liste
  zaten `cadStore`'dan türediği için anında güncel — kriterin "anında
  güncellenir" şartı sunum değiştiği hâlde korundu.
- **KK-22 — DURUYOR, yalnız tıklama yüzeyi değişti.** Aktif kat değiştirmenin
  dört yolundan üçü kriterin istediği gibi çalışıyor: menüdeki "Üst/Alt Kata
  Geç", Page Up/Page Down (`pages/useEditorShortcuts.ts`) ve "Katlar"
  penceresi. Dördüncüsü "şeritteki kata tıklama" yerine açılırdan kat seçme
  oldu. Kriterin geri kalanı aynen geçerli ve yazılı: çizim alanı terk
  edilmiyor, aktif katın altındaki kat soluk gösteriliyor
  (`scene/FloorBelowGhost.tsx`, `SceneRoot.tsx`), durum çubuğu güncelleniyor
  (`StatusBar.tsx`).
- **KK-23 — KONUSUZ KALDI.** Kriter "kat sayısı şeride sığmadığında şerit
  kayar, aktif kat görünür kalır" diyor; taşan bir şerit olmadığı için
  karşılanacak bir şey de yok. Aynı sorunun açılırdaki karşılığı listenin
  kendi içinde kaydırılmasıyla çözüldü (`max-h-64 overflow-y-auto`) — 40 katlı
  binada liste ekranı taşmıyor.

Talep metni ile kod arasındaki bu fark BİLEREK bırakıldı: docx sabit, karar
sonradan verildi. Sıradaki revizyonda talep metni güncellenecekse KK-21 ve
KK-23 düşürülür, KK-22'nin "şeritteki bir kata tıkladığında" ifadesi "kat
seçiciden bir kat seçtiğinde" olur.

### K56 — Görünüm açılırına nesne adı ve oda adı anahtarları

`Nesne adları` (alan nesnesi etiketleri, K50) ve `Oda adları` eklendi. İkisi de
varsayılan AÇIK: etiketler bugüne kadar hep görünüyordu, anahtar davranışı
değiştirmiyor — yalnız kapatma imkânı ekliyor.

**Oda adı ve alanı (m²) TEK madde.** İkisi aynı çapaya yazılmış tek yazı öbeği;
ayrı ayrı gizlemek ortada asılı bir sayı bırakırdı.

⚠️ **Ad DÜZENLEME kutusu anahtardan etkilenmez.** Kullanıcı çift tıklayıp adı
yazmaya başlamışsa yazdığını görmeli; anahtar yalnız salt-okunur etiketi gizler.

⚠️ **Gizli etiket TUTULAMAZ.** `findAreaObjectLabelAt` de anahtarı okuyor:
yalnız çizim durdurulsaydı görünmeyen etiketin tutma kutusu yerinde kalır ve
kullanıcı boşluğa bastığını sanarken hiçbir şey seçilmezdi. Tesisattaki
`pickElementLabelAt` aynı gerekçeyle `isElementLabelsVisible`'a bakıyor.

Kapsam bugün kolon/baca şaftı/kolon havalandırması (K50 kararı). Kapı, pencere,
merdiven ve kirişe genişletildiğinde aynı anahtardan yönetilecek.

Nerede: `ui/canvas/FloatingToolbar.tsx` + `ViewOptionsMenu.tsx` +
`canvasBarVariants.ts` (yeni), `scene/gridSnapMode.ts` (yeni),
`store/uiStore.ts`, `scene/DrawSurface.tsx`, `scene/useViewportControls.ts`,
snap çağıran beş hook, `pages/EditorPage.tsx`.

⚠️ **Tarayıcıda DOĞRULANMADI:** oturum düştü ve tarayıcı paneli kare üretmedi.
Sınanacaklar: çubuğun konumu/görünümü, el modunun sürüklemesi ve imleci, snap
anahtarının çizime etkisi, açılırın dışarı tıklamayla kapanması.

### K57 — Yüzen çubuk tesisatta da var; görünüme özel parçalar dallanıyor

Çubuk artık iki ÇİZİM görünümünde de mount ediliyor (izometrikte tuval
etkileşimi yok, orada yok). Ortak kontrollerin çoğu zaten hiçbir değişiklik
gerektirmedi:

- **Seç** — iki görünümün seçim aracı ayrı sabitlerde ama ikisi de `'selection'`.
  Yine de sabitler üzerinden okunuyor (`SELECTION_TOOL_ID` /
  `INSTALLATION_SELECTION_TOOL_ID`): biri değişirse çubuk sessizce şaşmasın.
- **El** — `DrawSurface` ve `useViewportControls` iki görünümde de mount
  ediliyor, pan modu zaten ortaktı.
- **Geri/Yinele, Kat** — `cadStore`, görünümden bağımsız.

**Görünüm menüsünün maddeleri görünüme göre seçiliyor.** Mimaride *Nesne
adları · Oda adları · Izgara*, tesisatta *Ölçüler · Eleman adları · Izgara*.
Tesisatın ikisi menü çubuğunda zaten vardı; çubuk onları TUVALE getiriyor,
durum tek yerde (`uiStore`) kaldığı için iki arayüz aynı bayrağı okuyor ve
ayrışamıyorlar.

⚠️ **Snap düğmesi tesisata KONMADI.** Tesisatın yakalaması bugün ızgara
GÖRÜNÜRLÜĞÜNE bağlı (`plumbing/scene/placementSnap.ts:18` →
`if (!isGridVisible) return planPoint`), yani orada "ızgarayı gizle" aynı
zamanda "yakalamayı kapat" demek. Mimarinin `isGridSnapEnabled`'ı ise ayrı bir
anahtar. Aynı düğmenin iki görünümde farklı şey ifade etmesi kötü olurdu;
hangi anlamın kalacağı tesisat sahibinin kararı (C fayı) ve o gelene kadar
düğme oraya konmuyor — **görünmeyen düğme, yanlış çalışan düğmeden iyidir**.

Karar verilince yapılacak: `placementSnap` `isGridSnapActive`'e geçer ve
`FloatingToolbar`'daki `isArchitecture` koşulu kalkar.

Nerede: `ui/canvas/FloatingToolbar.tsx`, `ui/canvas/ViewOptionsMenu.tsx`,
`pages/EditorPage.tsx`. Testler `ui/__tests__/FloatingToolbar.test.tsx` (yeni).

## 2026-08 · Aşama 5: Boru ve branşman çizimi

Çok noktalı hat çizimi devrede: sol tık nokta koyar, son noktadan imlece lastik
bant uzanır, tek sağ tık son noktayı geri alır, çift sağ tık hattı bitirip Seçim
aracına döner, Esc yarım hattı tümüyle iptal eder ve araç aktif kalır.

### Taslak kalıcı veriye girmez

Devam eden hat `plumbingUiStore.draftLine`'da yaşıyor; `cadStore`'a ancak
tamamlanınca tek `addLine` çağrısıyla giriyor. Hat + her nokta + her segment id'si
o tek `set()` içinde üretiliyor → tek `markDirty`, tek Ctrl+Z. Duvar aracı bilerek
farklı çalışıyor (her segment anında yazılıyor), çünkü duvar zinciri mevcut
geometriye bağlanabiliyor; hat böyle bir şey yapmıyor.

`addLine` iki noktadan azını reddediyor. `segments.length === points.length - 1`.

### Sağ tık ayrımı saf fonksiyonda

`core/pointerGestures.ts` → `resolveRightClick`. İlk sağ tık kararı 300 ms
(`DOUBLE_CLICK_WINDOW_MS`) erteler; pencere içinde ikinci tık gelirse "bitir",
gelmezse "son noktayı geri al". `setTimeout` hook'ta, karar saf fonksiyonda —
aksi hâlde jest yalnız elle denenerek doğrulanabilirdi (Risk R6).

Geliştirme sırasında kısa süre "tek sağ tık bitirir, Esc son noktada bitirir"
denendi; şartname metni gelince **geri alındı**. Değiştirmeden önce şartnameye
bakılmalı.

### Esc hat aracında araçtan çıkarmıyor

`useEscapeToSelectionTool` polyline araçlarını atlıyor. Yerleştirme aracında Esc
seçim aracına dönüyor (eski davranış), hat aracında yalnız taslağı siliyor —
kullanıcı paleti yeniden seçmeden yeni hatta başlayabilsin. Çift sağ tıkla bitirme
ise seçim aracına dönüyor.

### Çap kataloğu ve renk (K-W1, K-W2 uygulaması)

`plumbing/core/pipeTypes.ts` dokuz çap tutuyor (DN15–DN100, EN 10255 dış çapları).
Renk yalnız WebCAD referansında görülen dört çapta dolu; kalan beşinde `null` —
varsayılmıyor. Çizilen her yeni hat `DN25` alıyor, renk çaptan geliyor.
`plumbingTheme.gasLine` (marka sarısı) **kaldırıldı**: gaz hattının rengi artık
çapından geliyor.

Kalınlık gerçek dış çap: drei `<Line>` + `worldUnits` (duvar kapsülüyle aynı yol).
Uzaklaşınca ince çaplar piksel altına düşmesin diye 1.5 px'lik alt sınır zoom'dan
türetiliyor ve kapsayıcıda bir kez hesaplanıyor.

Çizim önizlemesi de **aynı** renk ve kalınlıkta (`scene/lineStyle.ts`): ince
önizleme, hat bitince kalınlaşmış gibi okunuyordu. Lastik bant kare başına
geometri üretmiyor — sabit bir birim parça `position/rotation.y/scale.x` ile
uzatılıyor; `worldUnits` kalınlığı kamera uzayında uyguladığı için ölçek çizgiyi
kalınlaştırmıyor.

### `isInsulated` alanı açılmadı

K-W4 gereği `InstallationLineSegment`'ten `isInsulated` çıkarıldı: izolasyon
segment boolean'ı değil kendi nesnesi olacak (Aşama 8).

### Kapsam dışı bırakılanlar

Ortogonal (yatay/dikey) kısıt bu aşamada yok — CLAUDE.md'deki "borular duvarlara
paralel" ürün kuralı henüz koda girmedi, plan da Aşama 5'te istemiyor. Porta
yakalanma ve uç bağlantısı Aşama 6'da, uzunluk etiketleri Aşama 7'de.

Nerede: `plumbing/core/pipeTypes.ts`, `plumbing/core/lineGeometry.ts`,
`plumbing/scene/useLineTool.ts`, `plumbing/scene/InstallationLineMesh.tsx`,
`plumbing/scene/lineStyle.ts`, `plumbing/scene/useMinimumLineWidthCm.ts`,
`plumbing/scene/DrawPreview.tsx`, `plumbing/store/plumbingSlice.ts`.
Ayrıntı: `.claude/knowledge/line-drafting.md`.

## 2026-08 · Aşama 6: Port bağlantısı ve yakalama

Hat ucu artık elemanların bağlantı noktalarına yakalanıyor ve porta sol tıklandığında
hat orada sonlanıp bağlantı kuruluyor. Bu çizimde araç **aktif kalıyor** (şartname):
arka arkaya hat çizilebilsin. Çift sağ tıkla bitirme ise Seçim aracına dönüyor —
ikisi bilerek farklı, çünkü porta bağlanmak "bu hat bitti, sıradakine geçiyorum"
demek, sağ tık ise "çizim işim bitti" demek.

### Doluluk türetilir, ikinci alan yok

Bir portun dolu olup olmadığı yalnız `installationConnections`'tan okunuyor
(`core/portSnap.ts` → `isPortOccupied`). Elemanda "bu port dolu" diye ikinci bir
alan yok (Risk R10): iki kaynak undo, yükleme ve kat silme sonrası ayrışırdı.
Bir hat ucunun bağlı olup olmadığı da kaydın VARLIĞINDAN okunuyor; serbest uçta
kayıt yok, `null` bir alan değil.

Bir port en çok bir bağlantı taşıyor. Kural iki yerde korunuyor: araç dolu portu
aday göstermiyor, `addLine` yazmadan önce tekrar bakıyor (iki ucu aynı porta düşen
hat için son savunma).

### Snap yarıçapı piksel tabanlı, port ızgarayı bastırıyor

`PORT_SNAP_RADIUS_PX / zoom` → yakalama uzaklığı her ölçekte aynı hissediliyor.
Öncelik port snap > ızgara snap. Ctrl ızgarayı kapatıyor ama portu kapatmıyor:
bağlantı kurmak serbest konumlandırmadan daha güçlü bir niyet.

### Bağlı eleman taşınınca hat ucu birlikte geliyor

`moveElements` aynı `set()` içinde bağlı hat ucunu da kaydırıyor. Port dünya konumu
yeniden hesaplanmıyor, AYNI kayma uygulanıyor: taşımada açı ve ölçek değişmediği
için sonuç birebir aynı ve store'un sembol metadata'sına (scene katmanı) ihtiyacı
olmuyor. Döndürme/ölçekleme eklenirse burası `getPortWorldPosition` ile yeniden
türetmeye çevrilmeli.

Eleman silinince bağlantı düşüyor, hat kalıyor ve ucu serbestleşiyor. Kat silmede
aynı temizlik `store/floorOps.ts`'te, silinenlerden ÖNCE toplanarak yapılıyor.

### Görsel ayrım biçimden geliyor

Boş port içi boş halka, dolu port içi dolu daire (nötr gri), yakalanan portun
dışında yeşil vurgu halkası. Hat ucunda da aynı mantık: bağlı uç dolu daire,
serbest uç içi boş halka. Ayrım yalnız renge bırakılmıyor.

Vurgu halkasının konumu React durumu değil — imleç her kıpırdadığında ağaç yeniden
kurulmasın diye `useFrame` içinde doğrudan mesh'e yazılıyor.

### Plandan sapma: tüm portlar mount ediliyor

Plan "yalnız imlece yakın elemanların portları mount edilir" diyordu. Uygulamada
hat aracı etkinken aktif kattaki tüm elemanların portları çiziliyor: eleman sayısı
onlarla ölçülüyor, geometri/material paylaşılıyor ve yakınlık her karede
hesaplansaydı mount/unmount dalgalanırdı. Eleman sayısı yüzleri geçerse önce burası
daraltılacak (Bölüm 15, spatial index).

### Henüz yok

`InstallationEndpointTarget`'ın `line` çeşidi (hattın başka bir hatta bağlanması)
tipte tanımlı ama kullanılmıyor — branşmanın ana hatta bağlanması sonraki bir işin
konusu. Serbest uç için uyarı listesi de (KK: "cihaza bağlanmamış uç uyarıyla
gösterilir") henüz yok; bugün yalnız görsel ayrım var.

Nerede: `plumbing/core/portSnap.ts`, `plumbing/core/ports.ts`,
`plumbing/scene/useLineTool.ts`, `plumbing/scene/PortMarkers.tsx`,
`plumbing/scene/InstallationLineMesh.tsx`, `plumbing/store/plumbingSlice.ts`,
`store/floorOps.ts`. Ayrıntı: `.claude/knowledge/port-connections.md`.

## 2026-08 · Boru çapı seçimi, kalınlık ve boru ayırma

Üç geri bildirim üzerine yapıldı: çizerken hatlar inceliyordu, çap seçilemiyordu ve
mevcut bir borunun üstünden dallanmanın yolu yoktu.

### Çap artık palette seçiliyor

Aktif çap `plumbingUiStore.activePipeTypeName` — araç ayarı, kaydedilmez ve geçmişe
girmez (aktif araç gibi). Palette yalnız RENGİ BİLİNEN çaplar var (DN25/32/40/50,
K-W1): rengi olmayanı seçtirmek onu hangi renkle çizeceğimizi varsaymak olurdu.
Renk gelince katalog kaydına `colorHex` yazmak yeterli, palet kendiliğinden büyür.

Seçim yalnız bundan sonra çizilecek hatları etkiliyor; mevcut bir hattın çapını
değiştirmek hat seçimi gerektiriyor (henüz yok).

Renk örneği DOM'da SVG `fill` ile çiziliyor. Değer katalogdan gelen bir hex, tema
token'ı değil; `style={{}}` ve `bg-[#...]` yasak, SVG özniteliği ise CSS değil —
sahnedeki R3F proplarıyla aynı istisna.

### Kalınlık: ekranda 3 px alt sınır

`worldUnits` kalınlığı cm cinsinden sabit tuttuğu için uzaklaştıkça hat piksel
olarak inceliyor. Alt sınır 1.5 px'ten **3 px**'e çıkarıldı: kat geneli görünürken
(zoom ~0.2) hatlar kıl gibi kalıyordu. Sınır çapları birbirinden ayırt etmeyi
bozmuyor — oran ancak bu sınırın altında kayboluyor.

Lastik bandın çizim yolu da gerçek hatla aynılaştırıldı: iki köşesi her karede
`instanceStart`/`instanceEnd` tamponuna yazılıyor. Önceki çözüm (birim parçayı
`scale.x` ile uzatmak) kalınlığı bozmuyordu — `worldUnits` shader'ı `linewidth`'i
`modelViewMatrix`'ten sonra uyguluyor — ama önizlemeyi gerçek hattan farklı bir
yola sokuyordu.

### Borunun üstüne bağlanmak onu AYIRIYOR

Hat aracıyla mevcut bir borunun üstünde gezerken o boruda dolu bir nokta görünüyor;
oraya tıklamak yeni hattı orada sonlandırıyor (ya da başlatıyor) ve hedef boruyu o
noktada ikiye ayırıyor. Yeni hat üretilmiyor, mevcut hatta bir köşe ekleniyor.

Mevcut nokta/parça id'lerine dokunulmuyor: bölünen parça kendi id'siyle kısalıyor,
yalnız ikinci yarısı yeni id alıyor. Hepsi yeniden numaralansaydı o boruya bağlı
kayıtlar sahipsiz kalırdı (kural 6). İzdüşüm bir köşeye yeterince yakınsa bölme
yapılmıyor, var olan köşeye bağlanılıyor — yoksa köşenin dibinde sıfıra yakın bir
parça doğardı.

Bölme ile hat yazımı tek `set()` içinde: tek Ctrl+Z ikisini birden geri alıyor. Bu
yüzden araç "şu parçayı şurada ayır" isteğini `LineEndAttachment.lineSplit` olarak
taşıyor ve çözümü store yapıyor — araç doğacak nokta id'sini bilemez.

Snap önceliği: port > mevcut boru > ızgara. Vurgu biçimi de işi anlatıyor: port
halka ("buraya bağlan"), boru üstündeki dolu nokta ("burada ayır").

Nerede: `plumbing/core/lineSnap.ts`, `plumbing/core/lineSplit.ts`,
`plumbing/core/pipeTypes.ts`, `plumbing/ui/PipeTypeSelect.tsx`,
`plumbing/scene/useMinimumLineWidthCm.ts`, `plumbing/scene/DrawPreview.tsx`,
`plumbing/store/plumbingSlice.ts`.

## 2026-08 · Hat aracı: ön eleman, seçim ve önizleme tuzağı

### Önizlemenin ince görünmesinin sebebi: drei `<Line>` propları material'e de gidiyor

drei `<Line>` bilmediği propları hem `Line2` nesnesine hem de MATERIAL'e yayıyor.
Banda verilen `visible={false}` bu yüzden `material.visible = false` yapıyor ve
`object.visible = true` yazmak onu geri getirmiyordu — lastik bant hiç çizilmiyordu.
Görünürlük artık yalnız nesne üzerinden, `useFrame` içinde ayarlanıyor.

Aynı sınıftan bir tuzak: `transparent`, `opacity`, `userData` da ikisine birden
gidiyor. Bu yüzden yerleşmiş hat ve önizleme artık **tek bileşenden** (`PipeLine`)
geçiyor; yeni bir prop oraya eklenir, kullanan yerlere değil. İkisi ayrı ayrı
kurulduğunda bir prop birinde unutuluyor ve önizleme farklı görünüyordu.

### Hat çiziminin ilk tıklaması eleman koyabiliyor

- **Branşman her zaman sayaçla geliyor**: ilk tık sayacı koyuyor, hat sayacın
  çıkış portundan başlıyor (gaz yönü: sayaç → tüketim).
- **İlk boru servis kutusunu kendisi koyuyor** — projede hiç kutu yoksa. Kutu
  varsa boru serbest başlıyor; servis kutusu proje başına tek.

Eleman kendi geçmiş adımında yazılıyor, hatla aynı adımda değil: Esc'lenen yarım
çizimde eleman da kaybolsaydı kullanıcının görerek koyduğu şey silinirdi.

### Borular tıklanabilir

`core/linePicking.ts` → `pickLineAt`. Tutma bandı çizilen kalınlığın yarısı + snap
toleransı, yani ince boru da tıklanabilir kalıyor. Sıra: eleman → hat → çerçeve.
Seçili hat mavi çiziliyor, Delete siliyor, çap paletindeki tıklama seçili hatlara
uygulanıyor (ayrı bir "uygula" düğmesi aranmasın).

`selectedLineIds` ayrı liste: eleman ve hat aynı id evreninde ama iki farklı nesne
türü — tek listede tutulsaydı her okuyan tür ayrımını yeniden yapardı.

Bugün yok: hat sürükleme, köşe düzenleme, çerçeveyle hat seçme, hat kopyalama.
Seçili elemanla seçili hat aynı anda silinirse iki geçmiş adımı oluşuyor.

Nerede: `plumbing/core/lineSeed.ts`, `plumbing/core/linePicking.ts`,
`plumbing/scene/InstallationLineMesh.tsx` (`PipeLine`), `plumbing/scene/DrawPreview.tsx`,
`plumbing/scene/useSelectionTool.ts`, `plumbing/ui/PipeTypeSelect.tsx`.

## 2026-08 · Boru kalınlığı piksel cinsinden veriliyor (worldUnits bırakıldı)

Borular ekrandan uzaklaşınca ve **ekran kenarlarına doğru** inceliyordu. Sebep
`worldUnits` shader yolunun perspektif varsayımı: göz ışınının bir NOKTADAN
çıktığını kabul ediyor (vertex'te `cross(start.xyz, worldDir)`, fragment'te
`normalize(worldPos.xyz) * 1e5`). Kameramız ortografik — ışınlar paralel — ve
kamera 100.000 cm yukarıda olduğu için hesap float32 hassasiyetini yiyor. Hata
ekran merkezinden uzaklaştıkça büyüyor; 20 cm'lik duvarda görünmüyor, 3.37 cm'lik
DN25 borusunda görünüyor.

Kararı: **boru `worldUnits` KULLANMAZ.** Kalınlık ekran pikseli olarak veriliyor:

    lineWidth(px) = max(dışÇap(cm) × zoom, MIN_LINE_WIDTH_PX)

Piksel yolunda shader ekran uzayında çalışıyor (küçük sayılar, ışın varsayımı yok)
ve yuvarlak uçlar korunuyor. Görünen boyut `worldUnits`'in amaçladığıyla aynı —
plan fiziksel olarak doğru okunuyor — ama kenarlarda incelme yok. Zoom değişince
kalınlık yeniden hesaplanmalı; `useCameraZoom` zoom'u state'te tutuyor (Grid.tsx
deseni: değer değişmezse render yok).

`CAMERA_HEIGHT_CM`'i düşürmek çözüm DEĞİL — capsule-walls.md'deki ters yönlü uyarı
duruyor, o değer duvar için yüksek tutulmak zorunda. Duvarlar `worldUnits` ile
kalıyor: aynı hata onlarda da var ama kalınlıkları yanında görünmez.

Uç işaretleri dünya ölçüsünde konumlandığı için piksel kalınlığı `toWidthCm` ile
cm'ye geri çevriliyor.

Nerede: `plumbing/scene/lineStyle.ts`, `plumbing/scene/useCameraZoom.ts`,
`plumbing/scene/InstallationLineMesh.tsx`.

## 2026-08 · Çap kataloğu tamamlandı, çap arayüzü sağ panele ertelendi

### K-W1'in boşluğu kapandı: dokuz çapın da rengi var

WebCAD referansında yalnız dört çapın rengi vardı; kalan beşi "ekip belirleyecek"
diye açık bırakılmıştı. **Ekip belirledi.** Yeni renkler WebCAD'in kullandığı
Material A400/A700 ailesinden, mevcut dördüyle ve tuvalde ayrılmış renklerle
çakışmayacak şekilde seçildi:

| DN | Dış çap (cm) | Renk | Kaynak |
|----|--------------|------|--------|
| 15 | 2.13 | `#00B8D4` camgöbeği | ekip |
| 20 | 2.69 | `#FF6D00` turuncu | ekip |
| 25 | 3.37 | `#FF1744` kırmızı | WebCAD |
| 32 | 4.24 | `#B388FF` açık mor | WebCAD |
| 40 | 4.83 | `#304FFE` mavi | WebCAD |
| 50 | 6.03 | `#6200EA` mor | WebCAD |
| 65 | 7.61 | `#C51162` macenta | ekip |
| 80 | 8.89 | `#795548` kahve | ekip |
| 100 | 11.43 | `#263238` antrasit | ekip |

Çakışmaması gerekenler: marka sarısı `#FFC107` (çizim alanına giremez), seçim
mavisi `#2d7ff9`, snap yeşili `#0aa06e`, duvar grisi `#6b7280`. Çap büyüdükçe ton
koyulaşıyor — ana hat plandan ağır okunsun. Renklerin tekilliği ve bu çakışmama
kuralı testle korunuyor.

`colorHex` artık `string | null` değil `string`: yeni bir çap eklendiğinde TS renk
vermeye zorluyor. Nötr yedek renk (`unclassifiedLine`) konusuz kaldığı için silindi.

**WebCAD `radius` sütunu doldurulmadı.** O değerler bizim çizimimizde kullanılmıyor
(kalınlık dış çaptan geliyor) ve yalnız WebCAD'in okuyacağı dosya üretilirse gerekli
(K-W5). Ölçülmemiş beş satırı tahminle doldurmak, kullanılmayan bir alana varsayım
yazmak olurdu.

### Çap seçme arayüzü sağdaki işlev paneline saklandı

Sol palete konan çap seçici KALDIRILDI: hat seçilince açılacak sağ paneldeki
"işlev" kısmının konusu. Çizim şimdilik varsayılan çapla (DN25) yapılıyor.
Altyapı hazır ve testli, panele yalnız arayüz kalıyor:
`plumbingUiStore.activePipeTypeName` (çizilecek hattın çapı) ve
`plumbingSlice.setLinesPipeType(lineIds, name)` (seçili hatların çapı).

### Seçimi silme tek adım

`removeSelection(elementIds, lineIds)` eleman ve hattı AYNI `set()` içinde siliyor:
bir silme jesti = bir Ctrl+Z. Önce iki ayrı action çağrılıyordu ve seçimde ikisi
birden varsa kullanıcı iki kez geri almak zorunda kalıyordu. Bağlantı temizliği de
aynı yerde toplandı — eleman ve hat silme aynı temizliği istiyor.

Nerede: `plumbing/core/pipeTypes.ts`, `plumbing/store/plumbingSlice.ts`,
`plumbing/scene/useSelectionTool.ts`, `plumbing/ui/PlumbingToolbar.tsx`.

## 2026-08 · Yönetici formları: alan hatası toplama kopyası

### K25 — `collectErrors`/`firstErrorField` ikinci kez kopyalandı, üçüncüde ortaklaşacak

`ui/admin/firms/gasFirmSchema.ts`, `ui/admin/projects/newProjectSchema.ts`
içindeki `collectErrors` ve `firstErrorField` fonksiyonlarının birebir eşini
taşıyor: alan sırası dizisine bakıp alan başına TEK mesaj toplamak ve görsel
sıradaki ilk hatalı alanı bulmak.

Ortak yardımcıya çıkarmak, yeni ekranı yazarken proje formunun şemasını ve
testlerini de değiştirmeyi gerektirirdi; iki ekran da kendi alan kümesine bağlı
olduğu için kopya bilerek bırakıldı (gerekçe iki dosyada da yazılı).

**Borç:** aynı desen ÜÇÜNCÜ bir ekranda gerekirse ortak yardımcıya çıkarılacak
(alan sırası dizisiyle parametrik, `ui/admin/form/` altında) ve iki mevcut şema
ona bağlanacak. Üçüncü kopya yazılmayacak.

### Kuralın ilk uygulaması: `FieldControl`

`TextField`, `SelectField` ve `PhoneField` girdinin içine ikon yerleştiren aynı
konumlandırma kabını (`relative flex min-w-0 flex-col` + ikon + girdi) üç kez
kuruyordu. K25'in "üçüncü kopyada ortaklaştır" kuralı gereği
`ui/admin/form/FieldControl.tsx`'e çıkarıldı; sınıf üreten yardımcı
(`fieldIconPadding`) `adminVariants.ts`'e gitti, çünkü bileşen dosyası yalnız
bileşen dışa aktarabiliyor (react-refresh kuralı).

`collectErrors`/`firstErrorField` borcu HÂLÂ açık: o desenin yalnız iki kopyası
var, üçüncüsünde ortaklaşacak.

## 2026-08 · Gaz dağıtım firma adı: büyük harf tercihi

### K26 — Firma adı otomatik büyütülmez, kullanıcıya hatırlatılır

Gereksinim belgesi madde 9: "mevcut kayıtlarla uyum için büyük harf kullanımı
**tercih edilecektir**." Tercih, kural değil.

Seçilen davranış: `Firma Adı` alanının altında bilgilendirme metni
(`GAS_FIRM_NAME_CASE_HINT`) gösterilir. Girdi otomatik büyütülmez, veri
değiştirilmez, kayıt engellenmez.

Neden otomatik dönüşüm YAPILMADI:

- Belgeye gömülü Dipos V liste ekranındaki kayıtlar büyük harf
  (`AKSA-ADANA`, `BAŞKENTGAZ`) ama **bizim mock verimiz değil**
  (`Adana Doğalgaz Dağıtım A.Ş.`). Yeni kayıtları zorla büyütmek listede yeni
  bir tutarsızlık üretirdi: eski kayıtlar karışık, yenileri hep büyük.
- Kullanıcının girdiği veriyi sessizce değiştirmek geri alınamaz ve nedeni
  ekranda görünmez.
- Tuş vuruşunda dönüştürmek imleci bozar (telefon maskesinde düzeltilen hatanın
  aynısı), IME ile daha da kötü.

**Açık:** biçim kuralının bağlayıcı olup olmadığı **iş birimine sorulacak**.
Cevap "zorunlu" gelirse karar (a)'ya yükseltilir: dönüşüm tuş vuruşunda değil
blur'da veya `toGasFirmPayload` içinde, `toLocaleUpperCase('tr')` ile yapılır ve
Türkçe `i → İ` / `ı → I` davranışı `core/` testiyle sabitlenir.

## 2026-08 · Gaz dağıtım firma listesi gerçek uca bağlandı

### K27 — İstemci tarafı arama/sıralama/sayfalama GEÇİCİ

`GET /api/gasdistributionfirms` filtresiz, sayfalamasız **düz dizi** döndürüyor;
`q`, `page`, `pageSize`, `sort` parametreleri yok. Bu yüzden liste ekranı tüm
kayıtları tek seferde çekiyor ve arama, sıralama, sayfalamayı istemcide yapıyor
(`api/gasFirmListQuery.ts`).

Bu, CLAUDE.md'deki **"sayfalama sunucu taraflı"** kuralının bilinçli istisnası.
`listProjects` içinde aynı gerekçeyle aynı istisna var.

**Borç:** backend sayfalı uç açınca `queryFirmList` kaldırılacak, parametreler
sorguya taşınacak ve uç yalnız istenen sayfayı döndürecek. Kayıt sayısı büyürken
bu çözüm ölçeklenmez — tek sayfada tüm liste indiriliyor.

Mock yol da AYNI `queryFirmList`'i kullanıyor: iki ayrı eşleşme/sıralama kuralı
olsaydı mock'tan gerçeğe geçerken davranış sessizce değişirdi.

### Bölge filtresi devre dışı, SİLİNMEDİ

Sunucunun liste satırı bölge taşımıyor. `region` alanı korundu ama `null` geliyor
ve süzgeç uygulanmıyor — süzülseydi bölge seçili her aramada liste boşalır,
kullanıcı veri kaybettiğini sanırdı.

Filtre kutusu ekranda duruyor ama `disabled`, altında sebebini söyleyen bir
açıklama var. Backend "bugün geçerli bölge yetkileri" alanını ekleyince
`isDisabled` kaldırılacak ve `queryFirmList` içindeki süzgeç geri açılacak.

**Yan etki:** üst bardaki "Bölge" seçimi ile sayfa içindeki filtre AYNI `region`
URL anahtarını paylaşıyor. Süzgeç uygulanmadığı için üst bardaki seçim de firma
listesini şu an daraltmıyor.

### Grup filtresi ADLA değil KİMLİKLE

Gerçek veri `groupId` taşıyor. URL anahtarı (`group`) aynı kaldı, taşıdığı değer
kimlik oldu. Uygulanan filtre çipi kimliği gösteremeyeceği için adı grup
listesinden çözüyor (aynı react-query anahtarı, ikinci istek çıkmaz).

---

## 2026-08 · Eleman yapışma modları: armatür boruya, sayaç uca, cihaz kola

### K28 — Yerleştirme serbest değil, hedefe yapışıyor

Tesisat elemanı artık tuvale istenen yere bırakılmıyor. Nereye tutunacağı
**türden** geliyor (`plumbing/core/attachModes.ts` → `ELEMENT_ATTACH_MODES`):

- `onLine` — vana, selenoid vana, regülatör, manometre, filtre kiti, süzme sayaç,
  izolasyon: boruya oturur, boru orada ayrılır.
- `lineEnd` — sayaç: boş (bağlantısız) bir boru ucuna takılır, araya vana girer.
- `nearestLine` — ocak/soba/şofben/kombi/kazan/diğer: imlecin bıraktığı yerde
  durur, en yakın boruya kısa bir kolla bağlanır, kolun dibine vana gelir.
- `free` — servis kutusu, baca, havalandırma: ızgaraya oturur, serbest.

Mod araç kimliğine ya da bileşenin içine gömülmedi: yeni bir sembol eklemek bu
tabloya bir satır yazmaktan ibaret olmalı.

### Armatür bir DÜĞÜMDÜR, ayrı bağlantı kaydı değil

`InstallationConnection` bir hattın UCUNU tarif ediyor (`end: 'start' | 'end'`);
armatür ise hattın ortasında. Bu yüzden `InstallationLinePoint` üzerinde
`inlineElementId` alanı açıldı — WebCAD'in `InstalmentPoint.inlineApplianceId`
deseninin aynısı (K-W3).

Sonuçları: eleman silinince düğüm boşa çıkar ve **boru bölünmüş kalır**; hat
silinince **üstündeki armatürler de gider** (düğümü kalmayan vana sahipsiz bir
sembol olarak asılı kalırdı); armatür taşınınca oturduğu düğüm aynı kaymayla gelir.

### Önizleme yoksa yerleştirme de yok

`onLine` modunda imleç boru üstünde değilse çözücü `null` döner; önizleme çıkmaz
**ve** tıklama hiçbir şey koymaz. İki koşul tek yerde: ayrı yazılsalardı "hayalet
görünmüyor ama eleman düşüyor" hâli doğardı. Geçersiz yerleşim de kaydırılmaz,
**reddedilir** — açıklık yerleştirmesindeki kuralın aynısı.

### Sembol boru açısından değil PORT EKSENİNDEN hizalanıyor

Eleman açısı `segmentAçısı − akışEkseniAçısı` (`getFlowAxisAngleDeg`). Vana gibi
portları yatay sembollerde bu boru açısının aynısı, ama **sayacın portları
gövdesinin üstünde** (`gas-meter.meta.json`: origin `[30,13]`, portlar `y = −20`) —
boru açısı doğrudan kullanılsaydı sayaç boruya ters otururdu. Aynı gerekçeyle
manometre boruya PORTUYLA değer, gövdesi yanda kalır.

### Regülatörün refakatçileri tabloda

Regülatör tek başına konmuyor: giriş tarafına vana, çıkış tarafına manometre ve
vana geliyor (`ELEMENT_COMPANIONS`). Ofsetler sembol genişliklerine göre üst üste
binmeyecek şekilde seçildi. **Bir refakatçi bile parçaya sığmıyorsa yerleşimin
tamamı reddedilir** — yarısı konsaydı kullanıcı eksik bir grup görürdü.

Sıra tek yerde (`getInlineSpecs`, ofsete göre artan) ve önizleme aynı diziyi
kullanıyor; iki yerde ayrı hesaplansaydı önizlemedeki sembol başka bir düğüme
yerleşirdi.

### Sayaç konunca boru çizimi kendiliğinden başlıyor

`placeElementAtLineEnd` sayacın id'sini döndürüyor; araç boruya geçiyor ve taslak
sayacın **çıkış** portundan açılıyor. Kullanıcı sayacı koyup paletten boruyu
ayrıca seçmiyor.

### Tek jest = tek Ctrl+Z

Üç yerleştirme aksiyonu da (eleman + refakatçiler + boru ayırma + kol + bağlantı
kayıtları) tek `set()` içinde çalışıyor. Regülatör dört eleman ve dört bölme
yazıyor, tek Ctrl+Z hepsini geri alıyor.

### İzolasyon artık bir eleman (K-W4 uygulaması)

`insulation` `TOOLBAR_ONLY_SYMBOL_IDS`'ten çıkıp `INSTALLATION_ELEMENT_TYPES`'a
girdi, araç davranışı `segment-toggle` yerine `placement` oldu ve `onLine`
modunda boruya oturuyor. `InstallationLineSegment.isInsulated` alanı hâlâ
AÇILMADI; izolasyonun kapsadığı aralık Aşama 8'de kendi alanı olacak.

### Bilinen sınırlar

- Yerleştirme aracı boruya yapışırken **kendi kattaki** hatlara bakıyor; başka
  kattaki boru aday değil.
- `nearestLine` modunda yarıçap yok ("en yakına yapışır"): hiç AÇIK UÇ yoksa
  yerleştirme de olmuyor, kullanıcıya ayrı bir uyarı çıkmıyor.
- Armatürün oturduğu düğüm sürüklenerek boruyu büküyor; armatürü boru boyunca
  KAYDIRMA (t üzerinde gezdirme) henüz yok.

## 2026-08 · Vana/filtre/regülatör SVG düzeltmeleri, cihaz kolu, boru taşıma, duvar snap'i

### K29 — `nearestLine` artık yalnız AÇIK UÇLARA bağlanıyor, ortaya değil

Vana/soba/kombi gibi `nearestLine` elemanları eskiden `findNearestSegment` ile
borunun HERHANGİ bir noktasına (ortasına dahi) bağlanıyordu. Artık `lineEnd`
modunun (sayaç) kullandığı `findNearestFreeLineEnd`'i paylaşıyor: yalnız
bağlantısız/armatürsüz uçlar aday. Sonuç olarak vana artık boruyu AYIRMIYOR —
`onLine`'daki gibi bir bölme yok, hattın zaten var olan ucuna `inlineElementId`
ile oturuyor. `resolveNearestLineAttachment` bu yüzden `connections` parametresi
aldı (bir uca ikinci eleman takılamaz, port kuralıyla aynı).

Cihazı boruya bağlayan kol yeni bir hat türü aldı: `applianceStub`. Çap
sınıfından BAĞIMSIZ, hep KIRMIZI ve KESİKLİ çiziliyor (`PLUMBING_COLORS.applianceStub`,
`PipeLine`'a `isDashed` propu eklendi) — "bu bir boru değil, cihazın kısa
bağlantısı" görsel olarak ayırt edilsin diye.

### K30 — Regülatör SVG'si artık salt gövde; iki manometre koda taşındı

`regulator.svg` vana + manometre görselini de bakıyordu; bunlar zaten
`ELEMENT_COMPANIONS`'ta GERÇEK, ayrı elemanlar olarak ekleniyordu — SVG'deki
kopyalar yalnız görsel gürültüydü. SVG artık yalnız boş gövde dairesi
(viewBox 76×68 → 24×24). Eskiden yalnız ÇIKIŞ tarafında bir manometre vardı,
artık HER İKİ tarafta da var — vana ile regülatör arasında, regülatöre YAKIN
(vana payından dar bir pay ile). Refakatçi sırası artık
`[valve, manometer, regulator, manometer, valve]` (beş eleman, beş bölme).

Vana/selenoid vana SVG'lerinden gövde dışına taşan giriş/çıkış "kulakçık"
çizgileri (önce kalınlaştırılıp uzatıldı, sonra kullanıcı isteğiyle TAMAMEN
kaldırıldı) — filtre kitiyle aynı gerekçe: boru zaten arkasından geçiyor,
tekrar gerekmiyor. Vana artık yalnız iki üçgenin (bowtie) kendisi.

### K31 — Boru rijit taşıma DENENDİ, GERİ ALINDI

`plumbingSlice.moveLines` + `useSelectionTool`'daki `lineGrab` bir tur içinde
eklenip kullanıcı isteğiyle AYNI oturumda geri alındı — kod tabanında iz
bırakmadı. Ürün kararı değil, "şimdilik istemiyoruz" tercihi; ileride tekrar
istenirse `moveElements`'in aynası olarak (düğümdeki armatür + PORT ile bağlı
eleman birlikte taşınmalı) yeniden yazılabilir.

### K32 — Hat çizimi duvar eksenine YUMUŞAK yapışıyor (ZORUNLU değil)

CLAUDE.md'deki "borular duvarlara paralel, hat üzerinden başlar" kuralı hâlâ
ZORUNLU bir kısıt olarak kodda değil — yalnız bir yardımcı snap eklendi.
`core/wallSnap.ts` → `findNearestWallPoint`, `useLineTool.ts`'teki
`resolveSnap`'e port > mevcut boru > **duvar ekseni** > ızgara sırasında
eklendi. Bu bir BAĞLANTI kaydı ÜRETMİYOR — boru grafiği duvarı tanımıyor
(`core/model.ts` sözleşmesi) — yalnız imleç duvara yakınken başlangıç
konumunu duvarın eksenine çekiyor; izdüşüm `core/wall.ts`'teki tek fonksiyondan
(`projectPointOntoWall`) geliyor, ikinci bir kopya yazılmadı.

## 2026-08 · K29–K32 sonrası düzeltmeler: süzme sayaç, izolasyon, kesikli önizleme

### K33 — Süzme sayacın portları gaz sayacından yanlışlıkla kopyalanmıştı

`strainer-meter.svg`/`.meta.json` `gas-meter`'ın (yukarı bakan, `lineEnd`
modu için tasarlanmış) port düzenini birebir taşıyordu. `strainerMeter` ise
`onLine` modunda — akış ekseni DİKEY çıktığı için sembol boruya yan yatık
oturuyordu. Düzeltme: valve'la aynı yatay port düzeni (giriş/çıkış x=0/60,
y=20), artık iki portlu her `onLine` eleman gibi merkezden (`ORIGIN` çapası)
doğrudan boruya oturuyor.

### K34 — İzolasyon artık İNCE UCUNDAN tutunuyor, merkezden değil

`insulation.meta.json` → `origin` `[20,15]`den `[20,24]`e taşındı: sembolün
daralan üç enine çizgisinin en dar olduğu nokta. 0 portlu elemanlarda
`getOnLineAnchorOffset` çapayı `metadata.origin`'in KENDİSİNE eşitliyor — origin
tabanın/gövdenin ortasındayken boru sembolün ortasından geçiyordu, artık
sadece ince ucu boruya değiyor, geniş taban ve sap borudan uzağa düşüyor.

### K35 — Cihaz kolunun kesikli önizlemesi hep SOLİD görünüyordu

`DrawPreview.tsx` → `StubPreviewLine` lastik bant tekniğini kullanıyor:
`points` PROPU sabit (`RUBBER_BAND_SEED`), iki köşe her karede tamponun İÇİNE
yazılıyor. drei `<Line>` kesikli desenin mesafesini yalnız `points` PROP
REFERANSI değiştiğinde `computeLineDistances()` ile hesaplıyor (`Line.js`);
tampon elle yazıldığında bu hiç tetiklenmiyordu, mesafe sıfır uzunluklu ilk
kareye takılı kalıyordu. Çözüm: buffer'ı yazdıktan hemen sonra
`line.computeLineDistances()` ELLE çağrılıyor. Yerleşmiş (kalıcı) kol bu
tuzağa hiç girmiyordu — `InstallationLineMesh`'te `positions` gerçek bir
`useMemo`'dan geliyor ve `points` prop'u mount'ta zaten doğru uzunlukla bir
kez değişiyor.

### K36 — Regülatör payları ikinci kez sıkılaştırıldı

`REGULATOR_MANOMETER_CLEARANCE_CM` 8→4, `VALVE_MANOMETER_CLEARANCE_CM` 20→10.
Ofsetler ±42/±114'ten ±38/±100'e indi.

## 2026-08 · Port yuvarlağı, kol-kopma düzeltmesi, onLine kaydırma, üçüncü sıkılaştırma

### K37 — Vana/selenoid vana/filtre/süzme sayaçta port yuvarlağı ÇİZİLMEZ

`attachModes.ts` → `NO_PORT_MARKER_TYPES`/`hasPortMarkers`; `PortMarkers.tsx`'in
paylaşılan bileşeni bu dört tür için erken `null` döner (hem seçili elemanın
kendi işaretinde hem hat çizerken görünen "buraya bağlan" işaretinde). Gerekçe:
bu dördü akış geçişli `onLine` — portları boruyu AYIRAN gerçek bir düğüm, WebCAD
anlamında serbest bir bağlantı hedefi DEĞİL. `isPortOccupied` bu elemanların
portları için zaten hiçbir zaman `true` dönmeyecekti (armatür bağlantı kaydı
değil `inlineElementId`'dir), yani işaret hep yanlışlıkla "boş" (mavi)
görünüyordu. Regülatör ve manometre bu istisnaya dahil değil.

### K38 — Vana taşınınca kol artık KOPMUYOR

`nearestLine`'ın otomatik vanası ana borunun VAR OLAN bir düğümüne
`inlineElementId` ile oturuyor; cihaza giden kol ise AYRI bir hat, o düğüme
yalnız bir `{kind:'line'}` bağlantı KAYDIYLA değiyor — kolun kendi başlangıç
noktası ana borudaki düğümle AYNI nesne değil. `moveElements` vanayı taşırken
ana borudaki düğümü doğru taşıyordu ama kolun ucunu unutuyordu → vana
sürüklenince kol görsel olarak KOPUYORDU. Düzeltme: `moveElements`'e dördüncü
bir döngü eklendi — `target.kind==='line'` bağlantılarını tarayıp hedefi az
önce taşınmış bir inline elemana aitse kolun o ucunu da aynı deltayla taşıyor.

### K39 — onLine eleman sürüklenince boru BÜKÜLMEZ, eleman ÜZERİNDE KAYAR

Önceki davranış boruyu büküyordu (K28'in bilinen sınırıydı). Yeni resolver
`core/elementAttach.ts` → `resolveOnLineSlide`: sürüklenen elemanın düğümünün
İKİ SABİT komşusu bulunur (kendileri hareket etmez), aralarındaki düz hatta
`projectOntoSegment` ile izdüşürülür ([0,1] aralığına zaten kelepçeli — segment
dışına taşan sürükleme en yakın komşuya yapışır, boruyu bükmez). Açı SABİT
kalır çünkü komşular kıpırdamıyor. İki komşusu da yoksa (eleman hattın tam
UCUNDA — ör. nearestLine'ın boş uca oturan vanası) `null` döner, o elemanlar
eski serbest `moveElements` yoluna düşer (K38'in düzeltmesi zaten onları
kapsıyor).

Store'da MUTLAK yazan ayrı bir eylem var: `slideOnLineElement(lineId, pointId,
elementId, nodePosition, elementPosition)` — `moveElements`'in kayma (delta)
mantığından bilerek FARKLI. `useSelectionTool.ts`'teki `SelectionGrab.slide`
yalnız TEK eleman seçiliyken ve çözücü `null` dönmüyorken devreye girer; grup
taşımasında hep eski serbest kayma kullanılır.

**Bilinen sınır:** boru segmentleri sürükleme boyunca CANLI güncellenmez —
store yalnız `pointerup`'ta yazılır (moveElements'teki bağlı eleman/hat ucu
davranışıyla AYNI, yeni bir sınırlama değil).

### K40 — Vana/sayaç payı da sıkılaştırıldı

`elementAttach.ts` → `ATTACH_CLEARANCE_CM` 20→10 (gasMeter'ın otomatik
vanasının gövdeden uzaklığı) — regülatörün `VALVE_MANOMETER_CLEARANCE_CM`siyle
(10) aynı değer.

## 2026-08 · Regülatör hâlâ genişti (asıl sebep bounds'tu), izolasyon hâlâ tersti

### K41 — Vana/manometrenin `bounds`'u çizimden İKİ KAT genişti

K36/K40'ta paylar iki kez daraltıldıktan SONRA bile regülatör grubu geniş
kalmaya devam etti. Kök sebep paylar DEĞİLDİ: `valve.meta.json` hâlâ 60 cm'lik
eski `bounds`/`viewBox` taşıyordu ama görünen çizim (kulakçık çizgileri
kaldırıldıktan sonra) yalnız 32 cm'ydi; `manometer.meta.json` de aynı şekilde
44 cm bildirirken çizim (daire çapı) yalnız 22 cm'ydi. `attachModes.ts`'teki
`VALVE_HALF_CM`/`MANOMETER_HALF_CM` bu HAYALİ genişliklere göre elle
yazılmıştı — sembol küçültülmüş GÖRÜNSE de aralıklar eski gövdeye göre
hesaplanmaya devam ediyordu.

Düzeltme: `valve.svg`/`.meta.json`, `solenoid-valve.svg`/`.meta.json`,
`manometer.svg`/`.meta.json` gerçek çizim sınırlarına küçültüldü (port
konumları da aynı oranda içeri çekildi), `VALVE_HALF_CM` 30→16,
`MANOMETER_HALF_CM` 22→11. Ofsetler ±38/±100'den ±26/±59'a indi — asıl fark
paylardan değil bu düzeltmeden geldi. **Genel ders:** `bounds` SVG çiziminden
manuel türetilen bir alan; çizim değişirken (kulakçık silme gibi) aynı adımda
güncellenmezse aralık hesapları sessizce (ve testte YAKALANMADAN) yanlış kalır.

### K42 — İzolasyon SVG'si yeniden çizildi: simetrik zikzak, artık YAPISAL OLARAK "ters" DURAMAZ

Önceki tasarım (taban çizgisi + yukarı sap + aşağı daralan üç enine çizgi)
ASİMETRİKTİ. Çapayı önce gövde ortasına, sonra "ince uca" taşımak sorunu
çözmedi — sorun çapa noktası değil, şeklin kendisiydi: SVG'nin +Y'si planın
−Y'sine karşılık geldiği için (`svgLocalToPlanOffset`) asimetrik bir şekil
hangi ucundan tutunursa tutunsun kullanıcıya hep "ters" görünüyordu.

Çözüm: `insulation.svg` tek bir simetrik zikzak `polyline`'a (viewBox 40×16,
dalga ortada) çevrildi. Çapa (`origin: [20,8]`) dalganın TAM ORTASI — dikey
ayna görüntüsü aynı desen gibi görünür, yön belirsizliği doğuran asimetri
kökten kaldırıldı.

## 2026-08 · Yönetici anasayfası (Genel Bakış)

### K28 — Ekran tek uçtan beslenir, veri katmanı sözleşmeyi garanti eder

Tüm sayılar `GET /api/admin/dashboard/summary?region=` sözleşmesinden geliyor
(`api/adminDashboard.ts`). Liste uçlarının toplamı ALINMADI: sayfalı bir uçtan
toplam çıkarmak yanlış sonuç verir.

**Uç HENÜZ YOK.** Sunucunun OpenAPI belgesinde 21 rota var, hiçbiri `dashboard`
veya `summary` içermiyor; `/api/admin/` öneki de hiç bulunmuyor. Bu yüzden yol
`/api/dashboard/summary` olarak yazıldı — backend NİHAİ adı farklı verebilir,
uç açılınca `DASHBOARD_SUMMARY_PATH` sabiti doğrulanacak.

**Sonuç: ekrandaki sayıların hemen hepsi ÖRNEK VERİ.** Base URL dolu olduğu için
istek gerçekten atılıyor, 404 dönüyor ve katman sessizce mock'a düşüyor.

Mock'a düşme koşulu SADECE bu dosyaya özel (`isMissingEndpoint`): 404, 501 ve
ağ hatası mock'a düşer. **401, 403 ve 5xx GEÇİRİLİR** — `http.ts` 401'de oturumu
düşürüyor ve `RequireAuth` girişe yönlendiriyor; bunları mock'a yutsaydık süresi
dolmuş oturumda kullanıcı sahte veriyle dolu çalışan bir ekran görürdü, ki bu
hata ekranından çok daha kötü bir sonuç. Gas-firm katmanına dokunulmadı.

Mock'a düşerken konsola **tek satır** `console.warn` yazılır (modül düzeyinde
bayrakla bir kez; bölge her değişince sorgu tekrar çalıştığı için aksi hâlde
konsol aynı satırla dolardı). Bu BİLİNÇLİ bir teşhis çıktısıdır, CLAUDE.md'deki
`console.log` yasağı gürültü amaçlı log'lar içindir — **"unutulmuş log" diye
silinmemeli**; `eslint-disable-next-line no-console` gerekçesiyle birlikte duruyor.
Uç açılınca bu blok tümüyle kalkacak.

Mock veri bölge taşıyor, böylece bölge seçimi gerçekten çalışıyor ve KK-2 test
edilebiliyor — 404 ile mock'a düşülen durumda da süzgeç işliyor.

Sıralama, üst sınırlar (5 bölge / 2 duyuru) ve duyuru kısaltması `normalizeSummary`
içinde, **kaynaktan bağımsız** uygulanıyor. Yalnız mock yolunda yapılsaydı sunucu
bir gün sırasız veya 10 satır döndürdüğünde KK-5/KK-6 sessizce ihlal olurdu.

Duyuru özeti CSS `line-clamp` ile değil **veri katmanında 120 karakterde**
kısaltılıyor: satır sayısı yazı tipine ve kart genişliğine bağlı olduğu için test
edilemezdi, karakter sınırı deterministik.

### Bölge filtresi burada AKTİF, liste ekranında pasif

Bilinçli fark. Gaz dağıtım listesinde bölge süzgeci devre dışı (K27) çünkü gerçek
uç bölge taşımıyor. Gösterge panelinde ise veri zaten mock; mock'a bölge alanı
koyup süzgeci çalıştırmak KK-2'yi test edilebilir kılıyor ve gerçek uç gelince
yalnız veri kaynağı değişecek.

### Mockup'ta olup belgede olmayan: "Abone Sorgulama"

Yeşil mockup'ta sağ üstte "Abone Sorgulama" butonu var; gereksinim belgesinde ve
KK-1'de geçmiyor (ikisi de yalnız "Duyuru Yayınla" diyor). **Kapsam dışı
bırakıldı**, eklenmedi.

### Olmayan ekrana bağlantı yerine PASİF öğe

> GÜNCELLENDİ — hızlı işlemler ve "Duyuru Yayınla" için bu karar artık geçerli
> değil; bkz. aşağıdaki "Hedefi olmayan kısayollar" ve "Duyuru Yayınla formu"
> başlıkları. Aşağıdaki gerekçe hâlâ pasif kalan öğeler için duruyor.

Hedef ekranı yazılmamış her öğe ölü bağlantı yerine `aria-disabled` ile pasif
render ediliyor: "Proje Firması Ekle", "Kullanıcı Oluştur", "Duyuru Yayınla".
Duyurular kartındaki "Tümünü Gör" ise düz metin — hedefi olmayan bir bağlantı
hiç kurulmadı. Hepsinin başında sahipli `TODO(esra)` var.

Gerçek `disabled` KULLANILMADI: `disabled` düğme odaklanamaz, dolayısıyla
"Bu ekran henüz hazır değil" açıklaması klavye ve ekran okuyucu kullanıcısına
hiç ulaşmazdı. Açıklama `title` ile de verilmedi (ekran okuyucularda tutarsız
okunuyor); görünür bir metne `aria-describedby` ile bağlı.

`adminNavItems.ts`'e dokunulmadı — olmayan sayfalara menü maddesi açmak ölü link
üretirdi.

### Yeni yetki anahtarları

`projectFirm.create` ve `user.create` eklendi (kalıp `<varlık>.<eylem>`).
"Projeleri Görüntüle" için anahtar AÇILMADI: proje listesi sol menüden zaten
korumasız açılıyor, kısayolu gizlemek tutarsız olurdu.

### Yeni renk token'ları

`--color-success-soft` (#3f8f63 / #5fbf8c) ve `--color-warning` (#b26a00 /
#e0a458). `success-soft` YALNIZ büyük kalın sayaç rakamında kullanılır: beyaz
zeminde ~3.4:1, WCAG AA büyük metin eşiğini (3:1) geçer ama küçük metin eşiğini
(4.5:1) geçmez. Kısıt token'ın yanına yorum olarak yazıldı.

### Çubuk grafik: kütüphane yok, inline stil yok

Yatay çubuk native `<progress value max>` ile çiziliyor; oran `max`'ı en yüksek
değere kurarak tarayıcıya bırakılıyor. Grafik kütüphanesi eklemek tek eksenli
beş satırlık bir gösterim için paket boyutunu ve tema uyumu yükünü boşuna
artırırdı. Genişliği `style={{}}` ile yazmak CLAUDE.md'nin inline stil yasağını
ihlal ederdi; `<progress>` dolgusu yalnız satıcı sözde-öğeleriyle boyandığı için
görünüm `styles/dashboardBar.css`'e ayrı dosya olarak konuldu.

## Genel Bakış: backend'den istenecek uçlar ve alanlar

Aşağıdakiler mock; MR açıklamasına da eklenecek.

1. `GET /api/dashboard/summary?date=&region=` — TEK uç (nihai adı backend
   onaylayacak). `date` YEREL takvim günü (`YYYY-MM-DD`) ve ZORUNLU: `today` ve
   `regionDensity` yalnız O GÜNE ait kayıtlardan hesaplanmalı, `counts` ise
   günden bağımsız birikimli toplam.
   Beklenen yanıt gövdesi:

   ```json
   {
     "counts": { "gasDistributionUsers": 2926, "projectFirms": 11838, "projectFirmUsers": 24804 },
     "today": { "newProjects": 11, "approved": 3, "rejected": 0 },
     "regionDensity": [{ "region": "Marmara", "count": 28 }],
     "announcements": [
       { "id": 2, "title": "...", "summary": "...", "publishedAt": "2026-07-11T06:00:00Z", "source": "Sistem" }
     ]
   }
   ```

   Alanlar:
   - `counts.gasDistributionUsers`, `counts.projectFirms`, `counts.projectFirmUsers`
   - `today.newProjects` (bugün OLUŞTURULAN, `createdAt`), `today.approved`, `today.rejected`
   - `regionDensity[]` → `{ region, count }` (bugün gelen projeler)
   - `announcements[]` → `{ id, title, summary, publishedAt, source }`
2. **Kullanıcı sayıları için uç yok.** Gaz dağıtım ve proje firması kullanıcı
   sayıları hiçbir uçtan gelmiyor.
3. **Proje durum alanı listede yok.** `ProjectListItemDto` durum taşımadığı için
   "Onaylanmış"/"Reddedilen" sayaçları sunucudan gelmeli.
4. **Bölge alanı.** Proje ve firma kayıtlarında bölge yok; K27'deki bölge
   yetkisi alanı gelince hem bu ekran hem liste süzgeci gerçek veriye bağlanır.
5. **Duyuru varlığı yok.** `source` alanı 'Sistem' | firma adı ayrımını taşımalı;
   amber kenarlık buna bağlı.
6. `GET /api/me/permissions` hâlâ mock — `projectFirm.create` ve `user.create`
   sunucudan gelmeli.
7. `POST /api/dashboard/announcements` — duyuru yayınlama. İstek gövdesi
   `{ title, body, region: string | null, isSystem: boolean }`, yanıt tek bir
   `Announcement`. Görünen `source` alanını sunucu belirler (`isSystem` ise
   'Sistem'); `region: null` = tüm bölgeler.

### "Bugün" sayaçları güne bağlandı, gün dönünce sıfırlanıyor

Sayaçlar artık BİR GÜNÜN kayıtlarını sayıyor. Gün anahtarı (`YYYY-MM-DD`,
`api/dayKey.ts`) hem sorgu anahtarının hem `?date=` parametresinin parçası:
gece yarısı anahtar değişiyor, veri yeni gün için yeniden isteniyor ve sayaçlar
sıfırdan başlıyor. Yani "gece yarısı sıfırlanır" ayrı bir kural değil, veri
kapsamının doğal sonucu — istemcide sıfırlayan bir kod YOK.

Gün YEREL takvim günü. `toISOString()` KULLANILMADI: o UTC'ye çevirir, TR
saatiyle gece yarısından sonra açılan ekran bir önceki günü sorardı.

Günü `useCurrentDay` taşıyor. Tarihi her render'da `new Date()` ile okumak
yetmezdi: render'ı TETİKLEYEN bir şey olmadığı için gece boyunca açık kalan
sekmede dünkü tarih ve dünkü sayaçlar ekranda kalırdı. Zamanlayıcı gece
yarısından 500 ms sonraya kuruluyor (erken uyanan `setTimeout` hâlâ dünü
görürdü) ve her uyanışta kendini yeniden kuruyor. Arka plandaki sekmede tarayıcı
zamanlayıcıyı kıstığı için `visibilitychange` de dinleniyor.

Mock'ta hareketler artık gün taşıyor ve uygulamanın AÇILDIĞI güne yazılıyor:
sabit tarih yazılsaydı mock ertesi gün "bugün" olmaktan çıkardı. Birikimli
sayılar (kullanıcı/firma adedi) günden bağımsız kaldı — onlar devreden toplam.

### "Duyuru Yayınla" formu: diyalog + canlı önizleme

Belgede formun nasıl olacağı yazmıyordu. Ayrı SAYFA değil DİYALOG seçildi:
yönetici anasayfadan ayrılmadan yazıp yayınlıyor ve sonucu arkadaki Duyurular
kartında hemen görüyor.

Alanlar: Başlık (zorunlu, 3–80), Kapsam (bölge; BOŞ BIRAKILABİLİR = tüm
bölgeler), Duyuru Metni (zorunlu, 500 karakter sayacıyla), "Sistem duyurusu"
kutusu. Kutu bilinçli: kartın amber sol kenarlığı `source === 'Sistem'`
ayrımına bağlıydı ama bu ayrımı kuracak bir giriş yoktu.

Formun altında CANLI ÖNİZLEME var ve kartın kendi satır bileşenini
(`AnnouncementItem`) kullanıyor — kart ile önizleme aynı koddan çiziliyor,
ikinci bir kopya zamanla sessizce ayrışırdı. Kısaltmayı da veri katmanının
kendi fonksiyonu yapıyor: metnin nerede kesileceği yayınlamadan ÖNCE görülüyor.

Görünen `source` alanını SUNUCU belirler; istemci yalnız `isSystem` gönderir.
Kaynak adını istemcide üretmek iki ekranın farklı etiket yazması demekti.
`POST /api/dashboard/announcements` de HENÜZ YOK; özet ucuyla aynı kural
geçerli (404/501/ağ hatası → mock, 401/403/5xx → geçer, kullanıcı "yayınlandı"
sanmasın). Mock, yayınlanan duyuruyu oturum boyunca tutuyor.

Diyalog kabuğu `ui/admin/AdminDialog.tsx`'e çıkarıldı ve `ConfirmDialog` de
ona bağlandı: odak tuzağı + Esc + odağın geri dönmesi mantığı üçüncü kez
kopyalanmadı. `ConfirmDialog` açılışta odağı ONAY düğmesine almaya devam ediyor
(`initialFocusRef`), kabuğun varsayılanı ilk odaklanabilir öğe.

### Hedefi olmayan kısayollar: pasif düğme yerine "bu ekran gelecektir" sayfası

Önceki karar (pasif `aria-disabled` öğe) DEĞİŞTİ. Hızlı işlemlerin dördü de
gerçek bağlantı; ekranı yazılmamış olanlar `ComingSoonPage`'e gidiyor
("Bu ekran gelecektir." + Anasayfaya dön).

Yollar şimdiden gerçek adlarıyla açıldı (`/admin/project-firms/new`,
`/admin/users/new`); ekran gelince YALNIZ route'un element'i değişecek,
kısayollara ve bağlantılara dokunulmayacak. Tıklamadan önce beklenti kurulsun
diye kısayolda "Yakında" rozeti var ve rozet erişilebilir adın parçası
("Kullanıcı Oluştur Yakında"), yani ekran okuyucu kullanıcısına da ulaşıyor.

Yetki kuralı aynı kaldı: kullanıcının izni yoksa kısayol listede HİÇ yer almaz
(pasif de görünmez). Sol menüye (`ADMIN_NAV_ITEMS`) yine dokunulmadı — menüdeki
`path: null` maddeleri kendi issue'larında ele alınacak.

Duyurular kartındaki "Tümünü Gör" de aynı desene bağlandı: düz metin değil
gerçek bağlantı (`/admin/announcements`), hedefinde bugün karşılama sayfası var.

### Sol menüde pasif madde kalmadı

`ADMIN_NAV_ITEMS`'ta `path: null` bitti; her maddenin yolu var
(`/admin/project-firms`, `/admin/firm-users`, `/admin/documents`,
`/admin/policies`) ve ekranı yazılmamış olanlar karşılama sayfasına gidiyor.

Gerekçe erişilebilirlik: `disabled` düğme ODAKLANAMAZ, dolayısıyla o dört madde
klavye ve ekran okuyucu kullanıcısına hiç görünmüyordu. Artık `NavLink`
oldukları için hem görünüyorlar hem `aria-current` işaretini alıyorlar.
`adminNavItemVariants`'ın `disabled` tonu kullanılmadığı için silindi.

"Yakında" rozeti hem menüde hem hızlı işlemlerde aynı bileşenden geliyor
(`ui/admin/ComingSoonBadge.tsx`) — ikinci kopya çıkarılmadı. Rozet METİN, yani
erişilebilir adın parçası; yalnız renkle verilseydi ayrımı göremeyen kullanıcıya
hiçbir şey söylemezdi.

### Duyuru listesi ekranı (`/admin/announcements`)

"Tümünü Gör" artık gerçek bir ekrana gidiyor. `GET /api/dashboard/announcements`
sayfalı liste döndürüyor (`?q=&region=&page=&pageSize=`); uç yokken mock aynı
süzme/sıralama/sayfalama davranışını taklit ediyor.

Liste satırı anasayfa kartıyla AYNI bileşen DEĞİL ve bu bilinçli: kart dar yerde
120 karakterde kısaltılmış `summary` gösteriyor, liste ekranının işi duyuruyu TAM
göstermek. Bu yüzden liste ucu ayrı bir satır tipi taşıyor (`AnnouncementDetail`:
kısaltılmamış `body` + `region`). Ortaklaştırılsalardı biri diğerinin kısıtını
taşımak zorunda kalırdı.

Arama başlıkta VE metinde, `includesTr` ile (kendi `toLowerCase()` çözümü
yazılmadı). Sayfa/arama durumu URL'de (`useAnnouncementListParams`), bölge için
ayrı süzgeç YOK — kapsam üst bardaki seçimden geliyor, böylece anasayfa ile liste
arasında gezinirken kapsam korunuyor.

Yayınlama formu iki ekranda da aynı bileşen. Bu yüzden duyuru parçaları
`ui/admin/dashboard/` altından `ui/admin/announcements/` altına taşındı: artık
tek ekrana ait değiller. Bağımlılık tek yönlü (dashboard → announcements).
Tarih/sayı biçimlendiricileri de iki ekran birden kullandığı için
`ui/admin/adminFormat.ts`'e çıkarıldı; `dashboardFormat.ts` yalnız gösterge
paneline özel kapsam metinlerini tutuyor.

---

## 2026-08 · Proje firmaları listesi gerçek uca bağlandı

### K29 — İstemci tarafı arama/sıralama/sayfalama, ikinci kez (K27'nin aynısı)

`GET /api/projectfirms` de filtresiz, sayfalamasız **düz dizi** döndürüyor;
`q`, `page`, `pageSize`, `sort` parametreleri yok (yerel cadapi OpenAPI'sinden
doğrulandı). Proje firmaları ekranı bu yüzden K27'deki çözümü tekrarlıyor:
liste tek seferde çekiliyor, arama/sıralama/sayfalama istemcide
(`api/projectFirmListQuery.ts`).

CLAUDE.md'deki **"sayfalama sunucu taraflı"** kuralının bilinçli istisnası —
`queryFirmList` ve `listProjects` ile aynı gerekçe. Mock yol da AYNI saf
fonksiyondan geçiyor.

**K27'den tek farkı, çağrıldığı yer:** `queryFirmList` React Query'nin `queryFn`'i
içinde çalışıyor ve sorgu `queryKey`'in parçası, yani her kriter değişimi yeni bir
sorgu (ve yeni bir ağ isteği) demek. Burada sorgu anahtara GİRMİYOR: liste
`['projectFirmList']` anahtarıyla bir kez çekilip `staleTime` ile duruyor, süzme
sayfada `useMemo` içinde yapılıyor. Sebep kayıt adedi — belgedeki ekranda ~11.839
satır var ve arama yazarken uygulanıyor; sorgu anahtara girseydi her tuş vuruşu
tüm listeyi baştan indirirdi.

**Borç:** backend sayfalı uç açınca `queryProjectFirmList` kaldırılacak,
parametreler sorguya taşınacak. Bu çözüm ölçeklenmez: tek istekte tüm liste
indiriliyor.

### Arama debounce'lu; kutunun taslağı bileşende, uygulanan sorgu URL'de

Arama Enter'a değil yazıma bağlı (300 ms, `useDebouncedValue`). Bu iki şeyi
gerektirdi:

- **Kutunun anlık metni bileşende** (`useDebouncedSearchDraft`) — CLAUDE.md'nin
  "liste durumunun kopyası bileşende tutulmaz" kuralının bilinçli istisnası.
  URL yalnız **uygulanmış** sorgunun sahibi; henüz durulmamış yazım sorgu değil.
- **Yazım URL'e `replace` ile işleniyor** (`useAdminParamWriter`'a opsiyonel
  `shouldReplace` eklendi) — her tuş vuruşu geçmişe kayıt bıraksaydı "abc" yazan
  kullanıcının geri tuşuna üç kez basması gerekirdi.

Gaz dağıtım firmaları ekranındaki `key={nameQuery}` numarası burada
KULLANILAMAZ: orada arama Enter'da uygulandığı için kutunun yeniden kurulması
görünmüyor, burada her 300 ms'de kurulur ve **kullanıcı odağını kaybederdi**.
İki yönlü eşitleme bu yüzden `lastAppliedRef` ile ayrıldı (kullanıcı yazdı →
URL'e yaz; URL kendiliğinden değişti → taslağı eşitle).

Arama karşılaştırması `includesTr`. `toLocaleLowerCase('tr')` **denenmedi çünkü
sorunu çözmüyor, üretiyor:** 'I' → 'ı' ve 'İ' → 'i' verdiği için düz klavyeyle
"ISTANBUL" yazan kullanıcı "İstanbul ..." ünvanını BULAMIYOR. `includesTr` üç
harfi de 'i'ye katlıyor, iki yön de eşleşiyor.

### Ekranın istediği alanların çoğu uçta YOK

Liste DTO'su yalnız `id, companyType, title, taxNumber, contactPerson, phone,
email` taşıyor. Sonuçlar:

- `Seri No` (`serialNumber`) ve `Gsm` (`phone2`) YALNIZ `/api/projectfirms/{id}`
  detay yanıtında var. Satır başına detay isteği atmak 30 kayıtta 30 istek
  demekti; yapılmadı.
- Yeterlik numarası (`Yeter No`) uçta HİÇ yok.
- Proje firmasını gaz dağıtım firmasına bağlayan **hiçbir uç yok**.

Sütunlar yine de duruyor ve "-" gösteriyor: sıra belgeden geliyor, uç genişleyince
yalnız `api/projectFirmDto.ts`'teki eşleme değişecek. `projectFirmDto.test.ts`
bilerek "bu alanlar null" diye iddia ediyor — alan eklendiğinde test kırılıp
eşlemenin güncellenmesini hatırlatsın diye.

**KK-5 (her G.D. yetkisi ayrı satır) KARŞILANMIYOR.** Uç firma bazlı dönüyor ve
istemcide düzleştirilecek yetki verisi de yok; başlıktaki adet bu yüzden
**tekil firma sayısı**. Filtre paneli (G.D. firması / bölge / yeterlilik) açılıyor
ama üç kutu da pasif — süzülselerdi ilk seçimde liste boşalır, kullanıcı veri
kaybettiğini sanardı (K27'deki bölge kararının aynısı).

---

## 2026-08 · Yeni proje firması ekle ekranı

### K30 — Benzersizlik ön kontrolü bu ekranda İSTEMCİDE

Gaz dağıtım firma formunda karar "benzersizliğe **sunucu** karar verir, istemci
ön kontrolü yok" idi (bkz. knowledge/gas-firm-form.md). Proje firması formunda
tersi yapıldı. Tutarsızlık değil: o kararın iki gerekçesi de burada geçersiz.

| Gerekçe (gaz dağıtım firması) | Proje firmasında durum |
|---|---|
| "Tüm numaraları çekmek 30'ar kayıtlık sayfalarda dolaşmayı gerektirir" | Uç sayfalamasız **düz dizi** döndürüyor; liste zaten tümüyle elde (K29) |
| "Yapılsa bile yarış durumunu istemci kapatamaz" | Doğru, ama sunucu bu kuralı **hiç denetlemiyor** — 409 yok |

`ProjectFirmCreateValidator` vergi/seri numarası benzersizliğine bakmıyor. Ön
kontrol olmasaydı kullanıcı aynı vergi numarasını ikinci kez kaydeder ve bunu
hiç öğrenemezdi. Kontrol `ui/admin/projectFirms/projectFirmUniqueness.ts`'te,
liste ekranıyla **aynı önbellek anahtarını** (`['projectFirmList']`) okuyor —
ekstra istek doğurmuyor.

Sınırları açıkça yazılı: yarış durumunu KAPATMAZ ve sunucu kuralı geldiğinde
kaldırılmaz, ikinci savunma hattına düşer. Bugün yalnız **vergi numarası** gerçek
veriyle karşılaştırılabiliyor; `serialNumber` liste DTO'sunda yok (yalnız detay
yanıtında), `accountingCode` hiçbir uçta yok — cari kod benzersizliği (belge
madde 23) bu yüzden **uygulanmıyor**.

`ProjectFirm` satırına yalnız bu kontrol için `taxNumber` eklendi; tabloda
sütunu yok.

### K31 — Üst bardaki bölge filtresi KALDIRILDI, "bölge" = gaz dağıtım firması

İki ayrı "bölge" kavramı aynı arayüzde çakışıyordu:

- üst bardaki **coğrafi bölge** kapsam seçicisi (Akdeniz, Ege, İç Anadolu…),
- yetkilendirmedeki **bölge lisanslı gaz dağıtım firması** (AKSA-GEMLİK).

Ürün kararı: kapsam seçicisi kalktı. Sunucuda karşılığı olan tek bir uç da yoktu
(`getRegions` mock'tu, liste satırı bölge taşımıyordu, filtre zaten `disabled`
duruyordu).

**Kaldırılanlar:** `AdminTopBar`'daki seçici, `region` URL anahtarı,
`useRegionParam`, `ALL_REGIONS_LABEL`, `getRegions`, gaz dağıtım firma satırındaki
`region` alanı, iki filtre panelindeki pasif "Bölge" kutuları ve uçlara giden
`region` parametreleri (`getDashboardSummary`, `getAnnouncements`, `listProjects`,
`getProjectFirms`, `getGasFirmsForProjectFirm`). Hiçbir yüzey onu yazamadığı için
okuyan her yer ölü koda dönüşüyordu.

**Korunanlar (coğrafi bölge VERİSİ duruyor, süzgeci kalktı):** "Bölge Bazlı
Yoğunluk" kartı, "Sistem geneli durum — …, tüm bölgeler" ve "Tüm bölgeler için"
metinleri, duyurunun kendi `region` alanı (kart rozeti + yayınlama kutusu).
`MOCK_REGIONS` `adminFirmsMock`'tan `adminDashboardMock`'a taşındı: gaz dağıtım
firma mock'unun bölgeyle işi kalmadı.

**Adlandırma:** yetkilendirme tarafındaki kod artık gerçeği söylüyor —
`RegionCheckboxGrid` → `GasDistributionFirmPicker`, `AuthorizationRegion` →
`AuthorizationGasFirm`, `regionId` → `gasDistributionFirmId`. **Kullanıcıya
görünen metinler DEĞİŞMEDİ**: "G.D Firması Bölgeleri" etiketi gereksinim
belgesinden geliyor (madde 14/17) ve orada kalıyor; üst bardaki çakışma
kalktığı için arayüzde belirsizlik doğurmuyor.

### K43 — Bölge kapsamı üst bara GERİ GELDİ, ama kapsam = grup firması

K31 coğrafi bölge seçicisini kaldırmıştı. Talep, üst barda yine bir "Bölge"
seçicisi olması ve seçimin listeleri süzmesi yönünde. Kavram çakışması
tekrarlanmasın diye kapsam **coğrafi bölge değil, gaz dağıtım GRUP firması**
(AKSA, ENERYA…): seçenekler `/api/gasdistributiongroups`'tan geliyor, yani
sunucuda gerçek karşılığı olan tek kaynak. Bölgeleri listeleyen uç hâlâ yok
(`/api/regions`, `/api/projectfirmregions` → 404).

**Ayrı `region` anahtarı YOK.** Üst bar, liste ekranının grup filtresiyle aynı
`group` anahtarını yazar. İki anahtar olsaydı aynı ekranda üst bar "AKSA",
sayfa içi filtre "ENERYA" diyebilir ve hangisinin kazandığı belirsiz kalırdı;
tek anahtarla ikisi birbirini kendiliğinden yansıtıyor.

**Kapsam sadece uygulanabildiği ekranda açık.** Bugün yalnız gaz dağıtım
firmaları listesi grup kimliği taşıyor. Proje firması satırında bölge/G.D.
firması alanı hiç yok; proje satırındaki `gasFirm` gerçek uçta her zaman `null`
geliyor. O ekranlarda seçici PASİF ve yanında sebebi yazılı ("Bu ekranda bölge
filtresi yok.") — seçim yapılabilseydi liste sessizce boşalır, kullanıcı "bu
bölgede kayıt yok" sanırdı. Uygulanabilir yolların listesi tek yerde:
`ui/admin/adminRegionScope.ts`. Backend proje/proje firması satırına bölge bağını
ekleyince oraya yol eklemek yeterli; üst bar ve hook değişmez.

### K44 — Bölge kapsamı TÜM ekranlarda etkin; bilgisi olmayan satır ELENMEZ

K43 kapsamı yalnız gaz dağıtım firmaları listesinde açmıştı, diğer ekranlarda
seçici pasifti. Talep üzerine kapsam **her yönetici ekranında etkin**.
`adminRegionScope.ts` (yol beyaz listesi) ve pasif hâl kalktı.

Kapsamın hiçbir listeyi sessizce boşaltmaması, ekran başına değil **kural
olarak** garanti ediliyor: satırında bölge bilgisi OLMAYAN kayıt elenmez
(`api/projects.ts` `matchesQuery`'de zaten uygulanan kural). Bugünkü sonuç:

| Ekran | Kapsam sonucu değiştiriyor mu |
|---|---|
| G.D. Firmaları | Evet — satır `groupId` taşıyor |
| Anasayfa | Evet — mock bölge kırılımı süzülüyor, kartlar birlikte dönüyor |
| Duyurular | Evet — bölgesi null olan duyuru "tüm bölgeler" sayılıp görünür kalır |
| Projeler | Hayır — `gasFirm` gerçek uçta hep null, kayıtlar elenmiyor |
| Proje Firmaları | Hayır — satırda bölge/G.D. firması alanı yok |

Uca giden ad `region` değil **`group`**: kapsam coğrafi bölge değil grup
firması kimliği (K43). `getDashboardSummary(dayKey, groupId)` ve
`AnnouncementQuery.groupId` bu yüzden kimlik alıyor; mock tarafı kimliği
`mockRegionNameOf` ile ada çeviriyor — eşleme tek yerde.

Gösterge panelindeki "Sistem geneli durum — …, tüm bölgeler" ve kart altındaki
"Tüm bölgeler için" metinleri kapsam seçiliyken bölgenin ADINI yazıyor
(`buildScopeDescription`, `buildCardScopeLabel`): sayılar süzülmüşken "tüm
bölgeler" demek yanlış bilgi olurdu.

### K45 — "Yetki" bir ROL değil, yetki satırının alanı

Proje firması kullanıcıları ekranındaki "Firma Mühendisi / Firma Yetkilisi"
seçimi rol modeline BAĞLANMADI. Rol modeli kesinleşti: üç kod
(`Admin`/`GasDistributionUser`/`ProjectFirmUser`) ve kullanıcı başına TEK rol
(knowledge/access-control.md). Oysa gereksinim yetkiyi KULLANICI başına değil
YETKİ SATIRI başına tanımlıyor: aynı kişi bir firmada mühendis, diğerinde
yetkili olabiliyor (KK-11).

İki yeni rol kodu açılsaydı tek-rol kuralı bu ekranı taşıyamazdı. Bu yüzden
`authorityType` yetki satırının bir alanı; kullanıcının rolü her zaman
`ProjectFirmUser`. Değerler `api/projectFirmUserDto.ts` → `AUTHORITY_TYPES`.

Belgenin "Yetki" sözcüğü arayüzde korunuyor (kullanıcı onu böyle tanıyor),
adlandırma ise gerçeği söylüyor — K31'deki bölge/grup ayrımıyla aynı yaklaşım.

### K46 — Mock, sunucu sözleşmesini TAKLİT eder; mock anahtarı uç bazlıdır

Proje firması kullanıcılarının hiçbir ucu yok (docs/api-eksikleri-kullanicilar.md).
İki karar:

**1. Mock sunucunun işini yapar.** `getProjectFirmUserList(query)` sorguyu
parametre olarak alır ve `{ items, totalCount, page, pageSize }` döndürür;
süzme, sıralama ve dilimleme mock'un İÇİNDE. Sayfa ve tablo kodu bugünden
sunucu taraflı davranıyor. İstemcide dilimleyen bir ara katman
(`…ListQuery.ts`) bilerek YAZILMADI: K27/K29'daki istemci taraflı çözüm sayfalı
uç olmadığı için katlanılan bir zorunluluktu, izlenecek desen değil. Uç
gelince yalnız `src/api/` altındaki gövdeler değişecek.

**2. Mock'a düşme kararı `hasApiBaseUrl()`e bağlanmaz.** Doğru soru
"`VITE_API_URL` var mı" değil, "bu UÇ var mı": API kökü tanımlıyken de bu
yollar 404 döner ve ekran sessizce boşalırdı. Uygulanmamış uçlar tek yerde:
`api/unimplementedEndpoints.ts`. Uç açılınca oradaki satır silinir ve
`isEndpointImplemented('…')` çağrısı DERLEME HATASI verir — bayrağı kaldırmayı
unutmak mümkün değil.

**Mock yalnız KULLANICIYI uyduruyor, firmaları DEĞİL.** Yetki satırındaki iki
seçim kutusu gerçek uçlardan besleniyor (`GET /api/gasdistributionfirms`,
`GET /api/projectfirms`) ve mock kullanıcı satırları da bu listelerden
tohumlanıyor (`seedProjectFirmUsers`). Sabit bir firma listesi tutulsaydı
formdaki seçenekler gerçek, listedeki kayıtlar sahte olur; güncelleme ekranında
kullanıcının kayıtlı firması seçeneklerde bulunmaz ve kutu boş açılırdı.

KK-20'nin daraltması (proje firmasını seçilen G.D. firmasına göre süzme) uç
olmadığı için YAPILMIYOR; kutu yine de firma seçilmeden pasif kalıyor —
uydurma bir daraltma yerine eksik olan açıkça eksik duruyor.

Kayıt da mock'ta kalıyor; kullanıcıya "kaydedildi ama sunucuya yazılmıyor"
uyarısı gösteriliyor (`isPersisted`, proje firması yetkilendirmelerindeki
`arePersisted` deseninin aynısı). `POST /api/auth/register`'a bağlanılmadı:
gövdesi `Aktif`, `GDF Kayıt No` ve çoklu yetki satırı taşımıyor, yarım
bağlansaydı listelenemeyen ve güncellenemeyen kayıt üretirdik.

### K47 — Proje firması kullanıcıları listesinde filtre "Filtrele" ile uygulanır

Bu ekranda arama/yetki/aktif kriterleri kutular değiştikçe DEĞİL, "Filtrele"
düğmesine (ya da arama alanında Enter'a) basılınca uygulanıyor. Gereksinim
bunu açıkça istiyor (KK-3, KK-5, KK-6) ve sayfalama sunucu taraflı olduğu için
her tuş vuruşu bir sayfa isteği doğururdu; düğmeli akışta üç kriter tek istekte
gidiyor.

**Proje firmaları ekranındaki "Filtrele" BAŞKA iş yapıyor** (orada arama 300 ms
debounce ile yazarken uygulanır, düğme yalnız kriter panelini açar,
bkz. knowledge/project-firm-list.md). İkisini eşitlemeye kalkan olursa bağlam
burada: fark bilinçli, kaynağı iki ekranın gereksinim metinleri.

Ortak kural değişmedi: durumun tek sahibi URL. Kutular yalnız TASLAK tutar,
uygulanınca adrese yazılır; adres dışarıdan değişirse (geri/ileri, paylaşılan
bağlantı, çipin kaldırılması) taslak URL'den yeniden kurulur.

### K48 — Gösterge panosu GERÇEK uca bağlandı; duyurular tarayıcıda kalıcı

Anasayfa artık iki kaynaktan besleniyor ve bu bilinçli.

**Sayaçlar, "bugün" ve bölge yoğunluğu → gerçek uç.** `GET /api/admin/dashboard`
sunucuda VAR (doğrulandı) ve bağlandı. Frontend'in tahmin ettiği
`/api/dashboard/summary` yolu yanlıştı. Alan adları da farklı
(`gasDistributionUserCount` ↔ `gasDistributionUsers`, `projectCount` ↔ `count`);
eşleme `adminDashboard.ts` içinde tek yerde.

İki parametre GÖNDERİLMİYOR:
- `date` — uç almıyor, "bugün" sayaçlarını sunucu kendi gününe göre hesaplıyor.
  Gün anahtarı istemcide yalnız sorgu anahtarı olarak kalıyor (gün dönünce veri
  tazelensin).
- bölge — uç sayısal `regionId` istiyor, elimizdeki değer bölge ADI. Coğrafi
  bölge tablosu da bugün tek kayıt taşıyor, eşleme kurmak sayıları
  değiştirmezdi.

**Bölge yoğunluğu bugün BOŞ görünüyor** ve bu gerçeğin kendisi: uç
`regionDensity: []` döndürüyor. Sunucudaki yoğunluk COĞRAFİ bölge başına PROJE
adedi (`{ regionId, regionName, projectCount }`), karttaki üç sayaç değil; grup
firması (AKSA, ENERYA…) bazlı yoğunluk sunucuda hiç yok. Mock sayılarla
doldurmak yerine boş bırakıldı — sahte sayı, eksik veriden kötüdür.

**Duyurular → tarayıcı deposu.** Duyuru varlığı sunucuda HİÇ yazılmadı (entity,
tablo, controller, migration; üçü de kontrol edildi ve backend de doğruladı).
Yayınlanan duyuru artık `localStorage`'da tutuluyor (`announcementStore.ts`),
yani sekme yenilenince kaybolmuyor.

Sahte kalıcılık GİZLENMİYOR: kayıt yalnız o tarayıcıda durur, başka makinede ve
başka kullanıcıda görünmez; ekran bunu söyleyen uyarıyı göstermeye devam eder.
Depodan okunan veri dış kaynak sayılıp şemadan geçiyor (kullanıcı depoyu elle
düzenleyebilir); bozuk içerik sessizce yok sayılıyor — duyuru listesi uğruna
anasayfa çökertilmiyor.

Duyuru uçları ağa HİÇ çıkmıyor: karar `hasApiBaseUrl`'e değil uç bazlı bayrağa
bağlı (`unimplementedEndpoints.ts`, K46). Eskiden her yayınlamada bir 404 gidip
mock'a düşülüyordu; şimdi gereksiz istek yok.

### K49 — `POST /api/projects` sözleşmesi değişti; il/ilçe zorunlu alan oldu

Proje ekleme HİÇ ÇALIŞMIYORDU. Sebep sunucu sözleşmesinin değişmesi: uç artık
`projectFirmRegionId` + `gasDistributionFirmRegionId` DEĞİL,
**`projectFirmAuthorizationId`** istiyor. Eski gövde 400 alıyordu:
"Proje firması yetkisi (ProjectFirmAuthorizationId) zorunludur."

Yeni gövde: `name`, `projectFirmAuthorizationId`, `description`, `code`,
`cityId`, `districtId`, `addressLine`, `blockLotParcel`.

**İl ve ilçe forma eklendi ve ZORUNLU.** Uç ikisini de alıyor ve adres onlarsız
eksik kalıyor. Kaynak gerçek uçlar: `GET /api/cities` (81 il) ve
`GET /api/cities/{cityId}/districts`.

İlçe kutusu il seçilene kadar PASİF: ilçeleri veren uç il kimliği istiyor,
ilsiz bir ilçe listesi yok. İl değişince ilçe seçimi TEMİZLENİR — eski ilçe yeni
ilin listesinde bulunmaz, ekranda geçerliymiş gibi durup sessizce yanlış kayıt
üretirdi (aynı kural yetki satırındaki firma ikilisinde de var, K45).

~~`projectFirmAuthorizationId` hâlâ SABİT (1)~~ — **kalktı (2026-08-16)**:
`GET /api/project-firm-authorizations` açıldı, kimlik seçilen firma çiftinden
çözülüyor (`resolveProjectFirmAuthorizationId`). Kuralın tamamı K86'da.

Yanıt şeması yalnız çağıranın ihtiyacı olan alanları zorunlu tutuyor: sunucu
`cityName`/`districtName` de türetip döndürüyor ama form onları kullanmıyor,
zorunlu kılınsalardı uç bir alanı kaldırdığında kayıt sınırda sessizce patlardı.

## 2026-08 · Proje detayı ekranı

### K50 — Sekmeler: belge metnindeki BEŞ sekme; plan/katı model/gaz açma kapsam dışı

Gereksinim dört ayrı liste veriyordu: belge metni "sekiz sekme" deyip BEŞ isim
sayıyor, KK-3 altı isim sayıyor (Proje Planı dahil), mockup görseli sekiz sekme
gösteriyor (+ Katı Model, Gaz Açma), mockup HTML'i altı.

Karar: ekran **belge metnindeki beş sekmeden** oluşuyor — Proje Bilgileri,
Proje İşlem Geçmişi, Proje Evrakları, Poliçe Bilgileri, Proje İşlemleri.

"Proje Planı", "Katı Model" ve "Gaz Açma" KAPSAM DIŞI ve şeritte hiç
görünmüyorlar (pasif madde olarak da durmuyorlar). Çizime detay ekranından
değil, başlıktaki "Çizim Editöründe Aç" bağlantısıyla giriliyor: aynı çizimin
ikinci bir görüntüleyicisini bakımda tutmak, editörün kendisi zaten o işi
yaparken maliyetliydi. Bu, ilk sürümde yazılan salt okunur SVG plan
görüntüleyicisinin (eski K55) GERİ ALINMASI demek.

Bedeli açık: **KK-7 karşılanmıyor.** Plan görüntüleyici, yakınlaştırma, sayfa
geçişi ve "Planı İndir (DWG)" bu sürümde yok; DWG uç bayrağı da kaldırıldı
(bayrağın çağrısı kalmayınca sessizleşirdi, bkz. K51).

Aktif sekme birincil renkte ALT ÇİZGİ ile vurgulanıyor: belgedeki "yeşil alt
çizgi" kuralının mavi paletteki karşılığı.

### K51 — Karma veri: mock yalnız GELİŞTİRMEDE, uyarı kalıcı, örnek değer işaretli

Ekranın istediği alanların yalnız onunun karşılığı var (`GET /api/projects/{id}`);
geri kalan her şey — durum, tesisat no, onay bilgileri, teknik değerler,
birim/cihaz, işlem geçmişi, evrak, poliçe, onay/ret/revizyon, .zpd/DWG/PDF —
sunucuda YOK. Dört ayrı karar:

**1. Mock ÜRETİM derlemesinde çalışmaz** (`api/mockGate.ts` → `isMockDataAllowed`
= `import.meta.env.DEV`). Üretimde ilgili bölüm veri yerine "bu bölümün veri
kaynağı henüz yok" kutusu gösterir. Karma verinin bilinen başarısızlığı sahte
kaydın bir demoda gerçek sanılmasıdır; boş bölüm, sahte dolu bölümden iyidir.

**2. Uyarı KAPATILAMAZ ve bölümleri sayar.** `NoticeBar` kullanılmadı (onun
kapatma düğmesi zorunlu). "Bazı veriler eksik" gibi genel bir cümle değil,
hangi kartın uydurma olduğu tek tek yazılıyor.

**3. Örnek değerin kendisi de işaretli** (`MockValue`): kesikli alt çizgi +
`sr-only` açıklama. Renk token'ı BİLEREK kullanılmadı — amber bu ekranda zaten
olağan bir renk ("Proje Güncelleme" etiketi, onay kartı kenarlığı) ve mock
işareti o üçlüye girseydi arka plana karışırdı. Kesikli çizgi renkten ve temadan
bağımsız.

**4. Gerçek/uydurma ayrımı TİPTE duruyor.** `ProjectDetail` düz bir nesne değil,
`{ server, extras }`: `server` gerçek uçtan, `extras` mock ve üretimde `null`.
Tek nesnede birleştirilseydi arayüz hangi değerin gerçek olduğunu bilemez ve
işareti koyamazdı.

**Mock DTO'ları uydurma değil:** cadapi'de `ProjectUnit`, `Device`,
`OperationHistory`, `Doc`/`ProjectDoc`, `Policy` entity'leri VAR — eksik olan
yalnız controller. Mock bu tabloların alan adlarını ve tiplerini taklit ediyor.

**Bayrak mekanizması SINANDI.** `unimplementedEndpoints.ts`'ten bir anahtar
silinince çağıran dosya derlenmiyor; ölçüldü: `firmUserList` silindiğinde
`api/projectFirmUsers.ts:99`, `firmUserCreate` silindiğinde
`api/projectFirmUserForm.ts:48` TS2345 veriyor (ternary değişkeninden geçen
çağrı da yakalanıyor). Çalışmasının sebebi `as const` + `isEndpointImplemented`
imzasının dar birleşim olması. TEK boşluk: bir bayrağın hiç çağrısı yoksa
hiçbir şey patlamaz — bu yüzden her yeni bayrağın en az bir
`isEndpointImplemented('…')` çağrısı var.

### K52 — Onay yetkisi tek yüklemin arkasında: `useCanApproveProject`

Gereksinimdeki "onay yetkisi bulunan kontrol mühendisi" üç rollü modelde
`GasDistributionUser`'a karşılık geliyor (projeyi onaylayan taraf dağıtım
firması); `Admin` de görüyor. Proje firması kullanıcısı kendi projesini
onaylayamaz.

Karar `ui/admin/useCanApproveProject.ts` içinde TEK bir fonksiyonun arkasında:
backend ayrı bir yetki alanı (`canApproveProject` gibi) açtığında yalnız o gövde
değişecek, çağıranların hiçbiri değişmeyecek. `usePermission` KULLANILMADI — o
hâlâ mock izin listesine bakıyor ve ikinci bir yetki kaynağı istemiyoruz.

Görünürlük ile ZAMANLAMA ayrıldı: yetkisi olmayana karar aksiyonları HİÇ
render edilmiyor (KK-10 "listelenmez"), taslak durumundaki proje için ise
görünüyor ama pasif ve sebebi yazıyor (KK-2) — yetki sorunu değil, sıra sorunu.

### K53 — `/projects/:id` detaya devredildi, editör `/editor` alt yoluna taşındı

`adminNavItems.ts`'teki TODO tam bunu bekliyordu: proje adına tıklayınca detay
açılmalı. Yol devri yapıldı, editör `/projects/:id/editor` oldu.
`projectEditorPath` duruyor (editöre giriş artık detaydan), yanına
`projectDetailPath` eklendi. Detay ekranı yönetici kabuğunun İÇİNDE (sol menü ve
üst bar duruyor); editör kabuk dışında, tam ekran kalmaya devam ediyor.

### K54 — Durum sözlüğü TÜRETİLDİ; `revizyonIstendi` sunucuda YOK, geçici

Belge "Revizyon İstendi" durumundan söz ediyor, repodaki `PROJECT_STATUSES` ise
dört değer taşıyor. İkinci bir sözlük yazılmadı, mevcut olan GENİŞLETİLDİ:
`PROJECT_DETAIL_STATUSES = [...PROJECT_STATUSES, REVISION_REQUESTED_STATUS]` ve
etiketler de aynı biçimde `PROJECT_STATUS_LABELS`'tan türüyor.

Liste ekranı `PROJECT_STATUSES`'ı kullanmaya devam ediyor: sekmesi artmadı,
testleri bozulmadı, kapsam korundu. Ortak dördün etiketi ve rengi tek yerde.

**Sunucu doğrulandı:** `ProjeDurumu` kod grubu (id 6) tam DÖRT kayıt taşıyor —
`Draft`(6001) / `PendingApproval`(6002) / `Approved`(6003) / `Rejected`(6004).
Revizyon karşılığı YOK. Yani `revizyonIstendi` bugün bir İSTEMCİ UYDURMASIDIR ve
geçicidir; onay/revizyon ucu açıldığında sunucunun döndüreceği `CodeValue` onun
yerini alacak. Backend'den istenecekler listesine girdi.

Durum çipinde renk yalnız NOKTADA; metin her durumda `ink` tonunda. Nokta bir
kontrast eşiğine tabi değil ve durumu söyleyen asıl kanal zaten yazının kendisi.

### K55 — Plan görüntüleyici YAZILDI ve AYNI GÜN GERİ ALINDI

İlk sürümde "Proje Planı" sekmesi için `ui/` altında bağımsız, salt okunur bir
SVG çizici yazıldı (`planGeometry.ts` + `PlanViewer.tsx`): `scene/` yeniden
kullanılmadı çünkü oradaki bileşenler `<Canvas>` içi (R3F) ve global `cadStore`
tarafından besleniyor; detay ekranından o store'u doldurmak editörün durumunu
ekran dışından yazmak olurdu.

Sekme kapsamdan çıkınca (K50) bu dosyaların hepsi SİLİNDİ. Karar burada
duruyor çünkü gerekçesi hâlâ geçerli: proje detayında çizim göstermek gerekirse
`scene/` gömülmemeli, aynı veriyi okuyan ayrı bir çizici yazılmalı.

**Silinirken kayda değer iki bulgu:**

**1. Kaydedilen çizimde TESİSAT YOK.** `saveProjectVersion` yalnız
`selectProjectData`'yı yazıyor ve `ProjectData` =
`floors/points/walls/openings/rooms/symbols/areaObjects`. Boru, servis kutusu,
sayaç ve cihazlar (`plumbing/`, `installationSlice`) hiç sunucuya
kaydedilmiyor; `docs/sample-project.json` de bunu doğruluyor. Yani proje
detayında "tesisat planı" göstermek bugün veri olarak MÜMKÜN DEĞİL — sekme
kalsaydı bile yarım kalacaktı.

**2. `loadLatestProjectVersion` kaydı olmayan projede `undefined` döndürüyor**
ve react-query `undefined`'ı geçersiz sayıp sorguyu HİÇ çözmüyor (sekme sonsuza
kadar "yükleniyor" kalıyordu). Bu uç başka bir yerden tüketilirse `?? null`
şart.

### K56 — Yeni renk token'ı YOK; rozet rengi kenarlıkta

Belgedeki renk adları mevcut token'lara eşlendi: "Proje Kayıt" → `success`,
"Proje Güncelleme" ve onay kartı sol kenarlığı → `warning`, "PDF" rozeti →
`danger`, "ZPD" rozeti → `selection`, aktif sekme alt çizgisi → `admin-primary`.
`--color-info` AÇILMADI: tek bir rozet için palet büyütmek erken. İncelemede
rozetin tıklanabilir sanılması sorunu çıkarsa o zaman eklenir — token eklemek
geri döndürülebilir, palet kirliliği daha zor geri alınır.

Rozetlerde renk KENARLIK + soluk zeminde, METİN her tonda `ink`. Dolgu üstüne
renkli yazı denenmedi çünkü iki temada birden güvenli bir mavi/amber metin
token'ı yok (`admin-primary` koyu temada ~2.9:1, `warning` metin olarak hiç
sınanmadı). Rozetin anlamını yazının kendisi taşıyor; renk ikinci kanal.

Ekrana özel üç varyant (`detailBadgeVariants`, `quickActionVariants`,
`viewerButtonVariants`) `adminVariants.ts`'e değil
`projectDetail/projectDetailVariants.ts`'e kondu: o dosyayı 200 satır sınırının
üstüne çıkarıyorlardı ve üçü de tek ekrana ait. İkinci bir ekran isterse aynı
kuralla `admin/` köküne taşınır.

### Ortak parçaya çıkanlar

`EmptyValue` ve `DateTimeCell` ikinci ekranda gerekti; kopyalanmadı,
`projects/` altından `admin/` köküne TAŞINDI (klasör sözleşmesi). Konum izi
`PageHeader`'ın içinden `Breadcrumb` olarak çıkarıldı: detay başlığı kendi
düzenini kuruyor (başlık yanında çip, altında künye) ama aynı izi gösteriyor.

## 2026-08 · Evraklar listesi ve Evrak Ekle ekranları

### K57 — Ekranların TAMAMI mock; uç yazmak backend'in işi

`localhost:5193` OpenAPI'sinde 30 yol var ve **evrakla ilgili tek bir yol ya da
DTO yok**: ne liste, ne yükleme, ne evrak tipi, ne proje birimi. Proje detayı
çalışmasında da olduğu gibi (K51) uçları frontend uydurmuyor; iki ekran da
`src/api/documentsMock.ts` içindeki BELLEK deposundan besleniyor.

Depo tohumunu `projectsMock.getMockProjectSeeds()` veriyor — evrak satırları
kendi proje listesini uydurmuyor. Uydursaydı tablodaki "Proje Adı" bağlantısı
proje listesinde bulunmayan bir kimliğe giderdi.

Eksik uçların dökümü ve önerilen sözleşme: `docs/api-eksikleri-evraklar.md`.
`unimplementedEndpoints.ts`'e bayrak EKLENMEDİ: o mekanizma "uç var mı" sorusunu
gerçek bir çağrının yanında tutuyor, evrak tarafında ise çağrı hiç yok — çağrısı
olmayan bayrak sessiz kalır (K51'de tespit edilen tek boşluk).

### K58 — Yükleme "kaydediyor gibi" yapıyor ama kalıcı OLMADIĞINI söylüyor

"Kaydet" dosyaları gerçekten belleğe yazıyor: yüklenen evrak hem genel Evraklar
listesinde hem proje detayının evrak sekmesinde görünüyor (gereksinim 12).
**Sayfa yenilenince kayboluyor** — veritabanı yok.

İki ayrı karar birleşti ve ilk uygulamada biri unutuldu:

1. Yüklemenin "kaydediyor gibi" davranması iş tarafının açık isteği (uç yokken
   ekran denenebilsin diye).
2. **Sahte başarı mesajı gösterilmemesi de iş tarafının açık kararıydı**
   (K51'deki `isPersisted: false` deseni). İlk sürüm bu ikinciyi atladı: düz
   yeşil "Evrak başarıyla yüklendi." şeridi çıkıyor, kalıcı olmadığı hiçbir
   yerde yazmıyordu.

Şimdiki hâl ikisini birden karşılıyor: mesaj çıkıyor (kayıt gerçekten görünür
bir etki üretiyor, o oturumda doğru) ama şerit `warning` tonunda ve altında
"kayıt yalnız bu oturumda tutuluyor, sunucuya yazılmadı; sayfa yenilenince
listeden düşer" satırları duruyor — karar işlemlerindeki `NOT_PERSISTED_DETAILS`
deseninin aynısı.

**Mock yalnız GELİŞTİRMEDE** (K51'e uygun, `mockGate`): üretim derlemesinde
liste veri yerine "kaynağı yok" kutusu gösterir, kalıcı mock uyarı şeridi
geliştirmede hep görünür ve "Kaydet" hiç yazmadan `unavailable` döner —
gösterilmeyecek bir depoya kayıt atmak yapılmamış bir işi yapılmış göstermek
olurdu.

**İki ekranın evrak deposu TEK.** Proje detayının `buildMockProjectDocuments`'ı
eskiden boş dönüyordu; artık aynı depodan süzüp sütun eşlemesi yapıyor. İki ayrı
mock kalsaydı aynı evrak bir ekranda görünüp öbüründe kaybolurdu.

Dosyanın kendisi de gerçek: yüklenen `File` için `URL.createObjectURL` üretiliyor
ve evrak adına tıklamak oturum boyunca gerçekten çalışıyor. Tohumlanan satırların
arkasında dosya YOK, o yüzden adları bağlantı değil düz metin — sahte bir adres
404'e giden bir bağlantı olurdu.

### K59 — Dosyanın açılma biçimi `contentType`'tan, uzantıdan DEĞİL

Görüntülenebilir tipler (`application/pdf`, `image/*`) yeni sekmede
(`target="_blank" rel="noopener noreferrer"`), gerisi indirilerek açılıyor.
Kararı yalnız `contentType` veriyor: uzantıya bakan bir ayrım, uzantısı yanlış
yazılmış dosyada sessizce yanlış davranırdı.

Uzantı→MIME türetmesi YALNIZ mock katmanında (`documentsMock.contentTypeOf`);
bileşen uzantıyı hiç görmüyor. Gerçek uç `contentType` alanını kendisi
döndürecek ve o türetme silinecek.

Biçim DOĞRULAMASI ise tam tersine uzantıdan (`documentFiles.validateDocumentFile`):
tarayıcı `.alp` ve `.bmp` için `File.type`'ı boş bırakıyor, MIME'a bakan bir
denetim geçerli dosyayı reddederdi.

### K60 — Kapsam dışı bırakılanlar ve gerekçeleri

- **Favori kavramı tümüyle yok:** listedeki "Favoriler" sekmesi, Evrak Ekle'deki
  "Favori Evraklar" sekmesi ve dropdown'daki "Favori Evrak" tipi (19 → 18).
  Seçilebilen ama hiçbir şey yapmayan bir tip, olmayan bir özellik vaat ederdi.
- **Sekme çubuğu tümüyle kaldırıldı:** "Favoriler" düşünce liste ekranında tek
  sekme kalıyordu; tek sekmelik şerit kullanıcıya seçenek varmış izlenimi verir.
- **Dosya tipi rozetleri (PDF/DWG/JPG) yok** — ne listede ne yükleme satırında.
- **Sayfalama numaralı**, mockup'taki "Daha Fazla Göster" uygulanmadı: sayfa
  durumunun URL'de tutulması kuralını (admin-list-state) bozuyordu.
- **Proje listesindeki evrak ikonunun yeşile dönmesi yapılmadı:**
  `GET /api/projects` `hasDocuments` döndürmüyor, istemcide geçici iz tutmak
  sunucudan gelen veriyle çelişen ikinci bir gerçek üretirdi.

### K61 — Kimlik yolda değil query'de: `/admin/documents/new?project=<id>`

Yüklenen evrak GELİNEN projeyle ilişkilendiriliyor (gereksinim 6), yani ekran
kimliksiz açılamaz. `/admin/documents/new` sabiti ve rotası zaten vardı; yolu
`/projects/:id/documents/new` yapmak hem sabiti hem rotayı hem de ona bağlı iki
bağlantıyı taşımak olurdu. Kimlik query parametresinde (`documentCreatePath`).

Kimliksiz gelinirse ekran boş kalmıyor: sebebi yazan bir hata kutusu ve
projelere dönüş bağlantısı çıkıyor.

### K62 — "Firma Adı" ve "G.D Firması" DÜZ METİN

Gereksinim üçünü de tıklanabilir istiyor ama ikisinin gidebileceği bir salt
okunur ekran repoda yok:

- `ProjectFirmsPage` yalnız `q` (ad araması) okuyor — kimlik filtresi yok, o
  yüzden bağlantı kullanıcıyı filtresiz bir listeye atardı.
- G.D. firmasının tek ekranı güncelleme FORMU; bir liste hücresinden düzenleme
  formuna gitmek yanlış hedef ve her rolün o formu görmesi de doğru değil.

Yalnız "Proje Adı" bağlantılı (`projectDetailPath`). İkisi de
`docs/api-eksikleri-evraklar.md`'deki eksik ekranlar notuna yazıldı.

### K63 — Evrak Ekle'nin proje künyesi mock tohumundan değil, GERÇEK uçtan

`findDocumentProject` projeyi `documentsMock.findMockProjectSeed` ile çözüyordu,
yani `projectsMock`'un ürettiği 48 sahte kayıtta arıyordu. Proje LİSTESİ ise
gerçek `GET /api/projects`'ten geliyor. İki liste birbirini tutmadığı için ekran
iki türlü yanlış davranıyordu:

- Sunucudaki projenin kimliği tohum aralığının dışındaysa (`id > 48`) ekran
  "adreste geçerli bir proje yok" deyip hiç açılmıyordu — Evrak Ekle gerçek bir
  projede kullanılamıyordu.
- Kimlik tesadüfen bir tohuma denk gelirse (`id ≤ 48`) ekran BAŞKA bir projenin
  adını gösteriyor ve evrağı o adla kaydediyordu. Sessiz olan ve daha kötü olan
  hâl bu.

Ayrıca künye `mockGate`'in dışındaydı: üretim derlemesinde de uydurma bir proje
adı çiziliyordu (K51'in kapatmak için var olduğu boşluk).

Künye artık proje detayını besleyen uçtan geliyor (`getProjectDetail` →
`server`); `Sourced` zarfına gerek yok, çünkü bu alanlar sunucunun GERÇEKTEN
döndürdüğü on alanın içinde. Uydurma olan tek şey evrağın kendisi ve o zaten
`mockedData` arkasında.

Sonuçları:

- `saveProjectDocuments` artık kimlik değil künye nesnesi alıyor; `unknownProject`
  hata dalı düştü (proje kaydetmeden önce zaten çözülmüş oluyor).
- Yüklenen satırın firma/tesisat alanları `null`: gerçek uç döndürmüyor,
  tohumdan doldurmak düzeltilen tuzağın kendisi olurdu.
- Künye artık asenkron; ekranın "yükleniyor" ve "okunamadı" hâlleri de var
  (`DocumentProjectNotice`). 404 "proje yok", diğer hatalar "tekrar dene" —
  ikisini tek mesaja indirmek, sunucu çökmesini "böyle bir proje yok" diye
  gösterirdi.
- Test tuzağı: `vi.fn().mockResolvedValue(new Response(...))` TEK yanıt nesnesi
  paylaştırıyor, gövde ilk okumada tükeniyor. Ekran artık aynı ucu iki kez
  çağırdığı için (künye + yönlendirme sonrası detay) sahte `fetch` her çağrıda
  yeni `Response` üretmek zorunda.

### Ortak parçaya çıkanlar

`toIsoDate` ve `lastMonthRange` ikinci ekranda gerekti; kopyalanmadı,
`projects/useProjectListParams.ts` içinden `admin/adminDateRange.ts`'e TAŞINDI
(klasör sözleşmesi). İki ekran ayrı kopya tutsaydı biri "son bir ay"ı öbüründen
farklı hesaplayabilirdi.

`ADMIN_PARAM_KEYS`'e `documentType` eklendi ve `authorityType` ile AYNI adresi
(`type`) kullanıyor: ikisi de "bu listedeki tür süzgeci" demek ve iki liste asla
aynı adreste açılmıyor. Ayrı alan adı taşımaları, hangi ekranın hangi süzgeci
yazdığını çağrı yerinde okunur kılıyor.

`AdminSidebar` testi "Yakında" rozetini artık etiketle değil `isComingSoon`
bayrağıyla arıyor: Evraklar ekranı yazılınca rozeti düştü ve sabitlenmiş etiket
testi kırdı — sıradaki ekran aynı testi bir daha kırmasın.
### K63 — Düşey eksen kimliği `AreaObject.axisId` ile geldi; nesne kattan KOPARILMADI

KK-19 kopyalanan baca şaftı ve kolon havalandırmasının "kaynak katla aynı düşey
eksende" kalmasını istiyor. K39/K40 bu türleri bilinçli olarak kat-başı alan
nesnesi diye modellemiş ve kat-bağımsız kimliği "gerekirse ayrı karar" diye
ertelemişti. Karar bu.

**Nesne kattan koparılmadı.** `Riser` gibi kökte yaşayan ayrı bir tip açmak
yerine `AreaObject`'e opsiyonel `axisId` eklendi. Ayrı tip, alan nesnesinin
tamamını (tutamaç, etiket, açıklık koruması, kat silme temizliği, grup
dönüşümü) ikinci bir kod yolunda tekrar yazmak demekti; kazanç yalnız
"kimlik korunuyor" idi ve bunu tek alan da veriyor.

**`id` bu işi göremez.** Kopya tanım gereği yeni id alır (kural 6), yani "aynı
baca" bilgisi kopyalamada kaybolurdu. Kopya aynı koordinatta doğduğu için
geometrik olarak hizalı GÖRÜNÜR — korunan bir kimlik olmadan kat sonradan
taşınınca bağ sessizce kopar. Kimliğin ayrı bir alan olmasının tek sebebi, id
ile kopyalamada ZIT yönde davranmak zorunda olması.

**Üç yol, üç davranış:**

- Yeni çizim (`addAreaObjectToDraft`) → kendi eksenini BAŞLATIR. Komşu katta
  hizalı nesne aranmaz: "yakın duruyor" ile "aynı baca" aynı şey değil,
  varsayılan bir bağ hata kontrollerinde uydurma hizasızlık uyarısı üretirdi.
- Kat kopyalama (`cloneFloorArchitecture`) → kimliği KORUR. Eksenin ikinci bir
  kata uzanabildiği tek yol burası.
- Ctrl+D çoğaltma (`duplicateSelectionInDraft`) → YENİ eksen. Kopya aynı kata
  düşüyor; düşey eksen kat başına bir tane, ötelenmiş kopya zaten hizalı değil.

**Opsiyonel kaldı, göç YAZILMADI.** Alanın yokluğu "bilinen bir ekseni yok"
demek, "ekseni sıfır" değil. Yükleme sırasında geriye dönük doldurmak
(`axisId = id`) bit-bit turunu bozar: depodaki her çizim ilk açılışta değişmiş
görünür ve kabul testi kırılır. Sonuç: K63 öncesi çizilmiş baca şaftları
kopyalandığında eksen kimliği taşımaz — yeniden çizilene kadar KK-19 onlarda
işlemez. Gerekirse ayrı bir göç kararı.

`nextUniqueId` sayacından geliyor (kural 6) — nesne id'leriyle aynı evrende,
çakışması yapı gereği imkânsız. Reddedilen yerleştirmede (K35/K36 açıklık
koruması) kimlik de harcanmaz.

## 2026-08 · Poliçe Oluşturma sihirbazı

### K64 — Kayıt Adım 4'te yapılır, Adım 5 kayıt SONRASI sonuç ekranıdır

Gereksinim belgesi kendisiyle çelişiyordu: bir yandan "son adımda İleri düğmesi
Bitir olur", öte yandan "beşinci adımda onay ikonu görünür, Bitir'e tıklanınca
poliçe kaydedilir" diyordu — yani başarı ekranı kayıttan ÖNCE gösterilecekti.

Karar: **kayıt Adım 4'ün (Poliçe Özeti) "Bitir" düğmesiyle yapılır**, Adım 5
yalnız sonucu gösterir. Sebep, kaydın başarısız olabilmesi: sunucu hatasında
kullanıcı "Poliçe Tamamlandı" yazan bir ekrana bakıyor olurdu. Adım 5'te
ileri/geri düğmesi de yok, tek düğme "Proje Detayına Dön" — kaydedilmiş bir
poliçenin adımlarına dönmek düzeltme değil, ikinci bir kayıt izlenimi verirdi.

Numara çakışması (`409`) gibi kayıt sırasında çıkan hata, hatanın AİT OLDUĞU
adıma geri götürüyor ve odak ilk hatalı alana taşınıyor (`FIELD_STEPS`).

### K65 — Sihirbazın durumu URL'de DEĞİL, bileşende

CLAUDE.md "liste ekranlarının durumunun tek sahibi URL query string'dir" diyor.
Sihirbaz liste değil ve kuralın gerekçesi burada tersine çalışıyor: adres
paylaşılabilir/yer imlenebilir olsun diye tutulan durum, form verisi adreste
taşınamadığı için yenilemede **adımı koruyup veriyi düşürürdü** — kullanıcı boş
bir "Poliçe Bilgileri" adımına düşerdi.

Bu yüzden adım ve form değerleri `usePolicyWizard` içinde yerel durumda; yenileme
akışı baştan başlatır. Adreste yalnız `?project=<id>` var, o da ekranın hangi
projeye bağlı açıldığını söylüyor (K61'in aynı gerekçesi).

Doğrulama ADIM BAZLI: "İleri" yalnız bulunulan adımın alanlarını denetler,
kullanıcı henüz görmediği alanın hatasını görmez. Kayıttan hemen önce iki veri
adımı birden denetlenir (araya dönülüp bozulmuş alan olabilir).

### K66 — Poliçe verisinin TEK deposu var; benzersizlik TEK kapıdan geçiyor

Sunucuda ne sigorta şirketi, ne acente, ne poliçe kaydı ucu var (`Policy`
entity'si tabloda VAR, controller'ı yok). K57'nin evrak deseni tekrarlandı:
`src/api/policies.ts` sözleşmeyi tanımlıyor, gövdeyi `policiesMock.ts`
besliyor, `mockGate` sahte veriyi yalnız geliştirme derlemesinde açıyor (K51).

Proje detayının poliçe sekmesi AYNI depodan okuyor (`buildMockProjectPolicies`
artık `getMockPolicies()`'i süzüyor): oluşturulan poliçenin sekmede görünmesi
(KK-21) ancak tek depo varsa doğru olur. Depo tohumlanmıyor — poliçesi olmayan
projede sekme dürüstçe boş kalır.

Poliçe numarası benzersizliği (KK-19) bugün istemcide, `isPolicyNumberTaken`
ile. Hem "İleri" doğrulaması hem kayıt bu tek fonksiyondan geçiyor: uç açılınca
gövdesi 409 kontrolüne dönecek ve iki çağıran da değişmeden doğru davranacak.
İki yere kopyalansaydı biri güncellenmeden kalırdı.

Eksik uçların dökümü ve önerilen sözleşme: `docs/api-eksikleri-policeler.md`.

### K67 — Kapsam: yalnız oluşturma akışı; "Poliçeler" menüsü hâlâ karşılama

Poliçe LİSTESİ ekranı bu işin kapsamı değildi. Sol menüdeki "Poliçeler" öğesi
"Yakında" rozetiyle duruyor ve `ComingSoonPage`'e gidiyor; sihirbaza yalnız
proje detayındaki "Poliçe Bilgileri" sekmesinin "Poliçelendir" düğmesinden
giriliyor. Kırılım yine de "Anasayfa / Poliçeler / Poliçe Oluşturma" (gereksinim
13) — iz, ekranın kavramsal yerini gösteriyor.

Yöntem adımında İKİNCİ seçenek EKLENMEDİ: sigorta şirketi servisleri üzerinden
otomatik poliçe ileride gelecek ama bugün seçilebilen ama hiçbir şey yapmayan
bir kart, olmayan bir özellik vaat ederdi (K60'ın "Favori Evrak" gerekçesi).
Yapı yine de kapalı kurulmadı: `POLICY_METHODS` dar birleşim ve tek elemanlı bir
radyo GRUBU — o gün ikinci bir `label` ve bir sözlük satırı yetecek.

Ayrıca sihirbazda birim (`ProjectUnit`) ve ödeme sorulmuyor (gereksinimde yok):
tablo sütunları ile form UYUŞMUYOR. "Birim" boş kalıyor (uydurulmadı), **"Ödeme:
Bekliyor" ise istemci varsayımıdır** — `buildMockProjectPolicies` sabit
`isPaid: false` yazıyor. İkisi de analiste soruldu
(docs/api-eksikleri-policeler.md, madde 2).

### Ortak parçaya çıkanlar

`DOCUMENT_PROJECT_PARAM` → **`PROJECT_PARAM`**: "bu ekran hangi projeye bağlı
açıldı" anahtarını iki ekran da (Evrak Ekle, Poliçe Oluşturma) kullanıyor; iki
ayrı sabit aynı anahtarın iki adı olurdu. Adresteki kimliği çözen
`parseProjectParam` de aynı yerde.

`documents/DocumentProjectNotice` → **`admin/ProjectContextNotice`** (klasör
sözleşmesi: ikinci ekranda gereken parça `admin/` köküne taşınır, ad öneki
düşer). Ekran adını parametre aldı; "yükleniyor / kimlik yok / okunamadı" üç
hâli aynen korundu.

`getProjectSummary` (`api/projectDetail.ts`): künyeyi gerçek uçtan çözen K63
mantığı Evrak Ekle'nin içinden ortak fonksiyona çıktı — 404 `null`, ağ hatası
FIRLATIR, çünkü "proje yok" ile "sunucuya ulaşılamadı" farklı ekranlar.

`TextField`'a `suffix` eklendi (girdinin İÇİNDE sağda duran "₺"); ikon slotuyla
aynı mekanizma, karşı taraf. `aria-hidden`: birim etiketin işi, ekran okuyucu
değeri iki kez okumasın.

`AdminSidebar`'da `end` artık YALNIZ Anasayfa'da: `/admin` her yönetici yolunun
ön eki olduğu için o madde hep etkin görünüyordu, diğer maddelerde ise alt yol
(`/admin/policies/new`) açıkken hiçbir madde işaretli kalmıyordu.

Sihirbaza özel `cva` varyantları `policies/policyVariants.ts`'te: `adminVariants.ts`
zaten 200 satır sınırının başındaydı ve klasör sözleşmesi tek ekrana özel
parçaları `<ekran>/` altında istiyor (`projectDetailVariants.ts` deseni).

`projectDetail/InfoRow` (+ bağlı olduğu `MockValue`) → **`admin/InfoRow`**: poliçe
özeti aynı etiket/değer satırını istedi. Özet kartı ilk yazımda satırın
işaretlemesini KOPYALAMIŞTI; kopya silindi, parça köke taşındı (klasör
sözleşmesi). Yan faydası: eksik değer artık iki ekranda da aynı soluk "—".

Aynı kural `projectDetail/projectDetailFormat.ts` için HENÜZ uygulanmadı: poliçe
özeti oradan yalnız `formatCurrency` ve `formatPlainDate` kullanıyor, kalan altı
biçimleyici proje detayına özel. Dosyayı `admin/adminFormat.ts` yapmak altı
dosyayı birden değiştireceği için ayrı bir adıma bırakıldı — bugünkü hâli
klasörler arası bir import, ikinci bir KOPYA değil.

## 2026-08 · Poliçe listesi ekranı ve sihirbazın yeri

### K68 — "Poliçelendir" poliçe bölümüne GİTMEZ; sihirbaz projenin altında

Sihirbazın yolu `/admin/policies/new` idi. Sol menüde `end` yalnız Anasayfa'da
olduğu için (K67) o adreste "Poliçeler" maddesi işaretleniyordu: kullanıcı proje
detayından "Poliçelendir"e bastığında, bütün poliçelerin listelendiği bölüme
geçmiş gibi görünüyordu. Poliçe LİSTESİ ekranı gelince bu iki ekran gerçekten
ayrıştı ve karışıklık somutlaştı.

Karar: sihirbazın yolu **`/projects/:projectId/policies/new`**. Sonuçları:

- Sol menüde "Projeler" işaretli kalıyor, "Poliçeler" listeye ayrıldı.
- Kırılım artık "Anasayfa / Projeler / <proje adı> / Poliçe Oluşturma" —
  K67'deki "Anasayfa / Poliçeler / Poliçe Oluşturma" izi kalktı; ekran bir
  projenin işlemi ve dönüşü de o projeye.
- Proje kimliği **YOLDA**, `?project=` ile değil (K61 evrak için geçerli
  kalıyor): adres zaten projeye bağlıyken ayrıca query taşımak aynı bilginin
  ikinci kaynağı olurdu. `parseProjectParam` ikisinde de ortak — bozuk kimlikte
  ekran veri çekmek yerine sebebini yazıyor.
- `POLICY_CREATE_PATH` sabiti düştü; yerine `POLICY_CREATE_ROUTE` (rota kalıbı)
  ve `policyCreatePath(projectId)` var, ikisi tek segment sabitinden türüyor.
  Proje detayının "İşlemler" sekmesindeki kısayol kimliksiz `POLICY_CREATE_PATH`
  kullanıyordu — o bağlantı da düzeldi (kimliksiz açılan sihirbaz "geçerli bir
  proje yok" diyordu).

### K69 — Poliçe listesi ekranı; mock depo artık TOHUMLU

Sol menüdeki "Poliçeler" karşılama ekranı değil, gerçek liste
(`src/pages/PolicyListPage.tsx`): bütün projelerin poliçeleri, sunucu taraflı
sözleşmeye göre sayfalanan tablo. Uç yok — `GET /api/policies` de
`unimplementedEndpoints`'te bayraklı, gövdeyi mock besliyor ve şerit bunun
uydurma olduğunu söylüyor (K51 + K58 deseni).

K66'nın "depo TOHUMLANMIYOR" kararı bu ekranla değişti: boş depoyla listenin
filtresi, sıralaması ve sayfalaması hiç denenemezdi. Tohumlar evrak mock'uyla
AYNI kaynaktan (`getMockProjectSeeds`) geliyor ki satırdaki "Proje Adı"
bağlantısı proje listesinde bulunmayan bir kimliğe gitmesin. Depo hâlâ TEK:
proje detayının poliçe sekmesi de oradan okuyor, bir poliçe iki ekranda da aynı
görünüyor. Poliçesiz proje kaldı (`POLICY_COUNTS` içinde sıfırlar) — sekmenin
boş hâli de görünsün.

Kaydedilen poliçe artık proje KÜNYESİNİ de saklıyor: liste "Proje Adı"
gösteriyor ve kimlikten ada inen tek yol mock tohumlarıydı — sunucudaki bir
projenin poliçesi o yolla uydurma bir projenin adıyla listelenirdi (K63'ün
tuzağı). Bu yüzden `createProjectPolicy` künyeyi parametre alıyor
(`saveProjectDocuments` deseni) ve `usePolicyWizard` kimlik değil `ProjectSummary`
istiyor. Künyesi olmayan satırda ad uydurulmuyor, boş değer işareti kalıyor.

Liste durumu URL'de (`admin-list-state`): arama (`q`) poliçe numarasını VE proje
adını kapsıyor, sigorta şirketi süzgeci yeni `company` anahtarında, sıralama
poliçe no ve başlangıç tarihinde. Sihirbazın durumu bunun DIŞINDA kalmaya devam
ediyor (K65).

Tabloda "Birim" ve "Ödeme" sütunu YOK: sihirbaz ikisini de sormuyor ve K67'de
"Ödeme: Bekliyor"un istemci varsayımı olduğu yazılmıştı — genel listede o
varsayımı tekrarlamak, listeyi olduğundan dolu gösterirdi.

### Ortak parçaya çıkan

`formatCurrency` ve `formatPlainDate` → **`admin/adminFormat.ts`**: K67'de
"ayrı bir adıma bırakıldı" denen taşıma yapıldı, üçüncü çağıran (poliçe listesi)
gelince gerekçe kalmadı. Kalan altı biçimleyici proje detayına özel kaldığı için
`projectDetailFormat.ts` duruyor.

### K70 — Geri al/yinele AKTİF GÖRÜNÜMÜN geçmişine gider, TEK kapıdan

İki ayrı geçmiş yığını var: mimari/proje verisi zundo ile cadStore'da
(`store/history.ts`), tesisat verisi ayrı bir aynada
(`plumbing/store/plumbingHistory.ts`). Hangisine gidileceğini seçen dallanma
klavye kısayolunun içine yazılmıştı; yüzen çubuğun ve menünün düğmeleri
doğrudan `undoProject`'i çağırıyordu. Sonuç: tesisat görünümünde düğmeye
basmak tesisatı değil MİMARİYİ geri alıyor, üstelik düğmenin pasifliği de
yanlış geçmişten okunduğu için tesisatta geri alınacak adım varken düğme
sönük görünüyordu.

Dallanma tek yere alındı: **`store/activeViewHistory.ts`** —
`undoActiveView`/`redoActiveView` ve aktiflik için
`useCanUndoActiveView`/`useCanRedoActiveView`. Kısayol, menü ve yüzen çubuk
artık yalnız bunları çağırıyor; `undoProject`/`useCanUndo` doğrudan
çağrılmıyor. İzometrikte düzenleme olmadığı için orada proje geçmişi
varsayılan kalıyor.

Geçmiş yığınları BİRLEŞTİRİLMEDİ: birleşik tek yığında tesisat görünümündeki
Ctrl+Z kullanıcıyı göremediği bir duvar değişikliğine götürürdü. Ayrık
yığınların bedeli, mimaride yapılan bir işin tesisat görünümünden geri
alınamaması — kullanıcı zaten o değişikliği görmediği görünümde geri almak
istemez.

**Görünüm (sayfa) geçişi geçmişe YAZILMAZ.** Geri alma çizim VERİSİNİ
kurtarır, gezinmeyi değil — zoom, pan, seçim ve aktif kat da aynı gerekçeyle
dışarıda (`store/history.ts`). Görünüm geçişi geçmişe girseydi Ctrl+Z bazen
bir şeyi geri alır bazen kullanıcıyı başka bir ekrana ışınlardı; tuşun ne
yapacağı öngörülemez olurdu. Gezinmenin geri tuşu tarayıcınınkidir.

### K71 — `nextUniqueId` ve `revision` mimari geçmişten ÇIKTI

K70'in ayrık yığınları tam ayrık değildi: `store/history.ts` bu iki alanı da
izliyordu, oysa ikisini de TESİSAT eklemesi artırıyor (`takeNextId`,
`markDirty` — ortak sayaçlar). Sonuç iki ayrı hataydı:

1. Her tesisat işlemi mimari geçmişe, mimari verisi birebir aynı olan bir adım
   bırakıyordu. Mimaride Ctrl+Z görünürde hiçbir şey yapmıyor gibi oluyordu —
   aslında o boş adımı geri alıyordu.
2. O boş adımı geri almak `nextUniqueId`'yi geriye düşürüyordu, ama tesisat
   elemanı yerinde kalıyordu. Sayaç aynı id'yi ikinci kez üretebilirdi —
   knowledge/id-scheme.md'nin "bir kez üretilir, ASLA yeniden üretilmez"
   kuralının ihlali. Sessiz veri bozulması.

İkisi de izlenen alan listesinden çıkarıldı. Geçmiş artık YALNIZ mimari çizim
verisini tutuyor; tesisat düzenlemesi mimari dizilere dokunmadığı için
`areProjectStatesEqual` onu zaten eliyor ve adım yazılmıyor. Sayaç hiç geri
sarmıyor: geri alınan bir duvarın id'si bir daha kullanılmıyor, ki doğrusu bu.

**Bedeli, bilinçli olarak kabul edildi:** kirli işareti artık geri alınmıyor,
yani kaydedilen noktaya kadar geri alınan proje "kirli" görünmeye devam ediyor
ve kullanıcı fazladan bir kaydetme uyarısı alıyor. Eski davranış (K25'ten beri
"geri alma revision'ı da döndürür") ters yönde yanılıyordu: araya bir tesisat
düzenlemesi girdiğinde Ctrl+Z sayacı geriye çekiyor ve KAYDEDİLMEMİŞ tesisat
işi "temiz" görünüyordu — kullanıcı uyarı almadan kapatıp kaybedebilirdi.
Fazladan uyarı, kaybolan işten iyidir.

Kirli işaretini gerçekten doğru hesaplamak, "şu anki veri kaydedilen veriyle
aynı mı" karşılaştırmasını ister (iki geçmişi de kapsayan). O ayrı bir iş.

### K72 — Duvar ölçüleri: eksen boyu, okunur yön, geometriden gelen yan

Floating bar'ın "Ölçüler" anahtarı artık mimaride de bir şey yapıyor: kat
planındaki her duvarın uzunluğu, duvara paralel ve ekseninden dik kaydırılmış
bir yazı olarak çiziliyor (`core/wallDimensions.ts` →
`getWallDimensionAnnotations`, `scene/WallDimensionLabels.tsx`).

**Ölçülen şey EKSEN boyu** (p1→p2), yüz boyu değil. Duvar bir kapsül olarak
çiziliyor (K23) ve kavşakta komşusuyla iç içe giriyor; "yüz boyu" için önce
hangi komşunun nereden kestiğini çözmek gerekirdi ve iki komşu duvar farklı
kalınlıktayken aynı duvarın iki yüzü farklı sayı verirdi. Eksen boyu tek ve
kararlı. Modelde `lengthCm` alanı YOK: her karede geometriden hesaplanıyor,
olsaydı köşe taşındığında bayatlardı.

**Yazı hep okunur yönde:** ham açı (-90°, 90°] dışına düşerse duvar ters yönde
okunuyor. Yan (etiketin düştüğü taraf) bu normalleştirmeden SONRA, eksenin sol
normalinden alınıyor — sırası önemli, çünkü böylece yan duvarın geometrisinden
çıkıyor, hangi ucun p1 olduğundan değil. Ters sırada aynı duvar ters çizilseydi
ölçüsü öbür yana atlar, plan çizim sırasına göre farklı görünürdü.

**"Dışarısı" hesaplanmıyor.** İdeali ölçünün odanın dışına düşmesi olurdu ama
dış taraf ancak kapalı bir oda çevriminde tanımlı; serbest duvarda tanımsız.
Tutarlı ve öngörülebilir bir yan, bazen doğru bazen tanımsız bir yandan iyi.

**Katman kapalıyken de sürükleme sırasında görünür** — ama yalnız DÜZENLENEN
duvarlar (taşınan duvarlar, ya da oynatılan köşeyi paylaşan duvarlar). Kullanıcı
sayıyı görmeden hizalayamaz; tüm planı açmak ise kullanıcının kapattığı katmanı
geri açmak olurdu. Tesisattaki `DraftLengthLabel` ile aynı ayrım: kalıcı
kotalama bir tercih, düzenleme sırasındaki sayı bir geri bildirimdir.

**Anahtar tesisatla ORTAK** (`isDimensionsVisible`). Kullanıcı için tek bir
"ölçüleri göster" tercihi var; ayrı bayrak olsaydı menü çubuğundaki tek
"Ölçüleri Göster" maddesi hangisini kastettiğini söyleyemezdi.

### Ortak parçaya çıkan

`formatLengthMeters` → **`core/lengthFormat.ts`**: tesisat ve mimari ölçüleri
aynı tuvalde yan yana okunuyor, biri "3,50 m" diğeri `core/coords.ts`'teki
`formatLengthAsMeters` ile "3.50" olsaydı çizim iki ayrı programdan çıkmış gibi
görünürdü. `plumbing/core/lengthFormat.ts` artık yalnız yeniden dışa veriyor
(tesisat tarafındaki çağrı yolları değişmesin diye).

### K73 — Açıklıklı duvar PARÇALARA bölünerek ölçülür; açıklık ayrı renkte

K72 duvarın toplam eksen boyunu yazıyordu. Üzerinde kapı/pencere olan bir
duvarda kullanıcıyı ilgilendiren sayı bu değil: imalatta ölçülen, açıklığın iki
yanında kalan DOLU parçalardır. Artık `getWallDimensionAnnotations` duvarı
açıklıkların kestiği parçalara bölüyor ve her parça için ayrı etiket üretiyor.

**Açıklığın kendi genişliği de yazılıyor**, ama duvar parçalarından FARKLI
renkte (mor, `ARCHITECTURE_COLORS.openingDimension`). Aynı hizada yan yana
duran sayıların hangisinin duvar hangisinin boşluk olduğu yalnız konumdan
okunamazdı. Mor seçildi çünkü tuvalde boş kalan tek anlamlı hue: sarı gaz
hattının (K27), mavi seçimin, yeşil yakalama işaretinin, kırmızı reddedilen
yerleştirmenin rengi.

Bölme yalnız GÖSTERİM içindir. Modelde açıklık duvarı bölmüyor — tek parça
duvarın üstünde bir delik (knowledge/opening-placement.md) ve bu değişmedi.

Köşeye dayanan açıklıkta sıfır boy parça yazılmaz (`MIN_LABELED_LENGTH_CM`).
Açıklık span'i duvar boyuna kelepçeleniyor: duvar kısaldığında sığmayan açıklık
siliniyor (K16) ama silinme ile yeniden çizim arasındaki karede taşan bir span
gelebilir ve ölçü negatife düşmemeli.

React anahtarı artık `wallId` DEĞİL: bir duvar birden çok etiket üretiyor.
Duvar parçaları `wall-<duvarId>-<sıra>`, açıklıklar `opening-<açıklıkId>`.

**Bilinen sınır:** iki komşu duvarın uçlarındaki kısa parçalar (20–25 cm) aynı
noktada buluştuğunda etiketleri üst üste biniyor. Ekranda doğrulandı. Ölçü
yazısını ekran boyuna göre eleyen bir eşik çözerdi ama bu, kullanıcının görmek
isteyebileceği sayıyı gizlemek demek — karar verilmeden eklenmedi.

### K74 — Duvar ölçüsü İÇTEN ve DIŞTAN yazılır; açıklık ölçüsünün ayrı anahtarı var

**Neden iki sayı:** bir odanın içten ölçüsü, köşedeki dik duvarların kütlesi
yüzünden dıştan ölçüsünden kısa. K72/K73 yalnız EKSEN boyunu yazıyordu; bu
ikisinin ortasında duran, sahada hiçbir yere karşılık gelmeyen bir sayı.

Komşu duvarın ekseni köşe noktasında durduğu için etkisi kalınlığının YARISI
kadar: içeride o kadarını yer, dışarıda o kadar uzatır. Yani
`içten = eksen − Σ(komşu kalınlığı / 2)`, `dıştan = eksen + Σ(...)`.
Hesap `getNeighbourThicknessCm`'i yeniden kullanıyor — açıklığın köşe payı da
(K11) aynı fonksiyonu okuyor ama TAM kalınlıkla: o bilinçli olarak temkinli bir
pay, buradaki ise gerçek geometri. İkisini karıştırma.

Bu, K72'nin "dışarısı hesaplanmıyor" kararını BOZMUYOR. Hâlâ duvarın hangi
fiziksel yanının oda içi olduğunu bilmiyoruz (o ancak kapalı çevrimde tanımlı);
hesaplanan şey yön değil, iki UZUNLUK. Etiketin düştüğü yan eskisi gibi
geometriden geliyor.

**Gösterim (K75'te düzeltildi):** iç ölçü duvarın ODA tarafına, dış ölçü karşı
yanına yazılır. İlk denemede ikisi aynı yana, alt alta konmuştu; kullanıcı
haklı olarak reddetti — "içten" ve "dıştan" mekânsal kavramlar, ikisini aynı
yere yazmak sayının anlamını konumdan koparıyordu.

İki değer eşitse TEK satır yazılır: serbest uçlu duvarda, ya da iki açıklık
arasında kalan parçada komşu yok. Aynı sayıyı iki kez yazmak kullanıcıya
"bunlar farklı" der ve yalan söylerdi. İçten ölçü sıfıra düşerse (iki kalın
duvar arasındaki kısa parça) yalnız dıştan yazılır; negatif uzunluk yazılmaz.

**Açıklık ölçüsünün ayrı anahtarı** (`uiStore.isOpeningDimensionsVisible`,
Görünüm ▸ Kapı/pencere ölçüleri): açıklıklı bir duvarda sayı adedi ikiye
katlanıyor ve kullanıcı çoğu zaman yalnız dolu parçaların boyunu okumak istiyor.
Varsayılan AÇIK — yeni anahtar var olan davranışı değiştirmemeli, yalnız kapatma
imkânı ekliyor. Anahtar yalnız mimaride; tesisatta açıklık diye bir şey yok.
(İlk hâlinde "Ölçüler"e bağımlıydı; K76 bunu kaldırdı.)

### K75 — İç ölçü ODANIN İÇİNE, dış ölçü dışına; oda tarafı çevrimden bulunur

K74 iki sayıyı da aynı yana, alt alta yazıyordu. Yanlıştı: "içten" ve "dıştan"
mekânsal kavramlar — sayıyı duvarın yanlış tarafına koymak, onu okunabilir ama
anlamsız yapıyor. İç ölçü artık odanın İÇİNE, dış ölçü karşı yana yazılıyor.

Bunun için duvarın hangi yanının oda olduğu gerekiyordu. K72'de "dışarısı
hesaplanmıyor" denmişti; o karar kalkmadı, KAPSAMI netleşti: hâlâ serbest bir
duvarda dışarısı tanımsız, ama kapalı çevrime giren duvarda tanımlı ve
`findRoomFaces` bunu zaten buluyor. `buildWallInteriorPoints` her çevrim için
`getRoomLabelAnchor`i (en ferah nokta) alıp çevrimdeki duvarlara dağıtıyor;
`getWallDimensionAnnotations` sol normali o noktaya BAKACAK şekilde çeviriyor.

Çapa neden ağırlık merkezi değil: içbükey odada ağırlık merkezi poligonun
dışına düşebiliyor ve iç/dış ters çevrilirdi. `getRoomLabelAnchor` zaten
poligonun içinde kalmayı garanti ediyor (oda etiketi için yazılmıştı).

Sonuç çağıranda `useMemo` ile önbelleğe alınır: çevrim araması duvar/nokta
değişmedikçe aynı sonucu verir, zoom her karede oynadığı için ikisini birlikte
koşturmak boşa iş olurdu.

**Bilinen sınırlar:** (1) Serbest duvarda oda tarafı yok — sayılar yine
karşılıklı iki yana düşer, yalnız hangisinin oda tarafı olduğu iddia edilmez.
(2) İki odayı ayıran iç bölmede İLK çevrim kazanır; iki tarafı da "içerisi"
olan duvarda "dışarısı" zaten yok, sayıların ayrı yanlarda durması yeterli.

Açıklık ölçüsünün elenmesi de `getWallDimensionAnnotations`a taşındı
(`isOpeningVisible`): sahnede bir `filter` olarak durduğunda testsiz kalıyordu.
Duvar parçaları anahtar kapalıyken de BÖLÜNMÜŞ kalır — açıklığın sayısı gizlense
de duvar orada delik, tek parça göstermek yalan olurdu.

### K76 — İki ölçü anahtarı BAĞIMSIZ

K74'te "Kapı/pencere ölçüleri" maddesi "Ölçüler" kapalıyken pasif yapılmıştı;
gerekçe "tek başına bir anlamı yok" idi. Yanlış varsayımdı: kullanıcı yalnız
kapı/pencere genişliklerini görmek isteyebilir ve bunun için planı duvar
sayılarına boğmak zorunda kalmamalı. İki anahtar artık birbirinden bağımsız —
dördü de anlamlı bir hâl:

| Ölçüler | Kapı/pencere | Ekranda |
|---------|--------------|---------|
| açık | açık | duvar parçaları + açıklık genişlikleri |
| açık | kapalı | yalnız duvar parçaları (parçalar yine BÖLÜNMÜŞ) |
| kapalı | açık | yalnız açıklık genişlikleri |
| kapalı | kapalı | hiçbiri (sürükleme geri bildirimi hariç) |

Eleme `getWallDimensionAnnotations` içinde iki ayrı seçenekle yapılıyor:
`isWallVisible` ve `isOpeningVisible`. Sürükleme sırasındaki geçici gösterim
için kullanılan `wallIds` kısıtı YALNIZ duvar parçalarını daraltır, açıklık
ölçüsüne dokunmaz — ikisi aynı kısıttan geçseydi "duvar ölçüsü kapalı, açıklık
açık" hâlinde ekran boş kalırdı (kısıt boş dizi oluyor).

### K77 — Köşe açıları: kollar SIRALANIR, ardışık çiftler ölçülür

Görünüm ▸ Açılar (`core/cornerAngles.ts` → `getCornerAngleAnnotations`,
`scene/CornerAngleLabels.tsx`). Bir köşede buluşan duvar kolları yön açısına
göre sıralanıyor, sonra ardışık çiftlerin arası ölçülüyor — toplamları 360°
ediyor. Sıralama olmadan "komşu kol" tanımsız kalırdı: üç kollu bir birleşimde
hangi ikisinin arasının ölçüleceği duvarların ÇİZİM SIRASINA düşerdi.

**İki kollu köşede ters açı (360−x) yazılmaz.** Aynı köşeyi öbür yandan ölçer,
yeni bir şey söylemez ve her köşedeki sayıyı ikiye katlardı. Üç ve daha çok
kolda her boşluk ayrı bir gerçek, hepsi yazılır.

**Etiket açıortay üzerinde.** Kolların yön vektörlerini toplamak da açıortay
verirdi ama 180°'ye yakın açıda toplam sıfıra gider ve yön kaybolur; hesap ilk
kolu açının yarısı kadar döndürerek yapılıyor, o her açıda çalışıyor.

**Yazı duvara paralel DÖNMEZ** (ölçü yazısının aksine, K72): açı iki duvara
birden ait, birine hizalamak öbürüne yanlış bakardı. Yatay kalıyor.

Varsayılan KAPALI: planların çoğu dik açılardan oluşuyor, her köşeye 90° yazmak
kalabalıktan başka bir şey getirmez — açı, eğik duvarla çalışırken açılan bir
katman. Kapalıyken de sürükleme sırasında düzenlenen köşeler için çizilir
(K73'ün kuralı). Anahtar diğer ikisinden bağımsız (K76'nın kuralı).

Sıfır boy duvar köşeye kol EKLEMEZ: `atan2(0, 0)` sessizce 0 döndürüyor ve
olmayan bir yön uyduruyordu.

**Bilinen sınır:** iki kollu içbükey köşede yazılan sayı odanın İÇİNDEKİ açı
(270°) değil, dışarıdaki tümleyeni (90°). Aynı köşenin geometrisi, yalnız öbür
yandan ölçülmüş. Oda tarafındaki açıyı seçmek `findRoomFaces`in yüzlerine
bakmayı gerektirir (K75'in çapası kullanılabilir); gerekirse ayrı bir adım.

### K78 — Açının altında GEOMETRİK işaret: 90°'de kare, diğerlerinde yay

Sayı tek başına yetmiyordu: teknik çizimde açı, kolların arasına çizilen bir
işaretle gösterilir ve sayı o işaretin etiketi olur. İşaret aynı zamanda
"bu sayı hangi iki duvarın arası" sorusunu da cevaplıyor — üç kollu bir
birleşimde yalnız sayıya bakarak bunu çıkarmak zordu.

- **Dik açıda KARE** (`getCornerAngleMarkerPoints` üç nokta döndürür, iki
  çizgi): teknik çizimin evrensel gösterimi, "burası tam 90°" demenin sayıya
  bakmadan okunan hâli. Tolerans 0.5° — trigonometriden 89.9999 çıkabiliyor ve
  toleranssız her dik köşe yay olarak çizilirdi.
- **Diğer açılarda daire dilimi YAYI**, 6°'de bir kırılarak örneklenir. Nokta
  sayısı açıyla büyür: dar açıda gereksiz nokta, geniş açıda köşeli görünüm
  olmasın.

Şekil `core/`'da üretiliyor (`getCornerAngleMarkerPoints`), sahne yalnız
çiziyor — geometrinin testi ekransız yazılabilsin diye. Yarıçap çağırandan
gelir ve ekran-sabittir (`px / zoom`): işaret dünya boyunda büyümemeli, zoom'dan
bağımsız aynı görünmeli. Yazı işaretin DIŞINDA kalır (yarıçap 16 px, yazı 30 px).

### K79 — Palet yalan söylemez: "Toplu Silme" kalktı, yazılmamış araçlar PASİF

Mimari paletindeki 22 aracın DÖRDÜ boştu: `bulkDelete`, `text`, `measure`,
`freeDraw` yalnız `core/tools.ts`'te tanımlıydı — hook'u, sahne karşılığı,
store'da izi yoktu. Tıklanınca yalnız "aktif araç" değişiyor, sonra hiçbir şey
olmuyordu. Kullanıcı hangisinin bozuk hangisinin "henüz yok" olduğunu
anlayamıyordu.

**"Toplu Silme" tümüyle KALDIRILDI** (issue 2.7'nin listesinden bilinçli sapma).
İşi zaten var ve daha iyisi var: çerçeveyle çoklu seçim + Delete, hem de tek
adımda — tek `markDirty`, tek Ctrl+Z (`useSelectionTool`, `selectionOps`). Aynı
işi yapan ikinci bir kip, öğrenilecek fazladan bir kavramdan ibaretti. Yeniden
gerekirse geri eklemek tek satır; boş düğmeyi taşımanın bedeli ise kalıcı.

**Kalan üçü palette DURUYOR ama pasif** (`ToolDefinition.isPlanned`). Gerekçe:
tıklanabilir görünüp hiçbir şey yapmayan araç "bozuk" dedirtir; listeden
kalkması ise yol haritasını görünmez yapar. Pasif düğme + "(henüz eklenmedi)"
ipucu ikisini birden çözüyor. Metin `aria-label`'a da giriyor — ekran okuyucu
kullanıcısı yalnız `disabled`'ı duyar, sebebini duymazdı.

Sıradaki adım ÖLÇÜM ve sıfırdan yazılmayacak: tesisatta çalışan bir ölçüm aracı
var (`plumbing/scene/useMeasurementTool.ts` + `MeasurementOverlay.tsx`), ortak
yere çıkarılacak. Duvar ölçüleriyle karışmasın — onlar duvarın boyunu anlatır
(K72), ölçüm ise iki serbest nokta arasını okur; ölçü çizime KAYDEDİLMEZ.

Metin ve Serbest Çizim ise yeni bir KALICI TİP istiyor (`core/model.ts`
sözleşmesi, serialize + WebCAD round-trip + kat kopyalama + grup dönüşümü +
geri alma). İkisi de karar alınmadan yazılmayacak; Serbest Çizim'de ayrıca
"bu çizgiler geometri mi, not katmanı mı" sorusu var (öneri: not katmanı, duvar
grafiğine ve oda tespitine girmez).

### K80 — Mimari ölçüm aracı: tesisattaki jest, mimarinin yakalaması

K79'da "sıradaki adım Ölçüm, sıfırdan yazılmayacak" denmişti; yapıldı. Jest
tesisattakinin aynısı: 1. tık başlangıcı koyar, imleç ikinci noktayı taşır,
2. tık ölçüyü dondurur, Esc temizler. Ölçü ÇİZİMİN PARÇASI DEĞİL —
`architectureUiStore.measurement`'ta yaşar, cadStore'a yazılmaz, `markDirty`
çağırmaz, kaydedilen JSON'a girmez. Model değişmedi.

**Ortak yere çıkan:** ölçü çapası (`getMeasurementAnchor` + `getSegmentNormal`)
`plumbing/core/lineGeometry.ts`'ten **`core/measurement.ts`**'e taşındı, tesisat
tarafı yeniden dışa veriyor. `getPlacementPosition`ın daha önce aynı yolu
izlemesiyle aynı gerekçe: iki yerde yaşasaydı biri değiştiğinde diğerinden
ayrışırdı. `formatLengthMeters` zaten ortaktı (K72).

**Ortak yere ÇIKMAYAN:** jestin kendisi ve çizim katmanı. Mimari kendi
`scene/useMeasurementTool.ts` + `MeasurementOverlay.tsx`'ini aldı. Gerekçe:

- **Yakalama kuralı farklı ve öyle kalmalı.** Mimari `getPlacementPosition` +
  Ctrl'le anlık kapatma kullanıyor (`useAreaObjectTool`, `usePointDragTool` ile
  aynı); tesisatınki ızgara GÖRÜNÜRLÜĞÜNE bağlı (`placementSnap.ts`) ve o ayrım
  tesisat sahibinin açık kararı (K57). Tek hook'a indirmek o kararı bozardı.
- **Durum ayrı store'larda.** Ortak bir hook, iki UI store'undan hangisine
  yazacağını parametreyle sorardı; ikisi de aynı sözleşmeyi ayrı ayrı tuttuğu
  sürece kazanç yok.
- Çizim tarafı zaten farklı: tesisat borunun `PipeLine`ını kullanıyor, mimari
  kendi `<Line>`/`<Text>` desenini.

Esc ölçümü siler ama aracı DEĞİŞTİRMEZ: ölçü almak tekrarlanan bir jest,
her ölçüden sonra aracı yeniden seçtirmek gereksiz olurdu. Tamamlanmış ölçümün
üstüne tıklamak da yenisini başlatır, aynı gerekçe.

Renk duvar ölçülerinden AYRI (`ARCHITECTURE_COLORS.measurement`): duvar ölçüsü
kalıcı bir kotalama katmanı, ölçüm ise o an alınan geçici bir okuma — aynı
renkte olsalardı ölçüm çizime yazılmış sanılırdı.

### K81 — Metin: plana serbestçe konan NOT, dünya boyunda

Palette pasif duran "Metin Ekle" (K79) çalışır hâle geldi. Model sözleşmesine
yeni bir kalıcı tip eklendi — `TextLabel { id, floorId, x, y, text, heightCm,
angleDeg }` — ve `ProjectData.texts` dizisi.

**Yazı boyu DÜNYA biriminde (`heightCm`), ekran pikseli değil.** Metin çizimin
bir parçası, üstünde yüzen bir arayüz öğesi değil: zoom'da duvarlarla birlikte
büyür ve PDF'e planla aynı oranda basar ("25 cm yazı yüksekliği" teknik çizimin
standardı). Oda adı ve ölçü yazıları bunun AKSİNE ekran-sabit, çünkü onlar
çizimden TÜREYEN okuma yardımcıları — kullanıcının yazdığı not değil.

**Serileştirme mevcut deseni izliyor:** `texts` de `.default([])` alıyor, böylece
alan yokken kaydedilmiş çizimler açılmaya devam ediyor; `serializeProjectData`
alanı her zaman yazdığı için bit-bit turu korunuyor. `docs/sample-project.json`
kabul testinin dayanağı olduğu için oraya da `"texts":[]` eklendi.

**Kapsam (kullanıcı seçti):** koy / yaz / seç / taşı / sil. Grup dönüşümü ve
Ctrl+D bu turda YOK — metin şimdilik tek tek taşınıyor.

**Kutuyu BOŞALTIP onaylamak metni SİLER** (kullanıcı isteği). Yazısı olmayan bir
not, kullanıcının orada bir şey istemediğinin en açık ifadesi; eski yazıyı geri
getirmek onu şaşırtırdı. Yanlışlıkla konan metnin çıkış kapısı da bu. Silme
`deleteSelection` üzerinden gidiyor ki jest tek Ctrl+Z adımı olsun.

Kuralın TEK adresi `isBlankText`: düzenleme kutusu "silecek miyim", store
"yazacak mıyım" diye aynı fonksiyonu soruyor. Ayrışsalardı boşaltılan metin ne
silinir ne yazılır, eski hâliyle geri gelirdi. Store hâlâ boş metin YAZMIYOR —
görünmez ve tutulamaz bir nesne planda hayalet bırakır; silme yolu ayrı.

**Yerleştirmenin ardından SEÇİM aracına dönülüyor** (K42'nin sağ tık kuralının
buradaki karşılığı): metin arka arkaya konan bir şey değil, konup yazılan bir
şey. Araç açık kalsaydı kullanıcı kutuya yazarken tuvale her tıkladığında yeni
bir metin doğardı.

**Metin hedef çözümleme zincirinde (`resolveArchitectureTarget`) YOK.** O zincir
duvar/açıklık/sembol/alan nesnesi için kurulmuş bir öncelik sırası ve metin
oraya girseydi bir notun üstüne düşen duvar seçilemez olurdu. Bunun bedeli
`AreaObjectNameLabels`taki tuzağın aynısı: diğer hook'lar metnin üstünü "boşluk"
sanıp çerçeve seçimi başlatıyordu. Çözüm de aynı — `findTextLabelAtPointer`
jesti sahipleniyor ve beş hook onu çağırıp erken dönüyor (K44'ün dersi, bu
kod tabanında beşinci kez).

Tutma kutusu yazının GERÇEK genişliğinden değil kaba bir tahminden geliyor
(`core/textLabel.ts`, karakter genişliği ≈ yüksekliğin 0.6'sı): core troika'yı
ve DOM'u tanımaz. Tahmin bilerek CÖMERT — dar bir kutu metni tutulamaz yapardı,
geniş olan yalnız biraz eli açık davranır.

Düzenleme kutusu `RoomNameEditor`ün birebir deseni: drei `<Html>`, NATIVE
dinleyici (React'in onKeyDown'ı ayrı react-dom kökünden store'a yazınca R3F
ağacı yeniden çizilmiyor), taslak yerel state'te (her harf ayrı Ctrl+Z adımı
olmasın).

### K82 — Palet İŞE göre gruplandı; issue 2.7'nin düz sırası bırakıldı

Araçlar issue 2.7'deki sırayla diziliyordu ve o sıra iki sütuna serilince duvarla
pano, kapıyla yangın söndürücü yan yana düşüyordu. Kullanıcı aradığı aracı
sırayla değil TÜRÜNE göre arıyor; palet artık dört gruba ayrıldı ve gruplar ince
bir ayraçla ayrılıyor:

1. **Kabuk** — Duvar, Oda, Kapı, Pencere.
2. **Yapı elemanları** — Merdiven, Kolon, Kiriş, Kolon Havalandırması, Baca Şaftı.
3. **Cihazlar** — Aydınlatma, Pano, Menfez, Ana Kesme Şalteri, Yangın Söndürücü,
   Alarm Cihazı, Deprem Sensörü.
4. **Notlar ve yardımcılar** — Ölçüm, Metin, Serbest Çizim, Silgi. Hiçbiri binanın
   parçasını çizmiyor: ölçü okur, not düşer, siler. Silgi de burada — yapı
   elemanı EKLEMİYOR, kaldırıyor.

Kullanıcının listesinde geçmeyen ikisi buraya yerleşti: Yangın Söndürücü
(3. grup — sembol/cihaz), Metin (4. grup — not).

**Seçim Aracı paletten ÇIKARILDI.** Aynı kip tuvalin altındaki yüzen çubukta
zaten var (K54) ve orada El aracıyla yan yana duruyor — sol tuşun ne yapacağını
söyleyen iki düğme aynı yerde olmalı. İki palette birden dururken kullanıcı
hangisinin "asıl" olduğunu bilemiyordu.

Yine de bir ARAÇ olarak duruyor: varsayılan odur (`DEFAULT_TOOL_ID`), durum
çubuğu adını yazar, bütün seçim hook'ları `SELECTION_TOOL_ID` ile ona bakar. Bu
yüzden `ARCHITECTURE_TOOLS` (var olan araçlar) ile `ARCHITECTURE_TOOL_GROUPS`
(palette görünenler) artık AYNI KÜME DEĞİL — ikisini karıştıran kod, palette
olmayan bir araca ikon aramaya kalkar.

`ARCHITECTURE_TOOLS` = palettekiler + palette görünmeyen seçim aracı; kimlik
türeten (`ToolId`), ikon zorlayan (`TOOL_ICONS`) ve ad çözen (`getToolLabel`)
taraflar onu okuyor. Gruplar yalnız YERLEŞİM bilgisi.

Düzleştirmenin dönüş tipi ELLE yazıldı — `flatMap` demet tiplerini genişletiyor
ve `ToolId` `string`e düşüyordu; o hâlde "olmayan araç kimliği" derleme hatası
vermezdi (`TOOL_ICONS` kaydının tüm araçları zorlaması da bu tipe dayanıyor).

Ayraç `<nav>`ın içinde grupların ARASINDA duruyor, ızgaranın içinde değil: iki
sütunlu tek ızgarada çizgi bir hücreyi işgal ederdi. Her grup kendi ızgarası ve
kendi `role="group"` + `aria-label`'ı — ekran okuyucu grubu duyar, ekranda
yalnız çizgi görünür.

### K84 — Sağ tık ARACI BIRAKIR; oda çizimi tıkla-taşı-tıkla oldu

K42'de yalnız alan nesnelerinde olan "sağ tık seçim aracına döner" davranışı
bütün araçlara yayıldı: cihaz/sembol, kapı, pencere, ölçüm, metin, silgi, oda ve
duvar. Kullanıcı bir aracı bitirmek için palete geri gitmek zorunda kalmıyor.

Kural TEK yerde: `scene/useRightClickReturnsToSelection.ts`, `ArchitectureLayer`
içinde bir kez mount ediliyor. Araç başına kopyalansaydı yeni araç eklendiğinde
unutulur ve "bu araçtan çıkamıyorum" diye geri gelirdi. Liste beyaz değil KARA
liste — davranış varsayılan, istisna eklemek bilinçli bir iş.

İki istisna:

- **Seçim aracı** — zaten seçimde, dönecek yer yok.
- **Duvar** — orada sağ tıkın ZATEN bir işi var: zinciri bitiriyor. Bu yüzden
  İKİ ADIMLI (`useWallTool`): zincir sürerken sağ tık onu kapatır, boştayken
  ikinci sağ tık araçtan çıkar. Tek adıma indirilseydi zincirin sonunu getirmek
  aracı da kapatırdı ve arka arkaya duvar çizmek imkânsızlaşırdı.

Araçların kendi önizleme temizliği kendi hook'larında kaldı: araç değişimi
onların effect'ini zaten söküyor.

**Oda çizimi artık TIKLA–TAŞI–TIKLA**, basılı tutmalı sürükleme değil. İlk tık
bir köşeyi koyar, imleç karşı köşeyi taşır, ikinci tık odayı yerleştirir.
Basılı tutma büyük odalarda tuvalin dışına taşıyordu — parmağı kaldırmadan
kaydırmak gerekiyordu. Duvar aracı da tıkla-tıkla çalışıyor; iki çizim aracının
aynı jesti paylaşması, kullanıcının hangisinde ne yapacağını hatırlamasını
gereksiz kılıyor. Sağ tık odada TEK adımda çıkarır: dikdörtgen bir zincir değil,
tek atımlık bir jest — yarım kalanı iptal etmekle araçtan çıkmak aynı anda
olabilir.

## 2026-08 · Projeler listesinin gerçek uca bağlanması

### K70 — Sekme rozetleri de listeyle AYNI uçtan sayılıyor

`GET /api/projects` Swagger'da doğrulandı (2026-08-14): **query parametresi
almıyor**, gövdesi beş alan — `id, name, code (null olabilir), createdAt,
updatedAt`. Liste zaten bu uca gidiyordu; sorun ucun etrafında kalan mock
artıklarıydı.

`getProjectStatusCounts` hâlâ `projectsMock`'un uydurma veri kümesini sayıyordu:
ekran kendi kendisiyle çelişiyordu — rozet "Onaylanan 7" derken o sekme boş
açılıyor, "Taslak 12" derken listede üç gerçek kayıt görünüyordu. Rozetler artık
listeyle aynı uçtan türüyor. Uç durum döndürmediği için **tüm kayıtlar taslak
hanesine** yazılıyor, diğer üç durum SIFIR. Uydurma bir dağılım üretmek,
sunucuda olmayan projeleri var göstermek olurdu.

Bedeli: sayfa aynı param'sız ucu iki kez çağırıyor (liste + rozet, ayrı React
Query anahtarları). Sunucu sayım ucu ya da durum alanı verdiğinde tek isteğe
inecek. Uca `page`/`q`/`sort` EKLENMEDİ: sunucu tanımadığı parametreyi sessizce
atar, arayüz süzülmüş sanırdı — bu yüzden süzme/sıralama/sayfalama istemcide
kaldı (CLAUDE.md "sayfalama sunucuda" kuralının bilinçli, geçici istisnası).

### K71 — Uçtan gelmeyen alan `null`; tireyi VERİ değil TABLO yazar

`mapApiProject` uçta karşılığı olmayan alanlara `'—'` **metnini** yazıyordu.
İki sorun: tip yalan söylüyordu (`firmName: string`, oysa sunucu böyle bir alan
döndürmüyor) ve gösterim kararı veri katmanına sızmıştı. Alanlar artık `null`,
tireyi tablo çiziyor (`EmptyValue`) — aynı tablodaki "Bina Kodu"/"G.D Firması"
zaten öyle yapıyordu, o yüzden bu bir sadeleşme: boş hücrelerin hepsi artık aynı
görünüyor ve ekran okuyucu "Değer yok" duyuyor. "Proje Tipi"/"Isınma Tipi"
rozeti yalnız DEĞER VARKEN çiziliyor; içi tire dolu boş rozet kalktı.

`hasDocuments` hâlâ `false` ve bu bir VARSAYIM (ikon "evrak yok" diyor, sunucu
demedi) — kaynağı evrak ucu, bu adımın kapsamı dışında, kodda TODO ile işaretli.

### Devreden çıkan mock

`projectsMock.ts` **silinmedi** ama listeye bakan yüzeyi kalmadı:
`queryMockProjects`, `queryMockProjectStatusCounts`, `deleteMockProject` ve
`createMockProject` (dördü de artık çağrılmıyordu ya da bu adımda çağrılmaz
oldu) yardımcılarıyla birlikte kaldırıldı — dosya 475 → 327 satır. Kalanlar:
"Onaya Gönder" (`submitMockProject`, uç yok), ilçe/firma/tip/mühendis lookup'ları
(ayrı uçlar) ve evrak+poliçe mock'larının ORTAK proje tohumu
(`getMockProjectSeeds`) — bu üçü silinirse üç ekran birden boşalır.

Hâlâ mock olduğu için ekranda duran ama HİÇBİR kaydı elemeyen iki filtre var:
ilçe ve proje firması (uç bu alanları döndürmüyor). Bilinen sınır, ayrı adım.

## 2026-08 · Güncellenen Swagger: sunucu taraflı liste + il/ilçe süzgeci

### K72 — Süzme, sıralama ve sayfalama SUNUCUYA geçti

Swagger güncellendi (2026-08-14): `GET /api/projects` artık sayfalı zarf
(`items/totalCount/page/pageSize`) döndürüyor ve on parametre alıyor —
`Status, DateFrom, DateTo, CityId, DistrictId, ProjectFirmId, SortBy, SortDir,
Page, PageSize`. K70'in "istemcide süzüyoruz" istisnası KALKTI; `listProjects`
diziyi artık dilimlemiyor, CLAUDE.md'nin "sayfalama sunucu taraflı" kuralı
gerçekten uygulanıyor. Satır ayrıca `status/statusName/projectTypeName/
heatingTypeName` taşıyor: proje ve ısınma tipi sütunları KOD değil AD alıyor
(rozet bilinmeyen kodu ham gösterdiği için değişiklik gerekmedi).

Sekme rozetleri de gerçek uca bağlandı (`GET /api/projects/status-counts`);
yanıt anahtarları `draft/pendingApproval/approved/rejected` → arayüzün dört
koduna çevriliyor. K70'teki "listeden türet" çözümü kalktı.

**İKİ ÇIKARIM, tek sabitte:** `Status` parametresine gönderilen değer
(`Draft|PendingApproval|Approved|Rejected`) ve `SortBy` değerleri
(`updatedAt|createdAt|name`) Swagger'da tanımlı DEĞİL — `status-counts`
anahtarları ilkini destekliyor ama ikisi de doğrulanmadı. Sunucu başka bir
biçim istiyorsa yalnız `SERVER_STATUS_CODES` sözlüğü / `SortBy` satırı değişir.

**Tarih dönüşümü:** uç `date-time` istiyor, URL'de gün duruyor. Sınırlar YEREL
saatle kuruluyor (`new Date(y, m, d)`), çünkü `new Date('2026-08-01')` UTC gece
yarısı sayılır ve +03'te günü geriye kaydırırdı; bitiş günü 23:59:59.999 ile
KAPSAYICI.

**ARAMA parametresi YOK.** Sözleşmede `q`/`Search` bulunmuyor. Kutu kaldırılmadı
(UI değiştirilmeyecekti) ama sayfalama sunucuya geçtiği için arama artık YALNIZ
görüntülenen sayfayı süzüyor ve `totalCount` süzülmemiş adedi göstermeye devam
ediyor — bilinen ve İSTENMEYEN sınır. Uca `Q` eklenmeli; eklenince
`filterBySearch` silinip parametre `buildFilterParams`'a taşınacak.

### K73 — Liste süzgecine İL eklendi, ilçe ona bağlandı

İlçe listesini veren tek uç `GET /api/cities/{cityId}/districts`, yani ilsiz
ilçe listesi YOK. Bu yüzden liste ekranına da il süzgeci eklendi: il seçilmeden
ilçe kutusu pasif ve istek atılmıyor, il değişince seçili ilçe düşüyor, il
etiketi kaldırılınca ilçe de kalkıyor. Mock `getDistricts`/`queryMockDistricts`
kalktı (`MOCK_DISTRICTS` sabiti evrak/poliçe tohumları için duruyor).

İl/ilçe sorguları FİLTRE ÇUBUĞUNUN İÇİNDE: ilçe listesi TASLAK ile bağlı
(kullanıcı "Filtrele"ye basmadan da doğru ilçeleri görmeli). Sayfa yalnız
etiketlerin adını çözmek için UYGULANMIŞ değerlerle aynı sorguları kuruyor;
anahtarlar aynı olduğu için önbellek paylaşılıyor, ikinci bir istek çıkmıyor.

### K74 — İş başlama/bitiş ve yetkili mühendis alanları KALDIRILDI

`ProjectCreateDto` bu üç alanı taşımıyor (Swagger doğruladı): form onları
topluyor, doğruluyor, kullanıcıya zorunlu diyor ama uca HİÇ göndermiyordu —
kullanıcının doldurduğu veri sessizce kayboluyordu. Üçü de UI'dan, form
durumundan, şemadan, varsayılanlardan ve `CreateProjectPayload`'dan kalktı.

Birlikte düşenler: bitiş tarihini başlamadan türeten `deriveEndDate`/`addMonths`
(ve "+2 ay" kuralı), `isEndBeforeStart` çapraz doğrulaması, mühendis listesi
zinciri (`getFirmEngineers`, `FirmEngineer`, `mapFirmEngineer`,
`queryMockFirmEngineers` ve mock mühendisler) ile `useNewProjectForm`'un `today`
seçeneği. Proje firması değişince artık yalnız GD firması temizleniyor.

**Proje DETAY ekranındaki "Firma Mühendisi" AYRI bir alandır** (`engineerName`,
mock extras) ve silinmedi.

### Sıradaki iş: POST gövdesi

Uç bu alanları da kabul ediyor ama form onları hâlâ göndermiyor:
`description`, `apartmentCount`, `workplaceCount`, `areaSquareMeters`,
`capacity`, `serviceBoxPressureMbar`, `coverNote`, `connectionObject`,
`isPermitProject`. Ayrıca proje/ısınma/bina kullanımı tipi artık KOD DEĞİL
`...CodeId` (integer) isteniyor; formdaki metin kodları (`ILAVE`, `bireysel`)
bunlara çevrilemiyor çünkü kod grubu ucu (`GET /api/codes/by-group-name/...`)
elimizde yok. Gövde bu yüzden bu turda genişletilmedi — kapsam GET tarafıydı.

### K75 — Proje Firması süzgeci gerçek uca bağlandı

Liste ekranının firma kutusu mock `getProjectFirms`ten (`MOCK_PROJECT_FIRMS`)
besleniyordu; artık **`getProjectFirmList`** → `GET /api/projectfirms`. Yeni bir
API modülü yazılmadı: uç, şeması (`projectFirmDto.ts`, `title` → `name`) ve
`hasApiBaseUrl` yedeği zaten proje firmaları ekranı için vardı. `queryKey` de
ORTAK (`['projectFirmList']`) — aynı liste iki ekranda ikinci kez indirilmiyor.
Seçim `ProjectFirmId` olarak uca gidiyor, temizlenince parametre düşüyor
(`buildFilterParams` boş değeri hiç yazmıyor).

Mock `getProjectFirms` **SİLİNMEDİ**: Evraklar listesinin firma süzgeci ve yeni
proje formunun firma kutusu hâlâ ona bağlı. Evrak satırları mock firma
kimlikleriyle (11–15) tohumlandığı için o süzgeci gerçek uca çevirmek, evrak
listesini hiçbir kaydın eşleşmediği bir hâle sokardı — ayrı iş.

Hata durumu `FilterSelect`'in mevcut yüzeyiyle: liste çekilemezse kutu pasif ve
altında "Firma listesi yüklenemedi." Boş bir kutu "sistemde firma yok" gibi
okunuyordu. (İl/ilçe kutuları bu şeridi HENÜZ almadı — aynı desen, ayrı adım.)

### K76 — Gösterge panosu özeti: `gdGroupId` gönderiliyor, mock yedeği kalktı

`GET /api/admin/dashboard` sözleşmesi değişti ve K48'de yazılan iki kısıt da
ortadan kalktı.

**Yoğunluk alanı yeniden adlandı.** `regionDensity: [{ regionId, regionName,
projectCount }]` → **`density: [{ id, name, projectCount }]`**, yanında kırılımın
hangi boyutta yapıldığını söyleyen `densityBy` var. Eşleme yine tek yerde
(`adminDashboard.ts` → `toDashboardSummary`); ekranın iç sözleşmesi
(`DashboardSummary`) DEĞİŞMEDİ, bu yüzden kartlar ve `AdminHomePage` hiç
dokunulmadan çalışıyor.

**Kapsam artık UCA GİDİYOR.** Uç `gdGroupId` alıyor — bu tam olarak üst bardaki
gaz dağıtım GRUP firmasının kimliği (K43), yani K48'de "gönderemeyiz" denen
coğrafi `regionId` değil. Süzme sunucuda; istemci gelen diziyi daraltmıyor.
Kapsam yokken parametre HİÇ yazılmıyor: boş bir `gdGroupId=` sunucuda ayrı anlam
taşıyabilir, "tümü" demek için parametrenin yokluğu kullanılıyor.

`dayKey` hâlâ gitmiyor: "bugün" sayaçlarını sunucu kendi gününe göre hesaplıyor,
anahtar istemcide yalnız TanStack Query anahtarı olarak yaşıyor.

**404/501/ağ hatası → mock yedeği KALDIRILDI.** Uç yokken ekran ölmesin diye
konulmuştu; uç açıldıktan sonra sürseydi gerçek bir arıza (yanlış yol, kapalı
API, bozuk dağıtım) ekranda "çalışıyor" gibi görünürdü. Artık hata `QueryError`
şeridine düşüyor. `isMissingEndpoint`/`warnOnceAboutMissingEndpoint` duruyor ama
YALNIZ duyuru yollarına ait — duyuru varlığı sunucuda hâlâ yok (K48).

**Mock gövde SİLİNMEDİ.** `VITE_API_URL` tanımsızken (backend'siz geliştirme)
ekran hâlâ `adminDashboardMock.ts`'ten besleniyor ve bölge kapsamı orada da
çalışıyor. Değişen tek şey: bu yola artık yalnız API kökü yokken giriliyor,
gerçek ucun hatasıyla değil.

`densityBy` ve `generatedAt` şemada ZORUNLU DEĞİL: arayüz ikisini de
kullanmıyor, sunucu birini kaldırdığında bütün ekranın sınırda patlaması
gösterilmeyen bir alan uğruna alınacak bedel değil (K49 ile aynı gerekçe).
Duyurular hâlâ yerel depodan geliyor, kart tek bir `DashboardSummary` alıyor —
kartların iki ayrı yükleme durumu yönetmesine gerek yok.

## 2026-08 · Bölge tanımları

### K77 — Bölgeler ekranı AÇILDI; "bölge" artık iki ayrı şey ve ikisi de kalıyor

`/api/regions` sunucuda VAR ve dört ucu birden veriyor (liste, ekle, güncelle,
pasifleştir). K31 bu ucu 404 diye kaldırmıştı, K43 de "bölgeleri listeleyen uç
hâlâ yok" diye yazıyordu — ikisi de artık geçersiz.

**Bağlanacak bir ekran YOKTU.** K31 `getRegions`'ı, bölge alanını ve filtreyi
tümüyle silmişti; ortada mock'tan gerçeğe çevrilecek bir yüzey kalmamıştı. Bu
yüzden iş "entegrasyon" değil, mevcut liste ekranı desenleriyle ekranı KURMAK
oldu: `/admin/regions`, sol menüde "Bölgeler".

**İki "bölge" kavramı bilinçli olarak yan yana duruyor:**

| Yüzey | Ne seçer | Kaynak |
|---|---|---|
| Üst bardaki kapsam seçicisi | gaz dağıtım GRUP firması (AKSA, ENERYA…) | `/api/gasdistributiongroups` (K43) |
| Bölgeler ekranı | coğrafi bölge KAYDI | `/api/regions` |

K31'in uyardığı çakışma bu: aynı kelime iki şeyi gösteriyor. Üst bar yine de
BAĞLANMADI, çünkü kapsam kavramı K43'te grup firması olarak sabitlendi ve URL'de
liste süzgeçleriyle aynı `group` anahtarını paylaşıyor — coğrafi bölgeye çevirmek
bir ürün kararı ister, yeniden adlandırma değil. **Açık soru:** kapsam seçicisi
`/api/regions`'a mı geçmeli, yoksa iki eksen birden mi gerekiyor?

**DELETE = pasifleştirme.** Sunucu soft-delete yapıyor, `GET` yalnız aktifleri
döndürüyor. Arayüz bu yüzden "Sil" demiyor, **"Pasifleştir"** diyor ve onay
diyaloğu "kayıt silinmez" diye yazıyor: geri dönüşü olmayan bir işlem yaptığını
sanan kullanıcı, olmayan bir riski üstlenir. Fonksiyon adı da `deleteRegion`
değil `deactivateRegion`.

**409 iki farklı iş kuralı taşıyor, uca göre ayrışıyor.** POST/PUT'ta kod
çakışması (`RegionCodeTakenError` → Kod alanının hatası olur), DELETE'te "bölge
kullanımda" (`RegionInUseError` → ne yapılacağını söyleyen şerit). İkisi de
METNE değil DURUM KODUNA bakarak tanınıyor (`DfirmNoTakenError` deseni). 403
ayrı bir metin alıyor: "bağlantınızı kontrol edin" demek, yetkisi olmayan
kullanıcıyı sonsuz tekrar denemeye iterdi.

**`http.ts`'e `requestVoid` eklendi.** PUT ve DELETE gövdesiz 200 dönüyor;
`requestJson` boş gövdede `response.json()` ile `SyntaxError` fırlatıyor ve bu
`ApiError` olmadığı için genel hataya düşüyordu — yani işlem SUNUCUDA
BAŞARILIYKEN kullanıcı "kaydedilemedi" görecekti. `projects.ts` bu boşluğu
yorumda zaten not etmişti (`deleteProject`, "uç 204'e dönerse http.ts'in gövde
okuması ayarlanacak"). Yeni bir istemci değil, `requestJson`'ın kardeşi.

**Liste durumu URL'de DEĞİL** — çünkü durum YOK. Uç filtresiz, sayfalamasız düz
bir dizi döndürüyor ve kayıt referans verisi ölçeğinde. İstemcide sayfalama
kurmak "sayfalama sunucu taraflı, istemci gelen diziyi dilimlemez" kuralını
çiğnerdi. Sıralama istemcide ve Türkçe (`toSortedRegions`) — bu dilimleme değil,
sunucunun 'Ç'yi 'D'den sonra vermesinin düzeltilmesi (`toSortedFirmGroups` ile
aynı gerekçe). Uç sayfalı hâle gelirse `useFirmListParams` deseni eklenir.

**Yazma düğmeleri yönetici olmayanda HİÇ ÇİZİLMİYOR** (`useIsAdmin`), pasif
durmuyorlar: pasif düğme, tıklayınca 403 alacak bir yolu açık bırakmak olurdu.
Karar yalnız GÖRÜNÜRLÜK; denetim sunucuda ve 403 yine de ele alınıyor.

Mock gövde `regionsMock.ts`'te ve YALNIZ `VITE_API_URL` tanımsızken çalışıyor —
uçların 404'ünde düşülmüyor (K76'daki gösterge panosu kararıyla aynı çizgi).

### K78 — Çıkış sunucuya da gidiyor; yönlendirme oturumun TÜREVİ

`logout()` vardı ama yalnız `setAuthSession(undefined)` çağırıyordu ve **hiçbir
yerden çağrılmıyordu** — ölü koddu. Arayüzde çıkış eylemi hiç yoktu.

`POST /api/auth/logout` bağlandı. Uç kullanıcının TÜM token'larını geçersiz
kılıyor; yerel temizlik tek başına yeterli değildi, token başka sekmede/istemcide
süresi dolana kadar geçerli kalıyordu. İstek gövdesiz, yanıt gövdesiz →
`requestVoid` (K77'de eklendi); `requestJson` boş gövdede patlar ve çıkış
SUNUCUDA başarılıyken hata görünürdü.

**Yönlendirme elle YAPILMIYOR.** `useNavigate` de `window.location` da yok:
oturum düşünce `authToken.ts` aboneleri uyanıyor, `useAuthSession` yeni değeri
veriyor ve `RequireAuth` girişe yönlendiriyor. Yani oturumu temizlemek
yönlendirmenin KENDİSİ. İkinci bir yönlendirme yazmak, süresi dolan token
yolundan (http.ts 401'de aynı mekanizmayı kullanıyor) farklı davranan bir çıkış
demekti — iki yol, iki ayrı bozulma noktası.

**Yerel oturum HER DURUMDA temizleniyor (`finally`).** Kullanıcı "çık" dedi;
istek ağ hatasıyla düşerse bile bu makinede oturumu açık bırakmak — paylaşılan
bir bilgisayarda — sunucudaki token'ın süresi dolana kadar geçerli kalmasından
daha kötü. Bu özellikten ÖNCEKİ davranış zaten tam olarak buydu: sunucu çağrısı
hiç yoktu. Hata yine de YUTULMUYOR, çağırana geçiyor.

**401 hata sayılmıyor.** Token zaten geçersizse istenen sonuç gerçekleşmiş
demektir; `http.ts` 401'de oturumu kendisi düşürüyor ve `RequireAuth` girişe
götürüyor. Kullanıcıya "çıkılamadı" demek, çıkmışken kalmış gibi göstermek olurdu.

Arayüzde kullanıcı bloğu bir MENÜYE dönüştürülmedi: yanındaki bildirim
düğmesiyle aynı `adminIconButtonVariants` varyantında tek bir ikon düğmesi
eklendi (`aria-label="Oturumu Sonlandır"`). İstek uçarken düğme kilitleniyor —
ikinci istek ilkinin token'ı düşürdüğü ana denk gelip gereksiz bir 401 üretirdi.

Üst bardaki "Administrator / Sistem Yöneticisi" metni HÂLÂ SABİT, oturumdan
gelmiyor. Kapsam dışı bırakıldı; ayrı iş.


## 2026-08 · Bölge kavramının kalkması ve kapsam modeli

### K79 — Coğrafi bölge sunucudan TÜMÜYLE kalktı

`/api/regions` (dört uç) ve `/api/gasdistributionfirms/{firmId}/regions` artık
YOK; `GasDistributionFirmRegion` ilişkisi de kaldırıldı, `ProjectDetailDto`
alanı `GasDistributionFirmRegionId` → **`GasDistributionFirmId`** oldu.

K77 ile yazılan Bölgeler ekranı (`api/regions.ts`, `regionsMock.ts`,
`ui/admin/regions/`) ve K31'den kalan `useRegionParam` SİLİNDİ. Olmayan bir uca
istek atmak arızadır; ekranı bırakmak "çalışıyor gibi görünen" bir yol açık
bırakırdı. Sol menüde madde, router'da rota kalmadı.

Kalan `region` geçişleri BİLİNÇLİ: `docs/kararlar.md`'deki tarihsel kayıtlar
(K31/K43/K76/K77) ve `projects.ts`'teki "sözleşme değişti" notu neden böyle
olduğunu anlatıyor; `adminDashboard.test.ts`'teki "hiçbir kapsamda regionId
gönderilmez" testi ise regresyon koruması.

### K80 — Kapsam: global / grup / firma, ayrık birleşim

`GET /api/admin/dashboard` iki opsiyonel parametre alıyor — `gdGroupId` ve
`gdFirmId` — ve **ikisi birlikte gönderilemiyor**. Model bu yüzden ayrık:

```ts
type AdminScope =
  | { type: 'global' }
  | { type: 'group'; groupId: number }
  | { type: 'firm'; firmId: number }
```

`{ groupId?: number; firmId?: number }` biçimi geçersiz hâli (ikisi birden dolu)
TİPTE MÜMKÜN kılardı ve hata ancak sunucuda görünürdü. Sorguyu `adminDashboard.ts`
içindeki (dışa açık olmayan) `withScopeQuery` kuruyor; global kapsamda parametre
HİÇ yazılmaz.

**Kapsam için `src/api` altında AYRI dosya açılmıyor.** Bir tur `adminScope.ts`
denendi ve kaldırıldı: API sözleşmesinin sahibi backend, arayüzde uç başına yeni
bir soyutlama katmanı kurulmuyor. Tip ve sorgu kurucusu, o parametreyi alan ucun
kendi dosyasında yaşıyor. UI tarafındaki `useAdminScopeParam` (URL durumu) ve
`adminScopeOptions` (seçenek hiyerarşisi) API katmanı DEĞİL, `ui/admin/` altında.

URL'de grup `group` (liste süzgeciyle ORTAK anahtar), firma `gdfirm` (liste
karşılığı yok; proje firması süzgecinin `firm` anahtarıyla karıştırılmamalı).
Biri yazılırken öbürü siliniyor. Sorgu anahtarı kapsamın TAMAMINI taşıyor →
grup ile firma kapsamı ayrı önbellek girdisi.

### K81 — Üst bar seçicisi iki düzeyli, yeni uç YOK

Seçenekler mevcut iki uçtan birleşiyor: `/api/gasdistributiongroups` +
`/api/gasdistributionfirms` (satır zaten `groupId`/`groupName` taşıyor). Her
grubun altında kendi firmaları; `<optgroup label>` tıklanabilir olmadığı için
grubun KENDİSİ ilk satır olarak ayrıca yazılıyor ("AKSA (tümü)"). Değer türü de
taşıyor (`group:5` / `firm:42`) — aynı sayı hem grup hem firma kimliği olabilir.

Sıralama İSTEMCİDE ve Türkçe (hem gruplar hem her grubun firmaları): sunucu
'Ç'yi 'D'den sonra veriyor ve firma ucunda `sort` yok. Grubu olmayan firmalar
sonda ayrı başlıkta — elenselerdi kapsamları hiç seçilemezdi.

### K82 — Yoğunluk: `densityBy` + `density`, tanınmayan değer gruba düşer

`regionDensity: [{ region, count }]` yerine `densityBy: 'group' | 'firm'` ve
`density: [{ id, name, projectCount }]`. Satır artık ekranın iç tipinde de
sunucunun alan adlarını taşıyor; kart başlığı `densityBy`'dan geliyor
("Grup/Firma Bazlı Yoğunluk"), satır anahtarı `id` (iki kaydın adı aynı olabilir).

`densityBy` şemada `z.enum(['group','firm']).catch('group')`: bu alan sayıları
değil METNİ seçiyor, tanınmayan bir değer yüzünden bütün panelin hata ekranına
dönmesi orantısız olurdu. **TODO(esra): canlı yanıtta değer teyit edilecek** —
K76 döneminde gerçek yanıt `'GasDistributionGroup'` diyordu.

## 2026-08 · Firma listeleri sayfalı zarfa geçti (K27 emekliliği bekliyor)

### K83 — `/api/gasdistributionfirms` ve `/api/projectfirms` artık zarf döndürüyor

İkisi de düz dizi vermeyi bıraktı, `{ items, totalCount, page, pageSize }`
döndürüyor ve `SortBy`/`SortDir`/`Page`/`PageSize` (+ sırasıyla
`GasDistributionGroupId` ve `GasDistributionFirmId`/`GasDistributionGroupId`)
almaya başladı. Şemalar `z.array(...)` olduğu için **her iki liste de doğrulama
sınırında patlıyordu**: firma listesi, proje firmaları listesi, üst bardaki
kapsam seçici, Yeni Proje açılırları, proje listesi süzgeci ve benzersizlik ön
kontrolü aynı anda ölüydü.

Şemalar `pagedResultSchema` ile zarfa çevrildi. **Davranış bilinçli olarak AYNI
kaldı**: süzme/sıralama/sayfalama hâlâ istemcide.

### K84 — Varsayılan `pageSize` 30, tavan 100 → sayfalar toplanıyor

Ölçüldü (2026-08-16, gerçek uç): parametresiz çağrı `pageSize: 30` dönüyor ve
`PageSize=1000` isteği **sessizce `pageSize: 100`'e kırpılıyor**. Yani "tek
istekte hepsini al" mümkün değil, büyük `PageSize` göndermek de yetmiyor.

`fetchAllFirms` ve `getProjectFirmList` bu yüzden `listQuery.fetchAllPages` ile
sayfaları SIRAYLA topluyor: ilk yanıtın `totalCount`'u kaç sayfa gerektiğini
söylüyor, sayfa boyutu istenen değil **dönen** değerden okunuyor (sunucu
kırpıyor), boş sayfa gelirse döngü duruyor ve 200 sayfalık güvenlik tavanı var.

Tek sayfayla yetinilmedi çünkü bu iki fonksiyonun on bir çağıranının HEPSİ tüm
listeyi varsayıyor. En keskini benzersizlik ön kontrolü
(`findTakenProjectFirmErrors`): 30. kayıttan sonrası görünmeseydi form "bu vergi
numarası boşta" der ve MÜKERRER kayıt açtırırdı. Diğerleri (kapsam seçici,
açılırlar, istemci tarafı süzme) sessizce eksik liste gösterirdi.

### K85 — K27 emekliliği BEKLİYOR, ekran ekran yapılacak

`Page`/`PageSize` bugün yalnız "hepsini topla" amacıyla gidiyor; `SortBy`/
`SortDir` hiç kullanılmıyor ve ekranın sayfa boyutu uca YANSITILMIYOR. Yani K27
(istemci tarafı süzme/sıralama/sayfalama) hâlâ yürürlükte.

Sunucu tarafına geçiş tek seferde YAPILMADI: her liste ekranının kendi filtre
sözleşmesi, arama alanı ve sıralama anahtarları var; hepsini aynı anda çevirmek
altı ekranı birden riske atardı. Geçiş ekran ekran ve ayrı yapılacak — o zaman
`fetchAllPages` çağrıları teker teker düşecek.

## 2026-08 · Yetki ucunun kalan üç bağı

### K86 — Süresi dolmuş yetki kuralının TEK kapısı: `getEffectiveAuthorizations`

`GET /api/project-firm-authorizations` artık dört yeri besliyor: proje
oluştururken yazılan `projectFirmAuthorizationId`, Yeni Proje formunun G.D.
firması açılırı, kullanıcı yetki satırının proje firması açılırı (KK-20) ve
proje firmaları listesindeki "G.D. Firması" sütunu.

Uçta `onlyValid` ya da tarih süzgeci YOK, yani "süresi dolmuş yetki sayılmaz"
kuralı istemcide. Dördü de tek fonksiyondan geçiyor
(`isAuthorizationEffectiveAt` → `getEffectiveAuthorizations`); ikinci bir tarih
karşılaştırması yazılmadı. Sebep kuralın sınırda incelmesi: geçerlilik GÜN
bazlı ve iki uçta da dahil, damgalar dilim eki taşımadığı için UTC varsayılıyor.
Bu kadar ince bir kuralın ikinci kopyası kaçınılmaz olarak farklı davranırdı ve
fark ancak gün sınırındaki bir kayıtta görünürdü.

### K87 — KK-20 daraltması `/api/projectfirms?GasDistributionFirmId=` ile DEĞİL, yetki ucuyla

Yetki satırındaki proje firması açılırı artık seçilen G.D. firmasına daralıyor.
Daraltmayı iki uç da verebilirdi:

| | `/api/projectfirms?GasDistributionFirmId=` | `/api/project-firm-authorizations?GasDistributionFirmId=` |
|---|---|---|
| Satır | doğrudan firma | yetki kaydı → tekilleştirme gerekir |
| `validFrom`/`validTo` | YOK | var |

Kısa yol firma satırı döndürdüğü için tekilleştirme istemiyor ve ilk bakışta
daha uygun. **Ama geçerlilik tarihi taşımıyor.** Uçta `onlyValid` de olmadığına
göre süzme istemcide yapılmak zorunda; o hâlde tarihleri getiren tek kaynak
yetki ucu. Kısa yol seçilseydi süresi dolmuş bir yetkiyle bağlı firma da
seçenek olarak çıkardı ve hata ancak kaydetmeye basınca görünürdü — Yeni Proje
formunda tam olarak bu yaşandığı için K86 kuralı konmuştu.

Tekilleştirme "derdi" ölçüldüğünde üç satır: `getAuthorizedGasFirms`'in aynası
(`toFirmOptions`) iki yönde de aynı Map'i kullanıyor. Yani kısa yolun tek
avantajı bedava değil, sadece görünmez bir doğruluk kaybı karşılığındaydı.

Mock kullanıcı tohumu (`seedFromRealFirms`) bu daraltmadan MUAF: tohum tüm
firmaları istiyor, `getProjectFirmList`'ten alıyor. Eskiden `getAuthorizedProjectFirms(0)`
çağırıyordu ve daraltma bağlanınca sessizce boş liste dönerdi.

### K88 — "G.D. Firması" sütunu doldu ve ÇOĞUL

Proje firmaları listesindeki sütun artık "-" değil. Bağı kuran tek uç olmadığı
için birleştirme istemcide: `GET /api/projectfirms` firmayı, yetki ucu bağı
veriyor, `buildProjectFirmRows` satırda birleştiriyor (`ProjectFirmRow`).

Alan `gasFirm | null` değil `gasFirms: []`: bir proje firması aynı anda birden
fazla G.D. firmasında yetkili olabiliyor. Tekil bırakılsaydı çağıranın "ilk
yetki" gibi sessiz bir seçim yapması gerekirdi ve kullanıcı firmanın diğer
yetkilerini hiç görmezdi. Hücrede adlar ALT ALTA (`<ul>`) — virgülle ayrılmış
bağlantılar hem gözle hem ekran okuyucuda tek bağlantıya benziyor.

Yetkisi olmayan firma listeden DÜŞMEZ, hücresi "-" kalır: iç birleştirme
yapılsaydı liste sessizce firma kaybederdi. Yetki sorgusu AYRI anahtarda ve
listeyi BEKLETMİYOR — firma listesi altı ekranda ortak anahtarla paylaşılıyor
(K75), yetki isteği o anahtara eklenseydi bağa ihtiyacı olmayan beş ekran da
ikinci isteği çekerdi. Bağ çekilemezse sütun boş kalır ve "hiç yetkisi yok" gibi
okunur; bu yüzden kapatılabilir bir uyarı şeridi farkı söylüyor.

Boş hücre "yetki yok" gibi bir METİN yazmaz, projenin ortak `EmptyValue`
işaretini çizer. Tablonun kendi yerel tiresi de aynı turda oraya bağlandı —
yerel sürüm ekran okuyucuya "-" diye okunuyordu, ortak bileşen işareti
`aria-hidden` yapıp yerine "Değer yok" veriyor.

Filtre panelindeki iki kutunun pasiflik SEBEBİ artık ayrı, ipuçları da ayrıldı:
yeterlilik durumunda veri yok, G.D. firmasında veri var ama süzgeç bağlanmadı
(KK-5 kararına bağlı).

### K89 — KK-5 satır kararı: satır = FİRMA kalıyor

Veri geldiği hâlde "her yetki ayrı satır" (KK-5) UYGULANMADI. Engel veri değil,
ekranın eylem modeli: İşlemler sütunu firma bazlı ("Sil" firmayı siliyor), yetki
bazlı bir eylem sunulamıyor çünkü yetki yazma yolu S1/S2 yüzünden hâlâ mock, ve
düzleştirme aynı yıkıcı düğmeyi bir firma için N kez gösterirdi.

Denenen alternatifler ve neden seçilmedikleri: "Sil yalnız firmanın ilk
satırında" → tekrarlayan ad + "neden burada düğme yok" belirsizliği; "İşlemler
sütunu tümüyle kalksın" → listeden silme yeteneği kaybolur.

Karar S1/S2 netleşince yeniden değerlendirilecek; analiste sorulacak soru
docs/api-eksikleri-proje-firmalari.md **S7**: satırlar yetki bazlı olursa yetki
başına hangi eylemler sunulacak?

## 2026-08 · Editör kabuğunun yeniden kurulması

### K90 — Üst bar proje düzeyine daraldı, kip ayarları tuvale indi

Menü çubuğunda yalnız **Dosya** ve **Araçlar** kaldı. Düzenle / Görünüm /
Katlar KALKTI; taşıdıkları her şeyin tuvalde zaten bir karşılığı vardı:
geri al-yinele ve görünüm anahtarları yüzen çubukta (K54/K56), kat geçişi kat
seçicide (K55). Kalan tek madde "Kayıt Geçmişi"ydi, o da sağdaki eylem öbeğine
kendi düğmesi olarak geçti — Kaydet'in açılırı DEĞİL, çünkü kayıt geçmişine
bakmak kaydetmenin bir çeşidi değil.

Sebep mesafe: kullanıcı çizerken eli tuvalin altında, ölçüleri açmak ya da kat
değiştirmek için ekranın tepesine çıkıp geri dönmesi gerekiyordu. Aynı ayarın
iki yerde durması da (menü + çubuk) hangisinin "asıl" olduğunu belirsiz
bırakıyordu (K83'ün seçim aracı için verdiği kararın aynısı).

Alt **durum çubuğu kaldırıldı** (`ui/StatusBar.tsx` silindi): üç alanının
üçünün de karşılığı ekranda duruyor — aktif araç palette vurgulu, kat seçicide
yazılı, görünüm sahne pilinde işaretli. Sol alttaki **X/Y eksen göstergesi** de
kaldırıldı (`ui/AxisIndicator.tsx`). Menü çubuğunun ortasındaki üç pasif ikon
(`menu/ShortcutButtons.tsx`) yerini Test Et / Gönder'e bıraktı.

**Test Et, Gönder, Hata Kontrolleri ve Kayıt Geçmişi görünür ama PASİF.**
(Kayıt Geçmişi 2026-08'de bağlandı — bkz. K109; kalan üçü hâlâ pasif.)
Arkalarında akış yok — `core/validate.ts` bugün boş dosya. K79'un palet
dürüstlüğü kuralı: düğme "bozuk" değil "henüz yok" demeli. "Hata Kontrolleri"
bağımsız bir eylem değil, Test Et'in SONUCUNU gösterecek yer; doğrulama hattı
bağlanınca sonuç varken görünen bir rozete dönüşecek. Yer tutucu bir "0 hata"
yazılmadı — çalıştırılmamış bir kontrolü geçmiş gibi gösterirdi.

### K91 — Kabuk iki yüzeye ayrıldı: tema değişeni ve HEP BEYAZ olanı

Üst bar ve tuval TEK yüzey; sol bar ve tuvalin çevresindeki boşluk ayrı zemin.
Yüzeyler arasındaki geçiş kavisle (`rounded-l-2xl`, sayfanın en üstünden en
altına) veriliyor — üst barın kendi dolgusu ve kenarlığı yok, "bar" diye ayrı
bir şerit okunmuyor.

Kritik kısım: **üst bar koyu temada da BEYAZ kalır.** Kullandığı token ailesi
`canvas-overlay`, kabuğun `surface`/`ink`'i değil. Gerekçe zaten o ailenin
tanımında yazılıydı — tuvalin üstünde duran DOM parçaları koyu temada dönmez,
çünkü tuvalin kendisi de dönmüyor (`sceneTheme.background` iki temada da beyaz).
Üst bar da o yüzeyin üstünde. Kabuk token'ı kullanılsaydı beyaz tuvalin üstünde
lacivert bir şerit kalırdı.

Aile beyaz zeminde okunacak dört token'la genişledi (`index.css`, hepsi açık
tema değerleri ve `.dark` karşılığı YOK): `canvas-overlay-ink-strong`,
`-ink-muted`, `-success`, `-danger`.

⚠️ **`chromeButtonVariants` bu iş için DEĞİŞTİRİLMEDİ.** Üst barın kendi
varyantları ayrı dosyada (`ui/menu/editorBarVariants.ts`). Önce ortak varyanta
`card`/`success` tonları eklenmişti; o varyantı kat pencereleri, silme onayı ve
kopyalama listesi de kullanıyor ve onlar koyu temada KOYU kalmalı — beyaz
zemine göre ayarlanmış renkler oraya sızıyordu. Kabuk üstünde duran bir düğme
ile tuval üstünde duran bir düğme aynı varyantı paylaşamaz.

⚠️ **cva sınıfları ÇAKIŞTIRMAZ.** Taban ile ton aynı `disabled:` rengini
verirse hangisinin kazandığı Tailwind'in stil sırasına kalır, sınıf sırasına
değil. Bu yüzden pasif metin rengi tabandan tonların içine alındı; aynı gerekçe
`EDITOR_BAR_PANEL`'in köşe yarıçapı taşımamasının da sebebi (çağıran kendi
`rounded-*`'ını verir).

Tema DEĞİŞMEYE devam eden yerler: sol bar, yüzen çubuk ve tüm pencereler.
Sol barın "açık temada bile lacivert" durması DENENDİ ve geri alındı (kullanıcı
kararı) — bugün zemin token'ını izliyor.

### K92 — Kat yönetimi ve kopyalama, çubuktaki kat açılırının altına indi

"Katlar" menüsü kalkınca bu iki pencerenin tek girişi kat seçici oldu: liste,
ayraç, sonra `Kat Yönetimi (Ctrl+K)` ve `Kat Kopyalama (Ctrl+Shift+K)`.
Yukarısı "hangi kattayım", aşağısı "katları değiştir".

Düğme artık aktif katın adını değil `Katlar <sayı>` yazıyor (kalkan menünün
rozeti de buraya geldi); aktif kat açılırın içinde işaretli. Erişilebilir ad
ikisini birden söyler ("Katlar, aktif kat Zemin Kat") — görünen metin artık
aktif katı söylemediği için ekran okuyucu kullanıcısı onu kaybederdi.

↓/↑ okları bir tur KALDIRILDI, sonra GERİ KONDU (kullanıcı kararı): komşu kata
geçmek çizerken en sık yapılan hareket ve açılır açıp madde seçmek onun yanında
üç adım. Açılır uzak kata atlamak, boş katı görmek ve pencereleri açmak için.

### K93 — İki özellik paneli tuvalin üstünde YÜZEN KART, kabuk ortak

Paneller ekranın sağ kenarına yapışan tam boy şeritti. Üst barın şerit
görünümü kalkınca o blok kabuğun neresine ait olduğu okunmayan bir yama hâline
geldi. Artık üç kenardan paylı, kavisli, kenarlıklı ve gölgeli bir kart —
yüzen çubukla (K54) aynı aile.

⚠️ Kaydırma animasyonu panelin KENDİSİNDE değil bir sarmalayıcıda: kenar
boşluğu sarmalayıcıda olduğu için `translate-x-full` paneli boşlukla birlikte
götürüyor. Boşluk panelin üstünde olsaydı kapalıyken kenardan boşluk kadar bir
şerit sızardı.

Kabuk **paylaşıldı**: `ui/properties/PropertyPanelShell.tsx`. Mimari ve tesisat
panelleri ayrı bileşen kalmaya devam ediyor (seçim store'ları ayrı, K37) ama
ayrışmaması gereken şey görünümdü ve iki kopya hâlinde duruyordu — dosya
yorumunda "AYNI iskelet" yazdığı hâlde. Ortak kabuk: kaydırma, `aria-hidden` +
`inert`, kavis/kenarlık/gölge, başlık ve Sil düğmesi. Mimarinin grup dönüşümü
eylemleri `actions` prop'undan giriyor.

Paneller koyu temada KOYU kalıyor (K91'in tema değişen tarafı): içlerindeki
form bileşenlerinin tamamı kabuk token'larına bağlı, beyaza çevirmek onları da
yeniden boyamak demek. Yüzen çubuk ve sol barla tutarlı.

## 2026-08 · Kirli işaretinin hesabı

### K94 — Kirli işareti sayaçtan değil İÇERİKTEN hesaplanıyor

`selectIsProjectDirty` artık `revision !== savedRevision` demiyor; kaydetme/
yükleme anında alınan içerik anlık görüntüsüyle (`store/persistedContent.ts`)
bugünkü diziler karşılaştırılıyor. `savedRevision` alanı düştü.

Sebep: `revision` yalnız ileri gider ve geri alma onu düşürmez (K71, bilinçli).
Çizip Ctrl+Z yapan kullanıcının çizimi kaydedilenle birebir aynı oluyor ama
sayaçlar farklı kaldığı için kaydetme uyarısı alıyordu. K71'in notu bunu bilinen
bir bedel olarak yazmıştı ("fazladan uyarı, kaybolan işten iyidir"); bedel
gereksizmiş — sayacı geçmişe sokmadan da doğru hesap yapılabiliyor.

Karşılaştırma SIĞ referans karşılaştırması: immer dokunulmayan diziyi aynı
referansla bırakıyor, zundo geri alırken kaydettiği referansları geri koyuyor.
Yani "çiz + geri al" sonrasında diziler kaydetme anındaki referanslara döner.

Anlık görüntü MİMARİ + TESİSAT dizilerinin hepsini taşır. Yalnız mimari
geçmişinin izlediği alt küme (`history.ts`) kullanılsaydı K71'in asıl korkusu
gerçekleşirdi: mimaride Ctrl+Z yapmak kaydedilmemiş tesisat işini "temiz"
gösterirdi.

`nextUniqueId` ve `activeFloorId` JSON'a giriyor ama anlık görüntüde YOK: biri
sayaç (geri alınan nesnenin id'si zaten kullanımda değil), diğeri hangi kata
BAKILDIĞI. İkisi de dahil edilseydi ekranda hiçbir şey değişmeden uyarı çıkardı.

`markDirty`/`revision` DURUYOR, anlamı daraldı: "bir action gerçekten yazdı".
Reddedilen işlemler (K13 geçersiz taşıma, sığmayan yerleştirme) onu artırmıyor
ve testler reddedilmeyi bu şekilde sınıyor — 101 çağrıyı sökmek için sebep yok.

⚠️ Anlık görüntü immer producer'ının DIŞINDAN alınmalı. İçeriden `draft.walls`
okunursa bir draft proxy'si gelir; producer bitince state'e yazılan gerçek dizi
başka bir referans olur ve karşılaştırma HER ZAMAN "kirli" der. `loadProject`
bu yüzden gelen `data`dan alıyor (aynı referanslar state'e yazılıyor),
`markSaved` ise `getState()`ten.

## 2026-08 · Duvar ölçüsü tek sayıya indi

### K95 — İçten/dıştan ölçü KALDIRILDI (K74/K75 geri alındı)

Duvar parçası artık TEK sayı yazıyor: kendi EKSEN boyu. `WallDimensionAnnotation`
`innerLengthCm`/`innerPosition`/`outerLengthCm`/`outerPosition` yerine
`lengthCm`/`position` taşıyor; `buildWallInteriorPoints` ve `interiorPoints`
seçeneği tümüyle düştü.

Sebep: kullanıcı planda yanlış çalıştığını bildirdi. Ekran görüntüsünde aynı
duvarda `1,94 / 1,21` gibi farkı komşu kalınlığının yarısıyla açıklanamayacak
kadar büyük çiftler ve `0,02 m` gibi sayılar vardı. Sayıların bir kısmı doğru
iç/dış çiftiyken bir kısmı değildi ve kullanıcı ikisini ayırt edemiyordu —
"hangisi gerçek boy" sorusu her etikette yeniden soruluyordu.

K74'ün gerekçesi (imalatta ölçülen net açıklıktır) hâlâ geçerli, ama iki sayıyı
yan yana yazmak o bilgiyi güvenilir biçimde vermiyordu. Doğru olan tek sayının
yanlış olan iki sayıdan iyi olduğuna karar verildi; iç/dış ayrımı gerekirse
ayrıca ve kendi başına ele alınacak.

K76 (duvar ve açıklık anahtarlarının bağımsızlığı) ve K73 (duvarın açıklıklarla
parçalara bölünmesi) DURUYOR — kaldırılan yalnız parça başına ikinci ölçü.

Etiket okunur yönün SOL normaline yazılıyor; "oda tarafı" kavramı artık
hesaplanmıyor, dolayısıyla `findRoomFaces` bu yoldan çıktı (kare başına oda
çevrimi araması da gitti).

## 2026-08 · Tesisat paleti de gruplandı

### K96 — Tesisat paleti İŞE göre gruplandı, Seçim Aracı paletten çıktı

Mimaride K82/K83 ile yapılan düzen tesisat paletine de uygulandı: araçlar plan
Bölüm 10'un düz sırasıyla değil, TÜRLERİNE göre beş grupta duruyor ve gruplar
ince bir ayraçla ayrılıyor.

1. **Besleme ve ölçüm** — Servis Kutusu, Regülatör, Sayaç, Süzme Sayaç.
2. **Hatlar** — Boru, Branşman, Baca, Havalandırma Kanalı. Baca ve havalandırma
   eleman değil GÜZERGÂH (`attachModes.ts`), yeri hat grubu.
3. **Armatürler** — Vana, Selenoid Vana, Manometre, Filtre/Kit, İzolasyon.
   Hepsi `onLine`: boruya oturur, boruyu ayırır.
4. **Yakıcı cihazlar** — Ocak, Soba, Şofben, Kombi, Kazan, Diğer (`nearestLine`).
5. **Notlar ve yardımcılar** — Ölçüm. Tesisatın hiçbir parçasını çizmiyor.

Grup sırası gazın yolunu izliyor (servis kutusundan girer → hat çizilir →
armatür oturur → cihaz yanar) ve grupların sınırı `attachModes.ts`'teki tutunma
kipiyle uyumlu: kullanıcının gördüğü ayrım ile kodun davranış ayrımı ayrışırsa
"neden bu ikisi ayrı grupta" sorusunun cevabı kalmaz.

**Seçim Aracı paletten ÇIKARILDI** — K83'ün tesisat karşılığı. Yüzen çubuk iki
çizim görünümünde de mount ediliyor (K57) ve tesisatın seçim aracını
`INSTALLATION_SELECTION_TOOL_ID` üzerinden zaten gösteriyor; aynı kip iki yerde
dururken kullanıcı hangisinin "asıl" olduğunu bilemiyordu. Araç olarak duruyor:
varsayılan odur, hook'lar sabit üzerinden ona bakıyor.

Mimarideki gibi `INSTALLATION_TOOLS` (var olan araçlar) ile
`INSTALLATION_TOOL_GROUPS` (palette görünenler) artık AYNI KÜME DEĞİL; ikon
kaydı ve davranış çözen fonksiyonlar (`getPlacementElementType`, `getLineKind`,
`isMeasurementTool`) düzleştirilmiş listeyi okur, gruplar yalnız YERLEŞİM
bilgisidir. Düzleştirmenin dönüş tipi burada da ELLE yazıldı — `flatMap` demet
tiplerini genişletiyor ve `InstallationToolId` `string`e düşüyordu.

**Ayraç her grubun ÜSTÜNDE, ilki dahil** (kullanıcı kararı): en üstteki çizgi
grupları değil paleti üstündeki LOGODAN ayırıyor. İki palet aynı çizgiyi
kullansın diye sınıf `TOOL_GROUP_DIVIDER` sabitinde
(`ui/controls/buttonVariants.ts`), iki dosyada iki kopya değil.

## 2026-08 · Duvar uzaklaşınca kayboluyor, kenarlarda inceliyordu

### K97 — Duvar kalınlığı da PİKSEL cinsinden (worldUnits bırakıldı) + 3 px taban

İki şikâyet arka arkaya geldi ve ikisinin de kaynağı aynı çizim yolu:

1. **Uzaklaşınca duvarlar incelip yok oluyordu.** Duvar `alphaToCoverage` ile
   yumuşatılıyor; çizgi bir-iki pikselken bandın TAMAMI "kenar" sayılıyor, örtme
   maskesi seyrekleşiyor ve duvar yer yer silinip titriyordu. En uzak zoom'da
   (%10) 20 cm'lik duvar 2 px'e denk geliyor.
2. **Ekran KENARLARINA doğru inceliyordu.** Bu, boruda daha önce çözülen tuzağın
   aynısı ("Boru kalınlığı piksel cinsinden veriliyor" kararı): `worldUnits`
   shader'ı göz ışınının bir NOKTADAN çıktığını varsayıyor (perspektif), kameramız
   ortografik ve 100.000 cm yukarıda — hesap float32 hassasiyetini yiyor, hata
   ekran merkezinden uzaklaştıkça büyüyor. O kararda "duvarlarda görünmez" denip
   duvar `worldUnits`ta bırakılmıştı; 3 px'e inen duvarda GÖRÜNÜR oldu.

Karar: **duvar da `worldUnits` KULLANMAZ.** `scene/wallStyle.ts` →

    getWallLineWidthPx(thicknessCm, zoom) = max(thicknessCm × zoom, 3)

Taban boru tarafındakiyle aynı değer (`MIN_LINE_WIDTH_PX = 3`): aynı ekranda
duvar ile hattın alt sınırı farklı olsaydı, uzaklaşınca biri kaybolup diğeri
kalırdı. Taban yalnız en uzak birkaç zoom adımında devreye girer (20 cm duvar
için zoom < 0,15); yakınken duvar gerçek kalınlığında, plan fiziksel olarak
doğru okunuyor.

Kapsül biçimi KAYBOLMADI: `worldUnits`siz yolda da uçlar yuvarlak, yalnız
yuvarlaklık ekran uzayında hesaplanıyor. Ortografik tepeden bakışta ekran uzayı
dünyanın düzgün ölçeklenmişi olduğu için kavşaklar yine kendiliğinden dolar
(K23 duruyor). `CAMERA_HEIGHT_CM` uyarısı da duruyor ama artık duvar ona bağlı
değil — düşürmek yine de gereksiz.

Zoom, duvar başına DEĞİL kapsayıcıda bir kez okunur (`useCameraZoom`
sözleşmesi): `Walls`, `FloorBelowGhost` ve tesisat görünümündeki
`ArchitectureGhost` zoom'u prop olarak dağıtır. Üç yol da aynı fonksiyondan
geçiyor — hayalet kaybolup gerçek duvar kalsaydı hizalama referansı işe
yaramazdı.

Bilinen sınır: açıklık DOLGUSU dünya uzayında bir mesh, tabana tabi değil. En
uzak zoom'da duvar bandı biraz kalınken delik gerçek genişliğinde kalır, yani
kapı/pencere olduğundan dar görünür. Kiriş ve alan nesnesi konturları da hâlâ
`worldUnits` yolunda (AreaObject.tsx, Beam.tsx) — aynı iki kusur onlarda da var,
ayrıca ele alınacak.

## 2026-08 · Kavşaktaki hale

### K98 — Duvarlarda `alphaToCoverage` KAPALI: kavşaktaki hale bundandı

Duvar `<Line>`'ının kenar yumuşatması artık örtme (coverage) maskesiyle değil,
materyalin kendi harmanlamasıyla yapılıyor.

Eski yorum "duvarlar tek renk olduğu için çakışan kenarlarda dikiş oluşmaz"
diyordu ve İKİ duvarın gövdesi kısmen çakışırken bu doğruydu. Gözden kaçan
durum KAVŞAK: orada birden çok yuvarlak UÇ aynı noktada üst üste biniyor. Her
uç ayrı bir çizim ve örnek maskesini ekleyerek değil YAZARAK koyuyor; kenar
alfaları birbirine yakın olduğu için hepsi aşağı yukarı aynı örnek altkümesini
dolduruyor ve birleşim tam örtmeye ulaşmıyordu. Sonuç: kavşakta zeminin sızdığı,
duvardan açık renkli bir hale.

Belirti kullanıcıdan geldi ("köşelerde gölgemsi görüntü") ve dört kollu
kesişimde gözle seçiliyordu; iki kollu L köşesinde eksik örtme çok küçük olduğu
için fark edilmiyordu.

Kapatmanın bilinen riski shader'ın kenarı sert `discard` etmesi ve yuvarlak
uçların tırtıklanmasıydı; tarayıcıda bakıldı, uçlar düzgün kaldı (MSAA açık).

⚠️ Bu ayarı geri açan, kavşak halesini de geri getirir.

"Tek duvar çizdim iki oldu" şikâyeti bu haleyle birlikte KAPANDI. Belirtinin
iki kaynağı varmış ve ikisi de görseldi:

1. Kavşaktaki hale, ayrı bir parça gibi okunuyordu (bu karar).
2. Aynı parçaya yazılan ikinci ve yanlış sayı (K95'te kaldırılan içten ölçü).

⚠️ "Kıymık duvar" diye bir sorun ÇIKMADI, arama oraya boşuna gitti. Şüphe
ekrandaki `0,02 m` / `0,10 m` gibi etiketlerden doğmuştu; onlar minicik duvarlar
değil, `0,42 m` / `0,50 m` ile ÇİFT hâlinde duran bozuk içten ölçülerdi — K74
komşu kalınlığını düşüp sıfırda kelepçelediği için 42 cm'lik duvar "0,02 m"
yazıyordu. Ders: bir sayının saçmalığına bakmadan önce yanındaki sayıyla çift
olup olmadığına bak. Kullanıcı K95+K96 sonrası planı denetledi, 20 cm altında
parça yok.

## 2026-08 · Sürüklerken kasma: duvar geometrisi kare başına yeniden yükleniyordu

### K99 — `Wall` uçları SAYI olarak alır; kare başına değişen prop React Compiler önbelleğini çöpe atıyordu

Belirti kullanıcıdan geldi: "çizimde kasma". Ölçüldü — 220 duvar / 100 odalı
planda tek duvarı sürüklerken ortalama kare **156 ms**, yani ~6 fps.

Sebep drei `<Line>`: geometriyi `points` dizisinin KİMLİĞİNE göre kuruyor,
dizi değişince yeni `LineGeometry` ayırıp GPU tamponunu yükleyip eskisini imha
ediyor. `Wall` bu diziyi kapsülünden türetiyordu ve kapsülü `pointIndex`'ten
çözüyordu — `pointIndex` ise sürükleme boyunca HER KARE yeniden kuruluyor
(`useArchitecturePoints` sürüklenen köşeleri geçici konumla döndürüyor). Sonuç:
uçları hiç oynamayan duvarların geometrisi de her karede yeniden yükleniyordu.

Çözüm prop sözleşmesini değiştirmek: `Wall` artık `pointIndex` değil dört
koordinat (`p1x/p1y/p2x/p2y`) alıyor, kapsülü kapsayıcı çözüyor. Uçları
oynamayan duvarın propları sayı olarak AYNI kaldığı için önbellek tutuyor.

Ölçüm (aynı plan, aynı jest, tarayıcıda):

| | önce | sonra |
|---|---|---|
| `bufferData` / kare | 1223,2 | 143,0 |
| ortalama kare | 156,3 ms | 41,5 ms |
| en kötü kare | 396,5 ms | 86,1 ms |
| çizim çağrısı / kare | 379,1 | 379,1 |

⚠️ **Bu projede React Compiler AÇIK** (`vite.config.ts`, `reactCompilerPreset`).
Elle `useMemo`/`memo` yazmak çoğu yerde GEREKSİZ — derleyici zaten yapıyor.
İlk teşhis "zoom sırasında geometri çöpü oluyor" idi ve YANLIŞ çıktı: derleyici
çıktısında dizi zaten `[pointIndex, wall]` anahtarıyla önbellekteydi, zoom onu
bozmuyordu. Ölçüm eski ve yeni kodu zoom senaryosunda birebir aynı verdi.

**Ders:** derleyici önbelleği, ona verdiğin anahtarlar kadar iyi. Kare başına
kimliği değişen TEK bir prop (burada `pointIndex`) o bileşendeki tüm
önbelleklemeyi etkisiz bırakır. Performans ararken "memoize edilmiş mi" diye
değil, "anahtarı ne kadar sık değişiyor" diye bak.

⚠️ Ölçüm dev sunucuda alındı; kare süreleri koşudan koşuya oynuyor (41–58 ms).
`bufferData` sayısı ise deterministik, karşılaştırma ona dayanmalı.

Kalan: kare başına 143 tampon yüklemesi ve 379 çizim çağrısı DURUYOR. Bunlar
duvarlardan değil, oda dolguları/ölçü yazıları/diğer katmanlardan geliyor;
ayrıca ele alınacak (bkz. knowledge/render-performance.md).
## 2026-08 · Oda dolgusu kare başına GPU'ya yeniden yükleniyordu

### K100 — Oda dolgu tamponu poligonun DEĞERİNE göre önbellekte

K99'un (duvar çizgisi) aynısının oda tarafı. `RoomShape` dolguyu JSX içinde
üretiyordu:

```tsx
<bufferAttribute attach="attributes-position" args={[toFillPositions(fillCorners), 3]} />
```

`toFillPositions` poligonu üçgenleyip YENİ bir `Float32Array` döndürüyor.
`fillCorners` ise üstteki `shapes` türetmesinden geliyor ve o `points`'e bağlı —
sürükleme boyunca her kare değişiyor. Sonuç: sürüklenen duvara komşu OLMAYAN
odaların dolgusu da her karede yeniden üçgenlenip GPU'ya yükleniyordu.

Çözüm `useStableFillPositions`: tampon poligonun KOORDİNAT DEĞERLERİNDEN
üretilen bir anahtara göre `useMemo`'lanıyor. Poligon aynı kaldıkça referans
korunuyor, r3f `bufferAttribute`'u yeniden kurmuyor.

⚠️ `useMemo` bağımlılığı bilerek `fillCorners` DEĞİL `fillKey`; eslint uyarısı
tek satırlık `eslint-disable-next-line` ile bastırıldı çünkü kural burada yanlış
şeyi istiyor (kimliğe bakmak önbelleği anlamsız kılar).

⚠️ Ref ile "son değeri sakla" denemesi ÖNCE yapıldı ve BIRAKILDI: bu projede
`react-hooks/refs` render sırasında ref erişimini HATA sayıyor.

Ölçüm (220 duvar / 100 oda, tek duvar sürüklenirken, tarayıcıda):

| | önce | sonra |
|---|---|---|
| `bufferData` / kare (toplam) | 144,7 | 67,4 |
| bunun oda dolgusu payı | 101,5 | 25,1 |

Pay, odalar kaldırılıp ölçülen taban (42,3) çıkarılarak bulundu. Kalan 25,1
büyük ölçüde meşru: sürüklenen duvara komşu iki odanın poligonu gerçekten her
kare değişiyor, ayrıca oda ad/alan etiketi (troika) yeniden diziliyor.

**Ölçü yazıları SORUN DEĞİL — ölçüldü, elendi.** Görünüm ▸ Ölçüler açıkken
`bufferData` 43,1, kapalıyken 43,2: fark yok. Sadece çizim çağrısı artıyor
(+34,6) ve kare süresinde ölçülebilir etki görülmedi. Oraya dokunmaya gerek yok.

⚠️ Kare süreleri bu turda raporlanmadı: tarayıcı oturumu ölçüm sırasında
kısıtlandı (boş sondaj bile 93 ms verdi) ve sayılar koşudan koşuya 20 kat
oynadı. `bufferData` deterministik kaldı, karşılaştırma ona dayanıyor.

## 2026-08 · Editör geç açılıyordu: bekleme tamamen İNDİRME

### K101 — Editör parçası proje detay ekranında BOŞTA önden indiriliyor

"Editör geç açılıyor" şikâyeti ölçüldü. Üretim derlemesinde (`vite preview`),
proje detayından "Çizim Editöründe Aç"a basıp tuval görünene kadar:

| | süre |
|---|---|
| tıklamadan tuvale (soğuk) | **2220 ms** |
| bunun sadece parça indirmesi | **2129 ms** |
| ayrıştırma + WebGL kurulumu + ilk çizim | ~90 ms |
| tıklamadan tuvale (parça zaten inmişse) | **16 ms** |

Yani beklemenin **%96'sı** 413 KB'lık `EditorPage` parçasını indirmek. Kodun
ağırlığı, three.js'in kurulması, sahnenin çizilmesi — hiçbiri suçlu değil. Rota
bazlı kod bölme zaten vardı ve doğruydu; eksik olan, parçanın NE ZAMAN
indirildiğiydi.

Çözüm: kullanıcı proje detay ekranındayken parçayı boşta indir. Editöre giriş
K53'ten beri TEK noktada (`ProjectDetailHeader`), yani kullanıcı oradaysa
editöre girmesi kuvvetle muhtemel.

`src/app/editorChunk.ts` tek kapı: `importEditorPage()` hem `router.tsx`'in
`lazy()`'si hem ısıtma tarafından çağrılıyor. Ayrı ayrı yazılsaydı biri
taşındığında öbürü sessizce başka bir parçayı ısıtırdı.

Isıtma `requestIdleCallback` ile boşta çalışır (detay ekranının kendi verisiyle
yarışmasın), yoksa 300 ms'lik zamanlayıcıya düşer (Safari). Sonuç BEKLENMEZ,
hata YUTULUR — kullanıcının gördüğü hiçbir şey buna bağlı değil; gerçekten
gerektiğinde `router.tsx` aynı modülü tekrar ister ve hata Suspense sınırının
içinde yüzeye çıkar. Efektin temizliği ısıtmayı iptal eder.

Tarayıcıda doğrulandı (yeni derleme, önbellek boş):

| | önce | sonra |
|---|---|---|
| tıklamadan tuvale | 2220 ms | **35,5 ms** |

Detay ekranında hiç tıklanmadan parçanın indiği ölçümle görüldü (arka planda
512,7 ms).

⚠️ Bedeli: editöre hiç girmeyen kullanıcı 413 KB'ı boşa indirir. Detay
ekranında olmak zaten güçlü bir niyet sinyali olduğu için kabul edildi. Veri
tasarrufu kipine (`navigator.connection.saveData`) saygı duymak ayrı bir iş
olarak açık bırakıldı.

⚠️ **Isıtma yalnız DETAY EKRANINDAN geçen kullanıcıyı kurtarır.** Editör
adresine doğrudan gelen (yer imi, sayfa yenileme, paylaşılan bağlantı) ısıtacak
bir an bulamaz ve tam indirmeyi bekler — o yolda hâlâ ~2 saniye. Kapatmak
isteyen, parçayı giriş sonrası kabukta ısıtmalı; o zaman editöre hiç girmeyen
kullanıcılar da 413 KB indirir, takas bilinçli olarak yapılmadı.

⚠️ Detay ekranında ısıtmanın bitmesine YETECEK kadar kalınmazsa (parça arka
planda 512 ms sürdü) kullanıcı kalan kısmı bekler. Yine de hiç ısıtmamaktan iyi:
indirme yarıda kesilmez, kaldığı yerden kullanılır.

⚠️ Bu değişiklik B (mimari) fayının DIŞINDA: `src/app/router.tsx` ve
`src/ui/admin/projectDetail/`. Ölçüm B tarafında çıktığı için burada yapıldı,
gözden geçirmesi A'ya ait.

## 2026-08 · Boruya düşey eksen — ikinci deneme, temizinden

### K102 — Ayrı `riser` kind yerine var olan `pipe.startHeightCm/endHeightCm`

İlk deneme ayrı bir hat türüydü (`kind: 'riser'`, plan boyu SIFIR) ve sekiz
ayrı yerde özel-durum koruması, kendi kat-geçiş menüsü, ayrı bir taslak
zinciri, pano/kat-kopyalama istisnaları gerektiriyordu. Kullanıcı geri
aldırdı, "temizinden" istedi.

Keşifte ortaya çıktı: `InstallationLine.pipe.startHeightCm`/`endHeightCm`
ZATEN vardı, salt açıklayıcıydı — hiçbir geometri/render kodu okumuyordu.
Çizim kuralı gereği ("K-W: her sol tık kendi borusunu yazar") tipik bir hat
2 noktalıdır, yani start/end height kullanıcının "her noktada yükseklik"
isteğinin karşılığıdır. Yeni model alanı ya da ayrı tür GEREKMEDİ — var olan
alanlar render'a bağlandı (`plumbing/core/lineElevation.ts`).

Sonuç: ayrı kind kalkınca pano/kat-kopyalama/etiket sözlüğü/panel dallanması
gibi altı özel-durumun hiçbiri gerekmedi (`pipe` zaten hepsini kapsıyor).
Kalan tek risk — aynı plan konumunda iki nokta (saf dikey bağlantı) — yalnız
İKİ dosyada (`attachGeometry.ts`, `lineSimplify.ts`), "riser" adı olmadan,
genel "sıfır uzunluklu segment" koruması olarak ele alındı.

`+`/`-` ayrı bir "kolon yaz" fonksiyonuna İHTİYAÇ DUYMADI: normal sol-tık
commit yoluyla (`addLine`) aynı konumda ikinci bir nokta yazıyor, zincir
kotu `LineChain.elevationCm`'de taşınıyor. Kat geçişi bu kotu KENDİLİĞİNDEN
DEĞİŞTİRMİYOR — otomatik kolon ya da özel bir kat-geçiş menüsü bu turda
kapsam dışı bırakıldı.

Boruya oturan elemanlar (vana, sayaç…) borunun kotunu `getInlineElementElevationCm`
ile TÜRETEREK izliyor (store'a yazılmıyor, kural 4); bilinen sınır: `onLine`
sürükleme sırasındaki canlı önizleme bunu okumuyor, bırakılınca doğru kota
zıplıyor. Metraj artık `getLine3dLengthCm` ile gerçek 3B boru boyunu
kullanıyor (plan boyu + kot farkının Pisagor bileşkesi). Portlar bilerek 2D
kaldı. Ayrıntı: `knowledge/pipe-elevation.md`.

### K102 ek — sayısal kot girişi ve düzenlenebilir "Boy" (aynı gün, ikinci tur)

Kullanıcı "+/- yeterli değil, tam sayı girebilmeliyim" dedi: `+`/`-` ile
PAYLAŞILAN tek commit fonksiyonu (`store/pipeElevationActions.ts`) hem tuşu
hem yeni sayısal kutuyu (`PipeElevationInput.tsx`) besliyor — iki ayrı "kolon
yaz" yolu açılmadı. Zincirin devamının o kottan başlaması zaten çalışıyordu,
ek koda gerek kalmadı.

"Boy (cm)" alanı da düzenlenebilir oldu (`resolvePipeResizeTarget`): segmentin
güncel 3B yönü korunarak ölçekleniyor. Yalnız tek ve iki noktalı hatta —
`WallProperties.tsx`'in "uzunluk komşu köşeyi sürükler" gerekçesiyle aynı
sebeple üç+ noktalı/çoklu seçimde salt okunur kaldı. Taşıma + kot TEK
`plumbingSlice.resizePipeEnd` adımında yazılıyor (bir kullanıcı eylemi = bir
Ctrl+Z).
## 2026-08 · Duvar taşıma: normale kilitli hareket ve köşe ayrılması

### K103 — Duvar YALNIZ kendi normali boyunca taşınır; ötelemeyi karşılayamayan komşu köşeden KOPAR

İki kural tek karar: hareketin kısıtı ile kopmanın ölçütü birbirinden türüyor.

**1. Duvar kendine PARALEL kayar, uçları komşusunun DOĞRUSUNA oturur.**
`core/wallOffset.ts` → `planWallOffset`.

İlk sürüm duvarı KATI taşıyordu: iki köşe de aynı vektörle giderdi. Bu ancak
komşu duvar hareket yönüne paralelken işe yarıyor — dik açılı planlarda
tesadüfen hep doğru, EĞİK planda hiç doğru değil. Ölçüldü: yamuk bir odada
(eğik yan kenarlar) hiçbir duvar hiçbir yöne taşınamıyordu, yatay üst ve alt
duvarlar dahil; hepsi kopuyor ya da ret koruması tarafından engelleniyordu
(kullanıcı bildirimi).

Yeni modelde duvar kendi doğrultusunu korur, ucu komşunun doğrusu boyunca
kayar. Komşunun AÇISI korunur, yalnız BOYU değişir — istenen davranış tam
olarak buydu. Duvarı kendi ekseni boyunca sürüklemek hâlâ hiçbir şey yapmaz:
öteleme normale izdüşürülüyor.

⚠️ Bedeli: **taşınan duvarın BOYU değişebilir.** Yamukta aşağı inen duvar uzar,
yukarı çıkan kısalır. Dik açılı planda boy hiç değişmez ve sonuç eski katı
ötelemeyle BİREBİR aynı çıkar — bugüne kadar çalışan hiçbir şey bozulmadı.
"Öteleme KATIDIR" ifadesi bu kararla kalkmıştır.

⚠️ Kaydırma kendi eylemidir (`offsetWall`), `transformSelection` DEĞİL: iki uç
farklı vektörlerle gittiği için tek bir `translate` dönüşümüyle ifade edilemez.
Çoklu seçim eskisi gibi blok olarak ötelenir — orada ortak normal yok.

**2. Kopma ölçütü: komşunun doğrusu KESİŞİYOR MU.** Kesişim varsa komşu o
noktaya oturarak takip eder (açısı korunur, boyu değişir). Taşınan duvara
PARALEL komşunun kesişimi yoktur — takip edemez, köşenin klonuna bağlanıp
yerinde kalır. İlk görsellerdeki yan odaların üst duvarları tam olarak bu
durumdaydı.

Bir köşede kesişimi olan birden çok komşu varsa köşeyi ÖZGÜN köşeye en yakın
kesişim belirler; kalanlar kopar, çünkü tek köşe hepsinin doğrusunda birden
duramaz.

⚠️ Köşede kopan biri varsa, KISALAN kazanan komşu da yerinde bırakılır. Köşeyi
izleseydi eski köşeden geri çekilir ve orada kalan duvarı havada bırakırdı; yan
odanın çevrimi kopar, oda dolgusu ve etiketiyle kaybolurdu. Yerinde kalınca tam
boyunu korur, taşınan duvarın yeni ucu GÖVDESİNE denk gelir ve K24 oradan böler.

Pratikte: taşınan duvara DİK komşular gelir, ONUNLA AYNI HİZADAKİLER kopar.
Yan yana üç odada ortanın üst duvarı kaldırılınca bölme duvarları uzar, sol ve
sağ odanın üst duvarları yerinde kalır — kullanıcının dokunmadığı odaların
geometrisi artık bozulmuyor.

**İkinci ölçüt: KISALAN paralel komşu da yerinde bırakılır** — ama yalnız o
köşede kopan başka bir duvar varsa.

İlk sürümde ölçüt tek başına paralellikti ve yön asimetrisi doğurdu: duvar
YUKARI taşınınca bölme uzuyor, eski köşe onun gövdesinde kalıyor ve K24 orada T
kuruyordu (3 oda ayakta). AŞAĞI çekilince bölme KISALIYOR, köşeden geri
çekiliyor ve klonu havada bırakıyordu — yan odanın üst duvarı hiçbir şeye
bağlanamıyor, çevrim kopuyor ve üç oda birden düşüyordu (kullanıcı bildirimi).

Kısalan komşu yerinde bırakılınca tam boyunu koruyor, taşınan duvarın yeni ucu
onun GÖVDESİNE denk geliyor ve K24 oradan bölüyor: hem yan oda hem taşınan
duvarın odası kapanıyor.

⚠️ "Köşede kopan var mı" koşulu şart: kapalı bir dikdörtgenin üst duvarını
içeri çekerken yan duvarlar da kısalır ama orada kopan kimse yok. Koşulsuz
uygulansaydı yan duvarlar yerinde kalır ve yukarı taşan güdük parçalar kalırdı.

**Sürükleme ÖNİZLEMESİ de aynı kararı gösterir.** Önizleme (`scene/useArchitectureDraft.ts`)
yalnız nokta havuzunu ötelemekle kalmıyor, kopan komşuları köşenin ÖNİZLEME
KLONUNA bağlıyor. Kopma kararı store yazımıyla AYNI fonksiyondan geliyor
(`planCornerDetachments`), yani ikisi ayrışamaz.

İlk sürümde önizleme yalnız ötelemeyi uyguluyordu ve yalan söylüyordu: komşular
jest boyunca eğilmiş görünüyor, kullanıcı bıraktığında geometri birden başka bir
şeye dönüşüyordu (kullanıcı bildirimi). Duvar çizen HER yer önizlemeden hem
noktayı hem DUVARI okumalı — yalnız noktayı okumak kopmayı göstermez.

⚠️ Önizleme klonlarının id'si NEGATİF ve geçici; store'a asla girmez. Gerçek
id'ler pozitif artan tamsayı olduğu için (KK-6) çakışma imkânsız.

⚠️ **Oda tespiti KULLANILMIYOR.** İlk tasarım komşuları "taşınan duvarla aynı
odayı paylaşıyor mu" diye ayırıyordu; `findRoomFaces` çağırmayı, odasız duvarlar
için ayrı istisna kuralını ve eğik komşularda belirsizliği getiriyordu. Normal
kısıtı gelince ölçüt kendiliğinden geometrik oldu ve bunların hepsi düştü.

⚠️ **Shift'in bu işle ilgisi YOK.** Ara tasarımda kopma Shift'e bağlanmıştı;
Shift `pointerdown`'da zaten "seçime ekle/çıkar" demek (KK-10) ve iki anlam
çakışıyordu. Normale kilitli hareket ana davranış olunca kip kavramı gereksizleşti.

⚠️ Kısıt YALNIZ tek duvar sürüklenirken. Çoklu seçimde blok katı hareket ediyor
ve ortak bir normal yok; orada öteleme serbest, komşular eskisi gibi esner
(`WallGrab.normal === undefined`). Döndürme ve aynalama da kapsam dışı: tek bir
öteleme yönü tanımlamıyorlar, `transformSelectionInDraft` bayrağı yalnız
`kind === 'translate'` iken okuyor.

⚠️ Izgara yapışması kısıtı BOZMAMALI. Eksene paralel duvarda yalnız oynayan
koordinat yuvarlanır; eğik duvarda normal boyunca alınan MESAFE yuvarlanır
(`snapNormalMoveToGrid`). 2B ızgaraya yapıştırmak noktayı kısıt doğrusunun
dışına atardı.

**Oda kimliği eşleştirmesi genişledi (K31 eki).** Kopma + K24 bölmesi sonrası
komşu odanın KAYDI bölünen duvarın iki parçasını birden içeriyor, oysa oda artık
yalnız birini sınırında taşıyor. K31'in TAM KÜME EŞİTLİĞİ tutmuyor, oda "yeni
doğmuş" sayılıyor ve kullanıcının verdiği ad — odaya hiç dokunulmamışken —
siliniyordu (ölçüldü: üç odalı planda her taşımada iki ad kayboluyordu).

`core/roomIdentity.ts` artık iki geçişli: ÖNCE tüm yüzler için tam eşitlik,
SONRA eşleşmeyenler için TAM KAPSAMA + TEK aday — yüzün duvarları bir odanınkinin
alt kümesiyse ve böyle tek bir oda varsa aynı odadır.

⚠️ Bu, K31'in reddettiği "yaklaşık eşleşme" DEĞİL: uydurma bir yüzde eşiği yok,
iki koşul da kesin. Birden çok oda kapsıyorsa hangisi olduğu belirsizdir,
eşleşme yapılmaz ve yüz yeni oda olur. Odanın içinden duvar geçme senaryosu da
bozulmaz: yeni yüzler o duvarı içerir, eski kayıt içermez, kapsama tutmaz.

⚠️ Tam eşitlik geçişi HEPSİ için önce koşmalı; yoksa kapsama araması, kesin
eşleşen bir yüzün odasını çalıp başka yüze verebilir.

**Çizimi yırtan taşıma REDDEDİLİR** (`core/wallMoveValidity.ts` →
`findWallMoveBlocker`). Açıklık reddiyle aynı davranış (K36): `grab` korunur,
duvar imlece yapışık kalır, kullanıcı geçerli bir yere gelip tekrar tıklar.

İki ret sebebi, ikisi de kullanıcı bildirimiyle çıktı:

- **`freeEnd`** — taşınan duvarın ucu hiçbir duvara değmiyor. Köşe komşunun
  GÖVDESİNE denk geldiği sürece K24 orada T kurar ve duvar bağlı kalır; komşunun
  UCUNUN ötesine itilirse değecek gövde kalmaz ve duvar tek ya da çift taraflı
  SERBEST kalır ("köşeleri kopuyor, bağımsız bir duvar haline geliyor").
- **`collapse`** — bir duvar çizilemeyecek kadar kısalıyor. Duvarı komşusunun
  üstüne itmek sıfır boylu duvarlar ve üst üste binen kopyalar üretiyordu; nokta
  id'leri farklı olduğu için yineleme temizliği onları görmüyor, oda çevrimi
  kopuyor ve yan odalar ŞEFFAF DOLGUSU ve ETİKETİYLE birlikte kayboluyordu.

⚠️ İki denetim de "ÖNCEDEN de böyleydi" durumunu geçirir: yarım kalmış zinciri
ya da zaten güdük bir duvarı taşımak yasaklanmamalı. Kural YENİ bir kopma veya
çökme yaratmayı engelliyor, var olanı düzeltmeyi değil.

⚠️ Denetim JESTTE (`useWallSelectionTool`), store action'ında değil. `moveWall`
ve `transformSelection` ilkel kalır — K36 ile aynı ayrım.

Önizleme, denetim ve store yazımı AYNI simülasyondan geçer (`applyWallMove` +
`planCornerDetachments`). Üçü ayrı hesaplasaydı ekranda görülen, reddedilen ve
yazılan geometri birbirini tutmazdı.

⚠️ Klonlar özgün koordinatta doğuyor, kopma taşımadan ÖNCE yapılıyor. Yer
değişmezse iki köşe üst üste kalır ve `splitWallsAtIntersections` onları anında
geri birleştirir (K24) — kopma boşa gider.

⚠️ Klon eski köşede kaldığından çoğu zaman komşunun GÖVDESİNE denk gelir ve K24
orada T birleşimi kurar; yan odanın çevrimi böyle kapanıyor. Garanti değil —
klon hiçbir gövdeye denk gelmezse o oda düşer. Bilinen sınır.

**Oda KAYDI her zaman yüzle birebir tutulur.** `recomputeRoomsInDraft`'in
"hiçbir şey değişmediyse yazma" kestirmesi yalnız kimliğe ve sıraya bakıyordu.
Duvar bölününce `extendRoomsWithSplitPieces` iki parçayı da odanın kaydına
ekliyor; oda parçalardan yalnız birini sınırında taşıyorsa kayıt yüzün ÜST
KÜMESİ oluyor. Oda sayısı ve sırası değişmediği için kestirme yazmadan çıkıyor
ve bayat kayıt kalıyordu.

⚠️ Bunun sonucu STORE'DA değil ÇİZİMDE görünüyordu: `Room.tsx` yüzü odayla TAM
KÜME eşitliğiyle eşleştiriyor, tutmayınca `if (!room) return []` ile yüzü hiç
çizmiyor. Oda ölmüyor, GÖRÜNMEZ oluyordu — kullanıcı "odaların tanımı, şeffaf
dolgusu ve etiketi kayboluyor" diye bildirdi. Kestirme artık duvar kümesini de
karşılaştırıyor.

⚠️ Ders: oda sayısını, alanını ve adını doğrulayan testler bunu KAÇIRDI —
üçü de doğruydu. Kaydın İÇERİĞİNİN yüzle birebir olması ayrıca sınanmalı,
çünkü çizim ona bağlı.

Duvar kimliği korunuyor (yalnız `p1Id`/`p2Id` yeniden bağlanıyor), dolayısıyla
kopan duvarın üstündeki açıklıklar ve odanın kimliği bozulmuyor.

Tarayıcıda doğrulandı: üç odalı planda orta üst duvar ÇAPRAZ sürüklendi (110 px
sağa + 100 px yukarı); duvar yalnız dikeyde 100 cm ilerledi, `x` kıpırdamadı,
sol ve sağ odanın üst duvarları yerinde kaldı, iki klon doğdu, üç oda da ayakta.

`.claude/CLAUDE.md`'deki "Duvar ortak `Point` havuzunu paylaşır" sözleşmesi
geçerli; bu karar o havuzun bir köşesinin İKİYE AYRILABİLECEĞİNİ ekliyor.

## 2026-08 · Taşımanın bıraktığı artık düğümler

### K104 — Taşıma sonrası eş doğrultulu parçalar birleşir, çakışan köşeler kaynar

Duvar her taşındığında komşu kenar yeni köşede bölünüyor (K24, doğru davranış).
Ama bir sonraki taşımada önceki bölme noktası geride kalıyordu: kullanıcı duvarı
her oynattığında komşu kenar bir parça daha artıyor, düğümler birikiyordu
(kullanıcı bildirimi).

Üç ayrı sebep vardı, üçü de düzeltildi:

**1. Aynı kesişimi isteyen komşular boşuna koparılıyordu.** Bölünmüş kenarın iki
parçası eş doğrultulu olduğu için aynı noktayı istiyor — ortak köşe ikisini birden
karşılıyor. "Kazananı seç, ötekini kopar" kuralı her harekette bir artık düğüm
bırakıyordu. `planWallOffset` artık kesişimi kazananınkiyle AYNI olan komşuyu
koparmıyor.

**2. Artık ara düğümler temizleniyor** (`store/architectureWallMerge.ts` →
`mergeCollinearWallsInDraft`): bir köşede YALNIZ iki duvar buluşuyor ve ikisi de
aynı doğrultudaysa tek duvara birleşiyorlar. Küçük id kazanır (K34 kuralı),
kaybedenin açıklıkları kazanana taşınır ve offset kazananın YENİ p1'ine göre
yeniden hesaplanır (K10).

⚠️ Kalınlığı veya yüksekliği FARKLI iki duvar birleştirilmez: kullanıcının
bilerek koyduğu bir ayrım olabilir.

⚠️ Yalnız TAŞIMA yolunda çağrılır. `splitWallsAtIntersections`'a konsaydı
"bölünme geri birleşmez" sözleşmesi (knowledge/wall-graph.md) her yerde
değişirdi; burada temizlenen yalnız taşımanın kendi ürettiği artık.

**3. Çakışan köşeler kaynıyor** (`mergeCoincidentPointsInDraft`). Duvar eski
yerine geri getirildiğinde kopmuş köşe klonunun ÜSTÜNE geliyor. Aynı yerdeki iki
`Point` grafı kopuk bırakır (K24 ilkesi) ve aralarında sıfır boylu bir parça
kalırdı. `mergePointInto` kaynatmayı, sıfır boy ve yinelenen duvarların elenmesini
birlikte yapıyor.

Tarayıcıda doğrulandı (üç oda: Y, X, Z; X'in üst duvarı):

| adım | bölme parça sayısı |
|---|---|
| başlangıç | 1 |
| aşağı ×3 (−50, −30, −20) | 2 (birikseydi 4 olurdu) |
| yukarı +100, başa dönüş | **1** |

Üç odanın adı (Y, X, Z) her adımda korundu.

## 2026-08 · Geçersiz taşımada duvarın davranışı

### K105 — Duvar geçersiz konuma HİÇ gitmez, son geçerli yerinde durur

Geçersiz taşıma zaten reddediliyordu (K103: `freeEnd` / `collapse`). Ama ret
yalnız BIRAKIŞTA uygulanıyordu; sürükleme boyunca duvar imleci geçersiz bölgeye
kadar izliyor, orada kopmuş hâli gösteriyor ve bırakışta geri atıyordu.
Kullanıcı çizimin yırtıldığını sanıyor, üstelik duvarı hiçbir yere
bırakamıyordu (kullanıcı bildirimi).

Artık geçerlilik HER `pointermove`'da sınanıyor: geçersizse öteleme
GÜNCELLENMİYOR, duvar son geçerli konumunda kalıyor — fiziksel bir engele
dayanmış gibi. Geri atma yok, kopmuş görüntü yok.

⚠️ Açıklık reddi (K36) eski davranışında kaldı: orada engel konumun kendisinde
ve "biraz daha ilerlet, sığar" mantığı geçerli, imlece yapışmak yardımcı oluyor.
Burada engel YÖNÜN kendisinde — yapışkanlık yalnız kullanıcıyı kilitliyordu.

Ölçüldü (X'in sol-üst duvarı sola çekilirken; solda Y'nin üst duvarı kısalıyor):

| imleç | duvarın gittiği |
|---|---|
| −150 … −300 | takip ediyor |
| −350 | durdu |
| −400 | durdu |

Bırakışta duvar son geçerli konumuna yerleşti, üç oda korundu.

⚠️ Sürükleme hesabı `scene/wallDragDelta.ts`'e çıktı: `useWallSelectionTool`
200 satır sınırını aşmıştı. Davranış değişmedi.

⚠️ Geçerlilik artık kare başına sınanıyor. Maliyet duvar sayısında doğrusal
(`applyWallMove` + uç başına `isEndAttached`); çizim ölçeğinde ölçülebilir bir
etkisi görülmedi, ama plan çok büyürse ilk bakılacak yer burasıdır.

## 2026-08 · Oda adı duvar oynatınca kayboluyordu

### K106 — Kimlik eşleştirmesi ÇİFT YÖNLÜ kapsama; ad ve id oda var oldukça korunur

Kullanıcı bir odaya "X" dedikten sonra duvarlarla oynadıkça ad varsayılana
dönüyor ve odanın id'si değişiyordu — oda hiç yok olmadığı hâlde.

Sebep: taşıma, odanın sınırındaki duvar SAYISINI iki yönde de değiştirebiliyor.

- **Kayıt yüzden GENİŞ kalır** (K103): bölünen duvarın iki parçası da kayda
  ekleniyor ama oda yalnız birini sınırında taşıyor.
- **Yüz kayıttan GENİŞ olur** (bu karar): komşu odanın duvarı kopup bölününce
  artan parça bu odanın sınırına giriyor.

İlk düzeltme yalnız BİRİNCİ yönü kapsıyordu (yüz ⊆ kayıt). Ölçüldü: üç odalı
planda X'in üst duvarı iki kez oynatıldıktan sonra X ile Y'nin PAYLAŞTIĞI duvar
taşınınca X'in üst duvarı kopup bölünüyor ve artan parça Y'nin yüzüne giriyor —
yüz kaydın üst kümesi oluyor, eşleşme tutmuyor, Y yeni oda sayılıyordu.

Kapsama artık ÇİFT YÖNLÜ: yüz odanın alt kümesi YA DA üst kümesiyse ve böyle
TEK bir oda varsa aynı odadır.

⚠️ Bu hâlâ K31'in reddettiği "yaklaşık eşleşme" DEĞİL: uydurma bir yüzde eşiği
yok, iki koşul da kesin — bir yönde TAM kapsama ve TEK aday. Birden çok oda
kapsıyorsa hangisi olduğu belirsizdir, eşleşme yapılmaz.

⚠️ K31'in asıl senaryosu KORUNUR: odanın içinden duvar geçince yeni yüzler o
duvarı içerir, eski kayıt içermez ve yüz eski kaydın tamamını da kapsamaz —
hiçbir yönde kapsama tutmaz, iki YENİ oda doğar. Ayrı testle kilitlendi.

Ölçüm: üç odalı planda on iki ardışık duvar taşıması boyunca üç odanın da id'si
ve kullanıcının verdiği adı (Y, X, Z) hiç değişmedi.

### K107 — Taşıma denetimi ARA duruma değil GERÇEK sonuca bakar

Kullanıcı bildirimi: çıkıntılı bir odanın (üç oda: Y | X | Z, X'in üstü 200 cm
yukarıda) üst duvarı komşularının hizasına GETİRİLEMİYORDU. Köşeden çekince
oluyor, duvarı sürükleyince olmuyordu — hareket kısıtlanmış hissettiriyordu.

Sebep: `findWallMoveBlocker` temizlik ÖNCESİ ara duruma bakıyordu. Duvar hizaya
oturunca X'i yukarı taşıyan iki çıkıntı duvarı sıfır boya iniyor ve denetim
bunu `collapse` sayıyordu. Oysa `offsetWall` hemen ardından kaynatmayı
çalıştırıp o duvarları temizliyor ve çizim düzgün kalıyor. Yani denetim,
store'un ASLA YAZMADIĞI bir hâl yüzünden meşru bir hareketi reddediyordu.

Ölçüldü (tam hiza = 200 aşağı): `offsetWall` doğrudan çağrıldığında duvar 12→10,
nokta 10→8, **oda 3→3**, 1 cm'den kısa duvar 0, kopma yok. Engel yalnız
denetimdeydi. Reddedilen bant tam hizanın ±1 cm'i (`MIN_WALL_LENGTH_CM`).

Düzeltme: öteleme boru hattı TEK gövdeye alındı — `runWallOffsetInDraft`
(`store/architectureWallMoveValidity.ts`): geometri → köşe kaynatma → açıklık
budama → kavşak bölme → eş doğrultulu birleştirme → oda hesabı. `offsetWall`
bunu store'a yazmak için, `findWallMoveBlocker` ise ATILABİLİR bir kopyada
denemek için çağırır. Tek gövde olması şart: denetim başka bir sıra izleseydi
kabul ettiği çizim ile yazılan çizim yine ayrışırdı.

Sorular artık sonuca sorulur:
- `collapse`: temizlikten SAĞ ÇIKAN, 1 cm'den kısa duvar var.
- `freeEnd`: taşınan duvarın bir ucu hiçbir duvara değmiyor.
- `roomLost`: var olan bir oda yok oldu (YENİ) — duvarı komşusunun üstüne
  itmek çevrimi koparıyor, yan oda dolgusuyla ve etiketiyle kayboluyordu. Eski
  `collapse` kuralının koruduğu asıl zarar buydu; artık doğrudan ölçülüyor.

⚠️ Serbest uç ODA KAYBINDAN ÖNCE sorulur: duvarı havada bırakan taşıma çevrimi
de kopardığı için ikisi birden doğru çıkıyor, kullanıcıya sebebi bildiren asıl
kusur serbest uç — oda kaybı onun sonucu.

⚠️ Kopya ÖĞE ÖĞE alınır, yalnız diziler değil: `applyWallOffsetInDraft` nokta
koordinatını, `mergeCollinearWallsInDraft` duvar ucunu ve açıklık offset'ini
YERİNDE değiştiriyor. Sığ dizi kopyası bırakılsaydı denetim hiç onaylanmamış
bir hareketi gerçek store'a yazardı.

⚠️ Önizleme (`core/wallMoveDraft.ts` → `applyWallMove`) temizliği KOŞTURMAZ,
yalnız geometriyi üretir; adı bu yüzden `wallMoveValidity` değil artık ve
çıktısı geçerlilik kararına dayanak OLAMAZ. Görüntüyü bozmuyor: sıfır boya inen
duvar kapsül üretmediği için zaten çizilmiyor.

⚠️ 0 ile 1 cm arasındaki "kıymık" bant hâlâ reddedilir — o boyda duvar temizlikten
sağ çıkar ve çizilemeyecek kadar kısadır. Izgara açıkken erişilemez, sorun değil.

⚠️ `roomLost` oda SAYISINA bakar, KİMLİĞE değil. İlk hâli id karşılaştırıyordu
ve meşru hareketleri reddediyordu: taşıma bir odanın duvar kümesini yeterince
değiştirdiğinde K106'nın eşleştirmesi tutmuyor, oda AYNI YERDE dururken yeni bir
id alıyor. Paylaşılan duvarı olan iki odada (alt oda x=0..350, üst oda
x=100..500, ortak kenar y=250) duvar HİÇBİR yöne oynatılamaz olmuştu; ölçüldü:
id [12,20] → [12,25] ama oda sayısı 2 → 2, yani iki oda da yaşıyordu
(kullanıcı bildirimi). Sayının ARTMASI serbest — duvarı odanın içinden geçirmek
çevrimi ikiye böler, bu kullanıcının kendi kararıdır (K31).

### K108 — Açıklık ve sembol de ÖNİZLEME duvarından çözülür

Kullanıcı bildirimi: duvar sürüklenirken YAN duvarlardaki kapı/pencereler
eğiliyor, bırakınca doğru hâline dönüyordu. Duvarların kendisi doğruydu —
yalnız açıklıklar oynuyordu.

Sebep: `ArchitectureLayer.tsx` → `Openings` noktaları ÖNİZLEMEDEN
(`useArchitecturePoints`), duvarları ise STORE'dan okuyordu. Kopan komşu
önizlemede köşe klonuna bağlanır ama store'daki hâli hâlâ ÖZGÜN köşeye bakar —
ve o köşe draft'ta taşınmıştır. Açıklık böylece taşınan köşeye uzanan HAYALİ bir
duvara oturup jest boyunca eğiliyordu. Bırakınca store bağlantısı düzeliyor ve
açıklık yerine oturuyordu; kullanıcının gördüğü "zıplama" buydu.

Bu, K103'te duvarlar için düzeltilen hatanın açıklıklarda kalan artığı:
`useArchitectureDraft`'in kendi başlığı zaten "duvar ÇİZEN her yer bunu
kullanmalı, yalnız noktayı okumak kopmayı görmez" diyor. `Openings` ve
`PointSymbols` bu kurala uymuyordu.

Düzeltme: ikisi de `useArchitectureDraft()` ile hem noktayı hem DUVARI
önizlemeden alır. `useArchitecturePoints` geriye yalnız `PointHandle`'da kaldı —
orası yalnız nokta çiziyor, duvar bağlantısı okumuyor, doğru kullanım.

⚠️ Test `useArchitectureDraft.test.ts`'te veri düzeyinde kilitlendi (aynı
açıklığın konturu önizleme duvarıyla DEĞİŞMEZ, store duvarıyla değişir). Sahne
bileşenini render eden bir test YOK: biri `Openings`'i tekrar store duvarına
bağlarsa süit bunu yakalamaz.

## 2026-08 · Kayıt geçmişi bağlandı

### K109 — Sürüm listesi gerçek uca bağlandı; düğmenin ALTINDAN açılır, sürüm seçmek çizimi YÜKLER

K90 "Kayıt Geçmişi" düğmesini görünür ama pasif bırakmıştı: arkasında akış
yoktu. Akış artık var — cadapi `ProjectVersionsController` üç ucu da veriyor
(`newversion`, `versions`, `projectversions/{id}/get`) ve frontend API katmanı
(`getProjectVersions` / `loadProjectVersion`) zaten yazılıydı, hiçbir yerden
çağrılmıyordu. Bu iş yalnız arayüzü ve bağlamayı ekledi.

**Liste düğmenin altından açılıyor, yandan kayan panel DEĞİL.** İlk uygulama
özellik paneliyle aynı aileden bir yan paneldi; referans arayüz (WebCAD,
"Düzenle ▸ Kayıt Geçmişi") açılır liste gösteriyor ve kullanıcı onu istedi.
Yan panel ayrıca özellik paneliyle aynı sağ yuvayı paylaşıyordu — ikisinden
birini gizlemek gerekiyordu, açılır listede o sorun hiç doğmuyor. Satır biçimi
referanstan: `17 Ağu - 14:13 | test1`.

**Salt okunur liste seçilmedi.** Sürüm listesini gösterip yüklememek, düğmenin
pratik faydasını sıfıra indiriyordu: kullanıcı geçmişe kaydettiği bir çizime
dönemiyorsa geçmişin ekranda olması bilgi değil süs.

**Onay YALNIZ kaydedilmemiş değişiklik varken sorulur.** Temizken kaybedilecek
bir şey yok, aynı çizim sunucuda duruyor. Kirliyken şart, çünkü yükleme
`cadStore.loadProject`ten geçiyor ve o geri al geçmişini de sıfırlıyor
("yükleme bir düzenleme değil, yeni bir başlangıç") — kullanıcı sorulmadan
yüklerse çizimini Ctrl+Z ile geri getiremez.

**Yüklü sürüm de tıklanabilir kaldı.** Pasifleştirilseydi "kaydedilmemiş
değişiklikleri at, son kayda dön" hareketinin karşılığı kalmazdı; rozet
(`Yüklü` + `aria-current`) hangisinin açık olduğunu zaten söylüyor.

**"Farklı Kaydet" aynı turda aktifleşti** (Dosya menüsü + Ctrl+Shift+S). Uçtaki
her yazma zaten yeni ve değişmez bir kayıt doğuruyor; ayıran tek şey `label`.
Etiket olmadan liste yalnız tarih gösterirdi ve geçmişin okunurluğu buna bağlı.
Etiket ZORUNLU: boş bırakılabilseydi düğme düz "Kaydet"in ikizi olurdu.

**Açık sürümün kimliği artık durumun parçası.** `loadLatestProjectVersion`
`{ versionId, data }` döndürüyor, `useProjectPersistence.currentVersionId` hem
"Yüklü" rozetini hem listenin tazelenmesini sürüyor — kaydetme yeni bir kimlik
doğuruyor, panel de onu görünce listeyi yeniden çekiyor. Alternatif (react-query
+ invalidate) reddedildi: sorgu önbelleği editörde hiç kullanılmıyor ve
kaydetme yolunun ayrıca invalidate etmesi gerekirdi.

⚠️ Sürüm yükleme de `activeLoad` sahipliğinden geçiyor. Store'u dolduran her yol
aynı kapıdan geçmeli; yoksa proje değişince iptal edilemeyen ikinci bir yazar
kalır — knowledge/persistence.md'deki "bütün projeler tek çizime yakınsıyordu"
hatasının aynısı. Yan etki olarak: açılış yüklemesi hata verip kaydetmeyi
kilitlediyse, geçmişten sürüm yüklemek kilidi AÇAR (projenin sunucudaki çizimi
artık biliniyor).

⚠️ Tarih `new Date(...)` ile ayrıştırılmıyor. Uç `DateTime` döndürüyor
(`CreatedAt = DateTime.UtcNow`) ve .NET dilim eki yazmıyor; düz ayrıştırmada
değer YEREL saat sayılır ve UTC+3'te her kayıt üç saat geride görünürdü.
`api/serverTimestamp.ts → parseServerTimestampMs` bu tuzağı zaten belgeliyordu.

⚠️ Açık/kapalı durumu `VersionHistoryMenu`'nün içinde; MenuBar yalnız veri
kaynağını (`versionHistory`) TAŞIYOR. Dışarı tıklama kapsamı düğmeyi de
içeriyor, yoksa `pointerdown` kapatır ve düğmenin `click`'i yeniden açardı.

Liste DTO'su kullanıcı adı taşımıyor (`CreatedByUserId` yansımıyor), bu yüzden
satırda tarih + etiketten fazlası YOK. "Kim kaydetti" istenirse önce uç
değişmeli — uydurulmadı.

## 2026-08 · Çıkışta kaydedilmemiş değişiklik uyarısı

### K110 — Uyarı İKİ ayrı mekanizmayla; biri ötekinin yerini tutmuyor

Ürün kuralı tek cümle ("kaydedilmemiş değişiklik varsa kullanıcı uyarılır") ama
editörden iki farklı şekilde çıkılıyor ve tek bir kanca ikisini birden
yakalamıyor:

- **Sekme kapatma / yenileme / adres çubuğu** → `beforeunload`
  (`useUnsavedChangesWarning`). Tarayıcı kendi genel sorusunu sorar; özel metin
  yazılmıyor çünkü tarayıcılar onu yok sayıyor.
- **"← Projeler" / Dosya ▸ Kapat** → editörün kendi onay penceresi. `beforeunload`
  burada HİÇ tetiklenmez: yalnız belge boşaltılırken çalışıyor, React Router
  gezinmesi belgeyi boşaltmıyor.

`useBlocker` kullanılamadı — router `BrowserRouter`, veri router'ı değil. Bu bir
kayıp değil: editörden çıkışın tek yolu "Projeler"/"Kapat" ve o eylem zaten tek
yerde toplanmış (`useCloseEditor`, KK-10.3).

⚠️ **Bu son cümle YANLIŞTI ve K112 onu düzeltti:** tarayıcının GERİ tuşu da bir
çıkış yolu ve uyarısız çıkıyordu.

**Dinleyici yalnız kirliyken kuruluyor.** Sürekli kayıtlı bir `beforeunload`
bazı tarayıcılarda geri-ileri önbelleğini (bfcache) devre dışı bırakıyor; ayrıca
temiz projeden çıkarken soru sordurma riski taşıyor.

**Pencerede üç seçenek var, iki değil:** Vazgeç / Kaydetmeden Çık /
**Kaydet ve Çık**. Üçüncüsü olmasaydı kullanıcı pencereyi kapatıp Kaydet'e
basmak ve çıkışı tekrarlamak zorundaydı — uyarının amacı işi kurtarmak,
kullanıcıyı geri yollamak değil. "Kaydet ve Çık" YALNIZ sunucu kaydı kabul
edince çıkıyor; başarısız kayıtta çıkılsaydı kurtarılmaya çalışılan iş tam da
orada kaybolurdu. Hata pencerenin İÇİNDE gösteriliyor, üst bardaki şerit
pencerenin arkasında kalıyor.

**Temizken soru sorulmaz.** Her çıkışta pencere açmak uyarıyı gürültüye çevirir
ve kullanıcı okumadan kapatmayı öğrenir. Kirlilik ölçütü içerik karşılaştırması
(K94), sayaç değil — "çiz + Ctrl+Z" yapan kullanıcı çıkarken uyarı almıyor.

⚠️ Akış `EditorPage`'in içinde bırakılmadı (`useEditorExit`): orada kalsaydı
dallanmayı sınamak için tüm R3F sahnesini kurmak gerekirdi.

⚠️ Penceredeki hata `hasSaveFailed` ile kapılı. `useProjectPersistence.error`
daha eski bir yükleme hatasını da taşıyabiliyor ve pencere açılır açılmaz
alakasız bir uyarı göstermek soruyu bulandırırdı.


### K111 — Dosya menüsü YALNIZ dosya işleri; üst barda karşılığı olan madde menüde tekrarlanmaz

Dosya menüsü 14 maddeye çıkmıştı ve dördü üst bardaki düğmelerin kopyasıydı.
Aynı işi iki yerde sunmak, kullanıcıya ikisinin FARKLI şeyler yaptığını
düşündürüyor — "Kapat" ile "← Projeler" ya da "Proje Hareketleri" ile "Kayıt
Geçmişi" arasındaki farkı arayan kullanıcı, olmayan bir ayrımı arıyor.

Menüden KALKAN dört madde ve gittiği yer:
- `Kapat` → soldaki "← Projeler" düğmesi (ikisi de `onCloseEditor` çağırıyordu)
- `Gönder` → sağdaki "Gönder" düğmesi
- `Proje Hareketleri` → sağdaki "Kayıt Geçmişi" (K109'da gerçek uca bağlandı)
- `Proje Bilgileri` → sahne değiştiricinin YANINA, çerçevesinin DIŞINA bir ikon
  düğmesi. Proje künyesi bir "dosya işlemi" değil, her an bakılacak bilgi.

Kalan on madde beş öbeğe bölündü (aç/kaydet · JSON · PDF · proje dosyası ·
temizle). Düz bir on dörtlük liste maddeleri eşit ağırlıkta gösteriyordu.

⚠️ `Proje Dosyasını Aç/İndir`, `İçe/Dışa Aktar`ın KOPYASI DEĞİL: ikincisi JSON,
birincisi henüz kararlaşmamış başka bir biçim için ayrılmış. Ayrım etikete
yazıldı ("İçe Aktar (JSON)"), yoksa sonraki gözden geçiren onları kopya sanıp
siler.

⚠️ `Farklı Kaydet` KALDI. Bu temizliğin ilk analizi ESKİ main üzerinde yapılmış
ve maddeyi "ölü" saymıştı; oysa K-sürüm işinde arkasına etiketli kayıt akışı
bağlanmış. Menü temizliği yaparken maddenin pasif görünmesi yetmez, üretimdeki
hâline bakılmalı.

**Projeyi Temizle** pasiflikten çıkıp çalışır hâle geldi
(`cadStore.clearProjectDrawing` + `ClearProjectDialog`). Menüdeki tek yıkıcı
madde olduğu için kendi öbeğinde ve EN SONDA duruyor.

Davranışı `resetProject`ten üç noktada AYRI, üçü de bilerek:
- **Kat yapısı KALIR**, katlar boşalır. Kullanıcı katları tek tek kurmuş olabilir.
- **Geçmiş SIFIRLANMAZ**: temizlemek bir düzenlemedir, yeni başlangıç değil —
  tek Ctrl+Z çizimi geri getirir.
- **Kirli işaret DURUR** (`markDirty`): `savedContent` tazelenseydi kullanıcı
  çıkarken uyarılmaz ve işini sessizce kaybederdi.

⚠️ `nextUniqueId` geri alınmaz: silinen id'ler yeniden üretilirse geri alma
sonrası iki nesne aynı id'yi taşır (knowledge/id-scheme.md).

⚠️ Araçlar menüsü bu temizliğin DIŞINDA kaldı. Dokuz maddesinin altısı tesisat
toplu işlemi, yani fay C'nin kararı. Kalan ikisi (Mahalleri Tanımla, Malzeme
Listesi) silinecek madde değil YAZILACAK özellik — menü onlar için ayakta duruyor.

### K112 — Router veri router'ına taşındı; uyarıyı açan şey DÜĞME değil durdurulmuş GEZİNME

K110 uyarıyı "Projeler"/"Kapat" eylemine bağlamıştı. Kullanıcı bildirdi:
**tarayıcının geri tuşu uyarı vermeden çıkıyordu.** İki sebebi vardı ve ikisi de
K110'un varsayımındaydı:

- `beforeunload` yalnız belge boşaltılırken çalışıyor; geri tuşu SPA içinde
  belgeyi boşaltmadan rota değiştiriyor, oradan hiç geçmiyor.
- Uyarı düğmeye bağlıydı, geri tuşu ise düğmeye uğramıyor.

Gezinmeyi durdurabilen tek yer router. `useBlocker` de yalnız VERİ router'ında
çalışıyor, bu yüzden `src/app/router.tsx` `BrowserRouter`'dan
`createBrowserRouter` + `RouterProvider`'a taşındı. Göç dar tutuldu: rota ağacı
JSX olarak duruyor (`createRoutesFromElements` aynı ağacı okuyor), yollar ve
sıralama yorumları değişmedi; tek yapısal fark `<Routes>`i saran `<Suspense>`in
artık kök rotanın elemanı olması (`SuspenseLayout`).

Kazanç sadece geri tuşu değil: **çıkışın tek kapısı** oldu. Düğme, menü,
geri/ileri ve ileride eklenecek her uygulama içi bağlantı aynı engelden geçiyor;
"yeni bir çıkış yolu eklendi ama uyarı yazılmadı" hatası artık mümkün değil.
`useCloseEditor` sade gezinme olarak kaldı — onay eklenirse aynı soru iki
yerden sorulurdu.

⚠️ `useEditorExit` React Router'ın `Blocker` tipine bağlanmadı, kendi
`ExitBlocker` arayüzünü alıyor: bağlansaydı dallanmayı sınamak için testte tüm
rota ağacını kurmak gerekirdi.

⚠️ `AppRouter` hiçbir testte render edilmiyordu; göç ancak tarayıcıda fark
edilirdi. Bir duman testi eklendi (`src/app/__tests__/AppRouter.test.tsx`):
oturumsuz kullanıcı korumalı yoldan giriş ekranına düşüyor mu.

⚠️ Bilinen uç durum: engel `RequireAuth`'un 401 yönlendirmesini de durduruyor.
Oturumu düşen kullanıcı kirli çizimle pencereyi görür ve "Kaydet ve Çık" da 401
alır; çıkış yolu var ("Kaydetmeden Çık"), kilitlenme değil.

## 2026-08 · Proje firması alanlarının sadeleşmesi

### K113 — Seri No, Yeter No ve Gsm KALKTI

Liste ekranından üç sütun (`Seri No`, `Yeter No`, `Gsm`), formlardan iki alan
(`serialNumber`, `qualificationNumber`) silindi.

Üç sütun da HER SATIRDA "-" gösteriyordu: seri no ve Gsm yalnız detay
yanıtında vardı, yeterlik numarasının uçta hiç karşılığı yoktu. Hep boş bir
sütun, tabloyu geniş tutmaktan (`min-w-320` → `min-w-240`) başka bir iş
görmüyordu.

`serialNumber` isteğe artık HİÇ eklenmiyor — `null` gönderilmiyor, anahtar
yazılmıyor. Seri no üzerine kurulu istemci taraflı benzersizlik ön kontrolü de
kalktı; geriye yalnız vergi numarası kontrolü kaldı.

"Yeterlilik No" ile birlikte yetki kaydındaki İKİ NUMARA sorunu da bitti
(api-eksikleri-proje-firmalari.md → S1 KAPANDI): kayıt artık sunucunun tanıdığı
tek numarayı taşıyor, `certificateNumber`. Alan zorunluydu ve sunucuda evi
olmadığı için kullanıcının girdiği veri HER kayıtta sessizce kayboluyordu.

⚠️ `accountingCode` (Cari Kodu) AYRI bir alandır ve KALDI. Seri no ile
karıştırılmamalı — ikisi de "kod" gibi okunuyor.

### K114 — Şahıs / tüzel ayrımı gövdeye kadar iniyor; maskeli T.C. yüklenmiyor

Şahıs firması (`companyType = 1`) artık destekleniyor. §10 kuralı:

- `companyType = 1` → `nationalIdNumber` zorunlu, `taxNumber` **null**
- `companyType = 2` → `taxNumber` zorunlu (10 VEYA 11 hane), `nationalIdNumber` **null**

T.C. doğrulaması İSTEMCİDE de yapılıyor (`core/nationalId.ts`): 11 hane, ilk
hane ≠ 0, 10. ve 11. hane sağlaması. Yalnız hane sayısına bakılsaydı
"11111111111" geçer ve sunucudan 400 dönerdi. Hane sayısı tutup sağlaması
tutmayan numara AYRI mesaj alıyor — "11 haneli olmalıdır", 11 hane yazmış
kullanıcıya bir şey söylemiyor.

Seçim değişince kapanan alan hem EKRANDAN hem GÖVDEDEN temizleniyor. İki yerde
birden yapılıyor çünkü tek noktaya güvenmek kırılgan: formdaki temizlik ekran
için, `toProjectFirmPayload`'daki güvence için. Gizli ama dolu kalan alan
sunucudan 400 döndürüyor.

409 = aynı T.C. ile kayıtlı şahıs firması var. Mesaj ayırt edilebilir ve
SİLİNMİŞ firmanın da numarayı rezerve tuttuğunu SÖYLÜYOR — yoksa kullanıcı
listede arayıp bulamaz ve hatayı anlamsız sanardı. Hata genel şeride değil
ALAN hatasına çevriliyor: çakışan şey belli bir alan.

⚠️ **`GET /api/projectfirms/{id}` `nationalIdNumber`'ı MASKELİ döndürüyor**
("*******1234") ve maskeli metin geri gönderilemez: şahısta sağlamayı
tutturmaz, tüzelde "boş olmalı" kuralını çiğner — iki yönde de 400. Değer forma
YÜKLENMİYOR; yüklemek, maskeli değerin gövdeye ulaşabildiği tek yoldu.
Yüklememek hatayı yapısal olarak imkânsız kılıyor. Boşluğun sebebi alanın
altında yazıyor, yoksa "veri kayboldu" diye okunurdu.

Kişi Bilgileri ekranına da T.C. alanı eklendi (aynı koşullu kurallarla): o ekran
firma gövdesini OKUNAN kayıttan kuruyordu, yani şahıs firmasının her kaydı 400
alıyordu ve ekranda girdi bile yoktu.

### K115 — Hata kontrolleri: sekiz kural yazıldı, ikisi VERİSİ OLMADIĞI İÇİN yazılmadı

`core/validate.ts` ilk commit'ten beri boştu ve üst bardaki "Hata Kontrolleri"
düğmesi K79 gereği pasif duruyordu ("0 hata" yazmak, çalıştırılmamış bir
kontrolü geçmiş gibi gösterirdi). `hata-kontrol.docx` on kural tarif etti;
**sekizi yazıldı, ikisi bilerek YAZILMADI.**

**Yazılanlar** (kural kimlikleri `VALIDATION_RULE_IDS`): kat başına mimari ve
tesisat planı (Hata1), kapılardan erişilemeyen mahal (Hata2), cihazda eksik
marka/model (Hata4), mahal dışında kalan cihaz (Hata5), yakıcı cihazla
sonlandırılmamış gaz hattı (Hata6), sayaçta eksik birim/abone no (Hata7),
mahal içinde biten baca (Hata9), cihazlı mahalde atmosfere açılan menfezin
yokluğu (Hata10).

**Yazılmayanlar:**

- **Hata3 (uygun olmayan mahale cihaz).** `Room`'un TİPİ yok — yalnız serbest
  metin `name` var, varsayılanı `'Oda'`. Cihaz ↔ mahal uygunluk tablosu da
  yok; dokümanın kendisi "mahal listesi çok fazla olduğu için tek tek
  belirtilmemiştir" diyor. Mahal tipini uydurup tablo yazmak, denetlediğini
  sanan ama uydurma bir sınıflandırmaya bakan bir kural üretirdi.
- **Hata8 (kolon projesinde topraklanma).** Asıl engel modelde: **"topraklanma"
  diye bir nesne YOK**. En yakını `insulation.isGrounded`, ki o izolasyon
  nesnesinin bir alanı — "topraklama eklenmiş mi" sorusunun cevabı değil.
  Proje TİPİ ikincil bir engel ve AŞILABİLİR: `GET /api/projects/{id}`
  yanıtı 2026-08-16 envanterine göre `projectTypeName` taşıyor, arayüzün zod
  şeması onu okumuyor (`ProjectServerFields` on alanda duruyor) ve editör zaten
  proje detayını hiç çekmiyor. Yani bu ayak sunucu eksiği değil, bağlanmamış
  bir alan — ama tipin GÖRÜNEN ADI mı yoksa KODU mu geldiği (`projectTypeName`
  ↔ liste ucundaki `projectType` kodu) netleşmeden "kolon projesi" karşılaştırması
  yazılamaz.

İkisi de `docs/api-eksikleri-hata-kontrol.md`'de yazılı; kural kimliği bile
açılmadı ki liste "bu kural çalıştı ve temiz çıktı" izlenimi vermesin.

**Türetilen ortak kavramlar.** Dört kural aynı iki soruyu soruyor: "bu nokta
hangi mahalde" ve "bu duvarın öbür yüzü dışarısı mı". İkisi de yüz taramasından
(`findRoomFaces`) türüyor, bu yüzden tarama kural başına tekrarlanmıyor:
`core/roomTopology.ts` kat başına BİR kez kurulur ve iki kural dosyasına da
verilir. "Menfez atmosfere çıkar" bunun üstünde tek satır: menfezin durduğu
duvar en fazla BİR mahali sınırlıyorsa öbür yüzü dışarısıdır — dokümandaki iki
görselin farkı tam olarak bu.

**Kapı erişimi GRAF olarak okundu** (`core/roomAccess.ts`): "her mahalin bir
kapısı olsun" değil, "dışarıdan kapılarla ulaşılabilsin". Kapısı yalnız kapısız
bir odaya açılan mahal de erişilemez sayılır. Normal bir dairede ikisi aynı
sonucu verir. ⚠️ Kat dışarıya açılan tek bir kapı bile taşımıyorsa bütün
mahalleri erişilemez çıkar — merdiven boşluğunun ayrı çizilmediği üst kat
planlarında beklenen davranış bu olmayabilir, analist onayına AÇIK.

**Sonuç YAŞAYAN bir değer değil, bir ÇALIŞTIRMANIN çıktısı.** Denetim çizim her
değiştiğinde değil, liste AÇIKKEN çalışır (`useProjectValidation`): tarama kat
başına yüz taraması yapıyor, duvar sürüklenirken her karede tekrarlanamaz.
Tazeleme render sırasında hesaplamayla değil ABONELİKLE geliyor — doğrulamanın
girdisi React'in görmediği bir dış kaynak (store anlık görüntüsü) ve render'da
çağrılsaydı derleyici onu girdisiz bir sabit sanıp dondururdu. Düğme sayıyı
ancak TAZE bir sonuç varken gösterir.

**"göster" üç şeyi birden yapar** çünkü üçü olmadan hata görünmüyor: kata geç,
nesneyi seç, kamerayı oraya taşı. Kamera ayağı `uiStore.pendingFocusBounds` →
`scene/ViewportFocus.tsx` üzerinden: zoom/pan hâlâ kamerada yaşıyor, store'da
duran şey görüntü değil DOM'dan verilmiş tek seferlik bir emir ve sahne onu
uygular uygulamaz siliyor (silinmezse aynı hataya ikinci kez basmak hiçbir şey
yapmazdı). Hedef görünümü de taşıyor: mimari hata tesisat görünümündeyken
bulunabiliyor ve iki panel ayrı seçim store'una abone.

**"Test Et" ve "Gönder" PASİF KALDI.** Doküman yalnız hata kontrolleri ekranını
tarif ediyor; "Test Et"in ne yaptığı yazılı değil ve aynı işi yapan ikinci bir
düğme uydurmak K79'un tam tersi olurdu. "Gönder"in artık bir sebebi var (hatalar
giderilmeden proje onaya gidemez) ama onaya gönderme akışı — eksik evrak yanıtı
dahil — proje listesi ekranında yaşıyor (`useProjectActions`); editöre taşınması
ayrı bir adım.

### K116 — Mahalin kullanım tipi eklendi; ad ve tip AYRI durur, mahal ADSIZ doğar

Talep dokümanı madde 104 her mahal için "kullanım tipi (mutfak, salon…)"
istiyor. Referans WebCAD'de karşılığı **yok**: oradaki `Room` yalnız
`{ id, pointIds, label, labelPos, measuredArea, centralVentilation,
topSideOpenable }` taşıyor. Ekran görüntülerindeki **"Tanımsız" bir tip değil**,
boş `label`'ın arayüzdeki karşılığı — bunu doğrulamak listenin referanstan
kopyalanamayacağını gösterdi.

**`Room.usageType` opsiyonel, göç yok.** `AreaObject.axisId` ile birebir aynı
gerekçe: bu karardan önce çizilmiş mahallerde alan hiç yok ve
`docs/sample-project.json` bit-bit turu bozulmamalı. Alanın yokluğu "tip
belirtilmemiş" demek, listedeki bir değere denk düşmüyor — bu yüzden
`setRoomUsageType(id, undefined)` alanı boş bir değere ayarlamaz, `delete` eder
ve `toRoomJson` da onu dosyaya hiç yazmaz. İki taraf aynı şeyi söylemeli.

**Ad ve tip ikisi birden durur.** Tip kuralların baktığı sınıflandırma ("Yatak
Odası"), ad kullanıcının planda okumak istediği şey ("1 nolu daire mutfağı").
Tip adın yerine geçseydi aynı tipteki iki mahal planda ayırt edilemezdi.
Etiket sırası tek bir yerde (`core/roomUsage.ts` → `getRoomDisplayName`):
**ad → kullanım tipinin adı → "Tanımsız"**. Hata kontrollerindeki "Mahal: X"
satırı da aynı fonksiyondan geçiyor — kullanıcı listede okuduğu adı planda
arayacak, iki yerde farklı metin görmemeli.

**Mahal artık ADSIZ doğuyor** (`DEFAULT_ROOM_NAME` = `''`, eskiden `'Oda'`).
Zorunlu bir sonuç: sabit bir ad hep dolu olsaydı etiket tipe hiç düşemez,
"Tanımsız" da hiç görünmezdi. Buna bağlı olarak **boş ad artık REDDEDİLMİYOR** —
adı temizlemek, etiketi tipe düşürmenin tek yolu. `renameRoomInDraft`'ın
"boş ad reddedilir" kuralı bu yüzden kalktı; "aynı adı yeniden yazma" kuralı
(geçmişe boş adım eklememek için) DURUYOR.

**`reconcileRooms` tipi de korumak zorunda.** Duvar taşınınca oda yeniden
eşleştiriliyor ve kayıt alan alan yeniden kuruluyordu; `usageType` eklenmeseydi
kullanıcı duvara her dokunduğunda mahalin tipi sessizce silinirdi — adın K31'de
yaşadığı hatanın aynısı. Alanlar tek tek yazılıyor (`...existing` değil) ki
yüzden gelen taze `wallIds` eskisiyle ezilmesin.

**Liste TASLAK.** On beş tip (`ROOM_USAGE_TYPES`) doğalgaz tesisat planının
ihtiyaç duyduğu mahallerden yazıldı, analist onayı BEKLİYOR. Üstüne kural
yazılmadı: "hangi cihaz hangi mahale konabilir" ayrı bir tablo ve o tablo hâlâ
yok (bkz. `docs/api-eksikleri-hata-kontrol.md`, Hata3). Yani K115'te
açılmayan Hata3 bu adımda da AÇILMADI — tipin gelmesi kuralın yarısı.

**Kapsam dışı bırakılanlar.** `centralVentilation` / `topSideOpenable` (K32'nin
ertelediği, artık vadesi gelmiş iki alan) ve `Opening`'in WebCAD'deki rol
alanları (`entrance`, `buildingEntrance`, `boilerRoom`, `apartmentNumber`) bu
MR'a girmedi. İkisi de model sözleşmesini ayrıca açıyor ve farklı kuralları
besliyor; özellikle kapı rol alanları K115'in açık bıraktığı "dışarıdan erişim"
sorusunu çözebilir — giriş kapısı işaretli olsaydı graf tohumu tahmine
dayanmazdı.

**Düzenleme kutusu** `RoomNameEditor` → `RoomDefinitionEditor` oldu ve artık ad
+ tip alıyor. Ad taslakta bekler (her tuş ayrı bir Ctrl+Z adımı olmasın), TİP
seçilir seçilmez yazılır: açılır listede tek bir seçim zaten bitmiş bir karar.
⚠️ Dışarı tıklama kapsamı METİN ALANINDAN KUTUNUN TAMAMINA genişletildi —
yakalama fazındaki `pointerdown` yalnız input'u sayıyordu ve açılır listeye
tıklamak kutuyu kapatırdı.

### K117 — Mahal SEÇİLİR ve panelden tanımlanır; serbest metin ad KALKTI

K116 "ad ve tip birlikte dursun" demişti. Kullanıcı ekranda görünce kararı
değiştirdi: **kullanıcı kendi metnini yazmayacak, hazır etiketlerden seçecek**
ve tanımlama sahnedeki kutuda değil **sağdaki özellik panelinde** yapılacak.

**`Room.name` MODELDEN KALKTI.** Yazılabilir tek yol kaldırılınca alanın kaynağı
kalmıyordu; yazılamayan bir alan zamanla çürür. Etiketin tek kaynağı artık
`usageType`: `getRoomDisplayName(usageType)` → tipin adı, yoksa "Tanımsız".
`docs/sample-project.json`'da hiç oda yok, yani bit-bit turu etkilenmedi; eski
kayıtlarda kalan `name` anahtarını zod sessizce düşürür, dosyalar açılmaya
devam eder.

**Mahal artık SEÇİLEBİLİR bir tür** (`SelectableKind` → `'room'`), ama seçim
`resolveArchitectureTarget` zincirine GİRMEDİ. İki gerekçe:

1. Zincir her hover'da çalışıyor; mahal orada olsaydı **her fare hareketinde yüz
   taraması** yapılırdı (`findRoomFaces` grafi geziyor).
2. Mahal ekranın büyük bir bölümünü kaplıyor. Zincire girseydi mahalin içinden
   **çerçeve seçimi başlatmak imkânsız** olurdu — basış hep mahalin olurdu.

Bunun yerine seçim, `useSelectionTool`'un zaten var olan **"boşluğa tıklama"**
dalına takıldı: sürükleme eşiğin altında kaldıysa ve nokta bir yüzün içindeyse
seçim temizlenmez, o mahal seçilir. Yüz taraması yalnız tıklama anında yapılır,
jest sahipliği hiç değişmez.

⚠️ **`pruneSelection`'ın son satırı bir tuzaktı.** `return symbols.some(...)`
"geri kalan her şey sembol" anlamına geliyordu; `room` oraya düşüp sembol
id'leriyle karşılaştırılınca seçim **anında ve sessizce** siliniyordu. Her tür
artık AÇIKÇA soruluyor.

**Mahal silinemez ve dönüştürülemez.** Duvarların çevrelediği alanın türevi,
kendi başına bir nesne değil — silmek isteyen duvarı siler. Panel bu yüzden
mahalde hem "Sil" düğmesini hem grup dönüşümlerini gizliyor
(`PropertyPanelShell.isDeletable`). `deleteSelectionFromDraft` zaten mahal
tanımıyor ve yalnız mahal seçiliyken `false` dönüyor, yani kısayol da güvenli.

**Sahne içi düzenleme kutusu SİLİNDİ** (`RoomDefinitionEditor`,
`useRoomNameTool`, `architectureUiStore.editingRoomId`, `findRoomLabelAt`
korumaları). Tanımın tek yeri panel; iki giriş noktası bırakmak, hangisinin
doğru olduğunu sormaya davet ederdi. `core/roomLabel.ts`'teki
`isPointInRoomLabel`/`getRoomLabelBounds` da sahipsiz kaldı ama SİLİNMEDİ —
etiket vuruş testi ileride geri gerekebilir, bugün çağıranı yok.

Seçili mahal dolgusunu **seçim rengine** çevirir: mahalin gövdesi yok, geri
bildirimi verecek tek yüzey dolgu.

Panelde alan (m²) SALT OKUNUR gösteriliyor — geometri duvarların türevi, bir
sayı yazarak değiştirilemez; ama tipi seçerken bakılan ilk şey mahalin
büyüklüğü.

⚠️ "Tip seçilmedi" için ayrı sentinel (`'none'`) gerekti: `PropertySelectField`
boş string'i ÇOKLU SEÇİMDE AYRIŞAN değer olarak kullanıyor. İkisi aynı değeri
verseydi "hepsi tipsiz" ile "hepsi farklı tipte" ekranda aynı görünürdü.

Liste hâlâ TASLAK ve Hata3 hâlâ AÇILMADI — uygunluk tablosu gelmedi.

### K118 — Özellik panelinin seçim alanı native `<select>` DEĞİL; liste HER ZAMAN aşağı açılır

Mahal kullanım tipi listesi (15 seçenek) bazen yukarı doğru açılıyordu ve
kullanıcı bunu "garip bir görüntü" olarak bildirdi. Native `<select>`'te açılır
listenin yönü **tarayıcının kararı**: Chrome seçili maddeyi denetimin yakınında
tutmaya çalışır ve liste uzunsa yukarı taşar. CSS, öznitelik ya da başka bir
işaretleme bunu değiştirmez — bu yüzden alan özel bir listbox'a dönüştü.

**Değişen yer paylaşılan bileşen** (`PropertySelectField`), mahale özel bir
kopya DEĞİL. Sekiz tüketicisi var ve aynı sorun boru çapı listesinde (9
seçenek) de vardı; ikinci bir uygulama, aynı şeyin iki yerde ayrışması demekti.
Prop imzası korundu, hiçbir çağıran değişmedi.

**Liste PORTAL ile `body`'ye çiziliyor.** Panelin içerik alanı
`overflow-y-auto` (`PropertyPanelShell`) ve mutlak konumlanan bir kutu orada
KIRPILIRDI. Konum tetikleyicinin ekran dikdörtgeninden geldiği için
`position: fixed`; panel ya da pencere kaydırılınca liste KAPANIR — bayat bir
konumda asılı kalan kutu, kapanmasından daha kötü.

**Yön hiçbir koşulda ters çevrilmiyor.** Aşağıda yer yetmezse liste kısalır ve
içi kayar (`MIN_LIST_HEIGHT_PX` 96, tavan 280). "Yer yoksa yukarı aç" davranışı
bilerek YOK: kullanıcının şikâyeti tam olarak öngörülemez yöndü.

⚠️ **Konum EMİR KİPİYLE yazılıyor** (`useLayoutEffect` + `list.style.top = …`),
JSX inline stiliyle değil: değerler `getBoundingClientRect`'ten gelen çalışma
zamanı pikselleri, Tailwind sınıfıyla ifade edilemez ve inline stil repo
kuralınca yasak. Sahnedeki imleç atamalarıyla (`domElement.style.cursor`) aynı
kaçış. `useLayoutEffect` şart — boyamadan önce yazılmazsa liste bir kare yanlış
yerde görünür.

⚠️ **Seçenek `pointerdown` ile commit ediliyor, `click` ile değil.** Dışarı-tık
dinleyicisi de `pointerdown` üzerinde ve click'ten önce çalışıp listeyi
kapatıyordu; seçim hiç gerçekleşmiyordu.

Erişilebilirlik: tetikleyici `role="combobox"` + `aria-expanded`/`aria-controls`
/`aria-activedescendant`, liste `role="listbox"`, maddeler `role="option"` +
`aria-selected`. Odak tetikleyicide KALIR (roving focus yerine
`aria-activedescendant`) — Esc/seçim sonrası odağı geri taşımak gerekmiyor.
Klavye: ↓/Enter/Space açar, ↑↓/Home/End gezer, Enter seçer, Esc commit ETMEDEN
kapatır.

Testler `user.selectOptions` kullanamaz oldu (o yalnız native `<select>`te
çalışır); etkilenen tek dosya `RoomProperties.test.tsx` idi ve bileşenin kendi
testi eklendi (`PropertySelectField.test.tsx`).

### K119 — Cihaz KOLU ve refakatçi vanası cihazla birlikte silinir

Yakıcı cihaz `nearestLine` ile konunca iki ek nesne doğuyor: cihazı boruya
bağlayan **kol** (`applianceStub`) ve kolun boruya değdiği düğüme oturan
**otomatik vana**. Cihaz silinince ikisi de geride kalıyordu — ekranda sahipsiz
kırmızı kesikli bir parça ve boru ucunda anlamsız bir vana (kullanıcı bildirimi,
2026-08-20).

**Kol, borudan farklı bir kategoridir.** `dischargeLinks.ts`'in zaten yazdığı
ayrım burada da geçerli: bir eleman silinince ona bağlı BORU kalır (boru
bağımsız bir varlık, ucu serbestleşir), ama baca/havalandırma kanalı cihazın
EKLENTİSİDİR ve sahipsiz kalırsa yeniden bağlanamaz. Kol tam olarak aynı
kategoride, üstelik daha keskin: **araç paletinde bile yok**, yalnız yerleştirme
sırasında otomatik doğuyor, yani kullanıcı onu elle yeniden çizemez.

Bu yüzden ikinci bir toplayıcı yazmak yerine mevcut olan genelleştirildi:
`dischargeLinks.ts` → **`attachmentLinks.ts`**,
`collectDischargeLineIdsForElements` → `collectAttachmentLineIdsForElements`.
Gerekçe ortak olduğu için iki kopya zamanla ayrışırdı.

⚠️ **Vana kolun ÜSTÜNDE DEĞİL.** `placeElementWithStub` onu ANA BORUNUN uç
düğümüne yazıyor (`endPoint.inlineElementId`), çünkü vana boruda olmalı (K15).
`applyRemoval`'ın "silinen hattın üstündeki armatürler de gider" kuralı bu
yüzden onu GÖRMÜYOR — ayrı bir toplayıcı gerekti
(`collectCompanionValveIdsForLines`). Kolun `{kind:'line'}` bağlantısı hangi
noktaya tutunduğunu söylüyor, vana o noktada.

Toplayıcı YALNIZ otomatik vanayı alır (`ATTACHED_VALVE_TYPE`): kullanıcı o
düğüme başka bir armatür (filtre kiti, izolasyon…) koyduysa o kendi başına bir
karardır, cihazla birlikte silinmez.

Sayaç yolu (`placeElementAtLineEnd`) bu sorunu HİÇ taşımıyor: bağlantıyı hattın
KENDİ ucuna yazıyor ve ayrı bir kol üretmiyor.

Test `placeElementWithStub`'ın ürettiği durumu birebir kurup `removeElements`
çağırıyor — varsayılan bir şekil değil, gerçek yerleştirmenin çıktısı
(`plumbing/store/__tests__/applianceRemoval.test.ts`). Geri alma tesisatın
KENDİ aynasından (`undoPlumbing`), cadStore'un zundo'sundan değil.
---

### K120 — İzometrik görünüm: WebCAD'in izdüşümü AYNALANARAK alındı, kamera yönü olarak yazıldı

**Karar.** İzometrik görünüm, referans uygulamanın (WebCAD) izdüşüm matrisiyle
birebir aynı açı ailesini kullanır — `M(α, β) = Rx(α) · Ry(β)` — ama sonuç ayrı
bir 2B izdüşüm olarak DEĞİL, ortografik kameranın yönü olarak uygulanır.

**Varsayılan açı WebCAD'inkinden farklı** (kullanıcı kararı): onunki 40°/60°
(dimetrik), bizimki gerçek izometri atan(1/√2) = 35,264° / 45° — üç eksen eşit
kısalır, eksenler yatayla 30° yapar. Hazır açılar yalnız **Varsayılan** ve
**Üstten**; yan görünümler (önden/sağdan/soldan) kaldırıldı çünkü α = 0'da
zemin düzlemi kenardan görünüp tüm kat yerleşimi tek çizgiye çöküyor ve o iş
zaten plan görünümünün.

**Neden matris değil kamera.** Ortografik kamerada "noktaları elle izdüşürmek"
ile "kamerayı o yöne çevirmek" aynı görüntüyü verir. Kamera yolu seçildi çünkü
sahne o zaman gerçek derinlik testiyle çizilir: üst kat alt katı ÖRTER. Elle
izdüşümde derinlik yok, sıralamayı biz uydurmak zorunda kalırdık.

**Neden aynalı.** WebCAD'in tuval çerçevesi SOL ELLİ: x doğuya, y AŞAĞI (hem
kotta hem plan y'sinde — EaselJS tuval düzeni), z güneye. Bizim three uzayımız
sağ elli. Matris satırları olduğu gibi kamera bazı olarak alınınca kamera yerin
ALTINDA kalıyor: kot ekranda yukarı gidiyor ama derinlik ters dönüyor ve alt kat
üst katı örtüyor. Doğrusu `right = −satır1`, `up = −satır2`, `forward = −satır3`;
sonuç WebCAD çıktısının yatay aynası. Fiziksel olarak doğru olan bu, çünkü bizim
plan +y'miz onların y'sinin tersi. İki aday sayısal olarak karşılaştırılıp
seçildi ve testle sabitlendi (`kamera her zaman YUKARIDA durur`).

**Yan sonuç.** `Rx(α)·Ry(β)`'nın 1. satırı yapı gereği `(cosβ, 0, −sinβ)`, yani
y bileşeni her zaman sıfır: kot ekseni HER açıda ekranda tam dikey kalır.
İzometrik çizimin temel şartı, ücretsiz geldi.

Nerede: `src/isometric/core/isometricProjection.ts`, `scene/IsometricCamera.tsx`.

---

### K121 — İzometriğe özel elle yerleştirmeler AYRI alanlarda; plan çizimi hiç değişmez

**Karar.** İzometrikte üst üste binen dalları ayırmak ve etiketleri açmak için
model üç OPSİYONEL alan aldı: `InstallationLinePoint.isometricOffsetCm` +
`inheritedIsometricOffsetCm`, `InstallationElement`/`InstallationLine`
üstünde `isometricLabelOffsetCm`. WebCAD karşılıkları `isometricPositionRel` /
`formerIsometricPositionRel` / `labelPositionIsometry`.

**Neden iki ayrı kaydırma alanı.** Kullanıcı bir noktayı sürüklediğinde dalın
TAMAMI kaymalı, ama sonradan o dalın içindeki tek bir nokta daha
sürüklenebilmeli. Tek alanda toplansaydı ikisi ayırt edilemezdi. Yayılım kuralı:
sürüklenen nokta kendi kaymasını, ondan SONRAKİLER mirası alır, öncekiler
dokunulmaz. `izometrik_ornek.wcp`'de 54 noktanın 24'ü birebir aynı miras
değerini taşıyor — tek bir sürüklemenin izi, kuralın imzası.

**Neden plandan ayrı.** Aynı etiket iki görünümde farklı yerde durmalı:
izometride kalabalığı açmak plandaki yerleşimi bozmamalı. Bu yüzden
`labelOffsetCm` ile `isometricLabelOffsetCm` AYRI action'lara sahip.

**Neden hepsi opsiyonel.** `docs/sample-project.json` bit-bit round-trip kabul
testi. `undefined` alan serileştirmeye yazılmaz, zod `.default()` VERMEZ ve
sıfıra dönen kayma alanı SİLİNİR — "yokluk, sıfır DEĞİLDİR". `axisId` /
`labelOffsetCm` / `meterOrder` ile aynı gerekçe.

Nerede: `src/plumbing/core/installationModel.ts`, `plumbingSerialize.ts`,
`src/isometric/core/isometricOffset.ts`.

---

### K122 — α/β projeye yazılır ama projeyi KİRLETMEZ

**Karar.** İzometrik bakış açısı `cadStore`'da yaşar ve proje JSON'una girer
(WebCAD de `isometric: {alpha, beta}` olarak saklıyor), ama `PersistedContent`'e
GİRMEZ: açıyı oynatmak "kaydedilmemiş değişiklik" uyarısı üretmez ve geri alma
geçmişine düşmez.

**Neden.** K3'ün "zoom/pan/araç/görünüm projeyi kirletmez" garantisi ile
kullanıcının "açımı kaydet" beklentisi çatışıyordu. `activeFloorId` zaten tam
olarak böyle davranıyor — JSON'a giriyor, kirli işaretine girmiyor — ve
`store/persistedContent.ts` açık bir İZİN LİSTESİ olduğu için muafiyet
kendiliğinden geldi. Ayrıca alan varsayılana (40/60) EŞİTKEN hiç yazılmaz:
yazılsaydı açıya hiç dokunulmamış eski bir kayıt açılıp kaydedilince yeni bir
anahtar kazanır ve bit-bit testi kırılırdı.

Nerede: `src/isometric/store/isometricSlice.ts`, `src/store/cadStore.ts`,
`src/core/serialize.ts`.

---

### K123 — İzometrikte geri al TESİSAT geçmişine gider

**Karar.** `activeViewHistory.ts`'in "izometrikte düzenleme yok, proje geçmişi
varsayılan olarak kalır" varsayımı KALKTI. İzometrik artık tesisat aynasını
(`plumbingHistory`) kullanır, tesisat görünümüyle aynı dalda.

**Neden.** İzometrikteki her düzenleme — dal ayırma, etiket taşıma, izometrik
konumları sıfırlama — `installationLines`/`installationElements` üstünde
çalışıyor ve `plumbingSlice` üzerinden kaydediliyor. Proje geçmişine bağlı
kalsaydı izometrikte Ctrl+Z kullanıcının en son çizdiği DUVARI geri alırdı.

Nerede: `src/store/activeViewHistory.ts`.

---

### K124 — İzometrik yalnız tesisatı çizer; `layers.ts` orada geçersiz

**Karar.** İzometrik görünüm mimariyi (duvar/oda/açıklık) HİÇ çizmez, yalnız
tesisatı çizer — ama TÜM katları aynı anda, tek parça olarak. Aktif kat kavramı
yoktur. `src/scene/layers.ts` ve `RENDER_ORDER` bu görünümde kullanılmaz.

**Neden mimari yok.** Gerçek doğalgaz izometriğinde duvar çizilmez; kullanıcı
kararı da bu yönde. Kapsül duvar shader'ı zaten yalnız plan görünümü için
(K23 sonuçları: "3B/izometrik ayrı extrude geometri yolundan gidecek").

**Neden `layers.ts` geçersiz.** O tablo tepeden bakan ortografik kameranın
z-fighting çözümü ve mikro yükseklik farklarına dayanıyor (`WALL_ELEVATION_CM`
0, `HANDLE_ELEVATION_CM` 0.3). İzometrikte o mikro farklar GÖRÜNÜR hâle gelir.
Derinlik gerçek geometriyle (silindir/küre gövde + `depthTest`) çözülür.

**Kamera tekliği.** İzometrikte plan kamerası, `ViewportControls` ve `Grid` hiç
mount EDİLMEZ: iki kamera da `makeDefault` yazıyor, birlikte mount edilseler
hangisinin kazandığı mount sırasına kalırdı. `CAMERA_HEIGHT_CM` de kullanılmaz —
o sabit drei `<Line worldUnits>` shader'ına bağlı ve yalnız plan kamerasının
sözleşmesi.

Nerede: `src/scene/SceneRoot.tsx`, `src/isometric/scene/`.

---

### K125 — Klavyeyle boru çizimi: tuş ekseni kilitler, sayı yazar

**Karar.** Aktif bir boru taslağı varken ok tuşları X/Y eksenini, `+`/`-` ise
kot yönünü **kilitler** ve ekrana tek bir sayısal kutu getirir
(`DraftKeyboardInput`). Tuşun kendisi boru YAZMAZ — kullanıcı uzunluğu (ya da
kot farkını) yazıp Enter'a basar. Esc yalnız kutuyu kapatır, çizim sürer.

**Neden kutu, neden tek tuşla adım değil.** Boru bir uzunluk ister; tekrarlı
tuş basışıyla ızgara adımı ötelemek hem yavaş hem de "250 cm" gibi kesin bir
değeri veremez. Kot akışıyla (`+`/`-`) simetrik tek desen kaldı.

**Ekranda yukarı = plan +Y.** Kamera X'te −90° dönük ortografik tepe kamera, yani
three −Z ↔ plan +Y. Tuş ↔ eksen tablosu SADECE `core/draftKeyboard.ts`'te.

**`+` iki `key` üretir.** Klavye düzenine göre `'+'` (Shift'li) ya da `'='`;
`-`/`_` de öyle. Üçü de kabul edilmezse tuş kullanıcının klavyesinde sessizce
"çalışmıyor" görünür.

Nerede: `src/plumbing/core/draftKeyboard.ts`,
`src/plumbing/ui/DraftKeyboardInput.tsx`, `src/plumbing/scene/useLineTool.ts`.

---

### K126 — Klavyeden kat değiştirme TÜMÜYLE kalktı

**Karar.** PageUp/PageDown ve ok tuşlarıyla komşu kata geçiş, ok tuşuyla MANUEL
kat bağlama (`floorLinkActions.commitDraftFloorLink`) ve onun yarım bağlantı
durumu (`plumbingUiStore.pendingFloorLink`) kaldırıldı. Kat yalnız yüzen
çubuğun ▲/▼ düğmelerinden ve kat seçicisinden değişir.

**Neden.** Ok tuşları çizime geçti (K125); aynı tuşun iki işe binmesi zaten
K105/K106'da guard'larla yamanan karışıklığın kaynağıydı. Tek tuş = tek anlam.

**`FloorPipeLink` DURUYOR.** Tek üreticisi kaldı: kot aktif katın tavanını
aşınca `pipeElevationActions.crossFloorsWithOverflow`'un otomatik geçişi (K104).
`FloorLinkGlyph`, `getFloorLinkAnchoredPointIds` ve çapa kuralları aynen geçerli.

**Kot kutusu artık FARK istiyor.** `commitDraftElevationTo(mutlak)` yerine
`commitDraftElevationBy(fark)`: yön basılan tuşta olduğu için mutlak hedef
istenseydi tuşun işareti anlamsız kalırdı.

Nerede: `src/pages/useEditorShortcuts.ts`,
`src/plumbing/scene/useLineTool.ts`, `src/plumbing/store/pipeElevationActions.ts`.

---

### K127 — Adımın tek yazım yolu + Z düğümü halkası

**Karar (yazım).** Bir boru adımını yazan tek fonksiyon
`store/lineStepActions.ts` → `commitDraftStep(point, endTarget)`. Fare
(`useLineTool.commitStep`) ve klavye (`commitDraftAxisLength`) oradan geçer;
iki çağıran ayrı yazsaydı kot/çap/bağlantı alanlarından biri er geç birinde
unutulurdu. Klavye adımı BİLEREK snap ARAMAZ: yazılan sayı kesindir, en yakın
porta çekilseydi girilen uzunluk tutmazdı.

**Karar (işaret).** Dikey hareketin yapıldığı ya da yapılacağı düğüm, ekran
boyunda sabit mor bir halkayla İÇİNE ALINIR (`scene/ElevationNodeRing.tsx`).
İki yerde çizilir: yerleşmiş saf dikey segment (`PipeElevationGlyph`) ve `+`/`-`
ile kutusu açılmış taslağın ucu. Planda dikey boru tek nokta gibi göründüğü
için kullanıcı o düğümü gözle bulamıyordu. Renk kat bağlantı rozetiyle AYNI mor
(`ELEVATION_INK`) — ikisi de "burada düşey bir şey oluyor" diyor.

**`setDraftLine(null)` kutuyu da kapatır.** Tek invariant store'da: kapanış
yollarının hepsi (Esc, sağ tık, hedefe bağlanarak bitme, araç değişimi) ayrı
ayrı hatırlamak zorunda kalmasın.

Nerede: `src/plumbing/store/lineStepActions.ts`,
`src/plumbing/scene/ElevationNodeRing.tsx`, `src/plumbing/store/plumbingUiStore.ts`.

---

### K128 — "Boy" düzenlemesi ucundaki ağı rijit öteler

**Karar.** Özellik panelindeki **Boy (cm)** alanı borunun bitiş ucunu kaydırınca,
o ucun ötesindeki her şey aynı kaymayla ötelenir: dirsek, üstündeki vana, devam
boruları ve onlara bağlı elemanlar. Hiçbiri gerilmez. Bütünüyle ötelenen
boruların kotu da delta kadar kayar.

**Neden.** Eskiden yalnız o köşedeki kaynaklı uçlar taşınıyordu; devam borusu
karşı ucundan tutulu kaldığı için esniyordu. Üstelik yayılım bir port çapasına
değerse işlem TÜMÜYLE reddediliyor, uzunluk hiç değişmiyordu.

**`moveTargets.ts` ile birleştirilmez.** Köşe sürüklemesinde seçim rijit gider,
aradaki borular ESNER ve port çapası yayılımı DURDURUR. Boy düzenlemesinde
boyu değişen boru dışında hiçbir şey esnemez, bu yüzden port çapası yayılımı
DURDURMAZ — durdursaydı elemanın yerinde kalması ağı koparırdı. Kural farklı,
dosya ayrı (`core/resizeTargets.ts`).

**İki durak var.** Boyu değişen hattın öteki noktaları sabittir (çevrimde
borunun kendi başı kaymasın); `FloorPipeLink` ucu taşıyan hat rijit ötelenmez
(K104 — linkin `position`'ı ve karşı kattaki eşi burada kayamaz), o boru esner
ve öteleme orada biter.

Nerede: `src/plumbing/core/resizeTargets.ts`,
`src/plumbing/store/plumbingSlice.ts` → `resizePipeEnd`.

---

### K129 — Kot göstergesi kaybolmaz, köşe köşeye yapışır

**Karar (gösterge).** `PipeElevationGlyph`'in "plan boyu SIFIR, iki noktalı
boru" koşulu kalktı. Tek koşul kaldı: `firstElevationCm !== lastElevationCm`.
İşaret hattın SON noktasında durur — yükselinen kot orada, ve saf dikeyde iki
nokta zaten çakışık olduğu için o durum değişmez.

**Neden.** Kolonun ucu komşu yatay boruya kaynaklı; o boru oynatılınca uç
onunla gidiyor, kolonun iki noktası ayrışıyor ve gösterge kayboluyordu. Oysa
yükseklik farkı hâlâ oradaydı — kullanıcı "yükseklik göstergesi hiç gitmesin"
dedi.

**Karar (yakalama).** Köşe sürüklemesinde `resolveCornerPosition` artık
duvardan ÖNCE `findNearestLineCorner` ile başka bir hat KÖŞESİNE tam oturur.
Segment gövdesi aday değildir; sürüklemeyle birlikte giden noktalar
(`getLinkedLinePoints`, sürükleme başında bir kez hesaplanıp
`CornerDragTracker.linkedPointIds`'te tutulur) elenir — yoksa köşe kendi
kendine yapışırdı. Ctrl yine tüm yakalamayı kapatır.

**Neden duvarın önünde.** Yakın bir duvar yüzü kazansaydı birkaç santimlik bir
kayma kalır ve kolon bir daha tam düşey olmazdı; yükseklik hiçbir zaman
kesinleşmezdi. `useLineTool.resolveSnap`'teki "bağlantı kurmak
konumlandırmadan güçlü bir niyettir" sırasının aynısı.

**Değişmeyen.** `tryStartCornerDrag`'in "saf dikey borunun KENDİ ucu
sürüklenmez" kuralı duruyor: kolon yalnız komşusu üzerinden eğilebiliyor, o da
artık geri oturtulabiliyor.

Nerede: `src/plumbing/core/lineSnap.ts`,
`src/plumbing/scene/useSelectionTool.ts`,
`src/plumbing/scene/InstallationLineMesh.tsx`.

### K130 — Proje firması kullanıcılarında "Aktif" filtresi KALKTI

**Karar.** Liste ekranındaki "Aktif" onay kutusu, `active` adres parametresi,
"Yalnız aktif" çipi ve bunları besleyen `onlyActive` sorgu alanı silindi.
Kayıt üzerindeki `isActive` alanları (`ProjectFirmUserDetail`,
`ProjectFirmUserCompetency`) de kalktı — süzgeç gidince onları okuyan kimse
kalmadı, mock'ta üretilen pasiflik ölü veriydi.

**Neden.** Sunucuda karşılığı YOK ve yakında da olmayacak: `SoftDeleteEntity.IsActive`
global query filter'a bağlı, pasif kayıt sorgudan hiç dönmüyor — KK-4'ün istediği
"pasif kayıtlar da listelensin" davranışı ayrı bir `IsEnabled` kolonu istiyordu
(bkz. docs/api-eksikleri-kullanicilar.md, backend 2026-08-11 yanıtı). Uç
açıldığında çalışmayacak bir kutuyu ekranda tutmak, kullanıcıya var olmayan bir
süzgeç vaat etmekti.

**Gereksinim.** Belgedeki madde 3 ve KK-4 bu kararla GEÇERSİZ. Formdaki "Aktif"
anahtarı (madde 14 / KK-18) zaten daha önce kalkmıştı.

Nerede: `src/ui/admin/projectFirmUsers/`, `src/api/projectFirmUserDto.ts`,
`src/api/projectFirmUsersMock.ts`, `src/ui/admin/adminUrlParams.ts`.

### K131 — Proje firması kullanıcıları listesi `Sourced` zarfına geçti

**Karar.** `getProjectFirmUserList` artık `Sourced<PagedResult<…>>` dönüyor.
Geliştirmede ekranın üstünde KAPATILAMAZ `MockDataNotice` şeridi duruyor;
üretim derlemesinde satırlar hiç kurulmuyor ve tablo yerine
`MissingSourceNotice` (`GET /api/projectfirmusers`) çıkıyor. Poliçe listesiyle
(K51) birebir aynı desen.

**Neden.** Ekran uydurma bir kullanıcı kadrosunu tablo hâlinde, hiçbir uyarı
olmadan gösteriyordu — kayıt/güncelleme formu "sunucuya yazılmadı" diyordu ama
LİSTE susuyordu. `MockDataNotice`'in sözleşmesi zaten mock kapısına bağlı
(K50): şeridi kapısız kullanmak bileşenin kendi notunu yalanlardı.

**Şeritte ne yazıyor.** "Kullanıcı satırları" — satırların FİRMA sütunları
gerçek uçlardan geliyor (`GET /api/gasdistributionfirms`, `GET /api/projectfirms`),
uydurma olan yalnız kullanıcının kendisi. Genel bir "veriler eksik" cümlesi bu
ayrımı söylemezdi.

**Sonradan genişledi (K132).** Detay/güncelleme ve yazma yolu da aynı kapıya
alındı; bölümün tamamı tek kural altında.

Nerede: `src/api/projectFirmUsers.ts`, `src/pages/ProjectFirmUsersPage.tsx`.

### K132 — Kullanıcı bölümünün TAMAMI mock kapısının arkasında

**Karar.** K131'in zarfı bölümün kalanına da uygulandı:

- `getProjectFirmUser` → `Sourced<ProjectFirmUserDetail>`. Geliştirmede form
  `MockDataNotice` şeridiyle açılıyor; üretimde kayıt hiç kurulmuyor ve form
  YERİNE `MissingSourceNotice` (`GET /api/projectfirmusers/{id}`) çıkıyor.
- `saveProjectFirmUser` yazmayı `mockedData`'dan geçiriyor ve
  `{ ok: false, reason: 'unavailable' }` kolu kazandı. Üretimde bellekteki
  depoya kayıt DÜŞMÜYOR; kullanıcı formda kalıyor ve sebebini okuyor.

**Neden.** Doldurulmuş bir form, tablodaki uydurma satırdan daha inandırıcı:
listede "örnek veri" diye bakılan bir kayıt, güncelleme ekranında adı soyadı
telefonu yerli yerinde gerçek bir kişiye benziyordu. Yazma tarafı da aynı
sebeple kapandı — hiçbir yerde gösterilmeyecek bir depoya kayıt eklemek,
kullanıcıya yapılmamış bir işi yapılmış göstermek.

**Neden oluşturma ekranı açık kaldı.** Boş bir form sahte veri GÖSTERMİYOR;
K50'nin yasakladığı şey uydurma değerin gerçek sanılması. Kullanıcı doldurup
"Kaydet"e bastığında üretimde net bir hata alıyor, sessizce başarı değil.

**Bugün ulaşılamayan kollar.** `findTakenProjectFirmUserFields` üretimde boş
depoya bakıp "kullanılmıyor" diyor; sonuç zaten kaydın `unavailable` ile
reddedilmesini değiştirmiyor, bu yüzden ayrı bir kol açılmadı.

Nerede: `src/api/projectFirmUsers.ts`, `src/api/projectFirmUserForm.ts`,
`src/pages/ProjectFirmUserFormPage.tsx`,
`src/ui/admin/projectFirmUsers/useProjectFirmUserForm.ts`.

### K130 — Tesisatta alt kat izi TÜMÜYLE kalktı

**Karar.** `plumbing/scene/InstallationBelowGhost.tsx` silindi. Yanındaki
`INSTALLATION_BELOW_GHOST_ELEVATION_CM` ve `RENDER_ORDER.installationBelowGhost`
de kalktı — bu adlarla yeni kod yazılmaz. Mimarideki `FloorBelowGhost` DURUYOR,
karar yalnız tesisat görünümünü bağlar.

**Neden.** Mimaride alt katın duvar izi hizalamaya yarıyor (üst kat duvarı
alttakinin üstüne oturmalı). Boruda böyle bir kısıt yok: alt kattaki boru üst
katın borusuyla aynı yerden geçmek zorunda değil, dolayısıyla iz referans değil
GÜRÜLTÜ oluyordu — kullanıcı çizim sırasında hangi çizginin aktif kata ait
olduğunu ayırt edemiyordu.

**Neden anahtar değil.** Varsayılanı kapalı bir "Görünüm ▸ Alt kat borusu"
maddesi de düşünüldü; kimsenin açmayacağı bir anahtar için hem menüde bir
satır hem sahnede bir katman taşımak gerekiyordu.

Nerede: `src/scene/SceneRoot.tsx`, `src/scene/layers.ts`,
`src/plumbing/scene/plumbingLayers.ts`.

### K131 — Ölçüler varsayılan AÇIK

**Karar.** `uiStore.isDimensionsVisible` varsayılanı `false` → `true`.

**Neden.** Ölçü, çizimin okunmasının parçası: kullanıcı her oturumda önce
Görünüm ▸ Ölçüler'i açıyordu. `isElementLabelsVisible`'ın (eleman adları) zaten
açık olan varsayılanıyla aynı gerekçe; ikisi arasındaki "ölçü isteğe bağlı bir
kotalama katmanıdır" ayrımı pratikte karşılık bulmadı.

**Değişmeyen.** Bayrak hâlâ TEK (K76 öncesi kural): mimaride duvar parçalarını,
tesisatta boru boylarını açar. Kaydedilmez, geçmişe girmez.

Nerede: `src/store/uiStore.ts`.

### K132 — Boru ölçüleri mimari görünümde de yazılır

**Karar.** `InstallationGhost` (mimari görünümdeki tesisat izi) artık
`LengthLabels`'ı da mount ediyor. Etiket hayaletin aksine SOLUKLAŞTIRILMAZ ve
"Ölçüler" anahtarını aynı yerden okur.

**Neden okunur tonda.** Hattın kendisi bağlam, ölçü ise kullanıcının mimari
planda okumak İSTEDİĞİ bilgi — soluk yazı bu isteği karşılamazdı.

**Neden yalnız uzunluk.** "Uzunluk + çap" (`DN25 · 1,20 m`) değerlendirildi;
çap zaten çizgi renginden (K27) ve özellik panelinden okunuyor, etiketi iki
katına çıkarmak sık köşeli planlarda yazıları üst üste bindiriyordu. Bir boru
iki görünümde de AYNI etiketi taşır.

Nerede: `src/plumbing/scene/Ghosts.tsx`.

### K133 — Kot etiketi: fark + VARILAN kot

**Karar.** `PipeElevationGlyph` `▲0,75 m` yerine `▲0,75 m (+2,00)` yazar.
Ayrıca servis kutusunun çıkış kotu kendi sembolünün ALTINA basılır (`+0,15 m`,
`ServiceBoxElevationLabels`). Kot yazımının tek yolu
`core/lengthFormat.ts` → `formatSignedMeters` / `formatElevationMeters`:
uzunluğun aksine İŞARET taşır, çünkü kot mesafe değil zemine göre yönlü konum.

**Neden iki sayı.** Yalnız fark yazılınca kolonun hangi kota çıktığı ancak
baştaki kot bilinerek hesaplanabiliyordu; yalnız mutlak kot yazılınca K129'un
koruduğu "ne kadar yükseldi" bilgisi kayboluyordu.

**Neden servis kutusu.** Tesisat kotunun BAŞLADIĞI yer orası; kutunun kotu
bilinmeden borudaki farklar neye göre okunacağı belirsiz kalıyordu. Sayaç ve
cihazların kotu bağlı oldukları borudan türüyor (K102) ve her elemana kot
yazmak planı sayıya boğardı — etiket yalnız `serviceBox` türünde.

**"Ölçüler"e bağlı DEĞİL.** K129'un kuralı: kot göstergesi kaybolmaz. Kot
store'da da durmaz, `getElementElevationCm` ile türetilir.

Nerede: `src/core/lengthFormat.ts`, `src/plumbing/core/elementLabel.ts`,
`src/plumbing/scene/PipeElevationGlyph.tsx`,
`src/plumbing/scene/ServiceBoxElevationLabel.tsx`,
`src/plumbing/scene/PlumbingLayer.tsx`.

### K134 — Sayaç etiketinde birim + abone bilgisi

**Karar.** Plan görünümündeki sayaç etiketi artık tür adının altına birim,
abone adı ve abone numarasını yazıyor:

```
Sayaç
Birim: 3
FATMA ÇELİK
Abone No: 10045
```

Alanlar zaten modelde vardı (`GasMeterProperties.unitNumber` /
`.subscriberName` / `.subscriberNo`, özellik panelinde "Birim" / "Abone Adı" /
"Abone No"); etiket onları görmezden geliyordu — `getElementLabelDetails`
`gasMeter` için `{}` dönüyordu.

**Neden iki alan ETİKETLİ.** Alt alta duran `3` ile `10045`'in hangisinin birim
hangisinin abone numarası olduğu okunmuyordu. Abone ADI etiketsiz: bir isim
kendini zaten söylüyor, ön ek satırı boşuna uzatırdı.

**Yapı.** Detay satırları artık sabit şekilli bir nesne
(`{ brand, model, description }`) değil SIRALI bir dizi
(`getElementLabelDetailLines`): türler farklı alan kümesi taşıyabilsin diye.
Diğer türlerin davranışı değişmedi. Boş/boşluk alan satır olarak hâlâ hiç
yazılmıyor.

**Kapsam.** Yalnız PLAN etiketi. İzometriğin sayaç etiketi ayrı ve WebCAD
düzenini izliyor (`isometric/core/isometricLabels.ts` → `Sayaç Daire 3` + sınıf
+ alan + debi), dokunulmadı. Etiketin tutma kutusu (`getElementLabelRectCm`)
aynı metinden ölçtüğü için genişleyen etiket kendiliğinden tutulabilir kalıyor.

Nerede: `src/plumbing/core/elementLabel.ts`.

### K135 — Kot tabanı delince AŞAĞI kata otomatik geçiş

**Karar.** K104'ün "yalnız YUKARI yön otomatik" kapsam sınırı kalktı. Çizim
sırasında `-` ile verilen kot aktif katın TABANININ (0) altına inerse: bu katta
yazılan kot tabanla sınırlanır ve kalan miktar alttaki kata `FloorPipeLink` ile
otomatik taşınır — `capElevationToFloor`/`crossFloorsWithOverflow` çiftinin
aynası olarak `capElevationToFloorBase` (saf+testli) ve
`crossFloorsDownWithUnderflow`.

**Neden.** Kullanıcı bulgusu (2026-08): "boruya `-` yükseklik girince oda
uzunluğundan fazlaysa alt kata inmeli ama inmiyor". K104 yalnız yukarıyı
yazmıştı çünkü o turdaki istek metni yalnız "yeni kata çıksın" diyordu.

**Aynanın TEK asimetrisi.** Yukarı çıkarken yeni kata TABANINDAN (0) girilir;
aşağı inerken TAVANINDAN (`Floor.heightCm`) — üst katın tabanı alttakinin
tavanıdır. Yeni borunun `startHeightCm`i bu yüzden sıfır değil alt katın
yüksekliğidir ve kot aşağı doğru tüketilir.

**Eşik neden parametre değil.** Tavan kata göre değişiyor (`Floor.heightCm`),
taban değişmiyor: her katın tabanı kendi yerel koordinatında sıfırdır (kot
saklanmaz, `core/floorElevation.ts` türetir).

**Sınırda kat açma.** `addFloor({ isBasement: true })` — `addFloor({})` katı HER
ZAMAN dizinin en ÜSTÜNE koyar, bodrum bloğu ise BAŞINDA durur (K106'nın
tuzağının aynısı). Bodrum sınırına (5) ulaşılırsa `addFloor` `undefined` döner
ve döngü sessizce durur; yukarı yöndeki 40 kat sınırıyla aynı stil.

**Değişmeyen.** Tek bir hedef kot ya tavanı aşar ya tabanı deler, ikisi birden
olamaz. Yalnız ÇİZİM SIRASINDA (`commitDraftElevation`) — "Boy" alanından
yeniden boyutlandırma (K128) bu otomasyonu hâlâ tetiklemez. Yalnız `pipe` türü.

Nerede: `src/plumbing/core/lineElevation.ts`,
`src/plumbing/store/pipeElevationActions.ts`.

### K130 — Proje firması kullanıcılarında "Aktif" filtresi KALKTI

**Karar.** Liste ekranındaki "Aktif" onay kutusu, `active` adres parametresi,
"Yalnız aktif" çipi ve bunları besleyen `onlyActive` sorgu alanı silindi.
Kayıt üzerindeki `isActive` alanları (`ProjectFirmUserDetail`,
`ProjectFirmUserCompetency`) de kalktı — süzgeç gidince onları okuyan kimse
kalmadı, mock'ta üretilen pasiflik ölü veriydi.

**Neden.** Sunucuda karşılığı YOK ve yakında da olmayacak: `SoftDeleteEntity.IsActive`
global query filter'a bağlı, pasif kayıt sorgudan hiç dönmüyor — KK-4'ün istediği
"pasif kayıtlar da listelensin" davranışı ayrı bir `IsEnabled` kolonu istiyordu
(bkz. docs/api-eksikleri-kullanicilar.md, backend 2026-08-11 yanıtı). Uç
açıldığında çalışmayacak bir kutuyu ekranda tutmak, kullanıcıya var olmayan bir
süzgeç vaat etmekti.

**Gereksinim.** Belgedeki madde 3 ve KK-4 bu kararla GEÇERSİZ. Formdaki "Aktif"
anahtarı (madde 14 / KK-18) zaten daha önce kalkmıştı.

Nerede: `src/ui/admin/projectFirmUsers/`, `src/api/projectFirmUserDto.ts`,
`src/api/projectFirmUsersMock.ts`, `src/ui/admin/adminUrlParams.ts`.

### K131 — Proje firması kullanıcıları listesi `Sourced` zarfına geçti

**Karar.** `getProjectFirmUserList` artık `Sourced<PagedResult<…>>` dönüyor.
Geliştirmede ekranın üstünde KAPATILAMAZ `MockDataNotice` şeridi duruyor;
üretim derlemesinde satırlar hiç kurulmuyor ve tablo yerine
`MissingSourceNotice` (`GET /api/projectfirmusers`) çıkıyor. Poliçe listesiyle
(K51) birebir aynı desen.

**Neden.** Ekran uydurma bir kullanıcı kadrosunu tablo hâlinde, hiçbir uyarı
olmadan gösteriyordu — kayıt/güncelleme formu "sunucuya yazılmadı" diyordu ama
LİSTE susuyordu. `MockDataNotice`'in sözleşmesi zaten mock kapısına bağlı
(K50): şeridi kapısız kullanmak bileşenin kendi notunu yalanlardı.

**Şeritte ne yazıyor.** "Kullanıcı satırları" — satırların FİRMA sütunları
gerçek uçlardan geliyor (`GET /api/gasdistributionfirms`, `GET /api/projectfirms`),
uydurma olan yalnız kullanıcının kendisi. Genel bir "veriler eksik" cümlesi bu
ayrımı söylemezdi.

**Sonradan genişledi (K132).** Detay/güncelleme ve yazma yolu da aynı kapıya
alındı; bölümün tamamı tek kural altında.

Nerede: `src/api/projectFirmUsers.ts`, `src/pages/ProjectFirmUsersPage.tsx`.

### K132 — Kullanıcı bölümünün TAMAMI mock kapısının arkasında

**Karar.** K131'in zarfı bölümün kalanına da uygulandı:

- `getProjectFirmUser` → `Sourced<ProjectFirmUserDetail>`. Geliştirmede form
  `MockDataNotice` şeridiyle açılıyor; üretimde kayıt hiç kurulmuyor ve form
  YERİNE `MissingSourceNotice` (`GET /api/projectfirmusers/{id}`) çıkıyor.
- `saveProjectFirmUser` yazmayı `mockedData`'dan geçiriyor ve
  `{ ok: false, reason: 'unavailable' }` kolu kazandı. Üretimde bellekteki
  depoya kayıt DÜŞMÜYOR; kullanıcı formda kalıyor ve sebebini okuyor.

**Neden.** Doldurulmuş bir form, tablodaki uydurma satırdan daha inandırıcı:
listede "örnek veri" diye bakılan bir kayıt, güncelleme ekranında adı soyadı
telefonu yerli yerinde gerçek bir kişiye benziyordu. Yazma tarafı da aynı
sebeple kapandı — hiçbir yerde gösterilmeyecek bir depoya kayıt eklemek,
kullanıcıya yapılmamış bir işi yapılmış göstermek.

**Neden oluşturma ekranı açık kaldı.** Boş bir form sahte veri GÖSTERMİYOR;
K50'nin yasakladığı şey uydurma değerin gerçek sanılması. Kullanıcı doldurup
"Kaydet"e bastığında üretimde net bir hata alıyor, sessizce başarı değil.

**Bugün ulaşılamayan kollar.** `findTakenProjectFirmUserFields` üretimde boş
depoya bakıp "kullanılmıyor" diyor; sonuç zaten kaydın `unavailable` ile
reddedilmesini değiştirmiyor, bu yüzden ayrı bir kol açılmadı.

Nerede: `src/api/projectFirmUsers.ts`, `src/api/projectFirmUserForm.ts`,
`src/pages/ProjectFirmUserFormPage.tsx`,
`src/ui/admin/projectFirmUsers/useProjectFirmUserForm.ts`.
=======
### K136 — PDF vektör; çizim önce SVG olur, sayfaya ölçek TAŞINIR

Çıktı tek bir PROJE DOSYASI: kapak → vaziyet planı → kat planları → izometrik
şema. Menüde "Proje Dosyasını İndir" tek madde, kapsam (hangi sayfalar, hangi
katlar) pencerede seçilir. İki menü maddesi ("PDF'e Aktar" + "PDF'e Aktar
(Katlar)") KALKTI: kullanıcıyı pencereyi görmeden kapsama karar vermeye
zorluyordu, oysa kapsam da bir dışa aktarma ayarı.

**İZOMETRİK ŞEMA sayfası EN SONDA.** Ekrandaki izometrikle AYNI çekirdek
fonksiyonlardan üretiliyor (`buildIsometricScene` + `projectIsometric` +
`isometricLabels` + `layoutIsometricLabels`); kâğıt kendi çizim dilini
uydurmuyor.

⚠️ **Döndürülebilirlik PDF'e geçmez**; sayfa tek açıda donmuş görüntüdür. Açı
KULLANICININ EKRANDA BAKTIĞI açıdır. Sabit bir açı basmak, kullanıcının elle
ayırdığı binmeleri (`isometricOffsetCm`) geri getirirdi — o düzenleme baktığı
açıya göre yapılmış.

⚠️ Sayfa ÖLÇEKSİZ: izdüşümde uzunluklar kısalır (foreshortening), cetvelle
ölçülemez. Gerçek boy etiketten okunur; referans paftada da öyle. Bu yüzden
vaziyet planıyla aynı yoldan (`drawFittedSvg`) sığdırılıyor, üstünde ölçek
yazmıyor.

⚠️ Borular TEK ÇİZGİ, ekrandaki gibi kalınlıklarıyla değil (kullanıcı kararı):
şemanın işi güzergâhı göstermek, çap yazıdan (DN25) okunuyor. Kalınlıkla
çizilince yoğun projede etiketlere yer kalmıyordu.

⚠️ **Etiket halkası kâğıt için DARALTILIYOR** (`PAPER_RING_TIGHTNESS`).
`layoutIsometricLabels` halkayı sahne boyutunun YARISI kadar dışarı koyuyor;
ekranda doğru, çünkü yazı ekran-sabit boyutta ve kamera uzaklaşınca da okunur
kalıyor. Kâğıtta her şey BİRLİKTE küçüldüğü için aynı halka, çizimi sayfanın
ortasında minik bir leke yapıyor, kalanını kılavuz çizgileri dolduruyordu
(ölçüldü: 1500 cm'lik sahne 3883 cm'lik kutuya yayılıyordu).

⚠️ Etiket ayırma payı satır YÜKSEKLİĞİNDEN hesaplanamaz: künyeler geniş
("12000 kcal/h" tek satırda dört satır yüksekliği kadar yer kaplıyor) ve
yükseklikle ayrılan iki etiket yan yana çakışıyordu. Pay EN GENİŞ etiketten
geliyor. Aynı sebeple sınır kutusuna yazı GENİŞLİĞİ de katılıyor — yalnız çapa
sayılsaydı ortalanmış etiketin yarısı kırpılırdı.

⚠️ Eleman sembolleri BILLBOARD çizilir: plan açısı UYGULANMAZ, çünkü ekrandaki
`IsometricElement` de sembolü kameraya dönük gösteriyor. Plan sayfasının
`toSymbolTransform`ından tek farkı bu; çapa kaydırması ölçekten ÖNCE ve 1:1 cm
uygulanıyor (ekranla aynı sıra), yoksa sembol boruya değdiği noktadan kayardı.
İlk sürümde semboller HİÇ çizilmemişti — sayfada yalnız borular ve yazılar vardı
(kullanıcı bulgusu).

⚠️ Etiketler halka yarıçapının `PAPER_LABEL_PULL` katında duruyor.
`getIsometricLabelDistanceCm` en az 240 cm dayatıyor; ekranda doğru ama küçük
bir tesisatta kâğıtta boruların birkaç katı uzunlukta kılavuz çizgileri
üretiyordu. ⚠️ Yalnız yarıçapı kısmak etiketleri ÜST ÜSTE bindirir (aynı açısal
aralık daha küçük yayda demek), bu yüzden yerleşime verilen ayırma payı aynı
oranda BÜYÜTÜLÜYOR. Kullanıcının elle taşıdığı etiket çekilmez.

⚠️ Tesisatı olmayan projede izometrik sayfa HİÇ basılmaz: boş bir izometrik
okuyucuya bir şey söylemez. Kat planında durum farklı, orada boş sayfa "bu kat
boş" bilgisini taşıyor.

⚠️ Referans paftadaki bazı yazıların modelde karşılığı YOK (`Tük.Nok`,
`Abonelik`, `Belge Tarihi`, `Bağ.Nes`, topraklama özellikleri, "mevcut" /
"es verilmiştir"); kâğıda çıkmıyorlar. Ayrıca referansta segment etiketleri
KAT PLANLARINDA da var — bizde o etiketler yalnız izometrikte üretiliyor, plan
sayfasına taşınması ayrı bir iş olarak bırakıldı.

**Dosya hem PAFTA hem PROJE DOSYASI: veri belgeye gömülü.** "Proje Dosyasını
Aç" bunun tersini yapıyor ve çizimi geri yüklüyor.

⚠️ Sayfa OKUNMUYOR, okunamaz da: PDF'te duvar diye bir şey yok, vektör yolları
var. Vektörden model üretmek (yolları tanıyıp duvara/boruya çevirmek) ayrı ve
kayıplı bir iş. Bunun yerine dışa aktarırken proje JSON'u belgenin XMP
metadata'sına gömülüyor, açarken oradan geri alınıyor
(`core/pdf/projectPayload.ts`). Gömülen şey `serializeProjectDataForBackend`in
ürettiği JSON — "Dışa Aktar (JSON)" ve sunucuya kaydetmeyle AYNI kaynak, yani
"indirip geri açınca ne kaydettiysem onu alırım" garantisi tek yerden geliyor.

⚠️ Bedeli: yalnız STARCAD'in ürettiği dosya açılabilir. Başka programın
PDF'inde bu veri yoktur; anlaşılır bir hata verilir, sessizce boş proje
YÜKLENMEZ.

**Dosya adı `<proje numarası>.starcad.pdf`.** UZANTI `.pdf` KALIR.

⚠️ Bir ara uzantı `.starcad` yapıldı ve GERİ ALINDI: dosya gerçekten bir PDF,
uzantıyı değiştirmek onu işletim sistemi için başka bir TÜR yapıyordu — çift
tıklayınca görüntüleyici açılmıyor, basmak için elle yeniden adlandırmak
gerekiyordu. `.starcad` bu yüzden uzantı değil ADIN PARÇASI: dosyanın içinde
çizim verisi de olduğunu söylüyor ama PDF davranışını bozmuyor.

Ada kat adı gibi bir EK konmuyor: seçilen sayfa/kat kapsamı çıktının GÖRÜNEN
kısmını belirliyor, gömülü veri her zaman projenin tamamı.

**"Proje Dosyasını Aç" yalnız ÇİZİMİ ve KAT YAPISINI yükler; künyeye dokunmaz.**
Proje adı, numarası, taraflar ve tarihler zaten store'da durmuyor (CLAUDE.md
kural 4), uçtan geliyor. Store'a bir kimlik alanı EKLENMEMELİ: eklenirse
başkasının dosyasını açmak açık projenin künyesini ezer —
`store/__tests__/loadProjectDrawing.test.ts` bunu kilitliyor.

**Açma GERİ ALINABİLİR.** Bu yüzden `loadProject` DEĞİL ayrı bir
`loadProjectDrawing` var: `loadProject` geçmişi siliyor çünkü o "başka projeye
geçiş", oysa dosya açmak bir DÜZENLEME — tek Ctrl+Z önceki çizimi geri
getirmeli. Aynı gerekçeyle kirli işaret de duruyor (`clearProjectDrawing` ile
birebir aynı üç kural).

⚠️ Yükleme id sayacını GERİYE ÇEKMEZ (`Math.max`): geri alma açılan çizimi
kaldırıp eski nesneleri geri getiriyor, küçülen bir sayaç var olan bir id'yi
ikinci kez üretirdi (knowledge/id-scheme.md yasağı).

⚠️ JSON base64'e çevrilip gömülüyor. XMP bir XML paketi: ham JSON'daki `<`, `&`
ve tırnaklar paketi bozardı; ayrıca proje verisi Türkçe karakter taşıyor ve
base64 kodlama belirsizliğini tümüyle kaldırıyor. Bedeli ~%33 boyut.

⚠️ jsPDF 4.2'de dosya EKLEME (attachment) API'si YOK; `addMetadata` var. Bu
yüzden veri ek dosya olarak değil metadata akışında duruyor. Okuma tarafı PDF'i
düz metin olarak tarıyor — belge `compress` seçeneği olmadan kurulduğu için
akış sıkıştırılmamış. **İkisi birbirine bağlı:** sıkıştırma açılırsa arama
sessizce hiçbir şey bulamaz.

⚠️ Okurken baytlar `latin1` ile çözülüyor: her bayt birebir bir karaktere
eşleniyor, ikili içerik bozulmadan aranabiliyor. `utf-8` ile çözmek PDF'in ikili
kısımlarını bozardı.

⚠️ Gelen JSON yine `core/serialize.ts` şemasından geçiyor — "İçe Aktar (JSON)"
ile AYNI doğrulama yolu, ikinci bir okuma mantığı yazılmadı. Bozuk/eksik dosya
store'a hiç dokunmadan reddediliyor.

"İçe/Dışa Aktar (JSON)" maddeleri DURUYOR ve kopya değiller: onlar ham veri
alışverişi, bunlar teslim edilebilir dosya.

**Katlar ZEMİNDEN YUKARI basılır** — `floors` dizisinin kendi sırası. Belge
binayı aşağıdan yukarı gezer; tesisat da servis kutusundan yukarı doğru okunur.
İlk sürüm en üst kattan başlıyordu, ters çevrildi.

**ANTET YOK.** Sayfa başına künye bloğu basma kararı geri alındı
(`core/pdf/titleBlock.ts` SİLİNDİ — bu adla yeni kod yazma): künyeyi kapak
sayfası taşıyor, kat planı sayfası yalnız çizim. Antet her sayfada aynı bilgiyi
tekrarlıyor ve çizim alanının içinden yer alıp planın üstüne binebiliyordu.

**Kapak ve vaziyet planı SEÇİLEBİLİR**, ikisi de varsayılan açık. Yalnız çizim
isteyen kapatabilir.

**Kapaktaki kutular DEĞERİ OLMASA DA çizilir.** Kapak resmi bir belge; boş
hücre elle doldurulur. Değeri olmayan satırı gizlemek sayfayı her projede
farklı yükseklikte gösterirdi.

**Kapaktaki her değerin bir REFERANSI var: ya proje detayı ya çizim.** Kural
"mock veri kullanma" değil, **PDF katmanı kendi kafasından bir şey uydurmasın**.
Künye alanları proje DETAY EKRANIYLA aynı uçtan (`getProjectDetail`), aynı
adlarla geliyor; tesisat özeti ise ÇİZİMDEN hesaplanıyor. Kapak hiçbir değer
türetmiyor, varsaymıyor, sabit yazmıyor.

⚠️ Künye alanlarının çoğu bugün `extras` altında: geliştirmede yer tutucu,
üretimde `null` (K50/K51). Bu bir ARA DURUM, kusur değil — proje firması ve gaz
dağıtım kullanıcı ekranları sunucuya eklenince aynı tesisat gerçek değerleri
taşıyacak (PDF proje firması kullanıcısının ekranından da alınacak ve o
kullanıcının adı kâğıda çıkacak). Bağlantı bu yüzden ŞİMDİDEN kurulu tutuluyor.
Bir ara "gerçek değil" diye söküldü ve kapak neredeyse boşaldı; sökmek yanlıştı,
geri alındı. Kâğıtta ekrandaki kesikli "mock" işareti YOK — uçlar bağlanana
kadar çıktıdaki bu alanlara güvenilmemeli.

⚠️ Tesisat satırı ÇİZİMDEN: sayaç adedi, cihaz adedi, toplam debi ve kullanım
basıncı `installationSummary.ts` ile hesaplanıyor ve kaynağı `buildMeterReport`
— sayaç/cihaz ilişkisini borular üzerinden izleyen TEK yer orası. İkinci bir
sayım yazılsaydı (elemanları türe göre saymak gibi) sayaca bağlı olmayan bir
cihaz da toplama girer, kapak birim/cihaz raporundan farklı bir sayı gösterirdi.
Sayaçların basıncı farklıysa alan BOŞ bırakılıyor: tek sayı seçmek kâğıda
"tesisatın basıncı budur" yazmak olurdu. Girilmemiş değer SIFIR yazılmıyor —
"hiç sayaç yok" ile "debisi girilmemiş sayaç var" aynı şey değil.

⚠️ Sayfa ÜÇ DİKDÖRTGEN, aralarında ince beyaz şerit: (1) logo + kaşe/onay,
(2) tesisat özeti + BİNANIN, (3) PROJE TASARIMCISININ | FİRMANIN + pafta
künyesi. DIŞ ÇERÇEVE YOK — olsaydı boşluklar çerçevenin içinde kalan şeritlere
dönerdi ve üç blok tek tablo gibi görünürdü. Sütunlar EŞİT (yarı yarıya), böylece
ortadaki dikey çizgi kaşe kutularından tasarımcı/firma bloğuna kadar hizalı
kalıyor. Tesisat satırının kendi başlığı yok: tek satır, bölüm açacak kadar dolu
değil. Tasarımcı ve firma AYRI başlıklar altında — tek başlıkta birleştirilince
hangi alanın kişiye, hangisinin firmaya ait olduğu okunmuyordu. Adı soyadının
hemen altında boş bir İMZA kutusu var.

⚠️ Bant yükseklikleri birbirine göre SABİT punto; sabit bantlar bir katsayıyla
ölçekleniyor, KALAN kaşe bandına gidiyor ve sayfa tam doluyor. Katsayı iki
yönden sınırlı: `MAX_BAND_SCALE` (büyük kâğıtta hücreleri de büyütmek 11
puntoluk yazıyı boşlukta yüzdürüyordu) ve kaşe bandının en azı. Denenip düşen
iki yaklaşım: oranların toplamı 1 (satır eklenince alt bant taşıyordu) ve tek
katsayıyla her şeyi ölçeklemek (kaşe bandı A4 dikeyde sayfanın yarısını kaplayıp
çıktıyı upuzun gösteriyordu).

⚠️ Kapakta satır KAYDIRMA yok — hücre yükseklikleri sabit ve iki satır sığmıyor.
Taşan ünvan/adres `fitTextToWidth` ile küçültülüyor; küçültme YETMEZSE en küçük
puntoda "…" ile kısaltılıyor. İki adım birlikte uygulanıyordu ve tam sınırdaki
metin hem küçültülüp hem kırpılıyordu (ölçüldü: sığan bir vergi numarası
kesiliyordu). Genişlik tahmini kaba: `core/` fontu göremez (DOM yok, jsPDF yok),
bu yüzden karakter genişliği sabitten geliyor ve bilerek CÖMERT — gereksiz
küçültmek, komşu hücreye taşmaktan iyi.

⚠️ **Vaziyet planı ölçekli DEĞİL, iki farklı güven düzeyi taşır.** Kat yığını
kesiti GERÇEK veriden (`Floor.heightCm`, `isBasement`); parsel SINIRI BOŞ,
çünkü projede parsel/ada geometrisi yok ve uydurulmuş bir sınır yanlış bilgi
olurdu. Sayfaya `fitPlanToPage` ile değil SIĞDIRILARAK yerleşir — "ölçek
kutsaldır" kuralı kat planı içindir, şematik kesit cetvelle ölçülmez.

⚠️ Çerçevenin İÇİ ise gerçek: zemin katın KUŞBAKIŞI KONTURU ve SERVİS
KUTUSUNUN o kontura göre yeri. Sayfanın asıl işi bu — gazın binaya hangi
kenardan girdiğini göstermek. Kontur duvarı tek çizgi çizer, kalınlık yok
sayılır: bu ölçekte bir piksel etmez ve kapsül geometrisini (K23) buraya
taşımak boşuna karmaşa olurdu. Servis kutusu SINIRLARA katılır (bina dışında,
bahçe duvarında olabilir) ve kat FİLTRESİZ aranır (bodrumda olabilir).
Paletteki tek sıcak renk odur (`SVG_COLORS.serviceBox`): sayfadaki her şey
griyken göz doğrudan oraya gitsin diye.

⚠️ Kot sıfırı ZEMİN: ilk bodrum olmayan katın tabanı. Bodrumlu binada da zemin
kat 0'dan başlar. Bodrumun kot etiketi TABANINDAN yazılır; tavandan yazılsaydı
en üstteki bodrumun tavanı 0 çıkıp zemin çizgisinin etiketiyle çakışırdı.

⚠️ Kapaktaki logo RASTER (`assets/brand/starcad.image.png`) — belgenin geri
kalanı vektör ama marka varlığı bir görsel. Kaynak 1536×1024 / ~2 MB, kapaktaki
kutuysa yüz punto civarı: doğrudan gömülseydi HER PDF 2 MB ağırlaşırdı, bu
yüzden önce bir tuvale çizilip küçültülüyor (`ui/pdf/planPdfLogo.ts`).
Yüklenemezse kapak yine basılır, kutuya "STARCAD" yazılır. Görselin ALTINA
uygulama adı yazılmaz: logo zaten "StarCAD" diyor.

⚠️ Onay kutularının başlıkları künye etiketlerinden BÜYÜK punto
(`CoverField.labelSizePt`) ve ALTI ÇİZİLİ. Künye hücresinde asıl bilgi etiketin
altındaki değerdir, etiket küçük olmalı; onay kutusunda ise yazılacak değer
yok, etiketin KENDİSİ başlıktır. Kutunun ortası kaşe için BOŞ bırakılıyor,
künye sağ alt köşeye iniyor: solda projeyi çizen kişi ve firması, sağda dağıtım
şirketi ve onaylayan mühendis.

⚠️ Bölüm başlıkları DOLGUSUZ. Açık gri zeminle denendi, kâğıtta ağır durdu;
başlık olduğunu punto farkı söylüyor (künye etiketlerinin neredeyse iki katı) —
gömülü fontta kalın yüz olmadığı için vurgu zaten boyuttan geliyor.

**Vektör, tuval fotoğrafı DEĞİL.** Bu bir CAD çıktısı: müşteri basacak ve
üstünde ölçü okuyacak. Raster PDF ilk gün "çalışıyor" der, baskıda geri gelir.

**Yığın `jspdf + svg2pdf.js`** — `.claude/CLAUDE.md`de zaten yazılıydı ve
ölçüm de onu gösterdi: `pdf-lib` 2022-05'ten beri yayın almamış, jspdf 2026-03,
svg2pdf 2026-01. Ara SVG katmanının bedava gelen faydası TEST: "duvar şu
koordinatta, şu kalınlıkta" SVG metninde doğrulanabiliyor, PDF baytlarında
doğrulanamazdı — `core/`ye test zorunluluğu ancak böyle karşılanıyor.

**SVG birimi PLAN SANTİMİ, punto değil.** Duvar kalınlığı, boru çapı ve yazı
boyu zaten cm; cm uzayında kurunca `stroke-width` doğrudan gerçek kalınlık
oluyor ve ölçek değişince hiçbir sayı yeniden hesaplanmıyor — ölçeği
`width`/`height` öznitelikleri taşıyor. Duvar ekrandaki gibi yuvarlak uçlu
kalın çizgi (`stroke-linecap="round"`, kapsül — K23), kavşak hesabı yok.

**Ölçek sığdırma için OYNATILMAZ.** 1:100 dendiyse çıktı 1:100'dür; çizim
sayfaya sığmıyorsa taşar ve kullanıcı uyarılır (`PageFit.isOverflowing`).
Sığdırmak için ölçeği bozmak, cetvelle ölçen kullanıcıya yanlış sonuç verirdi.

⚠️ **Türkçe için gömülü font ŞART.** jsPDF'in yerleşik fontları WinAnsi
kodlaması kullanıyor ve `ı ğ ş İ` orada YOK. Üstelik jsPDF hata da vermiyor —
ölçüldü: Türkçe metne 186,60 genişlik döndürdü ama yanlış glif basacaktı
(pdf-lib aynı metinde açıkça patlıyor: `WinAnsi cannot encode "ı"`). Sessiz
bozulma olduğu için gömme adımı atlanamaz.

⚠️ Font YENİ VARLIK DEĞİL: sahnenin kullandığı `roboto-regular.woff`
`scripts/woffToTtf.mjs` ile TTF'e çevrildi (WOFF zaten zlib'li sfnt; dönüşüm
kayıpsız). Doğrulama: jsPDF bu TTF ile Türkçe metni 169,21 punto ölçtü,
pdf-lib aynı fonttan 169,2 — iki bağımsız kütüphane aynı sayıyı verdi.
Font `fetch` ile TEMBEL yükleniyor, ana pakete girmiyor.

⚠️ jsPDF'in y ekseni sayfanın ÜSTÜNDEN aşağı büyür; `core/pdf/paper.ts` ise
PDF biçiminin doğal sol-ALT başlangıcını kullanır (plan +y yukarı, kâğıt +y
yukarı — çevirme yok). Köprü TEK yerde: `ui/pdf/renderPlanPdf.ts` → `toJsPdfY`.
SVG tarafında da y çevirme tek yerde (`svgPrimitives.ts` → `sy`).

⚠️ Tesisat rengi `resolveLineColor` GERİ ÇAĞRIMIYLA dışarıdan gelir: renk
kuralı `plumbing/scene/lineStyle.ts`te ve `core/` sahne katmanından import
edemez (kural 1/2). Geometri core'da, palet ui'da.

⚠️ Boş kat da SAYFASIYLA basılır (`viewBox="0 0 1 1"`): yoksa çıktıda
hangi katın boş olduğu anlaşılmaz.

⚠️ Proje adı ve numarası çizim store'unda YOK (kural 4: store = kaydedilecek
JSON). Künye gerçek uçtan çözülüyor (`useProjectSummary` → `getProjectDetail`,
K63 deseni); uç yanıt vermezse iş durmaz, numara id'ye düşer.

Uçtan uca ölçüm (iki odalı plan, A3 yatay 1:100): çizimli PDF 23 074 bayt,
aynı ayarlarla boş kat 16 045 bayt — aradaki 7 029 bayt gerçekten sayfaya
basılan çizim. (Ölçüm gömülü proje verisinden ÖNCE alındı; bugün dosyaya bir de
çizim JSON'u giriyor.)

⚠️ Kat sırası: dizide `index 0` EN ALT kat ve çıktı da ZEMİNDEN YUKARI, yani
dizinin kendi sırası. İlk sürüm listeyi ters çevirip en üst kattan başlıyordu,
düzeltildi.


**Pafta bir TESİSAT çıktısıdır, mimari plan değil.** İlk hâlde duvarlar
neredeyse siyahtı (#1f2933) ve üstünden geçen boru kayboluyordu; ayrıca
boruya bağlanan elemanlar hiç basılmıyordu (kullanıcı bildirimi). İkisi de
düzeltildi:

- Mimari, tesisat görünümündeki hayaletle AYNI soluk tonda basılıyor
  (`#94a3b8`, `plumbing/scene/plumbingTheme.ts` → architectureGhost). Oda
  dolgusu neredeyse beyaz, ölçü/açı yazıları duvardan bir tık koyu.
- Tesisat elemanları (vana, sayaç, kazan…) sembolleriyle çiziliyor ve kendi
  renklerini koruyor — konu onlar.

⚠️ Eleman sembolleri YENİDEN ÇİZİLMEZ: `plumbing/assets/symbols/*.svg` ham
metin olarak (`?raw`) gömülüp bir `<g transform>` içine konuyor. Sahne aynı
dosyaları three.js geometrisine çeviriyor; PDF metnin kendisini istiyor.
`symbolLoader.ts` fay C'nin dosyası olduğu için ona dokunulmadı, okuma
`ui/pdf/symbolMarkup.ts`'te ayrı duruyor.

⚠️ Sembol dönüşümünde İKİ işaret çevrilmesi var, ikisi de kasıtlı:
`translate` y'si `-position.y` (çıktı svg'sinde y aşağı), `rotate` açısı
`-angleDeg` (plan açısı saat yönünün tersine, svg `rotate()` saat yönünde).
Sembolün İÇ koordinatı çevrilmez — kaynak svg de çıktı svg'si de y-aşağı,
arada yalnız origin ötelemesi kalıyor.

⚠️ Sembolün 1 svg birimi 1 SANTİMDİR (`elementPicking.ts` `bounds`'u plan cm
olarak kullanıyor); `element.scale` bunun üstüne çarpan.


**Referans paftayla karşılaştırma (kullanıcı örneği).** Eski üründen bir çıktı
örnek alındı ve şunlar uyarlandı:

- **Palet dengelendi.** İki tur gerekti: duvar önce neredeyse siyahtı
  (boruyu yutuyordu), sonra tesisat hayaletinin tonuna çekilince fazla soluk
  kaldı VE duvara oturan mimari semboller duvarla aynı renge düşüp GÖRÜNMEZ
  oldu (menfez, kullanıcı bildirimi). Şimdi duvar `#6b7280`, sembol `#334155`
  — sembolün duvardan koyu olması ZORUNLU, testle kilitli.
- **Kolon DOLU çizilir** (`structuralColumn`): taşıyıcı kütle planda boşluk
  gibi okunmamalı. Merdiven/baca şaftı kontur kalır — içlerinden tesisat
  geçebiliyor ve dolgu onu örterdi.
- **Eleman etiketi**: ad + varsa kapasite. MİNİMUM tutuldu; referansta cihaz
  başına marka/model/verim/brülör bloğu var ama bizde o alanlar serbest metin
  ve çoğu projede boş — hepsini basmak boş satır üretirdi. Birim UYDURULMAZ,
  kullanıcının girdiği metin yazılır.

⚠️ **Sayfa sınırı duvar UÇLARINDAN hesaplanmaz.** Kapsül her yöne yarım
kalınlık taşar, duvara oturan sembol daha da taşar, tesisat binanın dışından
dolaşabilir. Yalnız uçlara bakıldığında bu içerik sayfa kenarında KIRPILIYORDU.
Sınır artık duvar kalınlığını, hat noktalarını, eleman konumlarını ve etiket
çapalarını kapsıyor.

⚠️ **İçten/dıştan ölçü PAFTAYA EKLENMEDİ.** Referansta duvarların iç ve dış
boyu ayrı çizgilerle yazılı ve güzel duruyor — ama bu tam olarak K95'te
KALDIRILAN gösterimdir ve sebebi estetik değil DOĞRULUKTU: sayıların bir kısmı
yanlış çıkıyordu ve kullanıcı hangisinin gerçek boy olduğunu ayırt edemiyordu.
PDF'e eklemek iki şeyi birden bozardı: (1) aynı hatalı sayılar kâğıda basılırdı,
(2) ekran ile kâğıt farklı ölçü sistemi gösterirdi. K95 kapıyı açık bırakmıştı
("iç/dış ayrımı gerekirse ayrıca ve kendi başına ele alınacak") — doğru sıra
önce ANA ÇİZİMDE doğru geometriyle çözmek, PDF onu kendiliğinden devralır.


**Kâğıt EKRANIN aynısını basar.** Pafta kendi çizim dilini uydurmuyor; her
nesne sahnedeki geometrisiyle çıkıyor:

- **Alan nesneleri** `getAreaObjectPlanGeometry` ile: merdivenin basamakları ve
  yön oku, baca şaftının karesi + çemberi, kolon havalandırmasının yalnız
  çemberi. Önce hepsi kaba bir sınır dikdörtgeniydi ve birbirinden ayırt
  edilemiyordu (kullanıcı bildirimi).
- **Kiriş** KESİKLİ konturla (`Beam.tsx` ile aynı): üstten geçen taşıyıcı,
  duvardan böyle ayrılıyor.
- **Kapı/pencere** `getOpeningSymbol` ile: söve/yüz çizgileri ve kapı kanadı.
  Düz beyaz dikdörtgen kapıyla pencereyi ayırt ettirmiyordu.
- **Baca ve havalandırma** BORU DEĞİL: `getDischargeRunGeometry` ile sabit
  genişlikte, içi boş, ÇİFT ÇİZGİLİ kanal + türe özgü desen (baca eğik tarama,
  havalandırma dik panjur) + uç kapağı. Cihaza giren uç kapatılmaz.

⚠️ Baca/havalandırma ÇAPTAN renk ALMAZ — gaz taşımıyorlar. Renkleri
`DISCHARGE_STROKE_COLORS`ten gelir (baca gri, havalandırma yeşil); ilk turda
boru rengini alıp kırmızı çıkıyorlardı.

**Ad etiketleri KESİKLİ kılavuzla nesnesine bağlanır** (`planSvgLabels.ts`).
Ekranda tesisat elemanı da (`ElementNameLabels`) alan nesnesi de
(`AreaObjectNameLabels`) böyle çiziliyor; etiketin hangi nesneye ait olduğu
başka türlü okunmuyor. Kılavuz yazının KUTUSUNDA durur, merkezinde değil
(`clipLeaderEndToRectCm`) — yoksa çizgi yazının içinden geçer.

⚠️ Etiket+kılavuz yolu TEK: `buildLabelSvg`. Bugün tesisat elemanı ve alan
nesnesi besliyor; kirişe ya da başka bir nesneye ileride ad eklenirse tek
yapılacak şey buraya bir madde daha vermek. İkinci bir etiket çizim yolu
açılmamalı — ekranda da tek desen var.

⚠️ Hangi nesnenin adlanacağı EKRANDAKİ kuralla aynı (`hasAreaObjectNameLabel`,
`hasElementNameLabel`): merdiven ve vana etiketsiz. Yazılan şey TÜRÜN adı
("Kolon"), nesnenin kodu ("K-01") değil.


### K137 — Mimari kontur `worldUnits`ten piksele geçti; kiriş çizgisi inceldi

Kullanıcı: "mimari nesneler ekranın kenar kısımlarına yaklaştıkça ve zoom out
yaptıkça silik gözükmeye başlıyor bunu istemiyoruz" + "kiriş çizgileri bir tık
inceltilmeli".

İKİ ayrı soluklaşma vardı, ikisinin de sebebi `worldUnits`:

1. **Ekran kenarlarına doğru incelme.** `worldUnits` shader'ı göz ışınlarının
   tek noktadan çıktığını varsayıyor (perspektif). Kameramız ortografik,
   ışınlar paralel ve kamera 100.000 cm yukarıda; fragment hesabı bu büyüklükte
   float32 hassasiyetini yiyor. **Bu tuzak duvarda ZATEN teşhis edilmiş ve
   çözülmüştü** (`wallStyle.ts`, piksel yoluna geçiş) — alan nesnesi, kiriş ve
   ikisinin tesisat görünümündeki hayaletleri o düzeltmenin dışında kalmıştı.
2. **Uzaklaşınca kaybolma.** K43'ün kendi "bilinen sınır" notu: cm sabitken
   çizgi zoom ile küçülüyor, en uzak zoom'da (0,1) gövde 0,5 px eder.

**Çözüm:** kalınlık `cm × zoom` ile piksel cinsinden veriliyor ve
`MIN_ARCHITECTURE_STROKE_PX = 1,5` tabanına dayanıyor. Görünen boyut
`worldUnits`in çizmesi gerekenle AYNI; fark, hesabın shader yerine bizde olması
ve alt sınır koyabilmemiz. Duvarın tabanı (3 px) kullanılmadı: o değer kapsül
uçlarının kavşakta binmesinden geliyor, konturda öyle bir sorun yok ve 3 px en
uzak zoom'da 2,5 cm'lik ayrıntı çizgisini 20 cm'lik duvarla eşitlerdi.

K43 aynı sorunu kalınlık ARTIRARAK çözmeye çalışmış ve "kaybolmasın" ile
"kalın durmasın" arasında sıkışmıştı; taban piksel ikilemi ortadan kaldırıyor.
Aynı notta önerilen `alphaToCoverage` yolu da GEREKMEDİ — üstelik duvarda o
yol kavşakta hale bırakıp geri alınmıştı.

**Kiriş konturu `DEFAULT_WALL_THICKNESS_CM / 6`** (5 cm → 3,3 cm). Eskiden alan
nesnesinin gövdesiyle aynıydı; kesitin dışında kalan bir eleman olarak üstünden
geçtiği duvarı bastırmamalı.

**Sabitler tek yerde:** `scene/architectureStrokeStyle.ts`. Kalınlıklar gerçek
nesne ve hayaleti tarafından ORTAK okunuyor — iki dosyada kopyaydılar ve
"gerçeğiyle aynı oran" yorumuna rağmen elle senkron tutuluyorlardı.

⚠️ Kesik ölçüleri (`dashSize`/`gapSize`) cm KALIR: çizgi boyunca ölçülüyorlar,
genişlik biriminden bağımsızlar. Tarayıcıda doğrulandı (zoom değişince kirişteki
kesik sayısı sabit).

⚠️ Zoom kapsayıcıda BİR kez okunup prop olarak dağıtılıyor (`Walls` deseni);
nesne başına `useCameraZoom` çağrısı kare başına N geri çağrım demekti.

Nerede: `scene/architectureStrokeStyle.ts` (+ testi), `scene/AreaObject.tsx`,
`scene/Beam.tsx`, `scene/ArchitectureLayer.tsx`,
`plumbing/scene/ArchitectureGhostFixtures.tsx`, `plumbing/scene/Ghosts.tsx`.

### K138 — Mimari cihaza AD etiketi; seçim alanı çizimin üstüne daraldı

İki kullanıcı isteği, aynı dosya ailesi: "mimari cihazlara isim eklenecek alarm
cihazı deprem sensörü yangın söndürücü vs hepsine" ve "mimari cihazların seçim
alanı çok geniş, onu sadece çizimin kendisinin üstüne geldiğinde aktive olacak
şekilde değiştir".

**Seçim alanı.** Eskiden ÇAPA NOKTASI etrafında, kenarı
`çekme çizgisi boyu + derinlik` olan bir KARE kullanılıyordu: çekme çizgili
cihazda 114 cm'lik bir alan ve işaretin bulunmadığı üç yöne de yayılıyor.
Artık sınav sembolün KENDİ ekseninde: hedef, duvarın açısı ve montaj yüzü geri
alınarak yerel eksene taşınıyor (`isPointInAreaObject` ile aynı yöntem) ve
ÇİZİLEN geometrinin kutusuyla karşılaştırılıyor. Kutu `SYMBOL_DISPLAY`
ölçülerinden hesaplanmıyor, geometrinin kendisinden okunuyor — yeni bir şekil
eklendiğinde tutma alanı kendiliğinden doğru olur. Çekme çizgisi de çizimin
parçası olduğu için kutuya dahil; `toleranceCm` payı duruyor (ince çizgiye tam
nişan almak gerekmesin).

`isPointInSymbol` artık `position` değil `pose` alıyor: açı ve montaj yüzü
olmadan yerel eksene geçilemiyor.

**Ad etiketi.** Alan nesnesinin etiketiyle AYNI desen (kesikli kılavuz + ekran-
sabit yazı, `AreaObjectNameLabels`) ve AYNI görünürlük anahtarı
(`isAreaObjectNamesVisible`, menüde "Nesne adları") — kullanıcı için ikisi de
nesnenin adı, ayrı iki madde gereksiz bir ayrım olurdu. Yazan şey TÜRÜN adı
("Deprem Sensörü"), cihazın kodu ("DS-01") değil. TÜM tipler etiketleniyor
(kullanıcı: "hepsine"); alan nesnesinde merdivenin dışarıda bırakılma gerekçesi
burada yok, cihaz işaretlerinin hiçbiri kendi başına okunmuyor.

⚠️ **Etiket cihazın BAKTIĞI yöne konur, dünya +y'sine değil.** İlk sürüm sabit
"yukarı" kullanıyordu; tarayıcıda görüldü ki aşağı bakan bir cihazda işaret
duvarın altında, yazısı üstünde kalıyor, kılavuz duvarı kesip komşu odaya
düşüyor. Yön cihazın yerel +y'sinden geliyor (`outwardSign` uygulanmış), yazının
KENDİSİ dönmüyor — dik duruyor, yalnız nereye konacağı dönüyor.

**Etiket sürüklenebilir** (kullanıcı istedi; ilk turda kapsam dışı bırakılmıştı).
Kayma `PointSymbol.labelOffsetCm`'te ve alan nesnesindekiyle birebir aynı desen:
canlı kayma `architectureUiStore`'da durur, bırakılınca TEK
`setPointSymbolLabelOffset` yazımı olur (tek markDirty, tek Ctrl+Z); kayma
ızgaraya YAKALANMAZ — etiket bir açıklama notu, çizim geometrisi değil.

⚠️ Şema alanı OPSİYONEL ve varsayılana eşitken dosyaya YAZILMAZ: eski
kayıtlarda alan yok, zorunlu tutulsaydı depodaki her proje AÇILMAZDI
(knowledge/point-symbols.md'deki göç kuralı).

⚠️ Alan nesnesinin etiketi ÖNCELİKLİ: ikisi üst üste geldiğinde iki hook da
kendi jestini başlatır ve iki etiket birden taşınırdı. Beş araç hook'u
(`useSelectionTool`, `useWallSelectionTool`, `usePointDragTool`,
`useAreaObjectSelectionTool`, `usePointSymbolSelectionTool`) artık cihaz
etiketini de soruyor ve doluysa jesti hiç başlatmıyor (K44 dersi).

Etiket kutusu hesabı `core/labelLeader.ts` → `getLabelRectCm`'e taşındı; alan
nesnesininki oraya bağlandı. Tesisatın kopyası (`getElementLabelRectCm`)
dokunulmadan bırakıldı.

Nerede: `core/architectureSymbol.ts` (`isPointInSymbol`), `core/architectureHover.ts`,
`core/pointSymbolLabel.ts` (+ testi), `core/labelLeader.ts`, `core/areaObjectLabel.ts`,
`scene/PointSymbolNameLabels.tsx`, `scene/ArchitectureLayer.tsx`, `store/uiStore.ts`.

### K139 — Kolon ve baca şaftı duvarın YÜZÜNE yaslanıyor

Kullanıcı: "kolonlar ve baca şaftı duvarlara da snaplenmeli sadece ızgaraya
değil". Yerleşim önceliği artık **duvar → ızgara**: imleç bir duvarın yüzüne
yakınsa nesne oraya yaslanır, değilse eski ızgara yakalaması çalışır.

**İKİ hiza var, imlece yakın olan kazanır** (`AreaObjectWallSnapKind`):

- `onWall` — nesne duvarın **ÜSTÜNDE** durur, dış kenarı duvarın KARŞI yüzüyle
  hizalanır; kolon duvarı kaplar ve mahale taşar. Kullanıcının asıl istediği bu
  ("duvarın üstünde olacak şekilde duvarın kenarına snaplenmeli", ekran
  görüntüsüyle geldi).
- `besideWall` — nesne duvarın DIŞINDA, yüzüne değerek durur. İlk turda tek
  davranış buydu; kullanıcı "hem şimdiki yaptığına snaplenme olsun" dediği için
  KALDI, ama önceliği yok: eşitlikte `onWall` kazanır.

Merkez, duvar ekseni üzerindeki izdüşüm + normal × (aday hizanın uzaklığı).
Nesne duvar boyunca serbest kayar (izdüşüm imleci izler), yalnız duvarın ucunu
geçmez — `projectOntoSegment` uçlara kelepçeliyor.

⚠️ **Yakalama YARIÇAPI nesnenin BOYUNU içerir.** Yalnız merkez–eksen uzaklığına
bakılsaydı 50 cm'lik bir kolon, duvarın tam üstünde dururken bile toleransın
dışında kalırdı: yaslanmış hâlde merkez zaten yüzden yarım kolon uzakta.

⚠️ **Duvara oturan kolon artık açıklıkla ÇAKIŞABİLİR** ve `addAreaObject`
K35/K36 gerekçesiyle reddeder (id bile harcanmaz, araç sessizce kabul eder).
Bu bir gerileme değil, kuralın doğal sonucu — kapının üstüne kolon oturmaz;
tarayıcıda ilk denemede karşılaşıldı.

⚠️ **Pay, nesnenin AÇISINDAN türetiliyor** (`lengthCm / 2` sabiti DEĞİL): köşeler
duvar normaline izdüşürülüp en büyüğü alınıyor, böylece 37° dönmüş bir kolon da
tam yaslanır, köşesi duvara girmez.

**Yerleştirmede nesne duvarın AÇISINI alır, taşımada ALMAZ.** Yeni nesnenin
açısı yok, eğik duvarda ızgara hizasında durursa duvarın içine girerdi; taşınan
nesnenin ise kullanıcının verdiği bir açısı VAR ve taşıma jesti onu sessizce
silmemeli (döndürmenin kendi tutamacı var). Bu yüzden çekirdek fonksiyon
`isAlignedToWall` alıyor — açık olduğunda pay, nesnenin duvara döndürülmüş
hâlinden hesaplanıyor.

⚠️ Hangi TÜRLER yapışır: kolon ve baca şaftı (kullanıcı seçti). Merdiven
dışarıda — mahalin ortasında da durabiliyor ve mıknatıs onu istemediği yere
çekerdi; kolon havalandırması da dışarıda, şaftın yanında duruyor duvarın
değil. `Record<AreaObjectType, boolean>` olduğu için yeni bir tip eklenip burası
unutulursa DERLEME kırılır.

⚠️ Bu bir BAĞLANMA değil: nesne serbest kalmaya devam ediyor (`PointSymbol`in
duvara bağlanma modeli GİRMEDİ). Duvar sonradan taşınırsa kolon peşinden
gitmez — yakalama yalnız yerleşim anında çalışan bir mıknatıstır.

⚠️ Ctrl İKİSİNİ birden kapatır (ızgara + duvar): serbest yerleştirme için tek
tuş yetmeli, kullanıcı "hangisi hangi tuşta" diye düşünmesin.

**BOYUTLANDIRMADA da çalışır** (kullanıcı istedi): sürüklenen KÖŞE en yakın
duvar yüzüne oturuyor (`snapPointToWallFace`), böylece nesnenin KENARI duvarla
hizalanıyor. Ayrı bir "kenarı hizala" matematiği yazılmadı — köşe yüze
oturunca `resizeAreaObjectFromCorner` kenarı zaten oraya taşıyor. Duvarın İKİ
yüzü de aday.

`AddAreaObjectInput.angleDeg` opsiyonel eklendi (varsayılan 0) — eski
çağıranların davranışı değişmedi.

Nerede: `core/areaObjectWallSnap.ts` (+ testi), `scene/useAreaObjectTool.ts`,
`scene/useAreaObjectSelectionTool.ts`, `scene/useAreaObjectHandleTool.ts`,
`scene/ArchitectureLayer.tsx` (önizleme açısı), `store/areaObjectOps.ts`.

### K140 — Çizilen eksene göre aynalama

Kullanıcı: "çizilecek yatay veya dikey bir eksene göre de aynalama işlemi ekle;
ona tıkladığımızda ekranda bir çizgi çekelim ve seçili olan tüm şeyler o çizgiye
göre aynalansın."

**Yeni dönüşüm türü `mirrorLine`** (`origin` + `angleDeg`), paneldeki `mirror`ı
GENELLER: 0° yatay aynanın, 90° dikey aynanın ta kendisi. İkisi yine de ayrı
duruyor — panel düğmeleri seçimin KENDİ merkezine göre çalışıyor (dayanak sınır
kutusu), buradaki eksen ise kullanıcının koyduğu bağımsız bir doğru.

Nokta yansıması: fark vektörü doğrunun İKİ KATI açısıyla döndürülüp dik bileşeni
çevriliyor. Nesnenin kendi açısı da yansıyor: `2θ − açı` (θ=0 → `−açı`, θ=90 →
`180 − açı`, yani var olan iki özel durumla birebir aynı).

⚠️ **Çeyrek dönüş katlarında TAM trigonometri** (`cosDeg`/`sinDeg`): `Math.sin(Math.PI)`
1.22e-16 verdiği için dikey eksende aynalanan nokta 240 yerine 240.00000000000003
çıkıyordu (test yakaladı). Artık iki yol aynı eksende birebir aynı sayıyı
üretiyor ve "iki kez aynala = başa dön" tam sağlanıyor. `rotate` bilerek
DOKUNULMADI — o kod uzun süredir kullanımda, ayrı iş.

**Jest bir ARAÇ olarak kuruldu** (`mirrorAxis`), palette görünmüyor —
`SELECTION_TOOL`un deseni. Sebep: tuvale yapılan tıklamanın seçimi değiştirmemesi
gerekiyor ve bütün mimari hook'lar zaten `activeToolId`ye bakıp çekiliyor.
Alternatifi her birine tek tek "aynalama bekliyor mu" kontrolü eklemekti (K44
dersinin pahalı hâli). Araç değişimi seçimi TEMİZLEMEDİĞİ için seçim jest
boyunca duruyor.

**İşlem TAŞIMA değil ÇOĞALTMA** (kullanıcı isteği: "bu işlem kopyalama işlemi
olmalı, ilk hali silinmemeli"): kaynak yerinde kalıyor, aynalanmış kopya
ekleniyor ve seçim kopyaya geçiyor — çoğaltma düğmesiyle aynı sözleşme.

`duplicateSelectionWithTransform` iki adımı TEK `set` içinde yapıyor: kopya önce
YERİNDE çıkıyor (sıfır öteleme), sonra kopyaya dönüşüm uygulanıyor. Böylece iki
iyi test edilmiş yol yeniden kullanılıyor ve kullanıcı için tek Ctrl+Z oluyor.
Duvar bölme/oda hesabı SONDA bir kez koşuyor — kopya üst üsteyken bölünseydi
üst üste binen duvarlar birbirini bölerdi (K24 tuzağı).

⚠️ Kopyalanan duvara bağlı sembol artık KOPYA duvara yapışıyor. Eskiden her
hâlükârda kaynak duvarda kalıyordu: aynalanan duvarın panosu kaynakta kalıp tek
duvarda iki pano görünürdü. Çoğaltma düğmesi için de düzelme.

İki tık: birincisi ekseni başlatır, ikincisi uygular ve seçim aracına döner.
Sağ tık/Esc yarım ekseni bırakır. Açı 15°'ye YAKALANIR (Ctrl serbest) —
kullanıcının istediği yatay/dikey eksen elle tam tutturulamaz, 0/90 adımın
içinde.

⚠️ Eksen bir NESNE DEĞİL: uygulandıktan sonra saklanmıyor, ikinci bir aynalama
için yeniden çiziliyor. Saklamak "çizimin parçası mı" sorusunu açardı (ölçümün
K80'deki kararıyla aynı çizgi). Önizleme çizgisi tıklanan iki noktanın ÖTESİNE
uzatılıyor: ayna bir DOĞRU, çizilen parça onu yalnız tarif ediyor.

⚠️ Kısmi seçimde ortak köşeler yüzünden çizim ESNER: seçili duvarların köşesi
seçilmeyen duvarla paylaşılıyorsa o köşe yansırken komşusu yerinde kalıyor. Bu
yeni değil — paneldeki döndürme/aynalama da aynı `transformSelectionInDraft`
üzerinden aynı şeyi yapıyor (K49 modeli).

Nerede: `core/transform.ts`, `core/tools.ts`, `scene/useMirrorAxisTool.ts`,
`scene/MirrorAxisOverlay.tsx`, `scene/ArchitectureLayer.tsx`,
`store/architectureUiStore.ts`, `ui/properties/SelectionActions.tsx`,
`ui/tools/toolIcons.ts`.

### K141 — Duvar ve kiriş uzunluğu panelden düzenlenebilir

Kullanıcı: "özellik panelinde duvar uzunluğu ve kiriş uzunluğu düzenlenebilir
olmalı". İkisi de SALT OKUNURDU ve iki panelde de aynı gerekçe yazılıydı: "bir
sayı hangi ucun oynayacağını söylemiyor". İtiraz bir KURALLA çözüldü.

**Kural: p1 ucu SABİT kalır, p2 mevcut doğrultu üzerinde kaydırılır.** Yani
köşeyi/uç tutamacını fareyle sürüklemenin klavye karşılığı; duvarda `movePoint`,
kirişte `moveBeamEnd` — ikisi de zaten var olan eylemler, yeni bir yazma yolu
açılmadı. Hesap `core/wall.ts` → `getSegmentEndAtLength`te ve iki panel de aynı
fonksiyonu okuyor.

⚠️ Duvarda p2 komşularla PAYLAŞILIYOR olabilir; o zaman komşular esneyerek bağlı
kalır ve oda alanları yeniden hesaplanır. Bu, duvarın kendi koordinatını
taşımamasının doğrudan sonucu ve köşeyi sürüklerken de aynısı oluyor —
panelde gizlemek kullanıcıyı iki farklı davranışla karşılaştırırdı. Tarayıcıda
görüldü: 400 → 300 yazınca komşu duvar eğik hâle geldi, iki mahalin m²'si
değişti.

⚠️ Yalnız TEK nesne seçiliyken yazılabilir. İki duvar köşe paylaşıyorsa toplu
yazım aynı köşeyi iki kez oynatır ve sonuç yazım SIRASINA bağlı olurdu; kirişte
de kalınlık/etiket zaten aynı kuralda.

⚠️ Sıfır boylu parçada `getSegmentEndAtLength` `undefined` döner: yön tanımsız,
uydurulmaz. Panel bunu reddedilmiş yazım olarak gösterir.

Nerede: `core/wall.ts` (+ testi), `ui/properties/WallProperties.tsx`,
`ui/properties/BeamProperties.tsx`.

### K142 — Çoğaltma, "Test Et" ve Araçlar menüsünün yarısı kaldırıldı

Üçü de aynı gerekçeyle: kullanıcıya bir şey vaat edip vermeyen ya da işe
yaramayan arayüz.

**Çoğaltma (panel düğmesi + Ctrl+D) KALKTI.** Kullanıcı: "kopyalamayı kaldır
çünkü direkt yapıştırıyor ve bütün duvarlar kesişip yapışıyor gerek yok."
Kopya kaynağın 50 cm yanına düşüyordu ve kesişim bölme (K24) iki duvarı
birbirine yapıştırıyordu. Ctrl+D artık YAKALANMIYOR — üstlenmediğimiz bir
kısayolu `preventDefault` ile yutmuyoruz.

⚠️ `duplicateSelectionInDraft` DURUYOR: çizilen eksene göre aynalama (K140) onun
üstünde çalışıyor. `duplicateSelection` action'ı da duruyor — kopyalama
mantığının testleri (id remap, etiket üretimi, düşey eksen kimliği, oda doğması)
o imzadan geçiyor ve helper hâlâ üretimde koşuyor. Yani kaldırılan şey ARAYÜZ,
kod yolu değil.

**"Test Et" üst bardan KALKTI.** Hiç bağlanmamıştı ve kullanıcı "zaten hata
kontrolleri tuşu o işi yapıyor" dedi. Dokümanda (hata-kontrol.docx) da yalnız
hata kontrolleri ekranı tarif ediliyor. "Gönder" pasif olarak KALIYOR: onun
pasifliğinin yazılı bir sebebi var (hatalar giderilmeden proje onaya gidemez).

**Araçlar menüsü DÖRT maddeye indi** (kullanıcı seçti): Mahalleri Tanımla,
Kolon Hattını Sil, Tesisat Sil, Malzeme Listesi. Çıkanlar: Birim
Numaralandırmayı Başlat, Tüketim Vanası Branşmanlarını DN25 Yap, Tüketim
Vanalarını Ekle, Tesisat Detayları, Hata Kontrollerini Çalıştır.

⚠️ "Hata Kontrollerini Çalıştır" menüden çıktı ama İŞLEV kaybolmadı: üst barda
kendi düğmesi var ve o çalışıyor (K115). Menüdeki pasif kopyası ikinci bir
giriş yolu vaat edip hiçbir şey yapmıyordu.

Kalan dört madde hâlâ PASİF (K79 deseni): "tıklanabilir görünüp hiçbir şey
yapmayan madde" yerine "henüz yok" demek.

Nerede: `ui/properties/SelectionActions.tsx`, `scene/useSelectionTool.ts`,
`ui/menu/EditorActions.tsx`, `ui/menu/menuDefinitions.ts`.

### K143 — Mimari kısayol ipucu dolduruldu

Kullanıcı: "mimari kısayollar tuşu sol bardaki tuş mouseu götürdüğümüzde mimari
ekrandaki tüm klavye-Mouse kısayollarını oraya yaz." Bileşen (`ui/ShortcutHint`)
ve boş liste zaten duruyordu; iş listeyi doldurmaktı.

`core/shortcuts.ts` → `ARCHITECTURE_SHORTCUTS` on altı kayıt: Ctrl+Z / Ctrl+Y /
Ctrl+Shift+Z, Ctrl+S, Ctrl+Shift+S, Ctrl+K, Ctrl+Shift+K, Delete/Backspace,
çerçeve seçimi, Shift+tık, Ctrl+sürükle, Ctrl+tutamaç, Esc, sağ tık, tekerlek,
Space/orta tuşla kaydırma.

⚠️ Liste ÜRETİLMİYOR, elle derlendi: tuşlar beş ayrı hook'ta yakalanıyor ve
hiçbiri kullanıcıya gösterilecek metin taşımıyor. Kısayol değişirse liste
kendiliğinden düzelmez.

⚠️ Ctrl metni "Izgarayı kapat (köşe/duvar yakalaması kalır)" — `gridSnapMode.ts`
YALNIZ ızgarayı kapatıyor, `resolveSnap` köşe/duvar yakalamasını sürdürüyor.
"Yakalamayı kapat" yazılsaydı kullanıcı olmayan bir davranış arardı; tesisat
listesindeki aynı satır da bu yüzden böyle.

⚠️ Ctrl+D LİSTEDE YOK: K142'de kaldırıldı, yakalanmıyor bile.

Nerede: `core/shortcuts.ts`.

### K144 — Mahal kullanım tipi listesi on tip büyüdü

Kullanıcının referans ekranındaki mahaller listede yoktu. Eklenenler: Oturma
Odası, Koridor, Dubleks Koridor, Salon (Açık Mutfak), Balkon (Kapalı), Yangın
Merdiveni, Asansör Boşluğu, Daire, Dükkân, Ofis. Liste 15 → 25.

⚠️ Var olan tiplerin HİÇBİRİ silinmedi (Kazan Dairesi, Çamaşırlık, Kiler, Garaj,
Depo, Şaft, İş Yeri referans ekranda yok ama duruyor): silinen bir değer eski
projelerde `z.enum`'dan geçemez ve mahal sessizce "Tanımsız"a düşerdi.

⚠️ `balcony` ETİKETİ değişti ("Balkon" → "Balkon (Açık)"), DEĞERİ değil. Günlük
dilde "balkon" açık balkondur, eski kayıtların kastı bu; kapalı balkon ayrı tip
(`balconyClosed`) çünkü tesisat açısından iki hacim aynı şey değil. Değeri de
değiştirseydik göç gerekirdi.

Liste hâlâ ONAY BEKLİYOR (K116'daki not geçerli) ve değişecek TEK yer
`core/roomUsage.ts`.

Nerede: `core/roomUsage.ts`.

### K145 — "Mahalleri Tanımla" kipi: alt kart + kamera odağı

Araçlar menüsündeki pasif madde ÇALIŞIR hâle geldi. Kip, aktif kattaki tanımsız
mahalleri tek tek geziyor; her durakta mahal ekranda vurgulanıyor, kamera ona
gidiyor ve altta yüzen bir kart tipleri rozet olarak sunuyor.

**Referans ekranın ORTADAKİ penceresi tekrarlanmadı** (kullanıcı seçti). Orada
kullanıcı hangi mahali adlandırdığını göremiyor, yalnız başlıktaki kat adına
güveniyordu. Burada kart alta alındı ki çizim açık kalsın; "hangi oda?" sorusunu
metin değil ÇİZİMİN KENDİSİ yanıtlıyor.

**Kapsam yalnız AKTİF KAT** (kullanıcı seçti): kip kullanıcı istemeden kat
değiştirmiyor.

⚠️ Kuyruk BAŞLARKEN donuyor (`architectureUiStore.roomDefinitionQueue`, yalnız
id'ler). Her karede yeniden türetilseydi tip verilen mahal kuyruktan düşer,
"3 / 7" göstergesi kullanıcının gözü önünde değişir ve geri gitmek imkânsız
olurdu. GEOMETRİ ise canlı okunuyor (`getRoomDefinitionQueue`) — kip açıkken
duvar oynatılabilir.

⚠️ Sıra id'den değil KONUMDAN geliyor (`sortByReadingOrder`: üstten alta, sonra
soldan sağa, 100 cm'lik satır toleransıyla). id sırası çizim sırasıdır; kamera
çizimin bir ucundan öbürüne savrulurdu.

⚠️ Tip yazıldıktan sonra bir SONRAKİ durağa değil, ilk TANIMSIZ durağa geçilir;
kalan yoksa kip kendini kapatır. `advanceAfter` içinde `stopsByRoomId` bilerek
bayat okunur (yazım henüz render'a yansımadı), o yüzden az önce tanımlanan mahal
ayrıca eleniyor.

⚠️ Kart yüzen çubuğun ÜSTÜNDE (`bottom-16`), üstünü örtmüyor: kip açıkken de
kat oku, geri al ve ızgara anahtarı elin altında kalmalı.

⚠️ Kartın geometri kaynağı `getFloorRoomStops` — kuyruğun kendisi değil. Kattaki
TÜM mahalleri verir (`isDefined` bayrağıyla): geri gidilen durak artık tanımlıysa
da kamera oraya gitmeli, yoksa kart "bu mahal tanımlandı" derken ekranda başka
bir yer durur (tarayıcıda yakalandı).

⚠️ Kip açılırken SEÇİM temizleniyor: açık seçim hem ikinci bir mavi vurgu hem de
sağda ikinci bir tanımlama arayüzü (özellik paneli) demekti.

Menü maddesi salt görüntülemede ve mimari DIŞI görünümlerde pasif: kip yazıyor
ve mahal mimarinin nesnesi.

Klavye: 1–9 ilk dokuz rozet, ← → duraklar arası, Esc çıkış.

Nerede: `core/roomDefinition.ts`, `store/architectureUiStore.ts`,
`ui/canvas/RoomDefinitionCard.tsx`, `ui/canvas/canvasBarVariants.ts`,
`ui/MenuBar.tsx`, `ui/menu/menuDefinitions.ts`, `scene/Room.tsx`,
`scene/sceneTheme.ts`, `pages/EditorPage.tsx`.

### K146 — Mahal tanımlama kipi: gözden geçirme turu, arama, daha geniş odak

Kullanıcının kip üstünde üç bulgusu.

**1. Hepsi tanımlıyken menü maddesi ne yapmalı?** Kullanıcı "ya pasif olsun ya
yanında yeniden tanımla tuşu olsun" dedi ve uyarı gerekip gerekmediğinden emin
değildi. Seçilen yol: madde AKTİF kalır, tanımsız mahal yoksa kip TÜM mahalleri
gezer — gözden geçirme turu. Böylece ölü tıklama da olmaz, ikinci bir düğme de
gerekmez.

⚠️ Tur SIFIRLAMA DEĞİL: hiçbir tip silinmiyor, kullanıcı gezip isterse üstüne
yazıyor. **Bu yüzden onay penceresi de YOK** — yıkıcı olmayan bir işlemin
uyarısı, kullanıcının her seferinde geçtiği gereksiz bir kapıdır (yanlış yazılan
tip zaten Ctrl+Z ile döner). "Hepsini sil, baştan tanımla" seçeneği bilerek
yazılmadı: kimse tipleri kaybetmek istemiyor, istediği şey yeniden GEZMEK.

⚠️ Madde yalnız katta HİÇ mahal yokken pasif (`floorRoomCount === 0`).
"Hepsi tanımlı" pasiflik sebebi değil.

⚠️ İlerleme mantığı bu yüzden değişti: `advanceAfter` önce ileride TANIMSIZ
durak arar, bulamazsa SIRADAKİ durağa geçer ve yalnız SON durakta kipi kapatır.
Eski hâli gözden geçirme turunda ilk düzeltmeden sonra kipi kapatıyordu
(tarayıcıda yakalandı).

**2. Rozetlerde arama — ve rakam kısayollarının KALDIRILMASI.** Yirmi beş tip arasında gözle aramak zorlaşıyordu.
Kutu Türkçe duyarsız (`includesTr`): "saft" → Şaft, "camasir" → Çamaşırlık.
⚠️ Rozetlerdeki 1–9 rakam kısayolları KALDIRILDI (kullanıcı kararı: "hepsine
yetmiyor"). Tek basışlık tuş dokuz taneydi, liste yirmi beş — kısayol tiplerin
ancak üçte birine yetiyordu ve "hangilerinde var?" diye bakılan ikinci bir kural
üretiyordu. Hızlı yol artık yalnız arama kutusu. ⚠️ Kutu yine de ODAK ALMIYOR
(autoFocus yok): kip açılır açılmaz odak kutuya gitseydi ok tuşlarıyla duraklar
arasında gezinmek çalışmazdı. ⚠️ Kutuda Esc önce ARAMAYI temizler, boşken kipi
kapatır — ve bunu kutunun kendisi yapar, çünkü pencere dinleyicisi yazı
alanlarını atlıyor (`isTypingTarget`). Enter görünen ilk rozeti yazar.

**3. Kamera fazla yakındı.** `FOCUS_MARGIN_RATIO` 0,35 → 0,85 ve asgari pay
60 → 150 cm. Mahal ekranı doldurunca komşu duvarlar kadraj dışında kalıyor ve
kullanıcı planda nerede olduğunu kaybediyordu; sorulan mahalin BAĞLAMI da
görünmeli.

**4. Kipten çıkış yolları.** Kart X'i ve Esc yetmiyordu; kullanıcı "sahneye
tıklayınca da çıksın" dedi — tuvale dönmek, işi bıraktığının en doğal işareti
(`scene/useRoomDefinitionExit.ts`). ⚠️ Yalnız SOL tuş: orta tuş kaydırma, sağ tık
araçtan çıkma jesti (K84); kaydırmak için tuvale basınca kipten düşmek kipi
kullanılamaz kılardı. Hook <Canvas> içinde mount ediliyor, köprü store — kart
DOM tarafında ve ui/ ↔ scene/ importu yasak.

Kart 200 satırı aştığı için arama + rozetler `ui/canvas/RoomUsagePicker.tsx`'e
ayrıldı: kart durakları ve gezinmeyi, picker tip seçmeyi biliyor.

Nerede: `core/roomDefinition.ts`, `ui/canvas/RoomDefinitionCard.tsx`,
`ui/canvas/RoomUsagePicker.tsx`, `ui/MenuBar.tsx`.

### K147 — Kolon Hattını Sil ve Daire İçi Tesisatları Sil

Araçlar menüsündeki iki pasif madde çalışır hâle geldi. İkisi aynı ağın
birbirini tümleyen iki kesiti; bölümleme TEK yerde
(`plumbing/core/networkPartition.ts`).

⚠️ **SINIR SAYAÇ, "tüketim vanası" DEĞİL.** Şartname bağımsız bölümü tüketim
vanasıyla tanımlıyor ama modelde öyle bir tür YOK: vana tek tür (`valve`) ve
`ValveProperties.type` serbest metin, "bu bir tüketim vanasıdır" diyen bir
işaret hiç üretilmiyor (K142'de "Tüketim Vanalarını Ekle" / "DN25 Yap"
maddelerinin kaldırılma gerekçesi de buydu). Sayaç tiplendirilmiş, "1 daire =
1 sayaç" kuralı yazılı ve `unitNumber`/`subscriberName` taşıyor — şartnamenin
"bağımsız bölüm bazında" istediği döküm oradan çıkıyor. Kullanıcı bu
uyarlamayı onayladı ve "tüketim vanası eklemeyeceğiz" dedi.

Sınır kararı `isUnitBoundaryElement` fonksiyonunda TEK satır: tüketim vanası
kavramı bir gün eklenirse değişecek tek yer orasıdır, çağıranlar (iki silme,
sayımlar, onay penceresi) olduğu gibi kalır.

**Kolon Hattını Sil** — servis kutusundan sayaçlara kadar olan gövde (kolon +
branşman + üstlerindeki armatürler). Kapsam DAİMA TÜM KATLAR, kat seçimi
sorulmaz (şartname şartı: hat düşeydir, tek katta kesmek onu ortasından
koparırdı). ⚠️ Servis kutusu gövdeye GİRMEZ — kaynak gidince kullanıcı
yeniden çizmeye başlayamazdı. Sayaçlar ve daire içi kalır, uçları serbest.

**Daire İçi Tesisatları Sil** — sayaçların çıkışından sonrası. Kapsam AKTİF KAT
(kullanıcı kararı); kat SAYACIN katıdır, dairenin tesisatı kat bağlantısıyla
üst kata taşıyorsa o parça da gider. Etiket "Tesisat Sil"den değiştirildi: eski
ad TÜM tesisatı silecek sanılıyordu.

⚠️ **İki madde YALNIZ TESİSAT görünümünde açık.** Kozmetik değil: geri alma
AKTİF GÖRÜNÜMÜN geçmişine gidiyor (K123) ve tesisat aynası yalnız
tesisat/izometrikte gezilir — mimaride çalıştırılsaydı Ctrl+Z tesisatı değil
DUVARI geri alır, onay penceresindeki "geri alınabilir" sözü yalan olurdu.
Tarayıcıda yakalandı. İzometrik de dışarıda: orada aktif kat kavramı yok (K124).

Onay penceresi AYRI YAZILMADI: var olan `CascadeDeleteDialog` iki yeni `kind`
ile genişletildi (kolonda hat uzunluğu, daire içinde bağımsız bölüm bazlı
döküm). İkinci bir pencere, "geri alınabilir" notunu ve kat yayılma uyarısını
iki yerde tutmak demekti.

Menü mantığı `ui/menu/useToolsMenuActions.ts`'e taşındı (MenuBar 200 satırı
aşmıştı); pasiflik hesabı da orada tek yerde.

Nerede: `plumbing/core/networkPartition.ts`, `plumbing/store/deletionActions.ts`,
`plumbing/store/plumbingUiStore.ts`, `plumbing/ui/CascadeDeleteDialog.tsx`,
`ui/menu/useToolsMenuActions.ts`, `ui/MenuBar.tsx`, `ui/menu/menuDefinitions.ts`.
### K148 — Tesisat geri alma, projedeki İLK düzenlemede her şeyi siliyordu

Kullanıcı bulgusu: "kolon hattını sil dedim, geri almaya tıkladığımda her şey
gidiyor."

**Sebep — tesisat geçmişi aynası tohumlanmıyordu.** `plumbingHistory` cadStore'un
DIŞINDA ayrı bir ayna store; zundo yalnız onu izliyor ve aynayı SADECE
`plumbingSlice`'ın tesisat action'ları (`record()`) güncelliyor. Proje yükleme
oradan geçmediği için ayna projenin başında BOŞ kalıyordu. Kullanıcı ilk tesisat
düzenlemesini yapınca zundo "önceki durum" diye o boş aynayı geçmişe itiyor,
Ctrl+Z de bütün tesisatı siliyordu.

⚠️ `resetPlumbingHistory` yazılmıştı ama üretimde HİÇ ÇAĞRILMIYORDU — yalnız
testlerde. Test kendi aynasını kurduğu için hata testlerde hiç görünmedi.

Düzeltme: cadStore'un tesisata dokunan üç yolu aynayı da eşitliyor
(`mirrorPlumbingHistory`) — `loadProject` sıfırlayarak (yeni başlangıç,
`temporal.clear()` ile aynı yerde), `loadProjectDrawing` ve
`clearProjectDrawing` kaydederek (ikisi de geri alınabilir DÜZENLEME).

⚠️ Aynı sınıftan bir yol daha var: `floorOps` kat silerken o katın tesisatını
da temizliyor ve aynayı güncellemiyor. Bu adımda DOKUNULMADI — kat silme kendi
onayı ve kendi testleriyle gelen ayrı bir yol; düzeltilecekse ölçülerek
düzeltilmeli.

Hata K147'nin toplu silmesiyle görünür oldu ama ondan ÖNCE de vardı: proje
açıp tek bir boru silen kullanıcı da aynısını yaşıyordu.

Nerede: `store/cadStore.ts`.

### K149 — Araçlar maddeleri görünüme göre kapanmaz, kullanıcıyı sahnesine ATAR

Kullanıcı fikri: "mimari tasarımda kolon hattını sil / daire içi tesisatı sil
tuşuna da tıklayabilelim ama tıkladığımızda bizi tesisat sahnesine atsın; aynı
şekilde tesisat ekranındayken de mahalleri tanımlaya tıklayabilelim ama bizi
mimari ekrana atsın."

K147'de bu üç madde YANLIŞ görünümde PASİFTİ. Gerekçe sağlamdı (geri alma aktif
görünümün geçmişine gider, K123/K148) ama çözüm yanlış yerdeydi: kullanıcıya
"burada yapılamaz" deyip nerede yapılacağını söylemiyordu.

Artık madde her görünümden tıklanabilir; `run` işlemden ÖNCE
`setActiveView` ile doğru sahneye geçiyor (`goToView`). Geri alma güvenliği
BOZULMUYOR: işlem çalıştığı anda aktif görünüm zaten doğru.

⚠️ Zaten doğru sahnedeysek `setActiveView` ÇAĞRILMAZ — gereksiz geçiş seçimi
temizler (K53) ve kullanıcının seçimini sebepsiz düşürürdü.

⚠️ Pasiflik yalnız ÇİZİMDEN gelir artık: katta mahal yoksa "Mahalleri Tanımla",
silinecek gövde/daire içi yoksa silme maddeleri kapalı. Salt görüntülemede üçü
de kapalı (hepsi yazıyor).

Nerede: `ui/menu/useToolsMenuActions.ts`.

### K151 — Duvar rengi koyu lacivert-antrasit

Kullanıcı bir referans görsel paylaştı ve duvar rengi olarak onu istedi.
`SCENE_COLORS.wallFill` `#6b7280` (orta gri) → `#2e3446`.

**Neden yalnız koyulaştırma değil, hiyerarşi düzeltmesi.** Eski değerde planın
EN ÖNEMLİ elemanı EN SOLUK çizilendi: kiriş (`#3e4a5a`), açıklık konturu
(`#5a6675`), alan nesnesi (`#4e5661`) ve cihaz sembolü (`#2f3a49`) duvardan
KOYUYDU. Artık duvar en koyu, kalan katmanlar ondan açılarak sıralanıyor.

Vurgu tonları duvara göre yeniden dengelendi (bir tık açık kuralı korunarak):
`wallHover` `#8c93a0` → `#4a5468`, `cornerHover` `#a6adb8` → `#63708a`. Eski
değerler yeni duvarın yanında "vurgu" değil "başka bir nesne" gibi okunuyordu.

⚠️ AÇIK KALAN İKİ İŞ (kullanıcı henüz seçmedi): mimari NESNE ile mimari CİHAZ
renginin ayrışması ve ölçü yazısı rengi. `pointSymbol` (`#2f3a49`) artık yeni
duvar rengine ÇOK YAKIN — duvara oturan cihazlar (menfez) okunurluk kaybediyor.
Palet seçilince ikisi birlikte çözülecek.

Nerede: `scene/sceneTheme.ts`.

### K152 — Mimari renk sistemi: aileler, kendi ölçü katmanı, ton yönleri

Kullanıcı: "her şey çok gri geliyor bana". Sebep tek tek renklerde değil
YAPIDAydı: mimari katmanın altı tonu da aynı dar gri aralığındaydı ve üç ayrı
şey aynı token'ı paylaşıyordu.

⚠️ İki gizli ödünç alma bulundu ve kesildi:

- **Duvar ölçüsünün kendi rengi YOKTU**, `ARCHITECTURE_COLORS.wall`'ı ödünç
  alıyordu; ölçü katmanı duvarla aynı ağırlıkta okunuyordu.
- **Cihaz ad etiketi `areaObjectStroke` ödünç alıyordu**: cihaz bir renkte, ADI
  başka renkte çiziliyordu.

**Cihaz rengi artık TÜRE GÖRE.** Eskiden tek renkti ve gerekçesi "cihazı ayırt
eden RENK değil ŞEKİL"di; kullanıcı planda güvenlik ekipmanını bir bakışta
görmek istediği için bu kural DEĞİŞTİ (`POINT_SYMBOL_COLORS`).

| Katman | Renk |
|---|---|
| Duvar + kiriş | `#2e3446` — kiriş duvarla AYNI: ikisi de taşıyıcı yapı |
| Alan nesnesi (kolon/şaft/havalandırma/merdiven) | `#5a6472`, yazı `#3f4854`, hover `#8b95a5` |
| Güvenlik (söndürücü/şalter/alarm/sensör) | `#c62828`, yazı `#8f1d1d`, hover `#e05252` |
| Menfez + pano | `#9ec3d4`, yazı `#4a7d92`, hover `#c3dde8` |
| Aydınlatma | `#e08a1e`, yazı `#a35c07`, hover `#f0a94b` |
| Duvar ölçüsü | `#4e2f8f` (koyu, soğuk mor) |
| Açıklık ölçüsü | `#8b5cf6` (aynı ailenin açık tonu) |
| Oda dolgusu | `#94a3b8` · 0,16 · etiket `#46505f` |

**Ton yönleri tüm ailelerde AYNI** (kullanıcı kuralı, teste bağlandı):

- **hover AÇILIR** — nesne imleç altında aydınlanır. Önce koyulaştırma
  denenmişti; buz mavisi gibi AÇIK bir aile koyulaşınca "seçildi" gibi
  okunuyordu, aydınlanma ise her ailede aynı anlama geliyor.
- **ad etiketi KOYULAŞIR** — beyaz zeminde okunsun.
- **önizleme AYNI renk, yarı saydam** (`PREVIEW_OPACITY`): "yerleştirince böyle
  görünecek" bilgisi renkten okunmalı; ayrı bir gri önizleme rengi bunu
  gizliyordu. Alan nesnesindeki desen cihazlara da taşındı.
- **SEÇİM bu kuralın DIŞINDA**: sistem geneli tek renk (mavi).

⚠️ Alan nesnesi duvardan AÇIK olmak ZORUNDA: kolon/şaft çoğu kez duvarın
ÜSTÜNE oturuyor ve orada ayırt edilebilmeli — koyulaştırmanın tabanı bu.
Konturları da inceltildi (gövde 1/6, ayrıntı 1/11 duvar kalınlığı).

⚠️ Marka sarısı (#FFC107) tuvale GİRMEZ; aydınlatma kehribarı ondan uzak
seçildi. Güvenlik kırmızısı reddedilen yerleştirmenin kırmızısından
(`previewInvalid`, #d64545) ayrı — ikisi karışırsa her söndürücü hata sanılır.

`ARCHITECTURE_COLORS.wall` → `beam` olarak yeniden adlandırıldı (duvarı zaten
`SCENE_COLORS.wallFill` çiziyordu); ölü kalan `pointSymbol` ve
`pointSymbolLabel` token'ları silindi.

Nerede: `scene/architectureTheme.ts`, `scene/sceneTheme.ts`,
`scene/architectureStrokeStyle.ts`, `scene/PointSymbol.tsx`,
`scene/AreaObject.tsx`, `scene/Beam.tsx`, `scene/WallDimensionLabels.tsx`,
`scene/AreaObjectNameLabels.tsx`, `scene/PointSymbolNameLabels.tsx`.

### K153 — Boru ölçüsü kendi anahtarına ayrıldı, ızgara çubuğa taşındı

Kullanıcı: "tesisat boru uzunlukları için floating barda görünüme ekleyelim,
ölçüler düzenli olmuş olur" + "görünümdeki ızgara tuşunu floating bara icon
olarak taşı, snap işaretinin yanına".

**1. Ölçüler ikiye ayrıldı.** `isDimensionsVisible` artık YALNIZ mimarinin
(duvar parçası ölçüsü); boru boyu kendi bayrağında (`isPipeLengthsVisible`).
Menüdeki etiket de netleşti: "Ölçüler" → mimaride **"Duvar ölçüleri"**,
tesisatta **"Boru ölçüleri"**.

⚠️ **"Boru ölçüleri" MİMARİ menüde DE var** (kullanıcı kararı) ve bu bilinçli
bir istisnadır: mimariden tesisatı yöneten TEK anahtar. Gerekçe — mimarideki
tesisat izi boru boylarını da yazıyor, kullanıcı duvar ölçüsü okurken onları
kapatabilmeli ve bunun için tesisat görünümüne geçmek zorunda kalmamalı.
Bayrak TEK: iki menü, aynı anahtarın iki giriş noktası — birinde kapatılan
ötekinde de kapalı. Mimari listede EN SONDA duruyor ki mimarinin kendi
katmanları yukarıda kalsın, istisna sonda okunsun.

⚠️ Bu K131'in "tek bayrak iki görünümü de yönetir" kararını GERİ ALIYOR. O
kararın gerekçesi menü çubuğundaki tek "Ölçüleri Göster" maddesinin hangisini
kastettiğini söyleyememesiydi; o menü K90'da kalktı ve K150'den sonra iki ölçü
gerçekten iki ayrı görünümde yaşıyor. Tek anahtar, tesisatta boru boyunu
kapatmak isteyeni mimaride duvar ölçülerinden de ediyordu.

**2. Izgara görünürlüğü Görünüm menüsünden ÇUBUĞA taşındı**, snap düğmesinin
YANINA: ikisi de ızgarayla ilgili — biri onu gösteriyor, öteki ona yapıştırıyor.

⚠️ Izgara menüde artık YOK. Aynı anahtarı iki yerde sunmak hangisinin ne
yaptığını belirsizleştirir (K111'in kuralı). ⚠️ Izgara düğmesi İKİ görünümde de
var; snap ise yalnız mimaride (K57 gerekçesi geçerli: tesisatın yakalaması
ızgara GÖRÜNÜRLÜĞÜNE bağlı, aynı düğme orada başka şey ifade ederdi).

**3. Menü ÖBEKLENDİ ve cihaz adları ayrıldı** (kullanıcı isteği). Düz liste
yerine ince çizgilerle üç öbek:

1. Ölçüler: Duvar ölçüleri · Kapı/pencere ölçüleri · Boru ölçüleri
2. Açılar
3. Adlar: Yapı elemanı adları · Cihaz adları · Oda adları

⚠️ "Nesne adları" → **"Yapı elemanı adları"** ve CİHAZ adları AYRI bir
anahtara çıktı (`isDeviceNamesVisible`). Eskiden ikisi tek bayraktaydı,
gerekçesi "kullanıcı için ikisi de nesnenin adı"ydı — K152'de renkler
ayrılınca yapı elemanı ile cihaz iki ayrı aile oldu, adlandırma da onu izledi.


**4. Mimari açılış kadrajı ve ızgaranın kalıcılığı** (kullanıcı kararı).

Açılışta YALNIZ **duvar ölçüleri** ve **oda adları** açık; kapı/pencere ölçüsü,
açılar, yapı elemanı adları, cihaz adları ve boru ölçüsü KAPALI. Gerekçe: plan
ilk açıldığında okunabilir olmalı — hepsi açıkken küçük dairelerde yazılar üst
üste biniyor ve kullanıcı çizimi göremeden katman kapatmakla başlıyordu.

⚠️ Bu, K74/K76'daki "açıklık ölçüsü varsayılan AÇIK" kararını GERİ ALIR. O
kararın gerekçesi geriye uyumluluktu ("yeni anahtar davranışı değiştirmemeli");
kullanıcı artık açılış kadrajını bilerek seçti.

⚠️ Boru ölçüsü bayrağı tesisatla PAYLAŞILIYOR, dolayısıyla kapalı varsayılan
tesisat görünümünü de etkiliyor: orası da boru boyları kapalı açılıyor. Ayrı
varsayılan istenirse bayrağı ikiye bölmek gerekir ve o zaman "tek anahtar, iki
giriş noktası" kuralı düşer.

⚠️ **Izgara görünüm geçişinde SIFIRLANMAZ.** Eskiden `setActiveView` tesisatta
kapatıp mimaride açıyordu; gerekçesi ızgaranın boru hayaletiyle karışmasıydı.
Anahtar menüden çubuğa çıkınca bu otomatik ezme hataya dönüştü: kullanıcının
bilerek kapattığı ve önünde duran bir düğme kendiliğinden geri açılıyordu.

⚠️ HİÇBİRİ KALICI DEĞİL: `uiStore` kaydedilmiyor (ne `localStorage` ne sunucu),
sayfa yenilenince hepsi bu varsayılanlara döner. Bilinçli — bunlar projeye
değil kullanıcıya ait tercihler ve projeye yazılsaydı bir kullanıcının kapattığı
katman başka kullanıcıda da kapalı açılırdı. Cihaz başına hatırlama istenirse
ayrı bir karar (`persist` sarmalayıcı + hangi alanların kaydedileceği).

Nerede: `store/uiStore.ts`, `ui/canvas/ViewOptionsMenu.tsx`,
`ui/canvas/FloatingToolbar.tsx`, `plumbing/scene/LengthLabels.tsx`,
`scene/PointSymbolNameLabels.tsx`, `scene/usePointSymbolLabelTool.ts`.

### K154 — Kat planı paftası TESİSAT ODAKLI: mimari içi boş çizilir

Kullanıcı: "PDF'te tesisat odaklı bir görünüm istiyorum, mimari olan her şey
renksiz gözükebilir; duvarlar içi boş, yalnızca dışında ince bir stroke."

Aynı oturumda başlangıç şikâyeti "K152 renk değişikliklerim PDF'te
gözükmüyor"du. **Hata değildi ve düzeltilmedi**: PDF'in kendi paleti var,
ekrandaki mimari renkler oraya hiç ulaşmıyor. Mimari zaten renksizleşeceği için
ekran paletini kâğıda taşımanın anlamı kalmadı — istek, bu kopukluğu bir karara
dönüştürdü.

**Tek mod, kip yok.** Pafta her zaman tesisat odaklıdır; "mimari pafta / tesisat
paftası" seçimi eklenmedi. Kip, `buildPlanSvg` imzasını ve tüm test
beklentilerini parametreleştirmeyi gerektirirdi ve kimse mimari pafta istemedi.

**Kapsam YALNIZ kat planı.** Görünüş, izometri, vaziyet ve oturum paftaları
`SVG_COLORS`ü kullanmaya devam ediyor; kat planı yeni `PLAN_COLORS`a taşındı.
⚠️ Ortak sabitleri değiştirmek dört paftayı birden silikleştirirdi — ikisinin
ayrı durmasının tek sebebi bu.

⚠️ **Duvar İKİ GEÇİŞTE çiziliyor.** Her duvarı tek tek konturlamak yanlış sonuç
verir: kapsüller (K23) kavşakta üst üste biner ve her birinin konturu ötekinin
İÇİNDEN geçer — spagetti. Bunun yerine önce TÜM duvarlar `kalınlık + 2×kontur`
genişliğinde kontur renginde, sonra TÜM duvarlar tam kalınlıkta beyaz basılıyor.
Geriye birleşimin dış çeperi kalıyor — polygon union yazmadan, var olan
`svgLine` ile.

⚠️ İkinci geçiş OPAK. Duvarın altındaki hiçbir şey görünmüyor; bu yüzden
duvarlar en alta indi ve **oda dolgusu tümden kalktı**.

⚠️ **Açıklığın beyazı şişirilerek basılıyor.** Poligon tam duvar kalınlığında;
olduğu gibi bırakılsaydı duvarın iki yüz çizgisi açıklığın önünden kesintisiz
geçer, delik "delik" gibi okunmazdı. Aynı renkte kontur poligonu her yöne yarım
genişletiyor, bu yüzden pay kontur kalınlığının İKİ katı (`WALL_OUTLINE_CM`
`svgPrimitives`te duruyor: iki dosya aynı sayıya bağlı).

**İKİ kademe, tek ton değil** (kullanıcı kararı): duvar `#5b6674` belirgin, geri
kalan mimari `#a8b0bb` silik. Tek tonda merdiven basamağı ile duvar aynı
ağırlıkta çıkıyor ve plan yine kalabalık okunuyordu.

| Ne | Nasıl |
|---|---|
| Duvar + kiriş | `#5b6674` kontur, içi beyaz |
| Kapı/pencere, kapı KANADI, kolon, merdiven, şaft, cihaz sembolü | `#a8b0bb` kontur, hepsi İÇİ BOŞ |
| Oda adı + m², serbest metin, yapı elemanı adı | `#8a94a1` |
| Duvar ölçüsü | `#a8b0bb` |
| Tesisat eleman etiketi + kılavuzu | `#334155` |
| Tesisat hatları ve sembolleri | DEĞİŞMEDİ — ekrandaki renginde |

⚠️ **Tesisat kalınlaştırılmadı** (kullanıcı: "tesisat ne ise öyle kalsın").
Boru genişliği gerçek ÇAPTAN geliyor ve ölçekli paftada ölçülebilir bir bilgi;
öne çıkarmak için kalınlaştırmak onu bozardı. Öne çıkma arka planın
silikleşmesinden geliyor.

⚠️ **Etiket rengi artık `buildLabelSvg`e parametre.** Yapı elemanı adı ile cihaz
adı AYNI çizim yolundan geçiyor; sabit tek renk kalsaydı cihaz adı plan yazısı
gibi okunurdu.

⚠️ `SVG_COLORS.roomFill`, `openingFill`, `symbol` ve `objectFill` SİLİNDİ —
sahipsiz kaldılar, bu adlarla yeni kod yazma.

⚠️ **Köşe açıları paftadan KALKTI.** Dik köşede "90°" mimari bir ayrıntı;
tesisatçıya bir şey söylemiyor ve plandaki yazı kalabalığını artırıyordu.
Ekranda duruyorlar — kalkan yalnız kâğıt. `getCornerAngleAnnotations` yerinde,
kat planı artık çağırmıyor.

**Kolonun dolgusu da kalktı.** Eski gerekçe "taşıyıcı kütle planda boşluk gibi
okunmamalı"ydı; altından geçen boru mimari yüzeyin arkasında kalmasın diye kural
düştü.


### K155 — İzometrik pafta SABİT ve OBLİK; ekranın kamera izometrisinden ayrıldı

Kullanıcı: "PDF'teki Three.js screenshot / canvas görüntüsü yaklaşımını kaldır,
gerçek izometrik tesisat şeması üret."

⚠️ **Ortada screenshot YOKTU.** İzometrik sayfa K136'dan beri saf vektör:
`isometricSvg.ts` boruların gerçek 3B koordinatlarını projekte ediyor,
bounding box'tan `viewBox` kuruyor, `svg2pdf` ile basıyor. Three.js, kamera,
renderer, canvas ya da PNG yolun hiçbir yerinde yok; PDF'teki tek raster şey
kapaktaki firma logosu. İstenen akışın tamamı (3B nokta → toIso → 2B → SVG →
bbox+autofit → jsPDF) zaten mevcuttu, `xPipe`/`yPipe` gibi bir eksen
sınıflandırması da hiç olmamıştı. Kaldırılacak bir şey bulunamadı.

**İki gerçek kusur vardı:**

1. **Açı ekrandan geliyordu** (K122). "Üstten" ön ayarındayken (α = 89°) sayfa
   neredeyse plan görünümüne çöküyordu — teknik olarak screenshot değil ama
   DAVRANIŞ olarak kamera görüntüsü.
2. **İzdüşüm yanlış AİLEDENDİ.** Kâğıt ortografik izometri çiziyordu; teslim
   edilen gerçek gaz paftaları OBLİK çiziliyor.

**Karar: kâğıdın kendi izdüşümü var** (`getObliqueProjection`), ekrandan
tümüyle bağımsız ve sabit.

| Model ekseni | Kâğıttaki yön |
|---|---|
| plan x | TAM YATAY (0°) — ⚠️ K165'te 180°'ye çevrildi |
| plan y | 30° EĞİK (sol-aşağı, −150°) |
| kot | TAM DİKEY (90°) |

⚠️ **Bu bir İZOMETRİ DEĞİL, oblik (cavalier) izdüşüm — ve bilinçli.** Gerçek
izometride üç eksen EŞİT kısalır; kot dikey sabitlenince bu, kalan iki ekseni
ZORUNLU olarak yataydan ±30°'ye oturtur, yani hiçbir eksen yatay OLAMAZ.
Kullanıcının referans paftasında ve ona ait iki kat planında yatay segmentler
ölçüldü (uzun bağlantı 30,1°, `h:` etiketli her şey tam dikey, `L: 1 m`
segmentleri tam yatay) — o çizim izometri değil. Kâğıt referansa uyar.

⚠️ Önce gerçek izometri (β = 135°) yazıldı ve kullanıcıya "X yatay olursa
izometri olmaz" denildi; kullanıcı referans belgesini gösterince karar DÖNDÜ.
Genel doğru burada belirleyici değil, teslim edilen belgenin biçimi belirleyici.

⚠️ **Oblik hiçbir KAMERA açısıyla elde edilemez.** `Rx(α)·Ry(β)` ailesinde plan
x'i yatay yapan tek durum β = 0/180 ve orada plan y ekseni düşeyle ÇAKIŞIYOR
(ölçüldü: +Y ve +Z ikisi de 90°), plan derinliği tümüyle kayboluyor. Oblik
ortografik bir bakış değil, bir KESME (shear) dönüşümü.

**Sonuç: ekran ile kâğıt bilerek AYRIŞTI.** Ekrandaki 3B görünüm gerçek bir
ortografik kamerayla çiziliyor ve kesme yapamaz; orada döndürülebilir izometri
kalıyor (K122 geçerli, α/β hâlâ projeye yazılıyor ve EKRANI yönetiyor). Kalkan
tek şey o açının KÂĞIDA gitmesi.

⚠️ Bu yüzden `IsometricAngles` (bir kamera) yerine `IsometricProjection`
soyutlaması geçti: `project` + `offsetToWorld`. `buildIsometricScene`,
`layoutIsometricLabels` ve `buildIsometricSvg` artık açı değil izdüşüm alıyor;
ekran `getCameraProjection(angles)`, kâğıt `getObliqueProjection()` veriyor.

⚠️ **`project(offsetToWorld(o)) === o` sözleşmesi ZORUNLU** ve teste bağlı.
Kullanıcının elle ayırdığı etiket/dal kaymaları (`isometricOffsetCm`, K121) 2B
saklanıp sahnede 3B uygulanıyor; bu eşitlik bozulursa kaymalar yerinden oynar.
Oblik'te yatay kayma three x'e, düşey kayma kota gidiyor — ikisinin de z
bileşeni sıfır olduğu için eğik eksen hiç karışmıyor.

⚠️ Eğik eksenin YÖNÜ (sol-aşağı) okunabilirlik için: plan x yatay olduğundan
eğik ekseni sağ-yukarı almak ikisini yalnız 30° ayırır ve dikdörtgen bir kat
ince bir dilime çöker; sol-aşağıda ayrım 150° olur. Referans paftada koşu
sağ-yukarı gidiyor ama bu aynı eksenin öteki işareti — projenin plan yönüne
bağlı, tek işaret değişikliğiyle çevrilir.

12 yön vakası teste bağlandı (`isometricPaperAxes.test.ts`): altı eksen yönü,
dört yatay bileşim, X/Y ilerlerken ±Z, artı oran korunumu, üç bileşenli borunun
tek doğru çıkması, yatay eksenin KISALMAMASI (oblik'in tanımı) ve kaydırma
gidiş-dönüşü.

### K156 — İzometrik paftada etiket kalabalığı: künyesizler susar, halka kalkar

Kullanıcı: "bu izometri şemasında bu kadar isim kalabalığı olması beni aşırı
rahatsız ediyor."

Ölçüm: iki katlı küçük bir tesisatta (6 armatür + 2 sayaç + 2 kombi) sayfa **23
yazı satırı ve 10 kılavuz çizgisi** basıyordu. Kalabalık tek sebepten değil,
**üçünden** geliyordu ve ikisi düzeltildi.

**1) Her eleman KOŞULSUZ etiketleniyordu.** 15 eleman türünden 8'i yalnız kendi
ADINI yazıyordu: Vana, Solenoid Vana, Filtre, Manometre, Regülatör, Süzme
Sayaç, Servis Kutusu, İzolasyon. Hiçbiri sembolün söylemediği bir şey
söylemiyor, üstelik her biri bir de kılavuz çizgisi getiriyordu. Referans
paftada bu etiketlerin HİÇBİRİ yok.

⚠️ Kural `hasIsometricElementLabel`de ve YALNIZ sayaç + yakıcı cihaz geçiyor.
Künyesi olmayan yakıcı cihaz yine etiketlenir (yalnız "Ocak" gibi türünün
adıyla) — hangi cihaz olduğu paftanın KONUSU, armatürün adı değil.

⚠️ Görünürlük kuralı metin üretiminden AYRI dosyada değil ama ayrı
FONKSİYONDA: `getIsometricElementLabelLines` metni üretmeye devam ediyor, çünkü
ekran ile kâğıt aynı metni kullanıp farklı süzüyor.

**2) Yerleşim bir HALKAYDI.** `layoutIsometricLabels` tüm etiketleri çizimin
etrafında bir çembere diziyor ve her birinden çizimin üstünden geçen kesikli
bir kılavuz çekiyordu. Etiket sayısı arttıkça çember büyüyor, çizim ortada
küçülüyordu. Kâğıt artık `layoutLabelsBesideAnchors` kullanıyor: etiket KENDİ
nesnesinin yanında, çakışanlar itilerek ayrılıyor, kılavuz İSTİSNA.

⚠️ **Ekran DEĞİŞMEDİ.** Halka orada mantıklı: yazı ekran-sabit boyutta,
kullanıcı etiketi sürükleyebiliyor ve çizimden uzak durması gezinmeyi
kolaylaştırıyor. İki yerleşim yan yana duruyor, biri ötekinin yerine geçmedi.

⚠️ Yeni yerleşimde kayma sahne BOYUTUNDAN bağımsız (etiketin kendi boyu kadar);
halka sahne boyutuyla ölçekleniyordu ve `PAPER_RING_TIGHTNESS` /
`PAPER_LABEL_PULL` bunu kâğıt için sürekli geri kısmaya çalışıyordu. İkisi de
`LABEL_SEPARATION_FACTOR` ve `distanceFactor` alanıyla birlikte SİLİNDİ — bu
adlarla kâğıt tarafında yeni kod yazma.

⚠️ Geri çekme AYIRMADAN ÖNCE yapılıyor. Tersi denendi: turun son işlemi çekme
olunca sıkışık bir öbekte (40 cm içinde beş künye) ayrılan kutular geri
biniyordu — testte yakalandı.

⚠️ Ayırma yönü eşitlikte ANAHTARA bağlı; yoksa aynı proje her basımda biraz
farklı çıkardı (teste bağlandı).

**3) Künyeler 4 satıra kadar çıkıyor** — DOKUNULMADI. Referansta da 4 satır var;
sorun satır uzunluğu değil ADET ve YERLEŞİMDİ.

Sonuç aynı fixture'da: **23 → 16 yazı satırı, 10 → 0 kılavuz çizgisi.**

⚠️ Servis kutusunun künyesi de SUSTU. Referans paftada o künye VAR ("Servis
Kutusu S200 / 21 mbar / Yandan Çıkış"); kullanıcıya istisna tutulması seçenek
olarak sunuldu ve BİLEREK seçilmedi. Geri istenirse `hasIsometricElementLabel`
tek satırla açılır.


### K157 — İzometrik paftada servis kutusu ve sembol boyu

K156'nın seyreltmesinin ardından kullanıcının istekleri.

**1) Servis kutusu künyesi GERİ GELDİ.** K156'da künyesizlerle birlikte
susturulmuştu; gazın binaya girdiği tek nokta ve referans paftada künyesi var,
armatürlerle aynı kefeye konamaz.

⚠️ Etiketi TEK SATIR ("Servis Kutusu") kalıyor. Referanstaki "S200 / 21 mbar /
Yandan Çıkış" satırlarının modelde KARŞILIĞI YOK — servis kutusunun hiç özellik
alanı yok (`elementLabel.ts` onun için boş nesne döner). Alanlar eklenene kadar
bu satırlar UYDURULMAZ.

**2) Semboller kâğıtta KÜÇÜLTÜLDÜ** (`PAPER_SYMBOL_SCALE = 0.55`). Ekrandaki
boyutlarıyla basılınca şemanın büyük bölümünü kaplıyor, boruların arasında
yazıya yer bırakmıyorlardı. Ekranda o boyut doğru: sembol tıklanabilir bir hedef
ve zoom'la büyüyor; kâğıtta tıklanmıyor, yalnız okunuyor.

⚠️ Ayrı bir "incelme" ayarı GEREKMEDİ: ölçek `stroke-width`e de uygulanıyor,
sembol küçülürken çizgisi de inceliyor.

⚠️ **Çarpan çapa kaydırmasına da uygulanmak ZORUNDA.** Kaydırma zaten
`element.scale` ile çarpılmış geliyor (`getElementIsometricAnchor`); yalnız
ölçek küçültülseydi sembol küçülür ama kaydırma eski boyuna göre kalır ve
bağlantı noktası borudan KOPARDI. İkisi aynı çarpanı alınca port yine tam
yerine oturuyor. Teste bağlandı: ölçek 1 → 2 → 3 giderken öteleme EŞİT
aralıklarla kaymalı; iki çarpan ayrışırsa bu doğrusallık bozulur.

**3) SEGMENT BOYLARI yazıldı ve GERİ ALINDI.** Referans paftadaki `L: 1 m` /
`h: 0,3 m` etiketleri istendiği için her segmentin kendi uzunluğu kendi yanına
basıldı (düşeyler `h:`, kalanı `L:`). Kullanıcı gerçek çıktıda gördü:
"inanılmaz kalabalık göstermiş".

⚠️ Sebep ÖLÇEK: referans paftada bir avuç segment var, gerçek bir binada gövde
borusu onlarca parçaya bölünüyor ve her parçaya bir yazı düşünce K156'nın
seyreltmesi boşa gidiyor. Aynı gerekçe `isConsumptionLine`i doğuran karardaki
gerekçenin aynısı — orada da her hat parçasına boy/çap yazmak "rakam bulutu"
yapıyordu.

⚠️ `getIsometricSegmentLengthLabel`, `VERTICAL_SEGMENT_TOLERANCE_CM`,
`MIN_LABELLED_SEGMENT_CM` ve `LabelBox.direction` SİLİNDİ — bu adlarla yeni kod
yazma. Segment boyu yeniden istenirse eşik/seyreltme kuralıyla birlikte
tasarlanmalı, koşulsuz basılmamalı.

Boru uzunluğu paftada YİNE VAR: tüketim künyesindeki `(3) / 4,74 m / DN25`
hattın toplam boyunu veriyor.


### K158 — Katı Model: dördüncü görünüm, çizimin 3B TÜREVİ (izometrikten AYRI)

Kullanıcı isteği (2026-08): "odalar, borular vs. hepsi kat sayısına ve diğer
verilere göre 3B render olabilmelidir." Sahne seçicisine dördüncü düğme eklendi:
**Katı Model** (`ViewId = 'solid'`). İzometrik görünümle (K120–K124) İLGİSİZ,
ikisi ayrı iş: izometrik gaz hattının tek parça şematiği, katı model binanın
kütlesi. İkisi de salt okuma ve ikisi de kendi kamerasını kurar, ama ne
geometriyi ne de kamerayı paylaşırlar.

**Model DEĞİŞMEDİ.** Katı model store'a hiçbir alan eklemez; çizimin türevidir
ve `core/solidModel.ts`te her değişimde yeniden kurulur (oda poligonlarıyla aynı
kural: geometri kopyalanmaz). Kaydedilen JSON'a tek bir bayt girmedi.

Kütle şuradan gelir: kat kotu ve yüksekliği `core/floorElevation.ts`'ten,
duvar kalınlığı/yüksekliği `Wall`'dan, döşeme `findRoomFaces` çevriminden, boru
kotu `pipe.startHeightCm/endHeightCm` oranlamasından (K102), boru çapı
`PIPE_TYPES`'tan, eleman ayak izi sembolün kendi `bounds`undan.

**Duvar kutusu iki uçtan yarım kalınlık UZAR.** 2B'de duvar yuvarlak uçlu bir
kapsül (K23) ve kavşağı o yuvarlak uç dolduruyor. Kutu uzatılmasaydı her köşede
duvar kalınlığı kadar boşluk kalırdı. Uzatılan kutular kavşakta üst üste biniyor,
hepsi aynı opak renkte olduğu için fark okunmuyor — planla birebir aynı gerekçe.

**Kamera TAKAS edilir, eklenmez.** Katı modelde ortografik kamera +
`useViewportControls` HİÇ mount edilmez; yerine perspektif kamera + yörünge
kontrolü gelir (`scene/solid/SolidCamera.tsx`). İkisi birlikte mount edilemez:
ikisi de `makeDefault`, hangisinin kazandığı mount sırasına kalırdı. Kamera
konumu PROP olarak verilmez, yalnız "sıfırla" isteğinde elle yazılır — prop
olsaydı her store yazımında kullanıcının döndürdüğü açı başa dönerdi. İstek,
varsayılan kamera BİZİMKİ olana kadar bekler: `makeDefault` varsayılanı bir
layout effect'te değiştirdiği için ilk render'da kontroller hâlâ ortografik
kameraya bağlı; kontrol edilmeseydi konum o kameraya yazılır ve Katı Model'e
ilk basışta boş ekran, ikincisinde doğru görüntü gelirdi.

**Zemin MAHALE göre renklenir**: döşemenin rengi `Room.usageType`ten gelir
(`SOLID_ROOM_COLORS`), mahal kimliği 2B'dekiyle aynı duvar-kümesi imzasından
(`getWallSetKey`) çözülür. Katı modelde etiket olmadığı için mahal ancak
renginden okunuyor; tipi verilmemiş mahal nötr renkte kalır, varsayılan bir tip
UYDURULMAZ (K117).

**Alan nesnesi kutu DEĞİL** (`core/solidAreaObject.ts`): merdiven basamak
basamak yükselen bir kol (rıht sayısı planla aynı), baca şaftı içi BOŞ bir boru,
kolon havalandırması dolu silindir, kolon tek kutu. Hepsi plandaki sembolüyle
aynı biçim — kutu olarak çizildiğinde merdiven boşluğu dolu bir blok, şaft da
kör bir prizma görünüyordu. Şaftın et kalınlığı da modelde yok, oran olarak
yazılmış bir GÖSTERİM sabiti (`FLUE_SHAFT_INNER_RATIO`).

⚠️ **Üç ölçü modelde YOK, GÖSTERİM sabiti olarak yazıldı** (`core/solidWall.ts`,
`core/solidModel.ts`): kapı/pencere yüksekliği (`Opening` yükseklik taşımıyor,
bkz. K9), kiriş derinliği (`Beam` yükseklik taşımıyor) ve tesisat elemanının
düşey derinliği (sembol 2B bir damga). Bunlar modele YAZILMAZ, JSON'a girmez;
gerçek alanlar bir gün eklenirse sabitlerin yerini alır. Eleman ayak izi bu
listede DEĞİL — o uydurulmuyor, sembolün kendi kutusundan geliyor.

⚠️ **Bilinen sınır:** kotu olmayan hat türleri (baca, havalandırma kanalı, cihaz
kolu) kat tabanında düz çiziliyor. Modelde o kot YOK ve varsayılmadı — baca
düşeyde yükselmiş görünmez. Kot alanı eklenirse `core/solidInstallation.ts`
içindeki `getLineElevationsCm` tek noktadan düzelir.

### K159 — PDF kapağında MOCK ALAN KALMADI: her değer gerçek uçtan

Kapak künyesinin büyük kısmı `ProjectDetail.extras`ten okunuyordu; o nesne
geliştirmede uydurma, ÜRETİMDE `null` (K50/K51). Yani üretimde basılan
paftalarda tasarımcı, firma ve onay blokları BOŞTU ve geliştirme çıktısı
üretimden farklıydı. Kullanıcının paylaştığı gerçek uç gövdeleri incelenince
alanların çoğunun ZATEN VAR olduğu görüldü.

**Dört kaynak birleşiyor** (`useProjectSummary`):

| Uç | Verdiği |
|---|---|
| `GET /api/projects/{id}` | ad, numara, adres, proje/ısınma tipi, mesken/dükkân adedi, alan |
| `GET /api/projectfirms/{id}` | firma ünvanı, vergi no, adres, telefon, yetkili |
| `GET /api/gasdistributionfirms/{id}` | onay bloğundaki firma adı |
| `GET /api/projects/{id}/history` | tasarımcı ve onaylayan |

Firma sorguları PROJEDEN gelen kimliğe bağlı (`projectFirmId`,
`gasDistributionFirmId`), bu yüzden zincirli.

⚠️ **Tasarımcı adı GEÇMİŞTEN, oturumdaki kullanıcıdan DEĞİL.** Önce "PDF'i
kim alıyorsa onun adı" düşünüldü; yanlış: projeyi A çizip B bastırdığında
kapakta B yazardı ve aynı belge her basımda farklı bir isim taşırdı — üstelik
kapakta İMZA satırı var. Geçmişteki `projeKayit` satırı kim bastırırsa
bastırsın aynı kalıyor. Sunucuya `createdByUserId` eklemeye de gerek kalmadı.

⚠️ **Sistem yöneticisi oluşturmuşsa adı BASILMAZ**, firma yetkilisi
(`contactPerson`) yazılır: hesap bir kişi değil ("Sistem Yöneticisi") ve
projenin tasarımcısı da değil (kullanıcı kararı).

⚠️ Rol ayrımı METİN eşleştirmesiyle yapılıyor ve bu KIRILGAN.
`OperationHistoryDto` yalnız `roleSnapshot` (serbest metin) taşıyor, `roleCode`
taşımıyor — oysa `roles.ts` kontrolün kodla yapılmasını söylüyor. Kullanıcı
kaydından bilinen iki değer de listeleniyor (`"Admin"`, `"Yönetici"`).
TODO(esra): uca `roleCode` eklenince liste silinip `ROLE_CODES.admin`'e geçilecek.

⚠️ **Onaylayan da geçmişten** (`projeOnay`, en GEÇ satır — proje yeniden
onaylanmış olabilir). `GET /api/projects/{id}` onay bilgisi hiç döndürmüyor.

⚠️ Satır sırasına GÜVENİLMİYOR: koda göre süzülüp `createdAt` karşılaştırılıyor.

⚠️ Ekranın "Bilinmeyen kullanıcı" yer tutucusu kâğıda GEÇMEZ — kapakta boş
bırakmak doğru.

**Kapaktan KALKAN satırlar:**

- `MAHALLESİ`, `SOKAK / KAPI NO`, `TESİSAT NO` — sunucuda karşılığı yok; adresin
  tamamı `ADRESİ` satırında, il/ilçe zaten ayrı (kullanıcı kararı).
- `MÜH. GDF KAYIT NO` — `gdfRegistrationNumber` var ama projeye değil
  KULLANICININ yetki kaydına bağlı; tasarımcı projede yazmadığı için ulaşılamaz.
- `YETER NO` — sunucudan KALDIRILMIŞ (bkz. `projectFirmAuthorizations.ts`).
- `VERGİ D. / VERGİ NO` → `VERGİ NO`: proje firması gövdesinde `taxOffice` YOK.
  `joinTax` silindi.

`ADI SOYADI` etiketi `PROJE TASARIMCISI` oldu.

⚠️ `KAT ADEDİ` uçta yok ama BOŞ KALMIYOR: kapak çizimdeki kat sayısına düşüyor
(`buildCoverInfo`) — o da uydurma değil, kullanıcının çizdiği katlar.

⚠️ **Vaziyet planının sokak/kapı ayrıştırıcısı DÜZELTİLDİ.** Artık tam adresten
türüyor ve eski desen orada BOZULUYORDU — ölçüldü:
`"...No 12 Bornova/İzmir"` kapı numarasını `"va/İzmir"` diye okuyordu, çünkü
"Bornova" içindeki "no" hecesi eşleşiyordu. Üç düzeltme: `` kelime sınırı,
ardından RAKAM zorunluluğu ("Nolu Sokak" tetiklemesin), ve sona SABİTLEMEYİ
kaldırmak (numaradan sonra ilçe/il geliyor). "No" hiç yoksa kapı boş kalır.



⚠️ **CANLI UÇ, OpenAPI ÖRNEĞİNDEN FARKLI ÇIKTI** — ilk sürüm bu yüzden kapakta
firma satırlarını boş bastı (kullanıcı bildirimi, tarayıcıda ölçüldü):

- `projectFirmId` yanıtta YOK; yerine `projectFirmAuthorizationId` geliyor.
  Firma künyesi bu yüzden ÜÇ halkalı bir zincirle çözülüyor: proje → yetki
  kaydı (`GET /api/project-firm-authorizations`) → `GET /api/projectfirms/{id}`.
- Bina kodu detay yanıtında `code`, LİSTE yanıtında `buildingCode`. İkisi de
  okunuyor, ikisi de boşsa proje numarası kimliğe düşüyor.

⚠️ **Geçmiş BOŞ olabiliyor.** Ölçüldü: admin'in açtığı projede
`GET /api/projects/{id}/history` boş dizi dönüyor. "Geçmiş yoksa satır boş
kalsın" kuralı bu yüzden GERİ ALINDI — kaşe kutusu bomboş çıkıyordu. Kural tek
cümleye indi: **oluşturan bir proje firması kullanıcısıysa onun adı, değilse
proje firmasının YETKİLİSİ.** Yetkili uydurma değil, projenin bağlı olduğu
firmanın kayıtlı sorumlusu.
**KAŞE kutularının alt satırları** ayrı bir kural izliyor (kullanıcı isteği):

- **Tasarımcı kaşesi**: projeyi oluşturan kişi + firma ünvanı. Admin
  oluşturmuşsa oluşturanın yerine firma yetkilisi geçtiği için kutu yine dolu.
- **Gaz dağıtım kaşesi**: şirket adı + imzalayacak kişi. Proje ONAYLANMIŞSA
  onaylayan, değilse şirketin YETKİLİSİ (`gasdistributionfirms/{id}.contactPerson`).

⚠️ `approverName` ile `gasFirmContactPerson` AYRI alanlar. Kaşe bir imza yeri,
"ONAYLAYAN" satırı ise gerçekleşmiş bir işlem — yetkiliyi onaylayan diye
yazmak, onaylanmamış projede olmayan bir onayı ima ederdi. Bu yüzden satır boş
kalırken kutu dolu olabiliyor.
`extras` PDF yolundan tümüyle çıktı; detay EKRANI onu kullanmaya devam ediyor.

### K160 — Mahal kullanım tipi artık SAĞ TIK menüsünde; özellik paneli kalktı

Kullanıcı: mahale sağ tıklayınca oda seçili rengini alsın ve kaydırılabilir
bir listeden tip seçilsin; mahalin sağdaki özellik paneli tümüyle kalksın.

Mahali adlandırmanın üç yolu vardı ve ikisi uzaktı: özellik paneli önce
seçmeyi sonra panele gitmeyi istiyordu, "Mahalleri Tanımla" kipi (K145) ise
TÜM mahalleri gezen bir tur — tek bir odayı düzeltmek için ağır. Sağ tık
doğrudan o odaya iniyor.

⚠️ Menü YALNIZ seçim aracındayken açılır. Sağ tıkın çizim araçlarında zaten
bir işi var: aracı bırakıp seçime döndürmek (K84), duvarda ve boruda zinciri
bitirmek. Menü her araçta açılsaydı bu jestlerin üstüne binerdi. Seçim
aracında sağ tıkın başka bir işi yok — boşluk orada.

⚠️ Menü açılırken mahal SEÇİLİR: `Room.tsx`in dolgusu seçim rengine dönüyor,
ayrı bir vurgu katmanı gerekmedi.

⚠️ Konum PLAN koordinatı, ekran koordinatı DEĞİL. Menü drei `<Html>` ile
çiziliyor ve yerini kameradan alıyor; menü açıkken kaydırıp yakınlaştırmak
onu mahalin üstünde tutuyor (`TextLabelEditor` deseni ve aynı tuzaklar).

⚠️ Arama kutusunun taslağı yalnız menü AÇIKKEN mount olan bir alt bileşende.
Dışarıda tutulup effect ile sıfırlansaydı hem fazladan render turu doğardı hem
de "effect içinde setState" kuralı çiğnenirdi (eslint yakaladı).

**Panel tarafı:** `RoomProperties.tsx` SİLİNDİ ve `PropertyPanel` mahalde HİÇ
açılmıyor. Panelin mahal dalı zaten yarım çalışıyordu — mahal silinemediği ve
dönüştürülemediği için "Sil" düğmesi ve grup işlemleri gizleniyordu, yani
panel kendi kabuğunun yarısını kapatıyordu. `PropertyPanelShell.isDeletable`
de sahipsiz kaldığı için kalktı — bu adla yeni kod yazma.

⚠️ Panelin iki işi menüye TAŞINDI, kaybolmadı:

- **Alan (m²)** menü başlığının altında; tip seçerken bakılan ilk şey mahalin
  büyüklüğü. (Tuvaldeki mahal etiketi de yazıyor ama etiket kapatılabiliyor.)
- **"Tanımsız"** → menüde "Tipi kaldır" eylemi. Taşınmasaydı yanlış seçilen bir
  tip bir daha temizlenemezdi. Rozetlerin arasına konmadı: bu bir tip değil,
  tipi kaldıran bir eylem.

⚠️ **ÇOKLU SEÇİM kaybı bilinçli.** Panel birden çok mahale aynı tipi tek
hamlede yazabiliyordu; sağ tık menüsü tek mahal. Kullanıcı paneli tümüyle
kaldırmayı istedi ve toplu tanımlamanın kendi aracı zaten var (K145 kipi).

⚠️ `findRoomIdAt` `useSelectionTool` içinde yerel bir closure'dı, `core/roomPick`e
ÇIKARILDI: sol tık ile sağ tık aynı mahali bulmak zorunda. İki kopya olsaydı
biri değiştiğinde seçili görünen mahal ile işlem yapılan mahal ayrışırdı.

⚠️ Seçici `RoomDefinitionCard` ile PAYLAŞILIYOR (`RoomUsagePicker`): arama
kutusu, Türkçe duyarsız süzme ve rozet düzeni iki yerde de aynı. İkinci bir
liste yazılsaydı tip listesi büyüdüğünde biri geride kalırdı.

### K161 — Duvara çift tık düğüm açar, düğüme çift tık kaldırır

Kullanıcı isteği: duvara çift tıklayınca o noktada düğüm oluşup duvar ikiye
ayrılsın; bir düğüme çift tıklayınca düğüm kalkıp duvarlar birleşsin — ama üç
duvarın buluştuğu köşede çalışmasın, yalnız doğrusal duvarlarda.

⚠️ **Yeni geometri yazılmadı.** İki işin de mantığı zaten vardı ve ikisi de
ORTAK kapıdan geçiyor:

- Bölme: `applyWallSplit` — kesişim bölmesinin (K24) kullandığı yol.
- Birleştirme: `mergeWallsAtJoint` — taşımanın ürettiği artık düğümleri
  temizleyen `mergeCollinearWallsInDraft`in (K103) tek eklemlik hâli.

İkisi de bu iş için ÇIKARILDI (refactor), kopyalanmadı: iki kopya olsaydı biri
"aynı doğrultu" ölçüsünü ya da açıklık kaydırmasını farklı yapabilirdi ve
kullanıcı aynı jestten iki farklı sonuç alırdı.

⚠️ Bölmenin ÜÇ yan etkisi ayrılamaz ve `applyWallSplit`te birlikte duruyor:
parça üretimi, odaların duvar kümesinin genişletilmesi (`extendRoomsWithSplitPieces`,
K31) ve açıklıkların doğru parçaya taşınması. Biri atlanırsa oda adı sessizce
kaybolur ya da açıklık silinmiş duvara bağlı kalır.

**Reddedilen istekler** (hepsi sessizce düşer, proje KİRLENMEZ):

- Nokta bir AÇIKLIĞIN içine düşüyorsa bölme reddedilir — K24 kuralının aynısı,
  kullanıcının koyduğu veri sessizce kaybolmaz.
- Duvarın UCUNA çok yakın tıklama reddedilir (`MIN_PIECE_LENGTH_CM`): orada
  zaten düğüm var, ikincisi sıfıra yakın bir parça üretirdi.
- ÜÇ duvarlı köşede birleştirme çalışmaz: düğümü kaldırmak üçüncü duvarı havada
  bırakırdı, hangi ikisinin birleşeceği de belirsiz olurdu.
- AÇILI köşede çalışmaz: iki duvar tek doğruya indirilseydi köşe kaybolur,
  çizim kullanıcının çizmediği bir yere kayardı.
- Kalınlığı/yüksekliği FARKLI duvarlar birleşmez (K103'ten devralındı).


⚠️ **"Doğrusal" EL ÖLÇÜSÜNDE, matematiksel değil.** İlk sürüm taramanın
payını (1e-6) aynen kullanıyordu ve kullanıcı bildirdi: düğümü elle geri
düzleştirmek "180'e tamamlanmıyor, zorlanıyor" ve zorla düzleştirilse bile
birleşme çalışmıyordu. El hiçbir zaman tam 180° tutturamaz.

Tolerans artık ÇAĞIRANDAN geliyor ve iki yol AYRI:

| Yol | Pay | Neden |
|---|---|---|
| Tarama (K103, taşıma) | 0 | Temizlediği artıklar makine üretimi, birebir doğrusal. Pay açılsaydı kullanıcının bilerek çizdiği hafif açılı köşeler HER taşımada sessizce düzleşirdi. |
| Çift tık (K161) | 3° | Açık kullanıcı isteği ve düğüm elle sürüklenmiş olabilir. |

3° insan ölçeğinde: 4 metrelik iki kolda eklemin doğrudan sapması ≈ 5 cm.
Daha büyüğü, bilerek yapılmış hafif açılı köşeleri yutmaya başlardı.

⚠️ Birleşme geometriyi bu pay kadar DÜZLEŞTİRİR — düğüm silindiği için duvar
uçtan uca düz gider. Kaçınılmaz ve zaten istenen.
⚠️ Düğüm tıklanan HAM noktaya değil, onun duvara DİK İZDÜŞÜMÜNE konur. Ham
nokta yazılsaydı duvar, tıklamanın sapması kadar kırılırdı.

⚠️ Jest YALNIZ seçim aracında dinlenir. Çizim araçlarında çift tıkın kendi
anlamı var ya da olabilir; her araçta dinlenseydi kullanıcı duvar çizerken
istemeden düğüm açardı.

⚠️ Sıra önemli: önce DÜĞÜM aranır, sonra duvar (`resolveArchitectureTarget`
zaten bu sırada). Duvar önce sorulsaydı düğümü kaldırmak hiç mümkün olmaz,
her çift tık yeni düğüm açardı.

`DrawSurface` çift tıkı HAM olay olarak yayınlamaya başladı (`onDoubleClick`);
karar aracın hook'unda (kural 7).

⚠️ Tarayıcıda doğrulanamadı: elimizdeki proje boş, çift tıklanacak duvar yok.
Mantık 15 store testiyle kapalı (bölme, birleştirme, dört ret kuralı, açıklık
taşıma, kirlilik sayacı) ama JESTİN kendisi kullanıcı gözüyle denenmeli.

### K162 — Köşe sürüklemede 180° yakalaması

K161'in payını (3°) açtıktan sonra kullanıcı yine bildirdi: "açımız her
noktada 180'e güzel bir şekilde snaplenmeli... normal taşırken 180 snapi her
noktada çalışmıyor, özellikle EĞİK duvarlarda baya sorunlu."

Pay birleştirmeyi kurtarıyordu ama SÜRÜKLEME hâlâ yardımsızdı. Sebep yakalama
zincirindeydi: nokta → duvar noktası → duvar kenarı → **ızgara**. Eğik bir
duvarda ızgara noktaları duvarın doğrultusuyla HİÇBİR ZAMAN çakışmıyor, yani
köşeyi geri düzleştirmeye çalışan kullanıcıyı ızgara sürekli doğrunun dışına
çekiyordu. Eksen hizalı duvarlarda tesadüfen çakıştığı için sorun orada
görünmüyordu — kullanıcının "özellikle eğik duvarlarda" demesinin sebebi bu.

**Yeni yakalama türü: `collinear`.** Sürüklenen köşe, İKİ komşusundan geçen
doğruya yapışıyor. Eksen hizalaması DEĞİL, doğru izdüşümü — bu yüzden eğik
duvarlarda da çalışıyor.

⚠️ Zincirdeki yeri: gerçek köşeden SONRA, ötekilerden ÖNCE. Var olan bir
köşeye kaynamak düzleştirmekten önemli (aynı yerde ikinci `Point` doğarsa graf
kopar, K24); ama ızgara ve komşu duvar kenarı 180°'nin önüne geçmemeli.

⚠️ Yalnız komşuların ARASINA düşen izdüşüm kabul edilir (0 < t < 1). Doğru
üzerinde ama dışarıda kalan noktada açı 180° değil 0°'dir: iki kol aynı yöne
katlanır. Orada yakalamak, kullanıcıyı düzleştirdiğini sanırken duvarı
katlamış hâle getirirdi.

⚠️ Kılavuz yalnız TAM İKİ duvarlı köşede üretilir (`getCollinearGuide`). Üç
duvarlı köşede "doğrusal" diye bir şey yok — hangi ikisinin hizalanacağı
belirsiz olurdu ve seçilen ikisi hizalanırken üçüncüsü rastgele bir açıya
düşerdi. Duvarın ucunda da anlamsız: hizalanacak ikinci kol yok.

⚠️ CTRL yakalamayı kapatınca 180° de kapanır: kullanıcı o tuşa "hiçbir şeye
yapışma, tam istediğim yere koy" demek için basıyor. Kılavuz o durumda hiç
gönderilmiyor, yani `core/snap.ts` bir tuş bilmiyor.

⚠️ K161'in 3°'lik payı KALDI ve gereksiz değil: yakalama tolerans dışında
kalan (uzağa sürüklenmiş) bir köşede çalışmıyor, kullanıcı da her zaman
yakalamaya güvenmek zorunda değil. İkisi birbirinin yerine geçmiyor — biri
sürüklemeyi kolaylaştırıyor, öteki birleştirmeyi bağışlayıcı yapıyor.

### K163 — Serbest çizim aracı; KAYDEDİLMEZ

Palette `isPlanned` olarak duran "Serbest Çizim" yazıldı (K79 tersine): kalem
basılı tutulduğu sürece çizgi bırakıyor.

⚠️ **Çizgiler PROJEYE KAYDEDİLMİYOR** (kullanıcı kararı). Bu yüzden `uiStore`da
duruyorlar, `cadStore`da değil — orada yalnız kaydedilecek JSON var (kural 4).
`core/model.ts` sözleşmesine dokunulmadı ve WebCAD tur-dönüşü genişletilmedi.

İki sonucu var, ikisi de bilinçli:

- Sayfa yenilenince kaybolurlar (`uiStore` kalıcı değil, K153).
- **Ctrl+Z onlara DOKUNMAZ**: geri alma çizim geçmişini yönetiyor, bu store'u
  değil. Silmenin yolu SİLGİ.

⚠️ Silgi zaten vardı ama yalnız AÇIKLIK siliyordu (`useOpeningTool`). Serbest
çizgi silme oraya YAZILMADI — başkasının dosyası (CLAUDE.md sahiplik). İki hook
aynı yayına abone; kod tabanında zaten olan bir desen.

⚠️ Kimlik `takeNextId`ten ALINMIYOR. O sayaç projeye kaydediliyor (kural 6) ve
serbest çizim kaydedilmiyor — oradan id almak, kaydedilmeyen bir nota harcanan
boşluklar yüzünden proje sayacını sessizce ileri iterdi. Modül düzeyinde ayrı
bir sayaç var.

⚠️ **Örnek seyreltmesi zorunlu** (`MIN_SAMPLE_DISTANCE_CM`): fare saniyede
onlarca olay üretiyor ve hepsi yazılsaydı tek darbe binlerce nokta taşır, çizgi
her karede yeniden tamponlanırdı — K99'daki `bufferData` fırtınasının aynısı.
Eşik PLAN mesafesi: yakınlaştırınca daha sık örnekleniyor, yani detay zoom'la
artıyor. Eşiğin altındaki örnek AYNI diziyi döndürüyor ki React referanstan
değişmediğini anlasın.

⚠️ Tek TIKLAMA iz bırakmaz (`MIN_STROKE_LENGTH_CM`): aracı seçip tuvale bir kez
basan kullanıcı ekranda nokta bulmamalı.

⚠️ Silginin isabeti NOKTALARA değil SEGMENTLERE bakıyor: seyreltme yüzünden iki
örnek arası açılabiliyor ve yalnız noktalara bakan bir silgi çizginin
ortasından geçerken hiçbir şey silmezdi. İzdüşüm segment uçlarına KIRPILIYOR —
sonsuz doğru, kısa bir segmentin çok uzağını da "değdi" sayardı.

⚠️ **Yakalama YOK**: serbest çizim serbest olmalı. Izgaraya ya da duvara
yapışan bir kalem "elle not al" işini yapamazdı.

Darbe KATA bağlı: başka katta çizilen not görünmez. En üstte çiziliyor
(`RENDER_ORDER.label`) — altında kalan bir not notluğunu yitirir.

### K164 — Serbest çizim Ctrl+Z ile geri alınır

K163 çizgileri bilerek `uiStore`a koymuştu (kaydedilmiyorlar) ve o kararın
yan etkisi "Ctrl+Z onlara dokunmaz" idi. Kullanıcı bunu istemedi.

⚠️ Çizgiler yine KAYDEDİLMİYOR — çözüm onları cadStore'a taşımak DEĞİL. Orada
olsalardı projeye yazılırlardı (kural 4) ve WebCAD tur-dönüşü genişlerdi.
Bunun yerine krokinin KENDİ geri alma yığını var.

**İşlem tutuluyor, anlık görüntü değil** (`SketchOp`): silgi de geri
alınabilmeli ve "eklendi" ile "silindi" birbirinin tersi — tersini almak için
darbenin kendisini saklamak yetiyor.

⚠️ **Sıralama sorunu gerçek**: iki geçmiş ayrı store'da yaşıyor (çizim
zundo'da, kroki `uiStore`da) ve birbirinin zamanını bilmiyorlar. Ctrl+Z'nin
doğru cevabı "EN SON hangisi yapıldıysa o". Bu yüzden `sketchHistory.ts`
içinde tek bir sayaç ikisini de damgalıyor:

- Kroki yazımı `markSketchAction()` çağırıyor.
- Çizim değişikliği cadStore aboneliğiyle yakalanıyor (`revision` artışı).

Sonuç: duvar çizip sonra kroki çizen kullanıcı Ctrl+Z'de KROKİYİ, kroki çizip
sonra duvar çizen ise DUVARI geri alıyor.

⚠️ ARACA göre dallanmak yanlış olurdu: kullanıcı krokiyi bitirip seçim aracına
dönmüş olabilir, jest yine krokiyi geri almalı.

⚠️ `revision` sayacı sıralama için KULLANILAMAZ — geri alma geçmişinde izlenen
alanlar arasında değil (`partializeProjectState`), yani geri alındığında eski
değerine dönmüyor ve "hangisi daha yeni" sorusunu yanıtlayamıyor. Bu yüzden
ayrı bir saat gerekti.

⚠️ Damga ÇAĞIRANDAN vuruluyor: `uiStore` `sketchHistory`yi import edemez, o da
store'u import ediyor (döngü).

⚠️ Geri alma/yineleme saati İLERLETMEZ: ilerletseydi krokiyi geri alan bir
kullanıcı, ikinci Ctrl+Z'de çizime düşemezdi.

⚠️ Düğmenin AKTİFLİĞİ de kroki yığınına bakıyor: yalnız kroki çizilmiş bir
projede proje geçmişi boş olur ve düğme pasif görünürdü.

Tesisat/izometrik görünümde kroki yığınına HİÇ bakılmıyor — orada geri alma
tesisat aynasına gidiyor (K123), kroki mimarinin işi.

### K165 — İzometrik pafta plana göre AYNALANMIŞTI; plan x ekseni çevrildi

Kullanıcı: "izometride solda servis kutusu ve boru sağa doğru gidiyor ise bu
matematik yanlış. olması gereken servis kutusunun sağda olup borusunun sola
gelmesi. sadece x ekseninin yatayda simetrisi alınmış hali olmalı."

K155'in oblik izdüşümünde eğik eksenin açısı ve kotun dikeyliği DOĞRUYDU,
yanlış olan plan x'in işaretiydi.

| Model ekseni | K155 | K165 |
|---|---|---|
| plan x | 0° (sağa) | **180° (sola)** |
| plan y | −150° (sol-aşağı) | −150° — değişmedi |
| kot | 90° (dikey) | 90° — değişmedi |

```
ekran_x = −planX − planY·cos30°      ← tek değişiklik: baştaki eksi
ekran_y =   kot  − planY·sin30°
```

**⚠️ Bu bir yön tercihi değil, ÖLÇÜLEBİLİR bir hata.** Ölçüt plan ayak izinin
izdüşüm determinantı — yönelimin korunup korunmadığını söyleyen sayı:

| Pafta | planX → | planY → | determinant |
|---|---|---|---|
| kat planı | (1, 0) | (0, 1) | **+1** |
| izometrik, K155 | (1, 0) | (−cos30, −sin30) | **−0,5** |
| izometrik, K165 | (−1, 0) | (−cos30, −sin30) | **+0,5** |

Negatif determinant demek, çizim plana göre AYNALANMIŞ demek: o görüntü hiçbir
gerçek bakış açısından elde edilemez. K165 işareti artıya çekiyor ve iki pafta
aynı ele oturuyor.

**⚠️ `offsetToWorld` da değişmek ZORUNDAYDI.** `project(offsetToWorld(o)) === o`
sözleşmesi (K155) yalnız `project` çevrilseydi bozulur, gidiş dönüş `{−o.x, o.y}`
verirdi ve elle ayrılmış bütün etiket/dal kaymaları (`isometricOffsetCm`, K121)
kâğıtta yatayda ters düşerdi. Doğrusu `[-offsetCm.x, offsetCm.y, 0]`. İki satır
birlikte gider; birini çevirip ötekini bırakma.

**⚠️ K155'in eğik eksen gerekçesi YANLIŞTI, düzeltildi.** Orada "sağ-yukarı
alınsa plan x ile yalnız 30° ayrılır ve dikdörtgen kat ince bir dilime çöker"
yazıyordu. Geometrik olarak yanlış: `(1,0)` ile `±(cos30, sin30)` tarafından
gerilen iki paralelkenar birbirinin ayna eşi, alanları da eşit (`|sin30| = 0,5`)
ve iç açıları ikisinde de 30° *ile* 150°. Ayak izinin ŞEKLİ iki seçimde de aynı.
Sol-aşağının gerçek gerekçesi başka ve daha güçlü: **derinlik, kotun TERSİ yöne
gitmek zorunda** — sağ-yukarı alınsaydı hem "daha uzak oda" hem "üst kat" ekranda
yukarı giderdi ve çok katlı bir kolon şemasında uzak odalar üst kata binerdi.
Sonuç aynı kaldı, gerekçe düzeltildi; yanlış gerekçe bir sonrakinin "bunu
çevirsem ne olur" demesini kolaylaştırıyordu.

**⚠️ Kapsam yalnız KÂĞIT.** `getObliqueProjection`ın tek çağıranı
`ui/pdf/useExportPdf.ts`; ekran kendi `getCameraProjection(angles)`ını
kullanıyor ve DEĞİŞMEDİ (K155'in ekran/kâğıt ayrımı yerinde). Katı model ve plan
paftası da etkilenmiyor.

Yönelim `isometricPaperAxes.test.ts`'te iki testle kilitli: determinantın
POZİTİF ve 0,5 olması, bir de kullanıcının tarif ettiği durumun kendisi —
planda soldaki servis kutusunun kâğıtta sağda kalması. Determinant testi asıl
koruma: biri işareti geri alırsa 12 yön vakasından önce burası kırılır ve
sebebini de söyler.

**Değişmeyen bilinen sınırlar** (bu kararın konusu değil, tartışıldı ve
bırakıldı): izdüşüm hâlâ CAVALIER, yani derinlik ekseni ölçek 1,0 ve kâğıdı
yatayda şişiriyor (cabinet 0,5 seçenek olarak duruyor); ve her paralel
izdüşümde olduğu gibi bir çekirdek yön var — plan (−0,866, −1) doğrultusunda
~21° eğimle inen bir hat noktaya çöker. Gaz tesisatı yatay+düşey ağırlıklı
olduğu için pratikte erişilmiyor: Δkot = 0 olan hiçbir yatay hat, hiçbir düşey
hat çökmüyor.

### K166 — Kat yönetimi ve kopyalama tek pencerede yeniden tasarlandı; kat şeridi sahneye taşındı

Kullanıcı: "kat yönetimi ve kat kopyalama kısımları aşırı kalabalık geldi",
"sayfalardaki gereksiz açıklamaları da sil", "en sade ve işlevsel tasarımı
oluştur".

Ölçüldü: iki pencere, 16 dosya, ~1900 satır. Kat satırı başına DOKUZ öge
(tutamak, onay kutusu, ad kutusu, yükseklik kutusu, kot, iki rozet, "Aktif Yap"
düğmesi, iki ikon). Beş katlı projede ekranda 45 kontrol.

**Beş yapısal sorun vardı, kalabalık bunların belirtisiydi:**

1. **Pencere içinden pencere ve GİZLİ yazım.** `openCopyDialog` bekleyen
   taslağı sessizce store'a uyguluyor, sonra ikinci bir modal açıyordu. "İptal"
   o noktadan sonra hiçbir şeyi iptal etmiyordu.
2. **Aynı liste iki kez yazılmıştı** (`FloorTable`+`FloorRow` 273 satır,
   `FloorCopyTargetList` 161 satır) — aynı ters sıra, aynı kot, aynı rozet.
3. **Aynı bilgi üç yerde**: "boş kat" hem özet sayısı, hem satır rozeti, hem
   alttaki uyarı. "Aktif kat" hem özet hücresi hem satır rozeti.
4. **Açıklama paragrafları tasarımın kendini savunmasıydı**: üç cümle `SEÇ`
   sütununu, `AKTİF KAT` sütununu ve sürüklemeyi anlatıyordu.
5. **`AKTİF KAT` sütunu yanlış yerdeydi**: her gün yapılan bir iş, taslak
   üzerinde çalıştığı için Uygula'ya kadar yürürlüğe de girmiyordu.

**Kopyalama artık bir KİP, ayrı pencere değil.** Aynı liste hedef seçmeye
geçiyor; kaynak elle seçiliyor (aktif kat VARSAYILMAZ — kullanıcı çoğu zaman
baktığı katı değil başkasını çoğaltıyor), alttaki ince şerit iki içerik
anahtarını ve üzerine-yaz/atla kararını taşıyor.

**Kopyalama TASLAKTA bekliyor** (kullanıcı kararı: iki seçenek sunuldu, (b)
seçildi). `DraftFloor.copyFromFloorId` → `DraftFloor.pendingCopy`
(`{sourceFloorId, isArchitectureIncluded, isInstallationIncluded}`); alan hem
YENİ kat "X'tan kopyalayarak" eklendiğinde hem MEVCUT kat hedef seçildiğinde
kullanılıyor — iki yol tek kavrama indi. Mekanizma sıfırdan yazılmadı, alan
zaten vardı, yalnız kapsamı genişledi.

⚠️ **"Üzerine yaz / atla" kipi taslakta SAKLANMAZ.** Kip hedef listesini süzen
bir karar; taslakta duran şey kipin SONUCU, yani gerçekten kopyalanacak katlar.

⚠️ **`copyFloorToTargets` action'ı SİLİNDİ** — bu adla kod yazma. Tek yazım
`applyFloorPlan`; ayrı action iki `set` çağrısı, dolayısıyla iki Ctrl+Z
demekti.

⚠️ **Kopyalama fazı ÜÇ ADIM: önce hepsini OKU, sonra SİL, sonra YAZ**
(`applyFloorCopiesInDraft`). Bir kat aynı Uygula içinde hem kaynak hem hedef
olabiliyor; hedef başına "sil sonra klonla" döngüsü kurulsaydı sonuç katların
LİSTE SIRASINA bağlı çıkardı. Klonlama saf okuma (yeni diziler döndürür,
store'a dokunmaz), bu yüzden fazlara ayrılabiliyor. Teste bağlı.

⚠️ **`planFloorCopy` artık ham store dizisi değil FONKSİYON alıyor**
(`FloorContentLookup`): pencere taslak üzerinde çalışıyor ve bir katın içeriği
"store'da ne var"dan ibaret değil. Store tarafı için köprü
`toFloorContentLookup`.

**Silme ONAY SORMUYOR** (kullanıcı kararı). Dokunulan şey store değil taslak;
Uygula'ya kadar hiçbir şey yazılmıyor, "İptal" hepsini atıyor. Yerine pencerenin
KENDİ geri al/yinele yığını geldi (`useFloorPlanDraft`, zundo DEĞİL — o store'un
geçmişi, pencere store'a hiç yazmıyor). ⚠️ SEÇİM geçmişe yazılmaz: bir düzenleme
değil, neye bakıldığı; yığına girseydi Ctrl+Z önce seçim adımlarını geri sarardı.
⚠️ Ctrl+Z/Ctrl+Y dinleyicisi YAKALAMA fazında — editörün kısayolu da window'da ve
baloncuk fazında, durdurulmasaydı aynı tuş iki geçmişi birden oynatırdı.
`core/floorDeletion.ts`, `FloorDeleteDialog` ve `floorCountText` SİLİNDİ.

**Satır artık 4 duran öge.** Yükseklik TIKLAYINCA düzenlenen alan (ad da
öyleydi, K167 ile ad DÜZENLENEMEZ oldu)
(`FloorInlineField`) — dinlenme hâlinde çerçevesiz, ama yine gerçek `<input>`,
klavye ve ekran okuyucu için değişen bir şey yok. İçerik üç rozet yerine TEK
glif (dolu/yarım/boş halka); boş halka sözlüğü kat seçicisinden geliyor.
⚠️ Satır işlemleri açılır menüde DEĞİL, hepsi ikon (kullanıcı kararı): aktif yap
(aktif katta DOLU halka, radyo okunuşu), kopyala, sil. Onay kutusu görünür ve
başlıkta "tümünü seç" var. ⚠️ Tıklama seçimi BİRİKTİRİR, değiştirmez — onay
kutusunun sözleşmesi bu; önceki davranış bir kattan diğerine geçerken öncekini
düşürüyordu (kullanıcı bildirimi). Shift aralık seçer.

**"Yeni kat yüksekliği" alanı SİLİNDİ.** Yeni kat ALTINDAKİ katın yüksekliğini
devralıyor; alan da gitti, "mevcut katları değiştirmez" feragatnamesi de.

**Sayıyla toplu ekleme** (kullanıcı isteği): `+ [3] kat [kaynak ▾] Ekle` — adet,
kaynak ve eylem tek cümlede. ⚠️ KISMİ ekleme YOK: istenen sayı tavana sığmıyorsa
hiçbiri eklenmez (`addDraftFloors`), sessizce 10 yerine 4 kat eklemek
kullanıcının saymadığı bir sonuç doğururdu; kalan kapasite alanın yanında yazar.
`3 kat · Zemin Kat'tan kopyalayarak` tipik bir apartmanı tek işlemde kuruyor.

**Kat şeridi sahnenin sol üstüne taşındı** (`ui/canvas/FloorRail.tsx`). Yüzen
çubuktaki kat LİSTESİ kalktı, orada yalnız iki pencere maddesi kaldı — aynı
listenin iki yerde durması gereksizdi ve geçiş için menü açtırmak her kat
değişimine bir tıklama ekliyordu. Yuvarlak, sade, YUKARIDAN AŞAĞI en üst kattan
en alta. ⚠️ Etiket kat ADINDAN değil SIRADAN türer (`getFloorShortLabels`): B /
Z / 1 / 2 — daire dar, ad serbest metin ve "Asma Kat" sıradaki yerini söylemiyor;
tam ad ipucunda. Çok bodrumda numara eklenir ve AŞAĞI indikçe artar (`B1` zeminin
hemen altı). ⚠️ Kaydırma çubuğu GİZLİ (`styles/floorRail.css`, kullanıcı kararı:
"scroll işareti kirliliği istemiyorum") ama kaydırmanın kendisi çalışıyor.
⚠️ Sarmalayıcı `pointer-events-none`: şeridin boş dikey alanı tuvalin tıklamasını
yutmamalı. Şerit AÇILIR/KAPANIR; kat ikonlu yuvarlak düğme sol üstte SABİT kalır.
Varsayılan AÇIK — varlık sebebi tek tıklamayla kat değiştirmek.

**Silinen dosyalar** — bu adlarla kod yazma: `FloorCopyDialog`, `FloorTable`,
`FloorSummary`, `FloorPlanActionBar`, `NewFloorHeightField`, `AddFloorMenu`,
`FloorCopyOptions`, `FloorCopySourceSection`, `FloorCopyTargetList`,
`FloorHeightField`, `FloorDeleteDialog`, `floorCountText`, `core/floorDeletion`.

⚠️ Test tuzağı: `floorCopy.test.ts`'in `resetState`i `installationLines` ve
`installationConnections` dizilerini SIFIRLAMIYORDU; `setState` birleştirdiği
için başka bir describe blogunun seedlediği hat sonraki testlere sızıyor ve
klonlamada "id remap eksik" hatası veriyordu.

### K167 — Kat adı KONUMDAN türer; yeniden adlandırma kalktı

Kullanıcı: "katların isim değiştirilme özelliği kalkmalı. katlar yer değiştirse
isimleri de değişir. kim hangi kattaysa o ismi alır."

Kat adı artık kullanıcının yazdığı bir şey değil, bulunduğu SIRANIN karşılığı.
Katlar yer değiştirince adlar yerinde kalır, içerik taşınır.

| Konum | Ad |
|---|---|
| en derin bodrum | `2. Bodrum Kat`, `3. Bodrum Kat`… |
| zeminin hemen altı | `Bodrum Kat` |
| ilk yer üstü kat | `Zemin Kat` |
| üstündekiler | `1. Kat`, `2. Kat`, … |

Kural `getPositionalFloorNames`te; `withPositionalNames` listeyi baştan
adlandırır ve değişen yoksa AYNI diziyi döndürür (taslak sözleşmesi).

⚠️ **`renameDraftFloor` SİLİNDİ** — bu adla kod yazma. Satırdaki ad alanı da
kalktı, ad artık düz yazı; satırın tek düzenlenebilir alanı yükseklik.

⚠️ **Adlar yalnız YAPISAL değişimden sonra tazelenir**: ekleme, silme, sıralama
(`withRenumberedFloors`, ayrıca `moveByKey`). Yükseklik ve aktif kat değişimi
sırayı bozmadığı için oralarda çağrılmıyor.

⚠️ **`createFloorPlanDraft` de normalleştirir.** Eski projelerde elle konmuş ad
olabilir ("Asma Kat"); pencere yürürlükteki kuralı göstermeli, yoksa kullanıcı
listede kuralın geçerli olmadığını sanır. Store'a yazan yine yalnız "Uygula",
yani pencereyi açıp İptal demek hiçbir şeyi değiştirmez.

⚠️ **JSON DEĞİŞMEDİ**: `Floor.name` modelde duruyor ve kaydedilmeye devam
ediyor, yalnız değeri artık türetiliyor. `core/model.ts` ve `core/serialize.ts`
ele alınmadı; gidiş-dönüş kabul testleri yerinde.

⚠️ Kısa etiketlerle (`getFloorShortLabels`, kat şeridi) tek kaynaktan
çıkmıyorlar: kural aynı, biçim ayrı — biri tam ad (`2. Kat`), öteki dar bir
daireye sığan işaret (`2`).

**Aynı oturumda düzeltilen iki kusur:**

⚠️ Toplu **Kopyala** düğmesi yalnız TEK seçimde çıkıyor. Çok seçimde
`selectedIds[0]`ı kaynak alıp gerisini sessizce yutuyordu (kullanıcı
bildirimi) — kaynak tanımı gereği tek bir kat, düğmeyi gizlemek yanlış katı
kopyalamaktan iyi. Toplu **Sil** her seçim sayısında çalışmaya devam ediyor.

⚠️ Dolu kat silinirken SATIR İÇİNDE küçük bir onay çıkıyor ("Çizim silinecek /
Vazgeç / Sil"). K166 silmeyi tümüyle onaysız yapmıştı; kullanıcı "uygula demeden
uygulanmasa da yanlış bir şey yapıyormuş gibi hissettim" dedi. Onay YALNIZ dolu
katta — boş katta soracak bir şey yok. Ayrı bir onay PENCERESİ yine yok.
⚠️ Satırdaki iptal düğmesi "Vazgeç": alt bardaki "İptal" bütün oturumu atıyor,
iki farklı anlam aynı kelimeyi taşımamalı.
⚠️ Onaydaki "Sil" `chromeButtonVariants` KULLANMAZ: onun `plain` tonundaki
`hover:bg-surface-sunken` kırmızı dolgunun üstüne binip düğmeyi koyu temada
yüzeye gömüyordu. Hover için yeni token `--color-danger-strong` (açık `#c23a2f`,
koyu `#d95d51`) — tehlike düğmesinin hover'ı kırmızının KOYUSU olmalı, nötr bir
gri değil.

### K168 — Kat TİPİ: dubleks, çatı katı, asma kat

Kullanıcı: "3 adet kat tipimiz olmalı, ama sadece isim olarak: dubleks, çatı
katı, asma kat."

Üçü de YALNIZ BİR AD. Kat davranışını, yüksekliğini, çizimini ya da kotu
etkilemiyor — kullanıcının kararı bu yönde.

| Tip | Nereye verilebilir | Ad | Şerit |
|---|---|---|---|
| Dubleks | yalnız EN ÜST kat | `Dubleks` | `D` |
| Çatı Katı | yalnız EN ÜST kat | `Çatı Katı` | `Ç` |
| Asma Kat | zemin ve bodrum DIŞINDA her kat | `Asma Kat (Zemin)`, `Asma Kat (1)` | `A` |

⚠️ **Tip AYRI BİR ALANDA saklanmıyor, `Floor.name`in kendisi.** Modele alan
eklemek kaydedilen JSON'un şemasını değiştirirdi (`core/model.ts` sözleşme, K167
de aynı gerekçeyle adı türetilmiş bırakmıştı). `name` zaten kaydediliyor ve tip
adlarıyla konumsal adlar çakışmıyor, bu yüzden tip ADDAN OKUNUYOR
(`getFloorType`). Yeni bir tip adı eklenecekse konumsal adlarla (`Zemin Kat`,
`Bodrum Kat`, `N. Bodrum Kat`, `N. Kat`) çakışmadığı doğrulanmalı.

⚠️ **Asma kat adı ALTINDAKİ katı taşır** (kullanıcı kararı): `Asma Kat (Zemin)`,
`Asma Kat (1)`. Sabit bir dize değil, bu yüzden `getFloorType` onu ÖNEKLE tanır.

⚠️ **Asma kat NUMARA TÜKETMEZ.** Sayaç asma katta ilerlemiyor; üstündeki katlar
numaralarını korur.

⚠️ **Asma kat yapmak kat SAYISINI BİR ARTIRIR** (`setDraftFloorType`). Kullanıcı:
"1. katı asma kat yaptığımda 1. kat yok olmaz, üstüne kopyalanır… en üstteki kat
silinmemeli". Dönüştürülen kat çizimiyle birlikte kendini korur ve asma kata
dönüşür; üstüne, onun adını devralan YENİ ve BOŞ bir kat girer. Böylece
`Zemin / 1. Kat / 2. Kat` → `Zemin / Asma Kat (Zemin) / 1. Kat / 2. Kat`.
Dubleks ve çatı katı kat EKLEMEZ, yalnız adlandırır.

⚠️ Bu yüzden `withFloorType` (core/floors.ts, saf ADLANDIRMA) ile
`setDraftFloorType` (core/floorPlan.ts, kat EKLEYEBİLİR) ayrı: id üretmek
taslağın işi, `core/floors.ts` id mintleyemez.

⚠️ **Asma kat SINIRSIZ ve üst üste gelebilir** (kullanıcı düzeltmesi). Üst üste
gelenler numaralanır — `Asma Kat (Zemin)`, `2. Asma Kat (Zemin)` — yani hepsi
altlarındaki ilk GERÇEK katın adını taşır, sıra numarasıyla ayrılırlar. Düzen
`Bodrum Kat / 2. Bodrum Kat` ile aynı; adlar benzersiz kalıyor (`isPlanValid`).

⚠️ **Tip yalnız o konumda GEÇERLİYSE korunur.** Çatı katı aşağı taşınırsa adını
kaybedip konumsal adına döner: kural "en üst kat" diyor ve kat artık orada
değil. Sessizce yanlış adı taşımaktansa düşürmek doğrusu; kullanıcı yeniden
verebilir. Tip KALDIRMAK kat silmez, yalnız adı konumsala döndürür — asma kat
yapılırken eklenen kat yerinde kalır (silmek, o kata bu arada çizim yapılmışsa
veri kaybı olurdu).

⚠️ Adların TEK kaynağı `resolveFloorNames`: aşağıdan yukarı tek geçiş. Asma katın
adı alt komşusundan okunduğu için sıra ZORUNLU — alttan gidildiğinde komşunun
adı o noktada zaten çözülmüş oluyor. `getPositionalFloorNames` bu fonksiyonun
tipsiz hâli.

**Arayüz:** tip satırdaki `⋯` menüsünde (kullanıcı isteği) — üç seçenekli ve çoğu
katta hiçbiri geçerli değil, satırda sürekli duran bir kontrolü hak etmiyor.
Menü yalnız verilebilir tipleri listeler; hiçbiri yoksa ve katın tipi de yoksa
menü hiç çizilmez.

**Aynı oturumdaki düzeltmeler:**

- Aktif kat düğmesi kat ADININ hemen SOLUNA alındı (`FloorActiveDot`): "hangi
  kattayım" sorusu adla birlikte okunuyor. Aktifken ve hover'da içi dolup BÜYÜR
  — sabit boyutlu bir halka tıklanabilir olduğunu söylemiyordu.
- Yüzen çubuktaki kat düğmesinden aşağı ok KALKTI; aktif kat adı ile kat sayısı
  arasına `CANVAS_BAR_DIVIDER` girdi.
- Pencere başlığı kipi söylüyor: **Kat Yönetimi** ↔ **Kat Kopyalama**.
- Kopyalama kipinin başlık satırı çerçeveli, kaynak kat açılırı da çerçeveli
  (düz bir etiketten ayırt edilmiyordu); "hedef katları seçin" başlık satırından
  çıkıp LİSTENİN ÜSTÜNE "Hedef katlar" başlığı olarak taşındı.

### K169 — Mimari hayalet KÂĞITTAKİ pafta gibi çizilir: içi boş, iki kademeli

Tesisat görünümündeki mimari hayalet (`plumbing/scene/Ghosts.tsx` →
`ArchitectureGhost`) tek soluk renge boyanmış **dolu** bir kopyaydı. Kat planı
paftası K154'te "her mimari yüzey içi boş, ince kontur" diline geçince ekran ile
kâğıt ayrıştı: aynı kat, aynı görünüm, iki farklı okuma. Kullanıcı isteği
üzerine hayalet paftanın diline geçti.

**Palet KÂĞITTAN geliyor**: `PLUMBING_COLORS.architectureGhostWall/Faint/Text`
artık `core/pdf/svgPrimitives.ts` → `PLAN_COLORS`ten türüyor. Ekranda ayrı bir
palet tutulsaydı biri değiştirilip öteki unutulurdu — tek renk (`#94a3b8`)
kalktı, yerine kâğıtla aynı İKİ kademe geldi: duvar `wall`, geri kalan mimari
`faint`, oda yazısı `architectureText`.

⚠️ **Duvar İKİ GEÇİŞTE**, `planSvg.ts` ile aynı hesap: önce TÜM duvarlar
`kalınlık + 2×kontur` kontur renginde, sonra TÜM duvarlar tam kalınlıkta zemin
renginde. Duvar duvar konturlamak yanlış sonuç verirdi — kapsüller kavşakta üst
üste biner (K23) ve her birinin konturu ötekinin İÇİNDEN geçerdi; iki geçiş
polygon union yazmadan birleşimin dış çeperini veriyor. İki bandın AYRI
`renderOrder`da olması şart (`architectureGhost` / `architectureGhostWallVoid`):
aynı bantta kalsalardı bir duvarın içi komşusunun konturunu silerdi.

⚠️ **Kontur kalınlığı kâğıttaki sabitten** (`WALL_OUTLINE_CM`), yalnız piksele
çevriliyor (`getArchitectureStrokeWidthPx`). cm bırakılamazdı: duvar bandının
kendisi piksel yolundan geçiyor (`wallStyle.ts`, ortografik kamerada `worldUnits`
soluklaşma yapıyor) ve biri cm biri piksel kalsaydı yakınlaştıkça kontur kıl gibi
incelirdi.

⚠️ **Açıklığın boşluğu ŞİŞİRİLİYOR**: poligon tam duvar kalınlığında, olduğu
gibi bırakılsa duvarın iki yüz çizgisi deliğin önünden kesintisiz geçer ve delik
"delik" gibi okunmazdı. Zemin renginde `2 × kontur` kalınlığında bir çerçeve
çizgisi payı veriyor — kâğıttaki `WALL_OPENING_BLEED_CM` ile aynı gerekçe, aynı
kat sayısı (çizgi kalınlığı poligonu her yöne YARISI kadar büyütür).

⚠️ **Hiçbir mimari yüzey DOLU değil**: oda, kiriş, alan nesnesi (kolon dahil),
kapı kanadı ve cihaz sembolü dolguları kalktı. Gerekçe kâğıttakiyle aynı —
tesisat görünümünde konu gaz hattı, altından geçen boru mimari yüzeyin arkasında
kalmamalı.

⚠️ **Oda dolgusu gidince mahali gösteren tek işaret ETİKET kaldı**, bu yüzden
kâğıttaki gibi ad + m² yazılıyor (K169 öncesi yalnız ad vardı, m² "bilerek yok"
diye işaretliydi — dolgu varken ikinci satır fazlalıktı). Rozet YOK: hayalet
bağlam, düz basılır. Etiket hayalet bandın en üstünde
(`architectureGhostRoomLabel`), kâğıtta da yazılar en son basılıyor.

⚠️ **Gömülü sembolün (pano, menfez) ayak izini zemin rengiyle "delme" çözümü
kalktı**: duvarın dolu bir bant olduğu zamanın çaresiydi, duvar içi boşalınca
gereksizleşti.

`RENDER_ORDER`daki hayalet bandı yeniden numaralandı; SİLİNEN adlar:
`architectureGhostRoom`, `architectureGhostBeamFill`,
`architectureGhostAreaObjectFill` ve `GhostRoomFill` bileşeni — bu adlarla yeni
kod yazma.

⚠️ Kâğıt DEĞİŞMEDİ: bu karar tek yönlü, ekran kâğıda uyduruldu.

### K170 — Boru bilgisi ÇİZİM ekranlarına taşındı; izometrik açıklama yalnız renk

Kullanıcı isteği (iki turda): "boruların çapına göre bilgilerinin yazması" →
"boruların açıklamaları eleman adları ile gelsin, hangi boru olduğu da yazılsın
boru ölçüleri açılınca, bunlar çizim kısmındaki ekranlarda olsun, dış çap ve
toplam boy yazmasın sol altta" → "Boru yazma ama açıklama kalsın".

**1) Ölçü etiketi artık kimliği de taşıyor**: `1,20 m · DN25`
(`plumbing/core/lineLabel.ts` → `getLineMeasurementLabel`). Deşarj hattında çap
yok, kimlik TÜRÜN adı: `3,00 m · Baca`.

⚠️ **K132 kısmen tersine döndü**: "çap etikete girmez, renkten okunur" artık
geçerli değil. Gerekçe: renk ancak açıklamaya bakılarak çözülüyordu ve ölçüyü
okuyan kişi zaten malzeme arıyor. Etiket `LengthLabels`'ın kendisi olduğu için
çap MİMARİ görünümdeki tesisat izinde de yazıyor — K132'nin "boru ölçüleri
mimaride de yazılır" kuralı olduğu gibi duruyor.

⚠️ Anlık (lastik bant) etiket DEĞİŞMEDİ: `DraftLengthLabel` çizim geri
bildirimi, kalıcı kotalama değil — henüz bir hat yok, kimliği de yok.

**2) Boru AÇIKLAMASI çizime basılıyor** (`LineDescriptionLabels.tsx`): özellik
panelindeki "Açıklama" alanı bugüne kadar hiç çizilmiyordu. Eleman ad
etiketleriyle AYNI anahtarda ("Eleman adları", `isElementLabelsVisible`) ve
aynı biçimde — kullanıcı için ikisi tek bir "adlar" katmanı.

⚠️ **Tür adı ("Boru") etikete GİRMEZ** (kullanıcı, ikinci düzeltme): önce
eleman künyesinin deseni izlenip "Boru
<açıklama>" yazılmıştı; her hatta
tekrarlanan aynı kelime kalabalıktan başka bir şey üretmiyor ve hattın ne
olduğu zaten renginden + ölçü etiketindeki çapından okunuyor. Açıklaması
olmayan hat etiket ÜRETMEZ.

⚠️ Etiket SÜRÜKLENEMEZ: hat modeli plan tarafında `labelOffsetCm` taşımıyor
(yalnız `isometricLabelOffsetCm` var, K121), uydurulmadı. Yeri ORTA bölümün
ortası (`getLineLabelAnchorCm`) ve ölçü etiketinin TERS yönünde kayar — aynı
tarafta olsalardı üst üste binerlerdi.

⚠️ Mimari görünümdeki tesisat izine GİRMEZ: orada eleman ad etiketleri de
çizilmiyor, açıklama tek başına asılı kalırdı.

⚠️ Açıklama alanı yalnız `pipe` türünde var (`lineProperties.ts`); bacanın ve
havalandırmanın karşılığı yok, uydurulmadı.

**3) İzometrik açıklama (sol alt) yalnız KİMLİK**: dış çap ve toplam boy
kaldırıldı, tablo tekrar renk + ad listesi oldu. Açıklamanın tek işi "bu renk ne
demek"; ölçü bilgisi çizim ekranlarında borunun kendi etiketinde okunuyor.
Deşarj satırları (Baca / Havalandırma Kanalı) KALDI — izometrikte çiziliyorlar
ama renkleri eskiden hiç açıklanmıyordu.

⚠️ İzometrik hat KÜNYESİ değişmedi: `(3)` / `4,74 m` / `DN25` / `Ø33,7 mm`.
Kaldırma isteği "sol alt" içindi; künye izometriğin kendi tüketim etiketi ve
PDF ile ortak (`getIsometricLineLabelLines`). `formatPipeOuterDiameter` orada
kullanılıyor, tek yer.

### K171 — İzometrik etiketler nesnelerinin yanında; vurgu ETİKETLERİ de soluklaştırır

Kullanıcı: "izometride etiketler daha toplu dursun, üst üste gelmesin; ayrıca
bir şeye tıklarsak onun etiketleri hariç her şey soluk halde gözüksün".

**HALKA yerleşimi SİLİNDİ**: `layoutIsometricLabels`, `isometricLabelLayout.ts`,
`getIsometricLabelDistanceCm`, `LINE_LABEL_DISTANCE_FACTOR`,
`ELEMENT_LABEL_DISTANCE_FACTOR` ve testleri kaldırıldı — bu adlarla yeni kod
yazma. Ekran artık kâğıdın yerleşimini kullanıyor
(`layoutLabelsBesideAnchors`): etiket kendi nesnesinin yanında, çakışanlar
itilerek ayrılıyor.

⚠️ K156 "iki yerleşim yan yana duruyor, ekran dokunulmadan kaldı" diyordu;
gerekçesi (yazı ekran-sabit, etiket sürüklenebilir, uzak durması gezinmeyi
kolaylaştırır) kullanıcı karşısında tutmadı — halkanın kusuru ekranda da aynı:
etiket sayısı arttıkça çember büyüyor ve çizim ortada küçülüyor.

⚠️ Modül `core/pdf/`den `isometric/core/isometricLabelPlacement.ts`'e TAŞINDI:
iki tüketicisi olunca "pdf" klasörü yanıltıcı kalıyordu.

⚠️ Kutu ölçüsü ZOOM'a bağlı: ekranda yazı ekran-sabit boyda, yani dünya
cinsinden boyu px/zoom. Sabit cm alınsaydı yakınlaşınca etiketler gereksiz yere
ayrılırdı. Karakter genişliği/satır yüksekliği oranları ekran ile kâğıtta
FARKLI (0.62/1.35 ve 0.55/1.25) — kutuyu çağıran hesaplıyor, yerleşim yalnız
ayırıyor.

⚠️ Kılavuz çizgisi ekranda da İSTİSNA oldu: etiket nesnesinin dibinde dururken
kısa bir kılavuz yazının ortasına kadar girip okunurluğu bozuyordu. Eşik
kâğıttakiyle aynı fikirde (yarım genişlik + yükseklik).

⚠️ Kamera çerçeveleme payı halka yarıçapına bağlıydı, oran oldu
(`LABEL_MARGIN_RATIO = 0.08`) — eski pay bırakılsaydı çizim kadrajın ortasında
küçücük kalırdı.

**Vurgu artık ETİKETLERİ de kapsıyor**: eleman künyeleri vurgulanan hatta bağlı
değilse solar. Önce yalnız hat etiketleri soluyordu (`opacityOf(lineId)`,
elemanda `lineId: null` → hep 1) ve cihaz sembolü solmuşken künyesi tam opak
kalıyordu — ekranda sahipsiz bir yazı asılı duruyordu.

⚠️ `getConnectedElementIds` `IsometricLayer`'dan `isometric/core/isometricHighlight.ts`'e
taşındı: sembol ile etiket AYNI kuralı okumak zorunda, ikinci kopya zamanla
ayrışırdı.

⚠️ Tıklanabilir olan hâlâ yalnız HAT (`highlightedLineId`): elemana tıklayınca
vurgu açılmıyor. Vurgu modeli tek kimlik taşıyor, elemanı da hedef yapmak
ayrık birleşime geçmeyi gerektirir — istenirse ayrı adım.

### K172 — İzometride yükseklik etiketi (`h=`), tıklanan boru künyesini açar, yazı borunun renginde

Kullanıcı, sırayla: "izometride yükseklik olan yerlere h yüksekliğini belirt",
"borunun bir tüketimi olmasa da üzerine tıklanınca bilgileri gelsin",
"etiketler bizim formüle göre dağılsın ama çok da değil, kameramızı
etkilemesin", "izometride veya tesisattaki boru açıklamaları o borunun rengine
göre değişsin".

**1. Yükseklik etiketi** (`getIsometricRiseLabel`, `isometric/core/isometricLabels.ts`):
kot değiştiren hatta `h=2,75 m`. Çapası hat künyesiyle aynı — düşey hattın
(plan boyu sıfır, K102) iki ucunun ortası, yani çubuğun tam ortası. EKRAN ve
KÂĞIT ortak.

⚠️ Koşul plan görünümündekiyle AYNI (K129): hattın İLK ve SON kotu farklıysa
yazılır. Segment segment YAZILMAZ — kot hat boyunca PLAN uzunluğuna göre
dağıtılıyor (`getLinePointElevationsCm`), yani eğimli bir hattın her parçası
farkın bir kesrini taşır ve her birine ayrı sayı yazmak tek bir yükselişi
rakam bulutuna çevirirdi.

⚠️ İŞARET YOK: h bir mesafe, kot değil (`formatSignedMeters` kullanılmıyor).
Yukarı mı aşağı mı gidildiği izometrik çizimin KENDİSİNDEN okunuyor; plan
görünümünde okunmadığı için orada ▲/▼ var (K133).

⚠️ Tüketim süzgecinin DIŞINDA (`isConsumptionLine`): kolon gövde borusunun bir
parçası ve süzgeç onu eler — bağlansaydı binanın asıl yükselişleri yazısız
kalırdı.

⚠️ Katlar arası bağlantı (`FloorPipeLink`) etiketlenmez: döşemeyi delen teknik
bir ek, kullanıcının verdiği bir yükseklik değil — verdiği kot zaten iki
yandaki hatta yazılı.

⚠️ Yuvarlanınca "0,00 m" yazacak fark (< 0,5 cm) etiket üretmez. Etiket
TAŞINAMAZ: hattın tek `isometricLabelOffsetCm` alanı künyeye ait, yükseklik onu
da birlikte kaydırırdı. `IsometricLabel.onCommitOffsetCm` bu yüzden opsiyonel
oldu.

**2. Tıklanan boru künyesini açar** (yalnız EKRAN): vurgulanan hat
`isConsumptionLine` süzgecinin dışında da etiketlenir. Kalıcı yazılsaydı
K156'nın kaldırdığı kalabalık geri gelirdi; vurgu geçici olduğu için çizim yine
sade kalıyor.

⚠️ Numara YAZILMAZ (`getIsometricLineLabelLines(line, null, …)`): numaralandırma
paftadaki TÜKETİM hatlarına ait bir sıra, araya geçici bir boru sokmak o sırayı
bozardı. Kâğıt değişmedi — orada süzgeç aynen duruyor (K156).

**3. Dağılma SINIRLI** (`MAX_PUSH_RATIO = 4`, `isometricLabelPlacement.ts`):
bir etiket kendi payından en çok birkaç satır boyu uzağa itilebilir. Sınırsız
itmede yoğun öbekler çizimden kopuyor, kılavuz çizgileri gövdenin üstünden
geçiyordu. Sınıra dayanan etiketler biraz binebilir — okunurlukta binmek,
sahipsiz kalmaktan iyi. Kısıtlama ayırmadan SONRA uygulanır, yoksa aynı turda
yeniden sınır dışına itilirdi.

⚠️ Etiketler EKRAN KAMERASINI zaten hiç etkilemiyordu ve etkilememeye devam
ediyor: `IsometricCamera` `scene.bounds`'a bakar, o da yalnız boru ve
elemanlardan hesaplanır (`computeBounds`). Etiketlerin sınırı büyüttüğü tek yer
KÂĞIT — orada sayfa payı bilerek yazıyı da kapsıyor.

**4. Yazı borunun renginde** (K27'nin devamı): izometrikte hat künyesi ve
yükseklik etiketi `getIsometricLineColor(geometry)` ile, tesisat görünümünde
boru açıklaması `getLineColor(line.pipeTypeName)` ile boyanır.

⚠️ Eleman künyesi NÖTR kalır (`ISOMETRIC_COLORS.label`): sembolün kendi çizimi
var, künyeyi de boyamak çizimde ikinci bir renk kodu doğururdu.

⚠️ ÖLÇÜ etiketleri (`LengthLabels`, `MEASUREMENT_INK`) da nötr kaldı: ölçü
katmanı mimariyle ORTAK okunuyor, çap rengine bağlanırsa duvar ölçüsüyle boru
ölçüsü iki ayrı dilde çıkardı.

⚠️ Açıklama alanı yalnız `pipe` türünde var (`lineProperties.ts`), o yüzden
tesisat tarafında renk doğrudan çaptan çözülüyor — kol/deşarj ayrımına gerek
kalmadı.

### K173 — İzometrik sürükleme EKSENE kilitli, bağlı ağı da çeker; düğme "Sıfırla"

Kullanıcı: "izometride borular 2D olarak hareket etsin kafasına göre değil,
hangi eksendeyse o tarafa çekebilelim; çekerken bağlı olduklarını da çekelim ki
okumak için amacımız yerine gelsin", "varsayılana döndür yerine sıfırla
yazabiliriz, bu da boruların uzattığımız kısımlarını geri yerine koyar",
"etiketleri ayırma algoritmamız da hiç çalışmıyor galiba".

**1. Eksen kilidi** (`isometric/core/isometricDragAxis.ts`): tutamaç serbest
değil, komşu parçalardan ÇEKME YÖNÜNE en yakın olanın ekseninde gider; dike
düşen bileşen atılır. Serbest sürüklemede kullanıcı yatay bir boruyu eğik bir
yere bırakabiliyordu ve şema teknik çizim olmaktan çıkıyordu.

⚠️ Yön 3B'den değil İZDÜŞÜMDEN okunur: sürükleme ekranda oluyor, kayma da
izdüşüm düzleminde saklanıyor (`isometricOffsetCm`).

⚠️ Seçilen eksen aynı zamanda **hangi ucun SABİT kalacağını** söyler
(`IsometricDragAxis.neighborIndex`). Bu ikisi ayrılamaz: çekilen parça uzarken
karşı taraf yerinde durmazsa ya hiçbir şey ayrılmaz ya da komşu parça eğrilir.

**2. Yayılım artık TÜM AĞDA** (`isometric/core/isometricNetworkDrag.ts`,
`resolveIsometricDragTargets`): eski kural tek `InstallationLine` içinde
kalıyordu ve her sol tık kendi borusunu yazdığı için (K-W) pratikte İKİ noktayı
kapsıyordu — sürükleme neredeyse hiçbir şeyi ayırmıyordu. Ağ kenarları: hattın
ardışık noktaları + hat-hat bağlantısı (iki yönlü) + elemanın portuna oturan
uçlar (eleman üzerinden) + düğüme oturan armatür. Yayılım `anchorPointId`de
DURUR; oradan ötesi yerinde kalır.

⚠️ Bağlı dal RİJİT gelir, aradaki borular ESNEMEZ — esneselerdi eksen kilidi
anlamını yitirir, yatay parça eğik çizilirdi.

⚠️ `moveTargets.ts`/`resizeTargets.ts` yeniden kullanılmadı: ikisi de PLAN
geometrisini değiştiriyor ve orada duraklar var (port çapası, `FloorPipeLink`in
sakladığı konum). İzometrik kayma plan konumuna hiç dokunmadığı için o
durakların hiçbiri geçerli değil.

⚠️ `applyIsometricDrag` (hat içi "sonrakiler mirası alır" kuralı) SİLİNDİ,
yerine `applyIsometricOffsets(points, draggedPointId, movedPointIds, delta)` —
hangi noktaların kayacağına artık ağ çözümü karar veriyor. Bu adla yeni kod
yazma.

⚠️ `applyIsometricLineDrag` imzası DEĞİŞTİ: `(pointId, anchorPointId, deltaCm)`.
`lineId` gereksizdi (nokta kimliği zaten benzersiz) ve çapa olmadan yayılım
ağın iki yanına birden koşuyordu.

**3. Eleman sembolü kaymayı boru UCUNDAN devralır**
(`IsometricElementAnchor.isometricOffsetCm`): eskiden eleman plan konumunda
kalıyordu, yani çekilen bir dalın ucundaki kombi yerinde duruyor ve boru ondan
kopuyordu. Eleman kendi kayma alanı TAŞIMAZ — türetmek iki kaynağın ayrışmasını
baştan engelliyor.

**4. Düğme "Sıfırla"** (eski "Varsayılana döndür"): kullanıcının dilinde bu
düğme boruların UZATILMIŞ kısımlarını yerine koyuyor. Davranış aynı — kaymalar,
etiket konumları, açı ve kamera kilidi birlikte sıfırlanır.

**5. Etiket ayırma kısıtı DÜZELTİLDİ**: K172'in `MAX_PUSH_RATIO` kısıtı turun
SONUNA konmuştu ve ayrılan kutuları geri bindiriyordu — dosyanın kendi
yazılı dersinin (geri çekme ayırmadan ÖNCE) tam olarak ihlali, sonuç "ayırma
hiç çalışmıyor" oldu. Kısıt artık geri çekmeyle aynı yerde ve yalnız turların
İLK YARISINDA (`CLAMP_PASSES`): erken turlar dağılmayı toplu tutuyor, son
turlar serbest kalıp çakışmayı bitiriyor. Sıkışık öbekte etiket payı aşabilir —
çakışmamak paya sığmaktan önce gelir.

### K174 — Ekranda künye HALKASI geri geldi (küçük yarıçapla); vana etiketi ekranda da sustu

Kullanıcı: "etiketler hâlâ karışık gözüküyor, güzel dağıt onları önceki gibi
sadece daha yakın olsunlar yani daha küçük olsun oluşturdukları yuvarlak",
"vana etiketi de olmasın".

**1. Halka geri geldi — ama YALNIZ EKRANDA.** `isometricLabelLayout.ts` ve
`layoutIsometricLabels` yeniden var (K171'de silinmişlerdi). Künyeler çizimin
çevresinde iki halkaya diziliyor: hat etiketleri içte
(`LINE_LABEL_DISTANCE_FACTOR = 1`), eleman künyeleri dışta (`= 1.7`).

⚠️ K171 kısmen GERİ ALINDI. O kararın teşhisi yanlıştı: kusur halkanın kendisi
değil YARIÇAPIYDI. Eski değerler halkayı çizim boyunun yarısı kadar dışarı
itiyordu (`LABEL_DISTANCE_RATIO = 0.50`, eleman çarpanı 2) ve kadraja sığmak
için çizim ortada küçülüyordu. Yeni değerler: oran **0,12**, alt sınır **120
cm**, çarpanlar 1 / 1,7 — tipik bir binada halka yarıçapı yaklaşık YARIYA
iniyor. "Nesnenin yanında + itme" düzeni ekranda denendi ve kullanıcı iki kez
"karışık" dedi; teknik çizimin balon düzeni burada daha okunaklı.

⚠️ KÂĞIT DEĞİŞMEDİ: pafta `layoutLabelsBesideAnchors` ile basılmaya devam
ediyor (K156, ölçülmüş karar — halka orada 10 kılavuz çizgisini çizimin
üstünden geçiriyordu). Ekran ile kâğıt yine bilerek ayrı: ekranda etiket
sürüklenebiliyor ve gezinmeye yarıyor, kâğıtta yalnız okunuyor.

⚠️ YÜKSEKLİK etiketleri (K172) halkaya GİRMEZ (`distanceFactor === null`):
onlar künye değil ÖLÇÜ ve ölçtükleri parçanın yanında kalmak zorundalar —
halkaya alınsalardı bir kolonun `h=2,75 m`'si binanın kenarına düşerdi.
Kendi aralarında yine itmeli yerleşimden geçiyorlar.

**2. Künyesiz armatürler EKRANDA da sustu**: `hasIsometricElementLabel` artık
ekranda da süzüyor, yani vana, solenoid vana, filtre, manometre, regülatör,
süzme sayaç ve izolasyon etiket yazmıyor (kâğıt bunu K156'dan beri yapıyordu).

⚠️ K156'nın "ekranda kalsın, çünkü etiket sürüklenebilir ve gezinmeye yarıyor"
gerekçesi kullanıcı karşısında tutmadı. Kullanıcı yalnız VANAYI söyledi ama
kural aynı: bu yedi tür etiket olarak yalnız KENDİ ADINI yazıyor, yani sembolün
zaten söylediği şeyi. Sayaç, yakıcı cihaz ve servis kutusu künyeleri duruyor.

### K175 — Mimari cihaz paneli yalnız etiket ve nota indi

Kullanıcı: "mimari cihazların özellik panelinde yalnızca etiket ve not kısmı
kalsın. tür, bağlantı, ve açı değerlerini kaldır."

`PointSymbolProperties` beş satırdı: Tür · Etiket · Bağlantı · Açı · Not. İkisi
kaldı.

⚠️ **Tür ve bağlantı SALT OKUNURDU.** Panelde yer kaplayıp hiçbir karar
sunmuyorlardı; üstelik tür zaten panelin BAŞLIĞINDA yazıyor ("Pano Özellikleri")
ve bağlantı sembolün duvara oturup oturmadığına bakınca görülüyor. Aynı bilgiyi
ikinci kez, düzenlenemez bir satır olarak göstermek panelin işi değil.

⚠️ **Açı bu cihazlar için anlamsız** (kullanıcı: "mimari cihazları döndürmeye
gerek yok zaten duvara yapışıklar. aydınlatmanın da döndürülmeye ihtiyacı yok").
Duvara bağlı sembolün yönü zaten duvarından türüyor — alan orada salt okunurdu.
Serbest olan tek tür aydınlatma ve o da tavana takıldığı için yönsüz. Yani alan
ya hiç yazılamıyordu ya da yazılan değerin bir karşılığı yoktu.

⚠️ Bu adlarla panele geri ekleme: `Tür`, `Bağlantı`, `Açı (°)`.

**Ne KALDI:** seçim dönüşümü (`SelectionActions` — 90° döndürme ve aynalama)
sembolü çevirmeye devam ediyor; kaldırılan yalnız panelden SERBEST AÇI yazma
yolu. Duvar döndüğünde sembolün onunla gelmesi de değişmedi.

⚠️ `rotatePointSymbol` store action'ının üretimde çağıranı KALMADI (yalnız
testler). Silinmedi: kapsam paneldi ve store'dan bir yetenek çıkarmak ayrı bir
karar. Bir sonraki dokunan ya bağlar ya siler — arada bırakmasın.
