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
