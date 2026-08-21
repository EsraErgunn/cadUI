# starcad — Frontend

Web tabanlı doğal gaz tesisat CAD editörü. Kullanıcı 2B'de duvar/oda çizer,
üzerine gaz borusu + vana + cihaz ekler, 3B ve izometrik görür, PDF (malzeme
dökümü dahil) alır. Ekip: 4 stajyer. Repo: gitlab.tekhnelogos.com/tekhnestars2026/cadui

## Teknoloji

- React 19 + TypeScript + Vite
- react-three-fiber + drei + three (TEK render dünyası, Three.js)
- Zustand + immer (durum), zundo (geri al/yinele)
- react-router-dom 7, graphlib, polygon-clipping (martinez DEĞİL — bkz. kararlar K22)
- Test: Vitest. PDF: jspdf + svg2pdf.js
- Ayrı 2B kanvas kütüphanesi (Konva/Fabric) YOK — 2B de Three.js ortografik kamerayla çizilir.
  Buradaki <Canvas> = react-three-fiber bileşeni, ayrı bir kütüphane değil.

## Değişmez kurallar (bunları ihlal eden kod üretme)

1. `core/` içinde React YOK. Sadece saf fonksiyon + tip. Testler burada.
2. `scene/` = <Canvas> İÇİ (R3F). `ui/` = <Canvas> DIŞI (DOM). Karıştırma.
3. Koordinat dönüşümü SADECE `core/coords.ts`'te: plan (x,y) → three (x, -z), elevation → y.
   Başka hiçbir dosyada bu dönüşümü tekrarlama.
4. Store'da yalnızca saf veri durur (= kaydedilecek JSON). Three.js/mesh nesnesi
   store'a KONMAZ; mesh'te sadece userData.id tutulur. Sahne, state'in türevidir.
5. Zustand mutasyonları immer producer içinde yapılır (doğrudan atama + return karışık olmaz).
6. Kalıcı id'ler proje bazlı **artan tamsayı** (`nextUniqueId`) ile üretilir — WebCAD
   JSON formatıyla round-trip uyumu buna bağlı, `crypto.randomUUID()` KULLANILMAZ.
   Bir kez üretilir, ASLA yeniden üretilmez. Dizi indeksi id yerine kullanılmaz;
   React key olarak da id kullanılır, indeks değil. (bkz. knowledge/id-scheme.md)
7. Araç (tool) çizim mantığı `DrawSurface.tsx`'e YAZILMAZ. DrawSurface sadece ham pointer
   olayı yayınlar. Araç mantığı kendi hook'unda: `scene/useWallTool.ts`, `scene/usePipeTool.ts`.
8. Birim: santimetre. Uzunluklar cm, açılar derece.

## Veri modeli (core/model.ts — SÖZLEŞME, izinsiz değiştirme)

- Duvar kendi koordinatını taşımaz. Ortak `Point` havuzunu `p1Id`/`p2Id` ile paylaşır.
  Bir köşeyi PAYLAŞMAK bağlı kalmayı garanti ETMEZ: duvar kendi normali boyunca
  taşınır ve ötelemeyi boyunu değiştirerek karşılayamayan komşu köşenin klonuna
  bağlanıp yerinde kalır (K103, `core/wallMove.ts`, bkz. knowledge/wall-graph.md).
- Kapı/pencere (`Opening`) yalnız duvara bağlıdır, `wallId` + `offsetCm` ile → duvar taşınınca birlikte gelir.
  Duvar BÖLÜNMEZ, açıklık tek parça duvarın üstünde bir deliktir. `offsetCm` açıklığın
  ORTASINI ölçer (p1 ucundan). Köşe payı = o uçta birleşen dik duvarın kalınlığı.
  Geçersiz (sığmayan/çakışan) yerleştirme REDDEDİLİR, kaydırılmaz. Duvarı silinen veya
  sığmayacak kadar kısalan açıklık otomatik silinir. Açıklık `floorId` ve yükseklik
  TAŞIMAZ. (bkz. knowledge/opening-placement.md)
- Yay (arc) duvar kararı YOK — `Wall`'a yay alanı eklemeden varsayım kodlama.
  offset ↔ konum dönüşümü sadece `core/wallPath.ts`'te. (bkz. knowledge/arc-walls.md)
