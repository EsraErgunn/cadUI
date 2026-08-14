# decision: Poliçe ekranları — sihirbazın yeri, kayıt sırası, tek depo

İki ekran: sihirbaz `src/pages/NewPolicyPage.tsx`, liste
`src/pages/PolicyListPage.tsx`; parçalar `src/ui/admin/policies/`,
veri katmanı `src/api/policies.ts` (+ `policiesMock.ts`, `policyListQuery.ts`).
Kararların tamamı docs/kararlar.md K64–K69; eksik uçlar
`docs/api-eksikleri-policeler.md`.

**Sihirbaz "Poliçeler" bölümünün ALTINDA DEĞİL** (K68): yolu
`/projects/:projectId/policies/new` ve kimlik YOLDA (evrak ekranındaki
`?project=` bu ekran için geçmiyor). `/admin/policies/new` iken sol menü
"Poliçeler" maddesini işaretliyordu — kullanıcı poliçe listesine geçmiş gibi
görünüyordu. Kırılım da poliçe bölümünden geçmez: Anasayfa / Projeler / proje /
Poliçe Oluşturma. `POLICY_CREATE_PATH` sabiti YOK; rota `POLICY_CREATE_ROUTE`,
bağlantı `policyCreatePath(projectId)`.

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

**Poliçe deposu TEK ve BELLEKTE** (`policiesMock.ts`). Üç ekran da oradan
besleniyor: poliçe listesi, proje detayının "Poliçe Bilgileri" sekmesi
(`buildMockProjectPolicies` süzüyor) ve benzersizlik kontrolü. İkinci bir mock
açarsan poliçe bir ekranda görünüp öbüründe kaybolur. Depo artık TOHUMLU (K69,
K66'nın kararı değişti) ve tohumlar evrak mock'uyla aynı `getMockProjectSeeds`
kaynağından — kendi proje listesini uydursaydı satırdaki "Proje Adı" bağlantısı
listede olmayan bir kimliğe giderdi. `POLICY_COUNTS` içinde sıfırlar var:
poliçesiz projede sekmenin boş hâli de görünsün. Testlerde
`resetMockPolicies()` **şart**, yoksa bir testin numarası öbüründe "bu numara
kayıtlı" hatası doğurur; tohum numaraları `ORNEK-POL-` önekli, test numaralarıyla
çakışmaz.

**Kaydedilen poliçe proje KÜNYESİNİ de saklar.** Liste "Proje Adı" gösteriyor ve
kimlikten ada inen tek yol mock tohumlarıydı — o yol sunucudaki bir projenin
poliçesini uydurma bir projenin adıyla listelerdi (K63). Bu yüzden
`createProjectPolicy` künyeyi parametre alıyor ve `usePolicyWizard` kimlik değil
`ProjectSummary` istiyor. Künye yoksa ad UYDURULMAZ, satırda boş değer kalır.

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

## Liste ekranı

Sol menüdeki "Poliçeler" artık gerçek liste (K69): bütün projelerin poliçeleri,
durum URL'de (`admin-list-state` — arama `q` poliçe numarasını VE proje adını
kapsar, sigorta şirketi süzgeci `company`, sıralama poliçe no / başlangıç
tarihi). Sunucu tarafını `policyListQuery.ts` oynuyor (evrakın
`documentListQuery` deseni); uç açılınca o dosya silinir, çağıran değişmez.
Tabloda "Birim" ve "Ödeme" sütunu YOK — ikisi de sihirbazda sorulmuyor ve
"Ödeme: Bekliyor" istemci varsayımıydı (K67).

## Kapsam dışı bırakılanlar

Yöntem adımında İKİNCİ seçenek (otomatik poliçe) EKLENMEDİ — yapı kapalı değil
(`POLICY_METHODS` dar birleşim + radyo grubu) ama bugün seçilebilen ama hiçbir
şey yapmayan bir kart konulmadı.

Sihirbaz birim (`ProjectUnit`) ve ödeme sormuyor; yeni poliçe satırında "Birim"
boş, "Ödeme" Bekliyor. Uydurma. Adım 5'in bilgilendirme metni GEÇİCİ ve kaynakta
TODO ile işaretli — nihai metin analistten gelecek.
