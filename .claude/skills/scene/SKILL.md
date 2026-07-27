---
name: scene
description: scene/ içindeki react-three-fiber bileşenleriyle (<Canvas> İÇİ) çalışırken oku. Kamera, çizim yüzeyi, mesh, katman sırası, seçim/hover, araç hook'ları yazarken gerekli.
---

# starcad — Sahne (scene/, <Canvas> içi, R3F)

- Bu klasördeki bileşenler SADECE <Canvas> içinde render edilir. DOM bileşeni koyma (o ui/).
  ESLint bu ayrımı zorluyor: `scene/` → `ui/` ve `ui/` → `scene/` importu hata verir.
  İkisinin de göreceği bir şey varsa `core/`'a koy (ör. `core/tools.ts`).
- Sahne state'in TÜREVİDİR. Mesh'te veri tutma; sadece userData.id koy, gerisini store'dan oku.
- Koordinat: three konumları core/coords.ts'ten geçer. Elle (x,-z) yazma.

## Kamera ve görünüm

- Kamera plan düzlemine tepeden bakar: `rotation={[-Math.PI / 2, 0, 0]}`.
  Bu döndürme yazılmazsa kamera −Z'ye bakar, plan düzlemini kenardan görür ve
  tuval BOŞ görünür. `up` vektörüyle çözmeye çalışma — `up` yalnız `lookAt()` ile etkilidir.
- `camera.zoom = 1` → 1 cm = 1 px ("%100"). Sınırlar `core/viewport.ts`'te
  (`ZOOM_MIN` 0.1, `ZOOM_MAX` 10).
- **Zoom/pan store'a KONMAZ**, kamerada yaşar — her karede store'a yazmak tüm ağacı
  60 fps yeniden render ettirir. Kamera ↔ saf `ViewportState` köprüsü:
  `scene/cameraViewport.ts`. Ayrıntı: knowledge/viewport.md.
- Görünüm hesapları (zoom sınırı, imleç merkezli zoom, ekrana sığdır) `core/viewport.ts`'te
  SAF fonksiyondur ve testi vardır. `scene/` yalnız bunları kameraya uygular.

## Izgara

- Kademe tablosu `core/grid.ts` → `GRID_LEVELS` (50/100 → 100/500 → 500/2500 cm).
  `majorCm` her zaman `minorCm`'in tam katı olmalı.
- Geometri yalnız görünür alan için üretilir ve bir adım payla dışarı yuvarlanır
  (`padBoundsToStep`) — hücre içi küçük pan'larda yeniden üretilmez.
- Görünür alana göre ürettiğimiz için `frustumCulled={false}` şart, yoksa kenarlarda kaybolur.

## Çizgi ve seçim

- Çizgi kalınlığı: three'nin düz Line'ında linewidth çoğu yerde çalışmaz (hep 1px).
  Kalın çizgi (kalın ızgara, boru, ölçü, snap) için drei <Line> kullan.
- İnce nesne seçimi: boru çizgisine raycast zor isabet eder. Görünmez, kalın bir
  "tıklama gövdesi" mesh'i ekle.
- Katman sırası: renderOrder scene/layers.ts'ten gelir. Mimari altta soluk, tesisat üstte.
  Mesh'e elle sayı yazma, sabitten al.
- Renkler `scene/sceneTheme.ts`'te (WebGL Tailwind kullanamaz). Marka sarısı #FFC107
  çizim alanına GİRMEZ — tuvalde sarı = gaz hattı.

## Olay dinleme

- ARAÇ MANTIĞI DrawSurface'e YAZILMAZ. DrawSurface sadece ham pointer olayı yayınlar
  (plan koordinatı, tıklandı, sürükleniyor). Araç mantığı kendi hook'unda:
  useWallTool.ts (B), usePipeTool.ts (C). Bu kural merge çakışmasını önler.
- Zoom/pan araç mantığı DEĞİLDİR; `useViewportControls.ts`'te durur, DrawSurface'e girmez.
- `wheel` dinleyicisi `{ passive: false }` ile bağlanmalı, yoksa `preventDefault()`
  yok sayılır ve sayfa kayar. Orta tuş için ayrıca `auxclick`'te preventDefault gerekir.
- Sürükleme başlarken `setPointerCapture` kullan — imleç çizim alanının dışına
  taşınca olaylar kesilmesin.
- Space gibi basılı-tutma durumları için `window`'un `blur` olayını da dinle; sekme
  değişince keyup gelmez ve tuş "basılı kalmış" görünür.
