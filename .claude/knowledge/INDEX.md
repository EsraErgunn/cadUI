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
