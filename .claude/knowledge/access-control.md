# open-question: Proje erişim kuralı

**Durum: KESİNLEŞMEDİ.** Aşağıdaki gibi "tek sahip" varsayımıyla kod yazılmasın.

**Bilinen:** Referans sistemde `ProjectFirmUser` gibi bir ara tablo var — bir
kullanıcının birden fazla rolü/firmayla ilişkili olabileceğini gösteriyor. Yani
erişim sadece `Project.OwnerUserId` ile sınırlı olmayabilir.

**Eski taslak (muhtemelen eksik, doğrulanmadı):** Kullanıcı bazlı —
`Project.OwnerUserId`, yazma yetkisi yalnız sahibe; dağıtım firması kullanıcısı
proje gönderildikten sonra salt-okunur görebilir + onay/red verebilir.

**Netleşene kadar yapılacak:** Erişim modelini varsayarak kod yazma. Ama
modelden bağımsız olarak doğru olan şu: yetki kontrolü her endpoint'te açık bir
serviste toplanır — `IProjectAccessService.CanEdit(projectId, userId)` gibi.
URL'deki id'ye güvenip global query filter'a bırakma (IDOR riski). Model
netleşince bu dosya ve `domain-model` skill'i güncellenir.
