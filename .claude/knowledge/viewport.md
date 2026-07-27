# decision + gotcha: Görünüm (zoom / pan / ızgara)

## "%100" = 1 cm başına 1 piksel

R3F `<Canvas orthographic>` frustum'u **piksel** cinsinden kurar, bu yüzden
`camera.zoom = 1` doğrudan 1 cm = 1 px demektir. %10 → `0.1`, %1000 → `10`
(`ZOOM_MIN` / `ZOOM_MAX`, `core/viewport.ts`). Araya ikinci ölçek katmanı koyma.

Frustum kameranın konumu etrafında simetrik olduğu için **viewport merkezi = kameranın
baktığı dünya noktası**. Pencere yeniden boyutlandığında merkez kendiliğinden sabit
kalır; telafi kodu yazma, bozarsın.

## gotcha: kamera döndürmesi yazılmazsa ekran boş görünür

Kamera `rotation={[-Math.PI / 2, 0, 0]}` ile tepeden bakar. Bu döndürme:
- baktığı yönü −Y yapar (plan düzlemine tepeden),
- ekranda "yukarı"yı three −Z'ye = **plan +Y**'ye denk getirir.

Yazılmazsa kamera −Z'ye bakar, plan düzlemini kenardan görür ve tuval boş görünür.
Yerine `up` vektörü ayarlamaya çalışma — `up` yalnız `lookAt()` çağrılırsa etkilidir.

## gotcha: zoom/pan store'a KONMAZ

Tekerlek/sürükleme her karede store'a yazarsa tüm ağaç 60 fps yeniden render olur.
Kamera tek doğruluk kaynağıdır; `scene/cameraViewport.ts` core'daki saf
`ViewportState` ile three kamerası arasındaki tek köprüdür.

Bunun bedava sonucu: "zoom/pan/araç/görünüm projeyi kirletmez" (issue 2.9) kuralı
kod incelemesiyle değil **yapıyla** garanti edilir — o veri `cadStore`'da yok.

## gotcha: wheel dinleyicisi `{ passive: false }` olmalı

Aksi halde `preventDefault()` yok sayılır, sayfa zoom yerine kayar.
Orta tuş için ayrıca `auxclick`'te `preventDefault` gerekir — yoksa Windows/Chrome
otomatik kaydırma imlecini açar.

## Izgara kademesi

`core/grid.ts` → `GRID_LEVELS` tablosu: 50/100 → 100/500 → 500/2500 cm.
Seçim kuralı: `minorCm * zoom >= 12 px` sağlayan ilk kademe.
`majorCm` her zaman `minorCm`'in tam katı olmalı (testi var) — değilse ince ızgara
kalın çizgilerin üstüne ikinci kez çizilir.

Kalın çizgi için drei `<Line>` kullanılır: three'nin düz `Line`'ında `linewidth`
çoğu platformda çalışmaz, hep 1 px kalır.