- Oda (`Room`) geometri kopyalamaz, duvar id'lerinden oluşan çevrim tutar.
  Serbest metin `name` YOK (K117): mahal `usageType` (kullanım tipi, madde 104)
  ile TANIMLANIR ve kullanıcı hazır listeden seçer. Etiket
  `getRoomDisplayName(usageType)` → tipin adı, yoksa "Tanımsız". Tanımlama YERİ
  özellik paneli; mahal seçilebilir ama SİLİNEMEZ/dönüştürülemez (duvarların
  türevi). Tip listesi TASLAK, analist onayı bekliyor — üstüne "hangi cihaz
  hangi mahale konabilir" kuralı YAZMA. (bkz. knowledge/room-usage-type.md)
- Boru grafiği `Node` + `Pipe` (fromNodeId/toNodeId). Vana/sayaç (`Fitting`) boru üzerinde `t` (0..1) ile.
- Tesisat elemanı nereye yapıştığını TÜRDEN alır (`plumbing/core/attachModes.ts`): armatür
  boruya oturur ve boruyu AYIRIR (`onLine`), sayaç boş uca takılır ve araya vana girer
  (`lineEnd`), yakıcı cihaz en yakın boruya kısa kolla bağlanır (`nearestLine`), servis
  kutusu/baca serbesttir (`free`). Boruya oturan eleman `InstallationLinePoint.inlineElementId`
  ile düğüme bağlanır — armatür = düğüm, ayrı bağlantı kaydı DEĞİL.
  (bkz. knowledge/element-attach.md)
- Boru kotu ayrı bir hat türü DEĞİL: var olan `InstallationLine.pipe.startHeightCm`/
  `endHeightCm` render'a bağlandı (K102). Saf dikey bağlantı (aynı plan konumunda iki
  nokta, farklı kot) hâlâ mümkün — riski yalnız iki dosyada, genel "sıfır uzunluklu
  segment" koruması olarak ele alınır, `riser` adlı ayrı bir tür YOK.
  Kot EKRANA da basılır (K133): yükseliş noktasında fark + varılan kot
  (`▲0,75 m (+2,00)`), servis kutusunun altında çıkış kotu (`+0,15 m`). Kot
  yazımının TEK yeri `core/lengthFormat.ts` (`formatSignedMeters` /
  `formatElevationMeters`) — uzunluğun aksine işaret taşır. İkisi de "Ölçüler"
  anahtarına bağlı DEĞİL (K129).
  (bkz. knowledge/pipe-elevation.md, knowledge/label-visibility.md)
- Boru ÇİZİMİ klavyeden de sürülür (K125–K127): ok tuşu X/Y eksenini, `+`/`-` kot
  yönünü KİLİTLER ve tek sayısal kutuyu açar — tuş boru yazmaz, Enter yazar. Kot
  kutusu MUTLAK hedef değil FARK ister (`commitDraftElevationBy`). Adımın TEK yazım
  yolu `plumbing/store/lineStepActions.ts`; tuş ↔ eksen eşlemesi SADECE
  `plumbing/core/draftKeyboard.ts`'te (ekranda yukarı = plan +Y).
  Kot katın TAVANINI aşarsa üst kata, TABANINI delerse alt kata OTOMATİK geçilir
  (K104 + K135, `capElevationToFloor`/`capElevationToFloorBase`) — aşağı inerken
  yeni kata tavanından girilir, aynanın tek asimetrisi budur.
  KLAVYEDEN KAT DEĞİŞTİRME YOK (K126): PageUp/PageDown, ok tuşları, `floorLinkActions.ts`
  ve `pendingFloorLink` SİLİNDİ — bu adlarla yeni kod yazma; kat yalnız yüzen çubuk +
  kat seçici. `FloorPipeLink` duruyor, tek üreticisi otomatik tavan aşımı (K104).
  Dikey hareket düğümü mor halkayla işaretli (`ElevationNodeRing`). Kot
  göstergesi KAYBOLMAZ (K129): tek koşul `firstElevationCm !== lastElevationCm`,
  ve köşe sürüklemesi duvardan ÖNCE başka bir hat KÖŞESİNE tam oturur
  (`findNearestLineCorner`) — kolon geri getirilince yeniden düşeyleşsin diye.
  (bkz. knowledge/keyboard-drafting.md)
