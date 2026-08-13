# Evrak ekranları — eksik uçlar ve sözleşme taslağı

**Durum:** İki ekran (Evraklar listesi + Evrak Ekle) yazıldı, sunucu tarafının
TAMAMI yok. Envanter `localhost:5193` OpenAPI'sinden çıkarıldı (2026-08-13):
30 yol var, evrakla ilgili **tek bir yol veya DTO yok**.

Sözleşme taslağı FRONTEND önerisidir; alan adları backend'le kesinleşecek.

## Bugün çalışan uç

Yok. Ekranların tamamı `src/api/documentsMock.ts` içindeki BELLEK deposundan
besleniyor: yüklenen evrak listeye gerçekten giriyor ama **sayfa yenilenince
kayboluyor**. Kalıcılık veritabanı + uç işi.

Satırlar uydurma değil, mock proje listesinden tohumlanıyor
(`projectsMock.getMockProjectSeeds`): tablodaki "Proje Adı" bağlantısı gerçekten
var olan bir projeye gidiyor.

## Eksik uçlar

| # | Uç (öneri) | Ne besleyecek | Karşılığı olan entity |
|---|---|---|---|
| 1 | `GET /api/docs?from&to&type&firm&q&sort&dir&page&pageSize` | Evraklar listesi (sayfalı) | `Doc` + `ProjectDoc` — **tablolar var** |
| 2 | `GET /api/projects/{id}/docs` | Proje detayının evrak sekmesi + Evrak Ekle'nin "Proje Evrakları" sekmesi | aynı |
| 3 | `POST /api/projects/{id}/docs` (multipart) | Dosya yükleme | aynı |
| 4 | `POST /api/projects/{id}/docs/{docId}/reassign` | Mevcut evrağı başka birimlerle yeniden ilişkilendirme (gereksinim 7) | `ProjectDoc` |
| 5 | `GET /api/projects/{id}/units` | Birim checkbox listesi | `ProjectUnit` — **tablo var, controller yok** (proje detayıyla ORTAK, ikinci uç istenmiyor) |
| 6 | `GET /api/codes/by-group-name/EvrakTipi` | Evrak tipi listesi | **Uç VAR**, eksik olan KOD GRUBU |

### 1 — Liste yanıtı (öneri)

Ortak sayfalama zarfı (`PagedResult`): `{ items, totalCount, page, pageSize }`.
Satır alanları `src/api/documents.ts` → `DocumentRow`:

```
id, fileName, docTypeCode, receivedAt, unitNames[],
projectId, projectName, projectPId, projectFirmId,
installationNo, firmName, gasFirmName,
sizeBytes, uploadedByName, contentType, url
```

- `contentType` **zorunlu**: dosyanın yeni sekmede mi açılacağı yoksa
  indirileceği mi kararını yalnız o veriyor (K57). Uzantıya bakan bir ayrım,
  uzantısı yanlış yazılmış dosyada sessizce yanlış davranır.
- `url` süreli bir MinIO bağlantısı olmalı (çizim JSON'undaki desenin aynısı).
- `unitNames` çoğul: bir evrak birden çok birime bağlanabiliyor (gereksinim 11).
- Arama `q` YALNIZ evrak adında; tarih aralığı evrağın **geliş** tarihine göre.

### 3 — Yükleme sözleşmesi (öneri)

`multipart/form-data`, **dosya başına ayrı istek**:

| Alan | Tip | Açıklama |
|---|---|---|
| `file` | binary | Tek dosya |
| `docTypeCode` | string | `EvrakTipi` kod grubundan |
| `unitIds` | number[] | En az bir birim |

Dosya başına ayrı istek, ağ/sunucu hatasında kısmi başarıyı korumak için:
biri düşünce diğerleri kaydedilmiş kalır. Biçim (7 uzantı) ve 10 MB sınırı
İSTEMCİDE, dosya listeye alınmadan denetleniyor (`ui/admin/documents/
documentFiles.ts`) — sunucunun da denetlemesi gerekir, istemci yalnız
kullanıcıya erken geri bildirim veriyor.

**`.dwg` yükleme biçimlerinde YOK** ama listede DWG kayıtları görünüyor: bunlar
kullanıcı yüklemesi değil, çizim tarafından üretilen dosyalar sayılıyor
(iş tarafına doğrulatılıyor).

### `http.ts` şu an multipart bilmiyor

Bugün yalnız `rawJsonBody` var. 3 numaralı uç açılınca `src/api/http.ts`'e
eklenecek:

```ts
export async function requestForm<Schema extends z.ZodType>(
  request: { method: 'POST' | 'PUT'; path: string; body: FormData; signal?: AbortSignal },
  schema: Schema,
): Promise<z.infer<Schema>>
```

`Content-Type` **elle konulmaz** — boundary'yi tarayıcı üretir. Token yine
`buildHeaders` üzerinden tek yerden eklenir. Bugün yazılmadı: çağıranı olmayan
bir kod ortak dosyada ölü ağırlık olurdu.

## Karara bağlanması gereken konular

**1. "EvrakTipi" kod grubu var mı?** Sunucuda parametrik kod grubu mekanizması
çalışıyor (`ProjeDurumu` grubu gibi) ama bu grubun tanımlı olup olmadığı
doğrulanamadı (yetkisiz istek 401 döndü). Bugün 18 tip
`src/api/documentTypes.ts` içinde sabit; kodlar İSTEMCİ uydurmasıdır ve grup
açılınca sunucunun `CodeValue`'larıyla değişecek. URL'deki `type` filtresi bu
kodu taşıdığı için geçişte eski bağlantılar filtresiz açılır.

**2. "Favori Evrak" tipi listeden ÇIKARILDI** (19 → 18). Favori kavramı tümüyle
kapsam dışı. Kod grubu bu tipi döndürürse istemcide SÜZÜLMEYECEK — sözleşmeye
giren bir kodu arayüzde saklamak, listedeki evrağın tipini boş gösterirdi.

**3. Yükleme yetkisi hangi rollerde?** Bugün ekran üç rolde de açık; içeriğin
sunucuda role göre daralması bekleniyor (istemci tarafı yalnız görünürlük).
İş tarafından cevap bekleniyor.

## Bu iş sırasında bulunan, evrak DIŞI eksikler

- **`GET /api/projects` yanıtında `hasDocuments` yok.** Proje listesindeki evrak
  ikonu bu yüzden hep gri; `projects.ts` alanı sabit `false` map'liyor.
  Gereksinim 12'nin "evrak yüklenince ikon yeşile döner" maddesi bu alan
  gelmeden karşılanamaz (kapsam dışı bırakıldı, istemcide geçici iz tutulmadı).
- **Proje firması için salt okunur bir ekran yok.** `ProjectFirmsPage` yalnız
  `q` (ad araması) okuyor, kimlik filtresi yok; bu yüzden evrak tablosundaki
  "Firma Adı" düz metin. Kimlik filtresi ya da firma detay ekranı gelince
  bağlanacak.
- **G.D. firmasının tek ekranı güncelleme FORMU.** Bir liste hücresinden
  düzenleme formuna gitmek yanlış hedef; "G.D Firması" de bu yüzden düz metin.
