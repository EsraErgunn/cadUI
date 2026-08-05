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