- Panelde "Boy (cm)" değişince ucun ötesindeki ağ RİJİT ÖTELENİR, esnemez (K128) —
  hesap `plumbing/core/resizeTargets.ts`'te ve `moveTargets.ts`'ten BİLEREK ayrı
  (orada port çapası yayılımı durdurur, burada durdurmaz).
  (bkz. knowledge/pipe-resize.md)
- Cihaz (`Equipment`) bir `portNodeId` taşır — her cihazın bağlantı noktası olmalı.
- Servis kutusu (`ServiceBox`) kökte TEK nesne (dizi değil) → "tek servis kutusu" kuralı yapı gereği.
- Kolon (`Riser`) kat dışında, kökte. Kat kopyalanınca KLONLANMAZ; `toFloorId` uzatılır.

## Dizin yapısı ve sahiplik

- `src/app/` (A) — main, App, router. Giriş koruması SADECE router.tsx'te (RequireAuth).
- `src/core/` — React yok. coords/viewport/grid/tools/views(D), snap/wall/room/floorClone/areaObject(B), pipe/graph/validate(C), bom/pdf(D), model/serialize(A).
  Doğrulama SÖZLEŞMESİ `validationModel.ts`'te (yaprak modül) — kural dosyaları
  onu `validate.ts`'ten alırsa import döngüsü doğar (knowledge/validation-rules.md).
- `src/store/` — cadStore+history+projectMeta(A), architecture/floorSlice + architectureUiStore + architectureMock(B), installationSlice(C), uiStore(D).
  Slice'lar cadStore'dan yalnız `import type` yapar; `takeNextId`/`markDirty` projectMeta.ts'te (import döngüsü, K17).
- `src/scene/` — çekirdek: SceneRoot/Cameras/cameraViewport/useViewportControls/DrawSurface/Grid/gridGeometry/layers/sceneTheme(D); Wall/PointHandle/Room(B); Pipe/Fitting/Equipment/Warning(C).
  Ölçüler varsayılan AÇIK (K131), tek bayrak iki görünümü de yönetir. Boru
  ölçüleri MİMARİ görünümde de yazılır (K132, `InstallationGhost` →
  `LengthLabels`) ve soluklaştırılmaz; çap etikete girmez, renkten okunur.
  Tesisatta ALT KAT izi YOK (K130): `InstallationBelowGhost`,
  `INSTALLATION_BELOW_GHOST_ELEVATION_CM` ve `RENDER_ORDER.installationBelowGhost`
  SİLİNDİ — bu adlarla yeni kod yazma; mimarideki `FloorBelowGhost` duruyor.
  (bkz. knowledge/label-visibility.md)
- `src/ui/` — MenuBar/menu/EditorSidebar/Toolbar/tools/canvas/controls/ExportDialog(D), PropertyPanel/properties(B), WarningList+validation(C).
  Kabuk yeniden kuruldu (K90–K93): üst barda yalnız Dosya + Araçlar, kip
  ayarları tuvalin yüzen çubuğunda; `StatusBar`, `AxisIndicator` ve
  `menu/ShortcutButtons` SİLİNDİ — bu adlarla yeni kod yazma. **Hata
  Kontrolleri artık ÇALIŞIYOR** (K115): `core/validate.ts` on kuraldan sekizini
  denetliyor, düğme kendi açılır listesini taşıyor. Hata3 (mahal TİPİ yok) ve
  Hata8 (topraklanma NESNESİ yok) BİLEREK yazılmadı — bu konularda varsayım
  kodlama, bkz. `docs/api-eksikleri-hata-kontrol.md`. "Test Et" ve "Gönder"
  hâlâ pasif.
  Üst bar tuvalle aynı yüzeyde ve `canvas-overlay` token'larıyla KOYU TEMADA DA BEYAZ; kendi
  varyantları `menu/editorBarVariants.ts`'te, `controls/buttonVariants.ts`
  pencerelerin (tema değiştiren yüzey). İki özellik paneli ortak kabuk
  kullanır (`ui/properties/PropertyPanelShell`). `ui/versions/` kayıt geçmişi
  listesini ve "Farklı Kaydet" penceresini taşır (K109); liste üst bardaki
  düğmenin ALTINDAN açılır, açık/kapalı durumu bileşenin içindedir.
  (bkz. knowledge/editor-shell.md, knowledge/canvas-toolbar.md,
  knowledge/property-panel.md, knowledge/version-history.md,
  knowledge/validation-rules.md)
