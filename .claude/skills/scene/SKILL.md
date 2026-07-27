---
name: scene
description: scene/ içindeki react-three-fiber bileşenleriyle (<Canvas> İÇİ) çalışırken oku. Kamera, çizim yüzeyi, mesh, katman sırası, seçim/hover, araç hook'ları yazarken gerekli.
---

# starcad — Sahne (scene/, <Canvas> içi, R3F)

> TASLAK — sıra gelince doldurulacak. Aşağıdakiler yazılacak başlıklar.

- Bu klasördeki bileşenler SADECE <Canvas> içinde render edilir. DOM bileşeni koyma (o ui/).
- Sahne state'in TÜREVİDİR. Mesh'te veri tutma; sadece userData.id koy, gerisini store'dan oku.
- Koordinat: three konumları core/coords.ts'ten geçer. Elle (x,-z) yazma.
- Çizgi kalınlığı: three'nin düz Line'ında linewidth çoğu yerde çalışmaz (hep 1px).
  Kalın çizgi (boru, ölçü, snap) için drei <Line> kullan.
- İnce nesne seçimi: boru çizgisine raycast zor isabet eder. Görünmez, kalın bir
  "tıklama gövdesi" mesh'i ekle.
- Katman sırası: renderOrder scene/layers.ts'ten gelir. Mimari altta soluk, tesisat üstte.
  Mesh'e elle sayı yazma, sabitten al.
- ARAÇ MANTIĞI DrawSurface'e YAZILMAZ. DrawSurface sadece ham pointer olayı yayınlar
  (plan koordinatı, tıklandı, sürükleniyor). Araç mantığı kendi hook'unda:
  useWallTool.ts (B), usePipeTool.ts (C). Bu kural merge çakışmasını önler.
