# Proje Firması Kullanıcıları — Gereksinimler

Kaynak: `firma_kullanıcı.docx` (2026-08). Metin BİREBİR korunmuştur; yalnız
bölümler numaralandırıldı — kod ve karar kayıtları "madde N" diye buraya atıf
yapıyor. Yerleşim taslakları: `mockup/admin/firma-kullanicilari.html` ve
`mockup/admin/kullanici-olusturma.html`.

Belge ile taslağın çeliştiği yerde **belge kazanır**; çözülen çelişkiler
`.claude/knowledge/project-firm-users.md` içinde listeli.


## Liste ekranı


### 1. Sayfa Başlığı

- Kırılım "Anasayfa / Firmalar / Proje Firması Kullanıcıları" şeklinde olacaktır.
- Başlıkta "Proje Firması Kullanıcıları" metni ve yanında toplam kayıt adedi gösterilecektir: "(25.566)".
- Başlığın altında "Firma mühendisleri ve yetkilileri" açıklaması bulunacaktır.
- Sistemde gaz dağıtım firması kullanıcıları da bulunduğundan, bu ekran karışıklığa yer bırakmamak için hem sol menüde hem sayfa başlığında "Proje Firması Kullanıcıları" olarak adlandırılacaktır.

### 2. Yetki (Seçim Kutusu)

- Sağ üstte, arama alanının solunda seçim kutusu olarak yer alacaktır.
- Seçenekler kullanıcı tiplerinden oluşacaktır: "Firma Mühendisi", "Firma Yetkilisi".
- Seçim yapıldığında yalnızca ilgili yetkideki kullanıcılar listelenecektir.

### 3. Aktif (Onay Kutusu) — KALDIRILDI (K130)

- Bu madde artık geçerli değil: onay kutusu ekrandan kaldırıldı. Gerekçe
  `docs/kararlar.md` K130 (sunucuda karşılığı yok, `IsEnabled` kolonu gerekiyor).

### 4. Kullanıcı Adı (Arama Alanı)

- Arama ikonlu text input olarak konumlandırılacaktır.
- Placeholder olarak "Kullanıcı Adı" gösterilecektir.
- Arama; kullanıcı adı, ad soyad ve e-posta alanları üzerinden içerik bazlı çalışacaktır.

### 5. Filtrele ve Yeni Kullanıcı (Butonlar)

- "Filtrele" butonu ikincil renkte olacak ve seçilen kriterleri uygulayacaktır.
- "Yeni Kullanıcı" butonu birincil renkte ve kullanıcı ekleme ikonu ile gösterilecektir.
- "Yeni Kullanıcı" tıklandığında kullanıcı "Yeni Proje Firma Kullanıcısı Oluşturma" ekranına yönlendirilecektir.

### 6. Kullanıcı Listesi (Tablo)

- Tablo sütunları sırasıyla şu şekilde olacaktır: Kullanıcı Adı, Adı Soyadı, E-mail, Telefon, Kullanıcı Tipi, G.D. Firması, Proje Firması, Gdf Kayıt No.
- "Kullanıcı Adı", "Adı Soyadı", "G.D. Firması" ve "Proje Firması" sütunundaki değerler tıklanabilir olacaktır.
- "Kullanıcı Tipi" sütunu renkli etiket (chip) ile gösterilecektir: "Firma Mühendisi" turkuaz, "Firma Yetkilisi" yeşil.
- "Gdf Kayıt No" değeri bulunmayan kayıtlarda alan boş bırakılmayacak, "—" işareti ile gösterilecektir.
- Bir kullanıcının birden fazla yetkisi bulunması durumunda, her yetki listede ayrı bir satır olarak alt alta gösterilecektir.
- Telefon numaraları kayıtlarda farklı biçimlerde tutulduğundan, listede "0xxx xxx xx xx" biçimine göre düzenlenerek gösterilecektir.

### 7. Kayıt Bilgisi ve Sayfalama