- `src/ui/admin/` — yönetici paneli: ortak kabuk (AdminLayout/AdminSidebar/AdminTopBar) +
  liste parçaları. Kabuk sayfaya GÖMÜLMEZ, route ebeveynidir. Liste durumu (arama/filtre/
  sıralama/sayfa) URL query param'da, sayfalama sunucu taraflı. Rol modeli KESİNLEŞTİ:
  üç rol, kullanıcı başına tek rol, kontrol `Role.Code` ile. Görünürlük kararı `useIsAdmin`
  (login yanıtındaki `roleCode`); `usePermission` hâlâ mock izin listesine bakıyor, yeni
  kodda kullanılmaz. İkisi birleşene kadar tek yetki kaynağı rol kodudur — istemci tarafı
  yalnız GÖRÜNÜRLÜK içindir, denetim sunucuda.
  Proje DETAY ekranı `/projects/:id`'yi devraldı, çizim editörü
  `/projects/:id/editor`'a taşındı (K53). Detayın verisinin çoğunun ucu YOK:
  sahte veri yalnız geliştirme derlemesinde üretilir, üretimde bölüm boş kalır
  ve gerçek/uydurma ayrımı tipte durur (K51) — varsayarak doldurma.
  Bir projeye bağlı açılan ekranlar künyeyi GERÇEK uçtan çözer (K63); Evrak Ekle
  kimliği query'de taşır (`?project=<id>`, K61), Poliçe Oluşturma ise YOLDA:
  sihirbaz poliçe bölümünün altında değil, `/projects/:projectId/policies/new`
  (K68) — sol menüde "Projeler" işaretli kalsın. Poliçe sihirbazının durumu
  URL'de DEĞİL (K65) — "durum URL'de" kuralı LİSTE ekranları içindir; poliçe
  LİSTESİ (K69) o kurala uyar.
  Coğrafi BÖLGE kavramı sunucudan TÜMÜYLE kalktı: `/api/regions`,
  `/api/gasdistributionfirms/{id}/regions` ve `GasDistributionFirmRegionId` YOK
  (yerine `GasDistributionFirmId`). Bölgeler ekranı, `useRegionParam` ve
  `RegionDensityCard` silindi — bu adlarla yeni kod yazma.
  Panelin KAPSAMI üç hâlli ve ayrık birleşim (`AdminScope`, ucun kendi
  dosyasında — `api/adminDashboard.ts`): sistem
  geneli / grup firması (`gdGroupId`, URL'de `group`) / tek gaz dağıtım firması
  (`gdFirmId`, URL'de `gdfirm`). İki parametre ASLA birlikte gitmez. Üst bardaki
  seçici iki düzeyli (`adminScopeOptions.ts`), seçenekleri mevcut İKİ uçtan
  birleştirir — yeni uç açma. Gaz dağıtım firmasının DELETE'i sunucuda
  soft-delete ama arayüzde "Sil" der (bilinçli).
  (bkz. knowledge/access-control.md, knowledge/admin-list-state.md,
  knowledge/project-detail.md, knowledge/documents-screens.md,
  knowledge/policy-wizard.md, knowledge/admin-scope.md)
- `src/isometric/` — izometrik görünüm; `plumbing/` deseninin aynası
  (`core/` + `scene/` + `store/` + `ui/`). Sahne verisi TÜRETİLMİŞ, store'a
  konmaz. Kot çözümü `plumbing/core/lineElevation.ts`'ten okunur, burada
  TEKRARLANMAZ. Cam HUD token'ları (`--color-glass*`) koyu temada EZİLMEZ.
  (bkz. knowledge/isometric-view.md, izometrik-adimlari.md)
- `src/pages/`, `src/api/` (A)

Bir dosyanın işini o dosyada yap. Başka birinin slice'ına/dosyasına yazma.

B (mimari) iki alt-faya bölündü: **duvar altyapısı** (wall/room/snap,
useWallTool/useRoomTool, Room tipi) ve **açıklık + nesne etkileşimi** (opening,
seçim/taşıma/çoklu seçim, grup dönüşümü, özellik paneli, kat yönetimi ve
floorClone). İkisinin sınırı knowledge/snap-contract.md'deki karşılıklı
fonksiyonlardır — o sınırın dışında birbirinin dosyasına yazılmaz.

`floorClone` ikinci tarafta çünkü grup çoğaltma (KK-11) ile kat kopyalama (KK-15)
AYNI id-remap yardımcısını istiyor; ayrı kişilerde olsa iki kez, iki farklı
şekilde yazılırdı (bkz. knowledge/floor-clone.md).

## Ürün kuralları (gereksinimler)

- Giriş yapmadan hiçbir sayfaya erişilemez (RequireAuth).
- Hatalı giriş: hesabın var olup olmadığını ele vermeyen GENEL hata mesajı.
- Boru duvara YAKINKEN (yakalama yarıçapı içinde) o duvara paralel/dik gider;
  yakında değilken TAMAMEN SERBEST (çapraz dahil) — hat üzerinden başlar.
  Duvarın üstü (gövde VE köşe) yasaklı alan, boru asla üst üste binmez
  (bkz. knowledge/line-drafting.md, 2026-08 üçüncü düzeltme).
- Cihaza bağlanmamış boru ucu UYARIYLA gösterilir ama çalışmayı ENGELLEMEZ (severity: warning).
- Bir kat mimarisi başka katlara kopyalanabilir (kat çıkma). Kopya tümüyle yeni id'ler alır.
  Hedefte içerik varsa kullanıcı seçer: üzerine yaz (aynı TÜRDEN çizim silinir) ya da o katı
  atla — "hedef boş olmalı" kuralı kalktı, bkz. knowledge/floor-clone.md.
- İzometrik çizimden otomatik üretilir, tüm binayı tek parça gösterir: YALNIZ
  tesisat çizilir (mimari yok), aktif kat kavramı yoktur. İzdüşüm WebCAD'in
  `Rx(α)·Ry(β)` matrisidir ama AYNALANARAK ve kamera YÖNÜ olarak uygulanır
  (K120) — işaretler tahmin değil türetimdir, değiştirmeden önce
  knowledge/isometric-view.md oku. İzometriğe özel elle yerleştirmeler
  (dal ayırma, etiket taşıma) AYRI opsiyonel alanlarda durur ve plan çizimini
  BOZMAZ (K121). α/β projeye yazılır ama projeyi KİRLETMEZ (K122); geri al
  TESİSAT geçmişine gider (K123); `scene/layers.ts` ve `CAMERA_HEIGHT_CM` orada
  GEÇERSİZDİR (K124).
- Kaydedilmemiş değişiklik varsa kullanıcı uyarılır. Yeni sürüm SADECE "Farklı Kaydet" ile.
- Renk: marka sarısı #FFC107 çizim alanına GİRMEZ. Seçim rengi mavi. Gaz hattının rengi
  ÇAPINDAN gelir (DN25 kırmızı, DN32/40/50 kendi renkleri — WebCAD ile aynı sınıflandırma,
  K27). "Tuvalde sarı = gaz hattı" kuralı bu kararla kalktı.
- Kimin projeye erişebileceği (tek sahip mi, çoklu rol mü) KESİNLEŞMEDİ — bkz.
  knowledge/access-control.md. Bu konuda varsayım kodlama.

## Kalıcılık

- Çizim JSON'u MinIO'da (S3 uyumlu nesne deposu) bir nesne olarak tutulur; SQL
  tarafı (`ProjeCizimGecmisi` benzeri tablo) sadece `DataUrl`/nesne anahtarı
  referansı tutar — JSON içeriği SQL'e KONMAZ. (NoSQL/belge-DB değil, nesne deposu.)
- SQL satırı ile MinIO nesnesi arasında ortak transaction YOK: MinIO'ya yaz →
  anahtarı al → SQL satırını ekle. SQL başarısızsa MinIO nesnesi temizlenir.
- Frontend açısından değişmez: api JSON alır/gönderir; serialize.ts model↔JSON çevirir.
- Her kayıt yeni ve DEĞİŞMEZ bir sürüm doğurur; üst bardaki **Kayıt Geçmişi**
  düğmesinin açılır listesi bunları gösterir ve seçileni yükler (K109). Yükleme geri al
  geçmişini SIFIRLAR, bu yüzden kaydedilmemiş değişiklik varken onay sorulur.
  Açık sürümün kimliği durumun parçası (`useProjectPersistence.currentVersionId`).
  Sunucu tarihleri dilim eki TAŞIMAZ → `parseServerTimestampMs`.
  (bkz. knowledge/version-history.md)

## Yorum, İsimlendirme, CSS

- Dosya başı açıklama yorumu yazılmaz — dosya/klasör adı zaten söylüyor. Yorum
  sadece "neden" için: workaround, geometri kısıtı, birim dönüşümü gibi kodun
  kendisinden anlaşılmayan bir şey varsa tek satır. TODO sahipsiz bırakılmaz: `// TODO(isim): ...`
- İsimlendirme: değişken/fonksiyon `camelCase`, bileşen/tip `PascalCase`, sabit
  `UPPER_SNAKE_CASE`. Boolean `is`/`has`/`should` ile başlar. Birim belirsizse adın
  içine yazılır (`widthCm`, `angleDeg`). Kısaltma yok (CAD terimleri hariç: bom, dxf).
  Dosya adı: bileşen `PascalCase.tsx`, geri kalan `camelCase.ts`.
- CSS: `style={{...}}` (inline stil) yasak. Tailwind utility class (`className`) bu
  kuralın dışında — proje zaten tailwindcss + class-variance-authority
  kullanıyor. Tekrar eden varyantlar `cva()` ile tanımlanır. Tailwind'in karşılamadığı
  özel CSS `src/styles/`'da ayrı dosyaya yazılır. İstisna: `scene/` içindeki R3F
  propları (`position`, `material` vb.) CSS değildir, bu kuralın kapsamı dışında.
- Kod hijyeni: magic number yok (isimli sabit), import sırası dış paket → iç modül
  → relative, fonksiyon/dosya tek iş yapar (200+ satır component bölünür), erken
  return kullanılır, barrel export (`index.ts` re-export) sadece gerçek public API
  için. PR küçük ve tek konulu tutulur.

## Çalışma şekli

- main'e doğrudan push YOK. Dal: feat/… , fix/… → Merge Request. Commit mesajı:
  `feat:`, `fix:`, `refactor:`, `test:` prefix'i.
- `core/` fonksiyonlarına test ZORUNLU. Kabul testi: docs/sample-project.json yükle→serileştir→
  bit bit aynı (float yuvarlanmaz). Bu test kırmızıyken özellik ekleme.
- Yeni bir mimari/ürün kararı verildiğinde bu dosyayı ve docs/kararlar.md'yi güncelle.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — tsc -b && vite build
- `npm run lint` — eslint
- `npm test` — testler (izleme modu), `npm run test:run` — tek seferlik

## Bilgi tabanı ve güvenlik

- Yeni oturumda ve bir modüle başlarken önce `.claude/knowledge/INDEX.md`'yi tara,
  bugünkü işe dair `decision`/`gotcha`/`open-question` satırlarını aç ve oku. Bu,
  en ucuz hata önlemidir. `open-question` işaretli konularda varsayım kodlama.
- Yeni bir mimari karar veya tuzak ortaya çıkınca: knowledge/ altına dosyasını yaz,
  INDEX.md'ye satır ekle, gerekiyorsa CLAUDE.md + ilgili SKILL'i güncelle.
- Yıkıcı komut (DROP/DELETE/TRUNCATE, rm -rf, main'e force push) öncesi ONAY al.
- Sır (API key, token) koda yazılmaz → .env; yeni env değişkeni eklenince .env.example güncelle.
  `VITE_` prefix'li her şey tarayıcıda görünür olur — sadece public bilgi bu prefix'i alır.
- Dış kaynaktan gelen veri (API response, form input) `zod` şemasından geçmeden
  state'e/isteğe girmez. `dangerouslySetInnerHTML` kullanılmaz (XSS).
- console.log/debugger commit öncesi kaldırılır. `any` tipi kullanılmaz.
