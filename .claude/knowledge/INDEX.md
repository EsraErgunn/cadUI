# Knowledge Index

Her mimari karar ve tuzak bir satır. Yeni oturumda ilgili olanları oku.
Yeni karar/tuzak çıkınca buraya satır ekle + dosyasını yaz.
Tür: `decision` (neden öyle) · `gotcha` (sessizce bozan tuzak) ·
`convention` (uyum kuralı) · `open-question` (henüz karar verilmedi — varsayarak kod yazma)

| Tarih | Tür | Konu | Özet |
|-------|-----|------|------|
| 2026-07 | decision | [persistence](./persistence.md) | Çizim JSON'u MinIO (S3 nesne deposu); SQL sadece DataUrl/yol tutar; proje değişince store SIFIRLANIR — yoksa önceki projenin çizimi yenisine kaydedilir |
| 2026-07 | decision | [id-scheme](./id-scheme.md) | Kalıcı id = artan tamsayı (nextUniqueId), UUID DEĞİL — WebCAD round-trip uyumu |
| 2026-08 | decision | [access-control](./access-control.md) | Üç rol, kullanıcı başına TEK rol (Role.Code); API fail-closed → token http.ts'te tek yerde eklenir, 401'de atılır |
| 2026-07 | gotcha | [floor-clone](./floor-clone.md) | Kat kopyalama: id remap zorunlu, kolon klonlanmaz |
| 2026-08 | decision | [floor-ordering](./floor-ordering.md) | Kat sırası dizinin KENDİSİ (order alanı yok), başı en alt kat; kat geçişi geçmişe adım yazmaz; kat silmede açıklık→duvar→nokta sırası |
| 2026-07 | gotcha | [tool-logic](./tool-logic.md) | Araç mantığı DrawSurface'e yazılmaz → merge çakışması |
| 2026-07 | convention | [coordinates](./coordinates.md) | Plan↔Three dönüşümü sadece coords.ts; sarı=gaz hattı |
| 2026-07 | decision | [viewport](./viewport.md) | %100 = 1cm/1px; zoom/pan kamerada (store'da değil); kamera rotation −90° şart |
| 2026-07 | gotcha | [opening-placement](./opening-placement.md) | offsetCm açıklığın ORTASI; duvar bölünmez (açıklık = delik); köşe payı = dik duvarın kalınlığı; geçersiz yerleştirme reddedilir, kaydırılmaz |
| 2026-07 | convention | [snap-contract](./snap-contract.md) | Sabit aralıklı snap yok (uç/orta/kesişim); duvar↔açıklık fonksiyon sözleşmesi; dizi (Record değil); taze dizi üreten selector'a abone olunmaz |
| 2026-07 | open-question | [arc-walls](./arc-walls.md) | Yay duvar kararı YOK — varsayma. Dikiş core/wallPath.ts; getPlacementRange'in uzunluk çağrısı da çevrilmeli |
| 2026-08 | open-question | [webcad-json-format](./webcad-json-format.md) | Referans JSON palet elemanlarının alanlarını veriyor; Room.pointIds / distance / kat başına nextUniqueId bizimkiyle çelişiyor — karara bağlanmadan yazma |
| 2026-07 | decision | [admin-list-state](./admin-list-state.md) | Yönetici listelerinde durum URL query param'da, sayfalama sunucuda; yetki düz izin listesiyle (rol modeli yok); kabuk viewport'a kilitlenmez — tek kaydırma pencerede, `h-screen`/`overflow-y` yok |
| 2026-07 | gotcha | [turkish-collation](./turkish-collation.md) | `'İ'.toLowerCase()` birleşen nokta üretir → arama sessizce eşleşmez; normalizeTr kullan |
| 2026-08 | decision | [capsule-walls](./capsule-walls.md) | Duvar = yuvarlak uçlu kapsül (gönye/union YOK); kontursuz düz renk; CAMERA_HEIGHT_CM düşürülmemeli |
| 2026-08 | decision | [wall-graph](./wall-graph.md) | Duvar grafı DÜZLEMSEL: kesişim/T birleşiminde düğüm açılır ve duvar bölünür; açıklığın içine düşen bölme reddedilir (K24) |
| 2026-08 | decision | [group-transform](./group-transform.md) | Dönüşüm köşelere uygulanır (açıklık duvarıyla gelir); dayanak sınır kutusu merkezi; taşıma da dönüşümdür; id remap KK-15 ile ORTAK, eksik referans hata fırlatır |
| 2026-08 | convention | [property-panel](./property-panel.md) | Panel seçime abone; ayrışan değer boş gösterilir; toplu yazım tek Ctrl+Z; kalınlık değişince açıklık temizliği AYNI adımda; konum panelde KENARDAN (K-3) |
| 2026-08 | gotcha | [gesture-bus-precedence](./gesture-bus-precedence.md) | Tek pointerdown'ı tüm hook'lar görür; köşe > açıklık > duvar > boşluk sırası geometriyle verilir; seçim TEK listede (KK-10), Delete tek dinleyicide |
| 2026-08 | decision | [new-project-form](./new-project-form.md) | Rol görünürlüğü useIsAdmin (roleCode) ile; doğrulamanın girişi validateNewProject — zod refine kardeş alan hatalıyken çalışmaz; parametrik seçenek kaybolursa seçim düşer; bitiş tarihi başlamadan TÜRER (+2 ay, her değişimde); sayısal alan `type=number` DEĞİL (metin + spinbutton); kapasite tavanı 10.000 m³/h |
| 2026-08 | decision | [webcad-format](../../docs/webcad-format.md) | Referans WebCAD JSON'u: çap boru başına (varsayılan DN25) ve renk çaptan gelir — "sarı = gaz hattı" KALKTI; armatür düğümdür (`t` değil); tesisatın katı yok (kot ile), baca ayrı graf; id evreni konteyner bazlı |
| 2026-08 | decision | [plumbing-selection](./plumbing-selection.md) | Tesisat tutması R3F ışınıyla değil saf geometriyle (tek olay kaynağı); sürükleme tek yazım = tek Ctrl+Z; iptalde konumu geri yazan effect şart |
| 2026-08 | gotcha | [undo-scoping](./undo-scoping.md) | Mimari ve tesisat geçmişi AYRI; Ctrl+Z tek dinleyiciden (pages/useEditorShortcuts) aktif görünüme dağıtılır — katman kendi window dinleyicisini kurarsa tek tuş iki geçmişi birden geri alır |
| 2026-07 | decision | [theming](./theming.md) | Açık varsayılan + koyu tema: token değerleri `.dark` altında değişir, class tabanlı (`@custom-variant`); admin'de sarı yok, birincil indigo, aksan cyan |