- Tablonun altında sol tarafta "<toplam> kayıttan <aralık> arası gösteriliyor" biçiminde sonuç bilgisi yer alacaktır.
- Taslakta "Daha Fazla Göster" butonu bulunmakla birlikte, kayıt adedinin yüksekliği nedeniyle bu ekranda da sayfa numaralı sayfalama kullanılacaktır.
- Sayfa başına 30 kayıt listelenecek; sayfalama tüm liste ekranlarıyla aynı biçimde çalışacaktır.
- Sayfalama sunucu taraflı olacak, her sayfa değişiminde yalnızca ilgili kayıtlar getirilecektir.

## Oluşturma / güncelleme ekranı


### 8. Ekran Yapısı

- Ekran iki bölümden oluşacaktır: "Kullanıcı Bilgileri" ve "Kullanıcı Yetkinlikleri".
- Başlığın altında "Oluşturma ve güncelleme aynı ekranı kullanır" açıklaması yer alacaktır.
- Zorunlu alanların etiketlerinin yanında kırmızı "*" göstergesi bulunacaktır.

### 9. Email (Zorunlu)

- "email" tipinde input kullanılacaktır.
- Placeholder olarak "ornek@firma.com" gösterilecektir.
- Format kontrolü yapılacak; uygun olmayan değer girilmesi durumunda "Geçerli bir e-posta adresi giriniz." mesajı gösterilecektir.
- Sistemde benzersiz olacaktır; aynı e-posta ile ikinci bir kullanıcı tanımlanamayacaktır.
- Şifre sıfırlama bağlantıları bu adrese gönderileceğinden alan zorunlu tutulacaktır.

### 10. Telefon (Opsiyonel)

- Text input formatında olacak.
- Placeholder olarak "0xxx xxx xx xx" gösterilecektir.
- Alan bu formata göre maskelenecek, harf girişine izin verilmeyecektir.

### 11. Adı Soyadı (Zorunlu)

- Text input formatında olacak.
- Placeholder olarak "Ad Soyad" gösterilecektir.
- Liste ekranındaki "Adı Soyadı" sütununa karşılık gelecektir.

### 12. Kullanıcı Adı (Zorunlu)

- Text input formatında olacak.
- Placeholder olarak "kullanici.adi" gösterilecektir.
- Sistemde benzersiz olacaktır; kullanılmakta olan bir ad girilmesi durumunda "Bu kullanıcı adı zaten kullanılmaktadır." mesajı gösterilecektir.
- Ad ve soyad bilgisinden otomatik olarak üretilecek, kaydedilmeden önce kullanıcı tarafından değiştirilebilecektir.
- Kullanıcı adı oluşturulduktan sonra değiştirilemeyecektir.

### 13. Şifre (Zorunlu)

- "password" tipinde input kullanılacak; girilen karakterler maskelenerek gösterilecektir.
- Şifre kuralları uygulanacaktır: en az 8 karakter, büyük/küçük harf, en az bir rakam ve özel karakter.
- Şifre sistemde geri döndürülemez biçimde (hash) saklanacaktır.
- Alanın sağında, giriş ekranındaki ile aynı biçimde şifreyi göster/gizle (göz) ikonu bulunacaktır.
- Güncelleme ekranında alan boş gelecek; yalnızca değer girilmesi durumunda şifre değiştirilecektir.
- Oluşturulan şifre kullanıcıya e-posta ile iletilecek ve ilk girişte değiştirilmesi zorunlu tutulacaktır.

### 14. Aktif (Anahtar)

- Anahtar (toggle) bileşeni olarak sunulacak ve varsayılan olarak açık gelecektir.
- Kapatıldığında kullanıcı portale giriş yapamayacak, giriş denemesinde "Hesabınız aktif değildir." mesajı ile karşılaşacaktır.
- Kullanıcı kaydı silinmeyecek; kullanımdan kaldırma bu alan üzerinden yapılacaktır.

### 15. Kullanıcı Yetkinlikleri (Bölüm)

