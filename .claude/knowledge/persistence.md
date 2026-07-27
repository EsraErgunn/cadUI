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
