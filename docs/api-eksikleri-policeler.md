# Poliçe Oluşturma — eksik uçlar ve sözleşme taslağı

**Durum:** Poliçe Oluşturma sihirbazı (5 adım) yazıldı, sunucu tarafının TAMAMI
yok. `Policy` entity'si veritabanında VAR (`ProjectUnit`'e bağlı) ama controller'ı
yok; sigorta şirketi ve acente için tablo bile yok.

Sözleşme taslağı FRONTEND önerisidir; alan adları backend'le kesinleşecek.

## Bugün çalışan uç

Sadece proje künyesi: ekran `?project=<id>` ile gelen projeyi `GET /api/projects/{id}`
(gerçek uç) üzerinden çözüyor (K63'ün deseni). Bunun dışındaki her şey
`src/api/policiesMock.ts` içindeki BELLEK deposundan geliyor: oluşturulan poliçe
proje detayının "Poliçe Bilgileri" sekmesinde gerçekten listeleniyor ama **sayfa
yenilenince kayboluyor**. Kullanıcıya bu SÖYLENİYOR (K58 deseni, dönüş
bildirimindeki `warning` şeridi).

Depo TOHUMLANMIYOR: hiç poliçe açılmamış projede sekme dürüstçe boş kalır.
Uydurma poliçe tohumlansaydı proje detayı, sunucuda karşılığı olmayan kayıtları
gerçek poliçeymiş gibi listelerdi.

## Eksik uçlar

| # | Uç (öneri) | Ne besleyecek | Karşılığı olan entity |
|---|---|---|---|
| 1 | `GET /api/insurancecompanies` | Adım 2 "Sigorta Şirketi" listesi | **yok** — tablo da yok |
| 2 | `GET /api/insurancecompanies/{id}/agencies` | Adım 2 "Acente / Poliçe Firması" listesi (seçilen şirkete bağlı) | **yok** |
| 3 | `POST /api/projects/{id}/policies` | Adım 4 "Bitir" — poliçe kaydı | `Policy` — **tablo var, controller yok** |
| 4 | `GET /api/projects/{id}/policies` | Proje detayının poliçe sekmesi (bu görevden ÖNCE de eksikti) | aynı |

Dördü de `src/api/unimplementedEndpoints.ts` içinde bayraklı: uç açılınca oradan
satır silinecek ve `src/api/policies.ts` derleme hatası vererek gövdenin gerçek
isteğe çevrilmesi gerektiğini gösterecek.

### 3 — Kayıt sözleşmesi (öneri)

İstek gövdesi `src/api/policies.ts` → `CreatePolicyPayload`:

```
projectId, method, insuranceCompanyId, agencyId,
policyNumber, amount, startDate, endDate
```

- `method` bugün tek değerli dar birleşim (`'manual'`). Sigorta şirketi
  servisleri üzerinden otomatik poliçe ileride eklenecek; alan şimdiden
  gövdede duruyor ki o gün sözleşme değişmesin.
- `amount` kuruş DAHİL ondalık sayı; binlik ayraç ve `₺` yalnız gösterimde.
- `startDate`/`endDate` `yyyy-aa-gg` düz tarih — saat dilimi kaymasın diye ISO
  damgası değil.
- **`policyNumber` benzersiz olmalı ve çakışma `409` dönmeli.** Bugün denetim
  istemcide, bellekteki depoya karşı yapılıyor (`isPolicyNumberTaken`); tek
  fonksiyondan geçiyor ki uç gelince yalnız o fonksiyonun gövdesi değişsin.
- Yanıt en az yeni kaydın kimliğini döndürmeli (`policyId`).

### 1–2 — Liste yanıtları (öneri)

`{ id, name }` yeterli; acente satırı ayrıca bağlı olduğu şirketin kimliğini
taşımalı (`insuranceCompanyId`). Bugün mock, her şirket için iki örnek acente
üretiyor ve adların örnek olduğu adın kendisinden anlaşılıyor ("… — Örnek Acente 1"):
gerçek acente listesi iş tarafından gelecek.

## Karara bağlanması gereken konular

**1. Adım 5'in bilgilendirme metni.** Gereksinim "sürecin sonraki aşamasını
açıklayan metin" diyor ama metni vermiyor. Ekrandaki cümle (`PolicyStepper.tsx`
→ `DONE_MESSAGE`) **Esra'dan alındı, analist onayı bekleniyor** — kaynağında
TODO ile işaretli.

**2. Tablo sütunları ile sihirbaz UYUŞMUYOR: "Birim" ve "Ödeme".** Proje
detayındaki poliçe tablosunda `unitNumber` ve `isPaid` sütunları var, ama
gereksinimde bu iki alan sihirbazda SORULMUYOR — yani oluşturulan poliçe bu iki
sütunu besleyemiyor. Analiste sorulacak: poliçe proje bazlı mı birim bazlı mı
(`Policy` entity'si `ProjectUnit`'e bağlı), ödeme hangi süreçte işaretleniyor?

- "Birim" hücresi yeni kayıtta BOŞ ("—"): uydurulmadı.
- **"Ödeme: Bekliyor" bir İSTEMCİ VARSAYIMIDIR.** Sunucudan gelen bir değer
  değil; `buildMockProjectPolicies` yeni satıra sabit `isPaid: false` yazıyor,
  tablo da bunu "Bekliyor" rozetiyle gösteriyor. Gerçek ödeme durumu bilinmiyor;
  uç geldiğinde bu sabit KALDIRILMALI.

**3. Teminat tutarının sınırları.** Alt/üst sınır verilmedi; bugün yalnız hane
sayısı sınırlı (15 hane) ve sıfırdan büyük olması isteniyor. Sunucu tarafı da
denetlemeli.

**4. Kayıt Adım 4'e alındı — analist onayı bekleniyor.** Gereksinim belgesi hem
"son adımda İleri düğmesi Bitir olur" hem "beşinci adımda … Bitir'e tıklanınca
poliçe kaydedilir" diyor, yani başarı ekranını kayıttan ÖNCE gösteriyor. Ekran
Adım 4'te kaydediyor, Adım 5 kayıt sonrası sonuç ekranı (K64) — sapma bilinçli,
sebebi kaydın başarısız olabilmesi. Esra onayladı; analist teyidi bekleniyor.

**5. Poliçe LİSTESİ ekranı kapsam dışıydı.** Sol menüdeki "Poliçeler" öğesi hâlâ
"Yakında" rozetli ve karşılama sayfasına gidiyor; ekrana yalnız proje detayından
giriliyor. 4 numaralı uç gelince liste ekranı ayrı bir iş olarak yazılacak.