- Bölümün üst kısmında amber renkli bilgilendirme kutusu yer alacaktır: "Kullanıcının en az 1 (bir) yetkisi tanımlı olmalıdır."
- Bilgilendirme kutusunun sağında "Yeni Yetkinlik Ekle" butonu bulunacaktır.
- Butona tıklandığında tabloya boş bir yetki satırı eklenecektir.
- Kaydetme sırasında en az bir yetki satırı bulunmaması durumunda kayıt tamamlanmayacaktır.

### 16. Yetki Tablosu

- Tablo sütunları sırasıyla şu şekilde olacaktır: Gaz Dağıtım Firması, Proje Firması, Yetki, GDF Kayıt No, Aktif ve işlem sütunu.
- "Gaz Dağıtım Firması" seçim kutusu olacak; varsayılan değer "Seçiniz" olarak gösterilecektir.
- "Proje Firması" seçim kutusunun yanında, seçilen firmanın detayını yeni sekmede açan bir kısayol butonu bulunacaktır.
- "Proje Firması" listesi, seçilen gaz dağıtım firmasında yetkili olan firmalarla sınırlandırılacaktır.
- "Yetki" seçim kutusunun seçenekleri "Firma Mühendisi" ve "Firma Yetkilisi" olacaktır.
- "GDF Kayıt No" text input olarak sunulacak, placeholder "Kayıt no" olacaktır.
- "Aktif" sütununda her satır için ayrı bir anahtar (toggle) bulunacak ve varsayılan olarak açık gelecektir.
- Her satırın sonunda kırmızı "Sil" butonu yer alacak, satır silinmeden önce onay istenecektir.
- Aynı gaz dağıtım firması ve proje firması ikilisi için ikinci bir yetki satırı eklenmesi engellenecektir.
- Bir satırdaki zorunlu seçimler tamamlanmadan yeni satır eklenmesine izin verilmeyecektir.

### 17. Kaydet ve İptal (Butonlar)

- Ekranın sağ alt köşesinde yer alacaktır.
- "Kaydet" tıklandığında zorunlu alan kontrolleri, benzersizlik kontrolleri ve en az bir yetki bulunma kontrolü yapılacaktır.
- Kayıt başarılı ise kullanıcı liste ekranına yönlendirilecek ve "Kullanıcı başarıyla kaydedildi." mesajı gösterilecektir.
- Eksik veya hatalı alan bulunması durumunda kayıt gerçekleşmeyecek, ilgili alanlar kırmızı kenarlık ve hata metni ile işaretlenecektir.
- "İptal" tıklandığında girilen veriler kaydedilmeden kullanıcı listesine dönülecektir.
- Güncelleme ekranı bu ekranla aynı alanları kullanacak; alanlar seçilen kullanıcının mevcut bilgileriyle dolu gelecektir.

## Kabul kriterleri


### KK-1 — Liste ekranının açılması

- Kullanıcı sol menüden "Proje Firması Kullanıcıları" maddesine tıkladığında liste ekranı açılır. Kırılımda "Anasayfa / Firmalar / Proje Firması Kullanıcıları" görünür; başlıkta "Proje Firması Kullanıcıları" metni, yanında parantez içinde toplam kayıt adedi ve altında "Firma mühendisleri ve yetkilileri" açıklaması yer alır.

### KK-2 — Filtre alanlarının açılış durumu

- Başlığın sağında sırasıyla "Yetki" seçim kutusu, "Kullanıcı Adı" arama alanı ve "Yeni Kullanıcı" düğmesi görünür. Ekran açıldığında "Yetki" seçim kutusu "Tümü" değerindedir ve liste tüm kullanıcıları gösterir. ("Aktif" onay kutusu K130 ile kalktı; "Filtrele" düğmesi K47 ile.)

### KK-3 — Yetki filtresi

- Kullanıcı "Yetki" seçim kutusundan "Firma Mühendisi" veya "Firma Yetkilisi" seçip "Filtrele" tıkladığında listede yalnızca o yetkideki kayıtlar görünür. Seçim "Tümü" değerine alındığında filtre kalkar.

### KK-4 — Aktif filtresi — KALDIRILDI (K130)

- Bu kabul kriteri artık geçerli değil: "Aktif" süzgeci ekrandan kaldırıldı.

