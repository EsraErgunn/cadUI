# Knowledge Index

Her mimari karar ve tuzak bir satır. Yeni oturumda ilgili olanları oku.
Yeni karar/tuzak çıkınca buraya satır ekle + dosyasını yaz.
Tür: `decision` (neden öyle) · `gotcha` (sessizce bozan tuzak) ·
`convention` (uyum kuralı) · `open-question` (henüz karar verilmedi — varsayarak kod yazma)

| Tarih | Tür | Konu | Özet |
|-------|-----|------|------|
| 2026-07 | decision | [persistence](./persistence.md) | Çizim JSON'u MinIO (S3 nesne deposu); SQL sadece DataUrl/yol tutar |
| 2026-07 | decision | [id-scheme](./id-scheme.md) | Kalıcı id = artan tamsayı (nextUniqueId), UUID DEĞİL — WebCAD round-trip uyumu |
| 2026-07 | open-question | [access-control](./access-control.md) | Erişim modeli kesinleşmedi — tek sahip mi, çoklu rol mü (ProjectFirmUser)? Çağrı bey'e sorulacak |
| 2026-07 | gotcha | [floor-clone](./floor-clone.md) | Kat kopyalama: id remap zorunlu, kolon klonlanmaz |
| 2026-07 | gotcha | [tool-logic](./tool-logic.md) | Araç mantığı DrawSurface'e yazılmaz → merge çakışması |
| 2026-07 | convention | [coordinates](./coordinates.md) | Plan↔Three dönüşümü sadece coords.ts; sarı=gaz hattı |
| 2026-07 | decision | [viewport](./viewport.md) | %100 = 1cm/1px; zoom/pan kamerada (store'da değil); kamera rotation −90° şart |
| 2026-07 | gotcha | [opening-placement](./opening-placement.md) | offsetCm açıklığın ORTASI; duvar bölünmez (açıklık = delik); köşe payı = dik duvarın kalınlığı; geçersiz yerleştirme reddedilir, kaydırılmaz |
| 2026-07 | convention | [snap-contract](./snap-contract.md) | Sabit aralıklı snap yok (uç/orta/kesişim); duvar↔açıklık fonksiyon sözleşmesi; dizi (Record değil); taze dizi üreten selector'a abone olunmaz |
| 2026-07 | open-question | [arc-walls](./arc-walls.md) | Yay duvar kararı YOK — varsayma. Dikiş core/wallPath.ts; getPlacementRange'in uzunluk çağrısı da çevrilmeli |
| 2026-07 | decision | [admin-list-state](./admin-list-state.md) | Yönetici listelerinde durum URL query param'da, sayfalama sunucuda; yetki düz izin listesiyle (rol modeli yok) |
| 2026-07 | gotcha | [turkish-collation](./turkish-collation.md) | `'İ'.toLowerCase()` birleşen nokta üretir → arama sessizce eşleşmez; normalizeTr kullan |
| 2026-08 | gotcha | [gesture-bus-precedence](./gesture-bus-precedence.md) | Tek pointerdown'ı tüm hook'lar görür; Seçim Aracı'nda köşe tutamağı açıklıktan önce gelir, yoksa tek harekete iki Ctrl+Z |
| 2026-07 | decision | [theming](./theming.md) | Açık varsayılan + koyu tema: token değerleri `.dark` altında değişir, class tabanlı (`@custom-variant`); admin'de sarı yok, birincil indigo, aksan cyan |
