# open-question: Kullanıcının çoklu yetkisi — şema kararı verilmedi

**Bu konuda varsayım kodlama.** Ekranlar (`ui/admin/projectFirmUsers/`) bugün
"kullanıcı birden çok yetki satırı taşır" varsayımıyla çalışıyor ve satırlar
MOCK; sunucu tarafı bu varsayımı henüz onaylamadı.

Bağlam: [project-firm-users](./project-firm-users.md), docs/kararlar.md K45–K47,
docs/api-eksikleri-kullanicilar.md

## Soru

Backend'in sorusu: "bir kullanıcının üç yetkisi" derken ne kastediliyor?

1. **Üç farklı firmada çalışıyor** → yeni `UserAuthorization` tablosu gerekir
2. **Aynı firmada üç sıfatı var** → tablo gerekmez, `AuthorityType` User'a kolon
3. **Aynı firmanın üç GDF bölgesinde yetkili** → zaten `ProjectFirmAuthorization`'ın işi

## Belgeden okunan cevap: (1)

Gereksinim metni bunu cümleyle söylemiyor ama form tasarımı üç yerde (1)'i
zorunlu kılıyor:

- **madde 16:** yetki tablosunun sütunları "Gaz Dağıtım Firması, **Proje
  Firması**, Yetki, GDF Kayıt No, Aktif" — proje firması SATIR BAŞINA seçiliyor,
  kullanıcının sabit bir alanı değil.
- **KK-20:** "Gaz dağıtım firması değiştirildiğinde satırdaki proje firması
  seçimi temizlenir" — seçim satıra ait.
- **KK-22:** benzersizlik "(gaz dağıtım firması, proje firması) **ikilisi**"
  üzerinde. Kullanıcı tek proje firmasına bağlı olsaydı ikili kuralı anlamsızdı;
  yalnız G.D. firması benzersizliği yeterdi.

Yani bu ÇIKARIM, belgede yazan bir cümle değil. Gereksinimin sahibi onaylamadan
şema açılmamalı.

## (1) seçilirse tek bir tablo eklemesi DEĞİL

Backend'in uyarısı kayda değer — mevcut modelde üç katman "kullanıcı = tek firma"
varsayımına dayanıyor:

- `CK_Users_SingleFirmReference` CHECK kısıtı (ProjectFirmId ve
  GasDistributionFirmId aynı anda dolu olamaz)
- JWT'ye `ProjectFirmId` / `GasDistributionFirmId` TEK değer olarak claim yazılıyor
- Tüm görünürlük filtresi (`WhereVisibleTo`) bu tek claim'e dayanıyor

Çoklu yetki üçünü birlikte değiştirir: CHECK kalkar, claim çoğullaşır ya da
"aktif yetki seçimi" kavramı doğar, filtreler `IN (...)`'e döner.

## Buna bağlı ikinci soru: sayfalama satır bazlı mı, kullanıcı bazlı mı

- **Belge (KK-11/KK-12):** "Başlıktaki kayıt adedi ve sayfalama SATIR adedi
  üzerinden hesaplanır", sayfa başına 30 kayıt.
- **Backend'in tercihi:** kullanıcı başına tek nesne + iç içe yetki dizisi;
  gerekçe "satır bazlı dönersek pageSize=30 bazen 12 kullanıcı getirir".

İkisi aynı anda olmaz. Kullanıcı bazlı seçilirse başlıktaki adet kullanıcı
sayısı olur ve ekranda 30'dan fazla satır görünür — KK-11 ve KK-12'den açık
sapma, belgeye not düşülmesi gerekir.

## Cevaplanmış olanlar (bunlar açık değil)

| Konu | Karar |
|---|---|
| `authorityType` | Rol DEĞİL. `Code`/`CodeGroup` altyapısında `YetkiTipi` grubu; `codeValue` = `FirmEngineer` / `FirmAuthorizedPerson`. Ekranda `name`, mantıkta `codeValue`, id'ye bağlanma. |
| Benzersizlik | Müsaitlik ucu AÇILMAYACAK. `POST /api/auth/register` çakışmada 409 + `{ message }` dönüyor; form 409'u alana basacak. Soft-delete edilmiş kullanıcının adı/e-postası da rezerve. |
| Sayfalama zarfı | `page/pageSize/q/authorityType/onlyActive` → `{ items, totalCount, page, pageSize }`. Repodaki İLK sayfalı uç olacak; mevcut uçlar düz dizi dönmeye devam edecek. |
| Uç yolu | `/api/users` (tablo tek: `Users`). Proje firması ekranı `?projectFirmId=` ile süzer. Oluşturma `POST /api/auth/register`'da kalır. |
| Kullanıcı "Aktif" alanı | `SoftDeleteEntity.IsActive` global query filter'a bağlı → pasif kayıt sorgudan HİÇ dönmez. KK-4 pasif kullanıcının listelenmesini şart koştuğu için ayrı `IsEnabled` kolonu gerekiyor. |
