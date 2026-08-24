# Evrak ekranları — sunucu durumu ve kalan eksikler

**Durum:** İki ekran (Evraklar listesi + Evrak Ekle) yazıldı ve **sunucu tarafı
AÇILDI**. Evrak modülünün tamamı gerçek uçlara bağlı (`src/api/documents.ts`);
bellekteki mock depo (`src/api/documentsMock.ts`) SİLİNDİ — bu adla yeni kod
yazma.

Doğrulama tabanı: cadapi @ `539383d` — `DocsController` + `DocDtos.cs`.

Bu belge artık bir sözleşme TASLAĞI değil; açılan sözleşmeyi ve **kalan**
eksikleri kaydediyor.

## Çalışan uçlar

| Uç | Ne besliyor |
|---|---|
| `GET /api/docs` | Evraklar listesi — süzgeç, sıralama ve sayfalama SUNUCUDA |
| `POST /api/docs` | Dosya yükleme (multipart) |
| `DELETE /api/docs/{id}` | Evrak silme |
| `PUT /api/docs/{id}/assign` | Evrağı başka projeye taşıma / havuza geri alma |
| `POST /api/docs/{id}/units/{unitId}` | Birim bağı ekleme |
| `DELETE /api/docs/{id}/units/{unitId}` | Birim bağı kaldırma |
| `GET /api/docs/{id}/download` | Süreli indirme adresi (`DocDownloadDto.url`) |

Yardımcı uçlar da açık:

- `GET /api/codes/by-group-name/DocumentType` — evrak tipi listesi
  (`src/api/documentTypes.ts`). Kod grubunun adı **`DocumentType`**; belgenin
  eski hâlindeki "EvrakTipi grubu var mı" sorusu böylece KAPANDI. İstemcide
  sabit 18 tip tutulmuyor.
- `GET /api/projects/{projectId}/units` — birim listesi (`ProjectUnitsController`).

`src/api/http.ts` multipart'ı ARTIK biliyor: `uploadForm` (`Content-Type` elle
konmuyor, boundary'yi tarayıcı üretiyor; yetki başlığı ve hata/şema kuralları
JSON isteğiyle aynı kapıdan geçiyor). Belgenin eski hâlindeki `requestForm`
taslağı gereksiz kaldı.

## Sözleşme (sunucudaki hâliyle)

`GET /api/docs` → `PagedResultDto<DocListItemDto>` = `{ items, totalCount, page, pageSize }`.

`DocListQueryDto` şu parametreleri alıyor:

```
ProjectId, ProjectUnitId, ProjectFirmId, DocTypeCodeId,
ReceivedFrom, ReceivedTo, PoolOnly,
SortBy (filename | receivedat, varsayılan receivedat), SortDir (varsayılan desc),
Page (1), PageSize (30)
```

`DocListItemDto` satırı:

```
Id, FileName, ContentType, SizeBytes, DocTypeCodeId, DocTypeName,
ProjectId, ProjectName, ProjectUnits[] ({ Id, UnitNumber, SubscriberNo }),
ProjectFirmId, ProjectFirmName, ReceivedAt
```

Yükleme (`POST /api/docs`, `DocUploadDto`): `ProjectId?`, `ProjectUnitId?`,
`DocTypeCodeId?`, `ProjectFirmId?`, `FileName`, `ContentType`, `SizeBytes`.
Dosya başına ayrı istek deseni korunuyor: biri düşünce diğerleri kaydedilmiş
kalır.

**Evrak BİRİME bağlanıyor.** Sunucu gövdesi proje seviyesinde evrağı ve "havuz"
kavramını (`PoolOnly`, `ProjectId = null`) destekliyor ama üründe böyle bir akış
YOK: her evrak en az bir birimle ilişkilendiriliyor (`useDocumentUpload` bunu
zorunlu tutuyor).

## Kalan eksikler

| # | Eksik | Etkisi |
|---|---|---|
| 1 | `GET /api/docs` **arama (`q`/`Search`) parametresi almıyor** | Evraklar ekranındaki arama kutusu KALDIRILDI. Sayfalı bir listede istemci tarafı arama yalnız görünen sayfayı süzeceği için yanlış sonuç verirdi; yarım çalışan süzgeç olmayandan yanıltıcıdır. |
| 2 | `DocListItemDto` **bina kodunu taşımıyor** | `DocumentRow.projectPId` `null`; hücre boş işareti çiziyor. Uydurma değer yazılmıyor. |
| 3 | **Tesisat numarasının** sunucuda karşılığı yok (ne `Doc`ta ne `Project`te) | `DocumentRow.installationNo` `null`. |
| 4 | Satır **gaz dağıtım firmasını taşımıyor** | `DocumentRow.gasFirmName` `null`; evrak listesinde KAPSAM süzmesi uygulanamıyor. |
| 5 | `GET /api/projects` yanıtında **`hasDocuments` yok** | Proje listesindeki evrak ikonu hep gri; `projects.ts` alanı sabit `false` map'liyor. Gereksinim 12'nin "evrak yüklenince ikon yeşile döner" maddesi bu alan gelmeden karşılanamaz. |

## Karara bağlanması gereken konular

**1. "Favori Evrak" tipi listeden ÇIKARILIYOR.** Kod grubu bu tipi döndürüyor
ama arayüz `EXCLUDED_CODE_VALUES` ile süzüyor (`documentTypes.ts`): favori
kavramı kapsam dışı ve seçilebilen ama hiçbir şey yapmayan bir tip, kullanıcıya
olmayan bir özellik vaat ederdi. Eleme İSTEMCİDE — sunucu tarafında da
kaldırılması isteniyorsa iş tarafına sorulmalı.

**2. Yükleme yetkisi.** Sunucuda `POST /api/docs` ve `DELETE /api/docs/{id}`
`Admin` + `ProjectFirmUser` rollerine açık. Arayüzün bunu görünürlükte
yansıtması gerekip gerekmediği (gaz dağıtım kullanıcısına yükleme düğmesi
gösterilsin mi) netleşmedi.

**3. `.dwg` yükleme biçimlerinde YOK** ama listede DWG kayıtları görünüyor:
bunlar kullanıcı yüklemesi değil, çizim tarafından üretilen dosyalar sayılıyor
(iş tarafına doğrulatılıyor). Biçim (7 uzantı) ve 10 MB sınırı İSTEMCİDE
denetleniyor (`ui/admin/documents/documentFiles.ts`); sunucunun da denetlemesi
gerekir, istemci yalnız erken geri bildirim veriyor.

## Bu iş sırasında bulunan, evrak DIŞI eksikler

- **Proje firması için salt okunur bir ekran yok.** Evrak tablosundaki "Firma
  Adı" bu yüzden düz metin (satır `ProjectFirmId` taşıyor, hedef ekran yok).
- **G.D. firmasının tek ekranı güncelleme FORMU.** Bir liste hücresinden
  düzenleme formuna gitmek yanlış hedef; "G.D Firması" de bu yüzden düz metin.
