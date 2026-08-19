# Kayıt geçmişi: sürüm listesi ve geçmişten yükleme (K109)

Editörün sağ üstündeki **Kayıt Geçmişi** düğmesi K90'da yer tutucuydu; artık
gerçek uca bağlı. Liste düğmenin ALTINDAN açılır (WebCAD'deki "Düzenle ▸ Kayıt
Geçmişi" akışının karşılığı), sürüm seçilince o çizim editöre yüklenir.

Satır biçimi: `17 Ağu - 14:13 | test1` — kısa tarih, saat, etiketliyse ayraçtan
sonra adı. Ayraç `aria-hidden` ve satırın erişilebilir adı ELLE kuruluyor
(`aria-label`): hesaplanan ad iki parçayı boşluksuz birleştirip "14:13test1"
diyordu.

## Uçlar (cadapi `ProjectVersionsController`, tag "Çizim Versiyonları")

| Uç | Dönüş |
|---|---|
| `POST /api/projects/{id}/newversion?label=` | `{ id, projectId, objectKey, label, createdAt }` |
| `GET /api/projects/{id}/versions` | `[{ id, label, createdAt }]` — **CreatedAt'e göre AZALAN** |
| `GET /api/projectversions/{id}/get` | `{ url }` — süreli MinIO linki |

Liste DTO'su **kullanıcı adı taşımıyor** (`CreatedByUserId` var ama yansımıyor):
satırda tarih + etiketten fazlası gösterilemez. "Kim kaydetti" gerekirse uç
değişmeli.

## Kararlar

- **Sürüm seçmek çizimi YÜKLER.** Salt okunur bir liste, düğmenin pratik
  faydasını sıfıra indirirdi.
- **Onay yalnız kirliyken sorulur.** Temizken aynı çizim sunucuda duruyor,
  kaybedilecek bir şey yok. Kirliyken şart: `loadProject` geri al geçmişini de
  SIFIRLIYOR (cadStore: "yükleme bir düzenleme değil, yeni bir başlangıç"),
  yani Ctrl+Z ile geri dönülemez.
- **Yüklü sürüm de tıklanabilir kalır** — kaydedilmemiş değişiklikleri atıp son
  kayda dönmenin tek yolu bu.
- **"Farklı Kaydet" aktifleştirildi** (Dosya menüsü + Ctrl+Shift+S): etiket
  ZORUNLU, yoksa düz "Kaydet"in ikizi olurdu. Etiket, kaydı listede tarihten
  başka bir şeyle tanımanın tek yolu.

## ⚠️ Tuzaklar

- **Açık sürümün kimliği durumun parçası.** `loadLatestProjectVersion` artık
  `{ versionId, data }` döndürüyor; `useProjectPersistence.currentVersionId`
  hem listede "Yüklü" rozetini hem de listenin TAZELENMESİNİ sürüyor (kaydetme
  yeni bir kimlik doğuruyor → panel yeniden çekiyor).
- **Sürüm yükleme de `activeLoad` sahipliğinden geçer.** Store'u dolduran her
  yol aynı kapıdan geçmeli; yoksa proje değişince iptal edilemeyen ikinci bir
  yazar kalırdı (knowledge/persistence.md'deki asıl hatanın aynısı).
- **Açılış yüklemesi hata verdiyse kaydetme kilitli** kalıyordu; geçmişten sürüm
  yüklemek bu kilidi AÇAR — projenin sunucudaki çizimi artık biliniyor.
- **Tarihte `new Date(...)` kullanma.** Uç `DateTime` döndürüyor ve dilim eki
  yazmıyor ("2026-08-19T11:30:00"), değer ise UTC. `api/serverTimestamp.ts`
  → `parseServerTimestampMs` kullanılır; düz ayrıştırmada her kayıt UTC+3'te üç
  saat geride görünür.
- **Açık/kapalı durumu bileşenin İÇİNDE** (`VersionHistoryMenu`). Yüzen liste
  kimsenin yerini daraltmıyor, dışarıdaki hiçbir parça bu bilgiye ihtiyaç
  duymuyor — sayfaya taşınsaydı MenuBar üzerinden iki prop daha inerdi.
  İlk denemede sağdan kayan bir panel yazılmıştı; kullanıcı WebCAD'deki açılır
  listeyi istedi, panel SİLİNDİ (`VersionHistoryPanel` adıyla yeni kod yazma).
- **Dışarı tıklama kapsamı düğmeyi DE içerir.** Dışarıda bıraksaydık
  `pointerdown` listeyi kapatır, hemen ardından düğmenin kendi `click`'i
  yeniden açardı (MenuBar'daki aynı tuzak).
- **Liste kapalıyken istek YOK**: `useProjectVersions` yalnız açıkken çekiyor.
- **Veri react-query ile çekilmiyor** (o yalnız yönetici ekranlarında). Listeyi
  tazeleyen anahtar zaten editörün "açık sürüm" durumu; önbelleğe taşınsaydı
  kaydetme yolunun ayrıca invalidate etmesi gerekirdi. "Yükleniyor" bayrak
  değil, sonucun anahtarıyla beklenen anahtarın karşılaştırması —
  `react-hooks/set-state-in-effect` senkron `setState`'i hata sayıyor.

**Dosya:** ui/versions/VersionHistoryPanel.tsx · VersionRow.tsx ·
VersionLoadConfirmDialog.tsx · SaveVersionDialog.tsx · useProjectVersions.ts ·
versionFormat.ts · pages/useProjectPersistence.ts · api/projects.ts ·
ui/menu/EditorActions.tsx