### KK-5 — Arama

- Kullanıcı arama alanına bir değer yazıp "Filtrele" tıkladığında veya "Enter" tuşuna bastığında kullanıcı adı, ad soyad ve e-posta alanlarında bu değeri içeren kayıtlar listelenir. Arama büyük ve küçük harf ayrımı yapmaz.

### KK-6 — Filtrelerin birlikte uygulanması

- Kullanıcı üç kriteri birlikte doldurup "Filtrele" tıkladığında kriterlerin tamamını sağlayan kayıtlar listelenir, liste ilk sayfadan başlar ve başlıktaki kayıt adedi filtrelenmiş sonuca göre güncellenir.

### KK-7 — Sonuç bulunmaması

- Filtrelere uyan kayıt bulunmadığında tablo yerine "Arama kriterlerine uygun kayıt bulunamadı." metni görünür ve sayfalama gösterilmez.

### KK-8 — Liste sütunları

- Tabloda sırasıyla "Kullanıcı Adı", "Adı Soyadı", "E-mail", "Telefon", "Kullanıcı Tipi", "G.D. Firması", "Proje Firması" ve "Gdf Kayıt No" sütunları görünür. "Kullanıcı Tipi" renkli etiketle gösterilir: "Firma Mühendisi" turkuaz, "Firma Yetkilisi" yeşil.

### KK-9 — Telefon ve boş değer gösterimi

- Telefon numarası kayıtta hangi biçimde tutulursa tutulsun listede "0xxx xxx xx xx" biçiminde görünür. "Gdf Kayıt No" değeri bulunmayan kayıtlarda alan boş kalmaz, "—" işareti görünür.

### KK-10 — Tıklanabilir sütunlar

- Kullanıcı "Kullanıcı Adı" veya "Adı Soyadı" değerine tıkladığında o kullanıcının güncelleme ekranı açılır. "G.D. Firması" veya "Proje Firması" değerine tıkladığında ilgili firmanın detay ekranı açılır.

### KK-11 — Çoklu yetkili kullanıcı

- Birden fazla yetkisi bulunan kullanıcı listede her yetkisi için ayrı satır olarak görünür; kullanıcı bilgileri her satırda yinelenir ve aynı kullanıcının satırları art arda listelenir. Başlıktaki kayıt adedi ve sayfalama satır adedi üzerinden hesaplanır.

### KK-12 — Sayfalama

- Listede sayfa başına 30 kayıt görünür. Tablonun altında solda "<toplam> kayıttan <aralık> arası gösteriliyor" bilgisi, sağda sayfa numaralı sayfalama yer alır; "Daha Fazla Göster" düğmesi bulunmaz. Sayfa değiştirildiğinde yalnızca ilgili kayıtlar sunucudan getirilir ve uygulanan filtreler korunur.

### KK-13 — Oluşturma ekranının açılması

- Kullanıcı "Yeni Kullanıcı" düğmesine tıkladığında "Yeni Proje Firma Kullanıcısı Oluşturma" ekranı açılır. Ekran "Kullanıcı Bilgileri" ve "Kullanıcı Yetkinlikleri" bölümlerinden oluşur; başlığın altında "Oluşturma ve güncelleme aynı ekranı kullanır" açıklaması, zorunlu alanların etiketlerinin yanında kırmızı "*" göstergesi görünür.

### KK-14 — Zorunlu alan ve biçim denetimi

- Kullanıcı "Email", "Adı Soyadı", "Kullanıcı Adı" veya "Şifre" alanlarını boş bırakıp kaydettiğinde kayıt gerçekleşmez ve ilgili alanlar kırmızı kenarlık ile hata metni alır. "Email" alanına biçime uymayan bir değer girildiğinde "Geçerli bir e-posta adresi giriniz." mesajı görünür. "Telefon" alanı boş bırakılabilir, maskeli çalışır ve harf girişi kabul etmez.

### KK-15 — Kullanıcı adının üretilmesi

