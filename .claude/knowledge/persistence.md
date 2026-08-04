# decision: Çizim JSON'u nerede durur

**Karar (net):** Çizim JSON'u bir nesne/blob deposunda — **MinIO** (S3 uyumlu) —
tutulur. SQL tarafında (ör. `ProjeCizimGecmisi` tablosu) sadece bir `DataUrl`/
nesne anahtarı referansı durur — JSON içeriğinin kendisi SQL'e KONMAZ.

**Netlik:** "NoSQL" ile "nesne deposu" karıştırılmasın. Burada JSON bir MinIO
nesnesidir (dosya gibi), Mongo gibi bir belge veritabanında DEĞİL. SQL sadece
metadata + DataUrl tutar; MinIO içeriği tutar.

**Neden:** Gerçek sistemdeki mevcut şema (`DataUrl` alanı) ile uyum; büyük JSON
içeriğini SQL satırında tutmanın maliyeti. (Önceki taslaklar "SQL nvarchar(max)"
ve daha öncesi "Mongo" diyordu — ikisi de geçersiz.)

**Frontend açısından değişmez:** `api` JSON alır/gönderir, `serialize.ts`
model↔JSON çevirir. Nesne deposu tamamen backend'in sorunu. Kaydetme akışında
SQL satırı ile MinIO nesnesi arasında ortak transaction yoktur — MinIO'ya yaz,
anahtarı al, sonra SQL satırını ekle; SQL başarısızsa MinIO nesnesi temizlenmeli
(yoksa sahipsiz nesne kalır).

## gotcha: proje değişince store SIFIRLANMALI

`useCadStore` modül düzeyinde **tek** bir örnek ve rota değişince (`/projects/1`
→ `/projects/2`) yeniden kurulmuyor — içindeki çizim yaşamaya devam ediyor.

Bu yüzden `useProjectPersistence` yeni projeye geçerken **önce**
`resetProject()` çağırır, sonra yükler. Eskiden yalnız `if (data) loadProject(data)`
vardı; yeni projenin kaydı yoksa (`data === undefined`) store'a hiç dokunulmuyor,
önceki projenin duvarları ekranda kalıyor ve ilk "Kaydet"te **o projeye**
yazılıyordu. Sonuç: bütün projeler tek bir çizime yakınsıyordu.

Aynı kökten iki kural daha:

- **Yükleme sürerken kaydetme reddedilir.** Sunucudaki çizim henüz görülmeden
  üstüne yeni sürüm konulmamalı.
- **Yükleme hata verirse kaydetme reddedilir.** Projenin sunucudaki çizimi
  bilinmiyorken kaydetmek, görülmemiş bir çizimi geçersiz kılan bir sürüm
  yaratır (sürümler değişmez, eskisi silinmez ama "en son" artık yanlış olur).

Yükleme durumu düz bir bayrak DEĞİL, `{ projectId, status }` olarak tutulur:
bayrak olsaydı proje değişince onu sıfırlamak için effect içinde senkron
`setState` gerekirdi (art arda render). Kimlik karşılaştırmasıyla "yeni proje =
yükleniyor" bilgisi render sırasında türüyor.

Regresyon testi: `src/pages/__tests__/useProjectPersistence.test.tsx`.
