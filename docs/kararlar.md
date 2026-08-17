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