- Kullanıcı "Adı Soyadı" alanını doldurduğunda "Kullanıcı Adı" alanı "ad.soyad" biçiminde otomatik dolar; Türkçe karakterler ASCII karşılığına çevrilir ve harfler küçültülür. Değer kaydedilmeden önce değiştirilebilir; kayıt oluşturulduktan sonra alan salt okunur olur.

### KK-16 — Benzersizlik

- Sistemde kayıtlı bir e-posta ile ikinci bir kullanıcı tanımlanamaz. Kullanımdaki bir kullanıcı adı girildiğinde "Bu kullanıcı adı zaten kullanılmaktadır." mesajı görünür ve kayıt tamamlanmaz. Her iki denetim de sunucuda çalışır.

### KK-17 — Şifre alanı

- "Şifre" alanına girilen karakterler maskeli görünür ve alanın sağındaki simgeyle görünür duruma getirilir. En az 8 karakter, büyük harf, küçük harf, rakam ve özel karakter kuralını sağlamayan değer kabul edilmez. Şifre geri döndürülemez biçimde saklanır.

### KK-18 — Aktif anahtarı

- "Aktif" anahtarı yeni kullanıcıda açık gelir. Anahtar kapatılıp kaydedildiğinde kullanıcı portale giriş yapamaz ve giriş denemesinde "Hesabınız aktif değildir." mesajıyla karşılaşır; kullanıcı kaydı silinmez.

### KK-19 — Yetki satırı ekleme

- Kullanıcı "Yeni Yetkinlik Ekle" düğmesine tıkladığında tabloya boş bir yetki satırı eklenir. Açık satırdaki zorunlu seçimler tamamlanmadan ikinci bir satır eklenmez. Bölümün üstünde "Kullanıcının en az 1 (bir) yetkisi tanımlı olmalıdır." bilgilendirmesi görünür.

### KK-20 — Proje firmasının gaz dağıtım firmasına bağlılığı

- Yetki satırında gaz dağıtım firması seçilmeden "Proje Firması" seçim kutusu pasiftir. Firma seçildiğinde listede yalnızca o gaz dağıtım firmasında yeterliliği bulunan proje firmaları görünür. Gaz dağıtım firması değiştirildiğinde satırdaki proje firması seçimi temizlenir.

### KK-21 — Firma detayı kısayolu

- Kullanıcı "Proje Firması" seçim kutusunun yanındaki kısayol düğmesine tıkladığında seçili firmanın detay ekranı yeni sekmede açılır ve oluşturma ekranı açık kalır. Firma seçilmeden düğme pasiftir.

### KK-22 — Yinelenen yetki

- Aynı gaz dağıtım firması ve proje firması ikilisi için ikinci bir yetki satırı tanımlanamaz; kullanıcı uyarılır ve satır kaydedilmez.

### KK-23 — Yetki satırı silme ve en az bir yetki

- Kullanıcı bir satırın "Sil" düğmesine tıkladığında onay istenir; onaylandığında satır tablodan kalkar. Yetki satırı bulunmadan kaydedilmek istendiğinde kayıt tamamlanmaz ve en az bir yetki gerektiği bildirilir.

### KK-24 — Kaydetme ve iptal

- Kullanıcı "Kaydet" düğmesine tıkladığında zorunlu alan, biçim, benzersizlik ve en az bir yetki bulunma kontrolleri çalışır; kontrollerin tamamı sağlandığında kullanıcı kaydedilir, liste ekranına dönülür ve "Kullanıcı başarıyla kaydedildi." mesajı görünür. "İptal" tıklandığında girilen hiçbir veri kaydedilmez ve liste ekranına dönülür.

### KK-25 — Güncelleme

- Kullanıcı listeden bir kayda tıkladığında aynı ekran güncelleme için açılır; alanlar kullanıcının mevcut bilgileriyle, yetki tablosu tanımlı yetkileriyle dolu gelir. "Kullanıcı Adı" salt okunur, "Şifre" boştur ve zorunlu değildir; boş bırakıldığında şifre değişmez. Yetki satırları eklenir, düzenlenir ve silinir, en az bir yetki kuralı güncellemede de geçerlidir.
