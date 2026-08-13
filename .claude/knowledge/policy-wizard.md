# decision: Poliçe Oluşturma sihirbazı — kayıt sırası, yerel durum, tek depo

Ekran: `src/pages/NewPolicyPage.tsx`, parçalar `src/ui/admin/policies/`,
veri katmanı `src/api/policies.ts` (+ `policiesMock.ts`).
Kararların tamamı docs/kararlar.md K64–K67; eksik uçlar
`docs/api-eksikleri-policeler.md`.

## Bu ekranda varsayım kodlamadan önce bilinmesi gerekenler

**Sunucuda hiçbir ucu yok.** Ne sigorta şirketi, ne acente, ne poliçe kaydı.
`Policy` entity'si veritabanında VAR (`ProjectUnit`'e bağlı) ama controller'ı
yok. Dördü de `unimplementedEndpoints.ts`'te bayraklı — uç açılınca oradan satır
silinir ve `api/policies.ts` derleme hatasıyla gövdeyi göstermeye zorlar (K46
deseni; evrak tarafında bu mekanizma KULLANILMAMIŞTI, burada kullanılıyor).

**Kayıt Adım 4'te, sonuç ekranı Adım 5'te** (K64). Gereksinim belgesi tersini de
söylüyordu (başarı ekranı kayıttan önce); çelişki bilerek Adım 4 lehine çözüldü,
çünkü kayıt başarısız olabiliyor. Adım 5'te ileri/geri YOK, tek düğme "Proje
Detayına Dön". Bu sırayı geri çevirme.

**Sihirbaz durumu URL'de DEĞİL** (K65). `admin-list-state` kuralı LİSTE ekranları
içindir; burada form verisi adreste taşınamadığı için adımı URL'de tutmak,
yenilemede adımı koruyup veriyi düşürürdü. Adreste yalnız `?project=<id>` var
(`PROJECT_PARAM`, K61 ile ortak).

**Poliçe deposu TEK ve BELLEKTE** (`policiesMock.ts`). Proje detayının "Poliçe
Bilgileri" sekmesi de oradan besleniyor (`buildMockProjectPolicies` süzüyor);
ikinci bir mock açarsan poliçe bir ekranda görünüp öbüründe kaybolur. Depo
TOHUMLANMIYOR — poliçesi olmayan projede sekme dürüstçe boş kalır. Testlerde
`resetMockPolicies()` **şart**, yoksa bir testin numarası öbüründe "bu numara
kayıtlı" hatası doğurur.

**Benzersizlik TEK kapıdan:** `isPolicyNumberTaken`. Hem adım doğrulaması hem
kayıt oradan geçiyor; uç gelince yalnız o fonksiyonun gövdesi 409'a dönecek.
İkinci bir kontrol yazma.

**Kayıt kalıcı DEĞİL ve bu SÖYLENİYOR** (K58 deseni): proje detayına dönüş
şeridi `warning` tonunda, altında "yalnız bu oturumda tutuluyor" satırları var.
Bu satırları kaldırma.

## Sık düşülecek tuzaklar

- **Teminat girdisi `type=number` DEĞİL.** tr-TR ondalık ayracı virgül ve sayı
  girdisi virgülü yutuyor. Değer HAM metin olarak tutulur (`amountText`), binlik
  ayraç yalnız odaktan çıkışta uygulanır — yazarken biçimlendirmek imleci
  kaydırıyordu. Geçersiz tuş vuruşu (`sanitizePolicyAmount → null`) değeri
  DEĞİŞTİRMEZ.
- **Sigorta şirketi değişince acente `null`'lanır.** Kalsaydı kullanıcı, listede
  görünmeyen bir acenteyle poliçe açardı.
- **Adım etiketleri `PolicyStepper.tsx`'te, anahtarlar `policySchema.ts`'te.**
  Bileşen dosyası bileşen dışında bir şey dışa aktaramıyor (react-refresh);
  etiketleri şemaya taşımaya çalışma, ayrımın sebebi bu.
- **Doğrulama ADIM BAZLI**, kayıttan hemen önce iki veri adımı birden. Kayıt
  sırasında çıkan hata, alanın GÖRÜNDÜĞÜ adıma geri götürür (`FIELD_STEPS`) ve
  odak ilk hatalı alana taşınır (`policyFieldId` ile `id` üzerinden).
- **Sahte `fetch` her çağrıda YENİ `Response` üretmeli** (documents-screens'teki
  aynı tuzak): ekran proje künyesini gerçek uçtan çözüyor ve yönlendirme sonrası
  proje detayı aynı ucu tekrar çağırıyor.

## Kapsam dışı bırakılanlar

Poliçe LİSTESİ ekranı yok; sol menüdeki "Poliçeler" hâlâ "Yakında" rozetli ve
`ComingSoonPage`'e gidiyor (K67). Yöntem adımında İKİNCİ seçenek (otomatik
poliçe) EKLENMEDİ — yapı kapalı değil (`POLICY_METHODS` dar birleşim + radyo
grubu) ama bugün seçilebilen ama hiçbir şey yapmayan bir kart konulmadı.

Sihirbaz birim (`ProjectUnit`) ve ödeme sormuyor; yeni poliçe satırında "Birim"
boş, "Ödeme" Bekliyor. Uydurma. Adım 5'in bilgilendirme metni GEÇİCİ ve kaynakta
TODO ile işaretli — nihai metin analistten gelecek.
