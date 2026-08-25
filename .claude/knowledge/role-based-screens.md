# decision: Rol bazlı ekranlar — ProjectFirmUser yönetici panelinden ayrıştı

**Durum: KESİNLEŞTİ** (2026-08). Üç rolden ikisi ayrıştırıldı; gaz dağıtım
kullanıcısı BİLEREK ertelendi (aşağıda).

## Ne değişti

Panel eskiden rol-kördü: `ADMIN_NAV_ITEMS` düz bir diziydi, `RequireAuth`
yalnız "oturum var mı" bakıyordu ve giriş sonrası herkes `/admin`'e düşüyordu.
Yani proje firması kullanıcısı hem sol menüde Gaz Dağıtım Firmaları'nı görüyor
hem adres çubuğundan o ekranı açabiliyordu.

- **Rol kaynağı tek:** `ui/admin/useRole.ts` (`useRoleCode`, `hasAnyRole`,
  `useIsManagementUser`). `useIsAdmin` gövdesini buraya devretti, imzası aynı.
  İkinci bir kimlik/rol sistemi kurulmadı; kaynak yine `useAuthSession`.
- **Tanınmayan rol hiçbir role sayılmaz.** `toRoleCode` bilinmeyen kodu
  `undefined` yapar → menü boş, rol kapısı kapalı. "Bilmiyorsam en azından şu
  rol sayayım" davranışı sessiz bir yetki sızıntısı olurdu.
- **Menü verisi:** `AdminNavItem.roles`; süzme `getNavItemsForRole`. Sıra
  korunur (süzgeç eler, yeniden dizmez).
- **Rota koruması:** `app/RequireRole.tsx`, `RequireAuth`'ın İÇİNDE ve ondan
  AYRI bileşen. Kimlik doğrulama ile yetkilendirme tek koşula bağlanmaz.
  Yetmeyen rol `/forbidden`'a gider — anasayfaya sessizce yönlendirmek, yanlış
  yapılandırılmış bir menü maddesini görünmez kılardı.
- **Anasayfa role göre:** `workspaceIdentity.ts` (`resolveHomePath`,
  kabuk rozeti/başlığı). `/admin` yönetimin, `FIRM_HOME_PATH = '/firm'` proje
  firmasının. `useLoginForm` sabit `/admin` yerine bunu kullanıyor; yoksa proje
  firması kullanıcısı girer girmez yetkisiz ekranına düşerdi.
- **Kırılım:** üç rolün de kullandığı ekranlarda ilk madde `useHomePath()`.
  Sabit `ADMIN_HOME_PATH` yazan bir kırılım o rolü `/forbidden`'a götürüyordu.

## Ekran ayrımı: ortak sayfa + varyant, ayrı kopya DEĞİL

Projeler ve Evraklar ekranları TEK sayfa kaldı. Ayrışan yalnız iki şey
(sütunlar ve firma süzgeci); veri kaynağı, aksiyonlar, sayfalama ve yerleşim
aynı. İki kopya, iki ayrı hata yüzeyi olurdu.

Karar `isManagementView` bayrağıyla taşınıyor (`useIsManagementUser`):
"Firma İsmi"/"Firma Adı" ve "G.D Firması" sütunları ile "Proje Firması"
süzgeci yalnız yönetim görünümünde çizilir. **Gelen DTO değişmiyor** — yalnız
sunum. "G.D Firması" hücresi ayrıca `gasFirmUpdatePath` ile YÖNETİCİ formuna
link veriyordu; proje firması kullanıcısına gösterilseydi 403'e giden bir
bağlantı olurdu.

Süzgeç kutusu çizilmeyen yerde İSTEĞİ de atılmıyor (`enabled`): firma listesi
ve kapsam seçicisinin iki ucu boşuna indirilmiyor.

## Kapsam SUNUCUNUN işi

İstemci `ProjectFirmId` göndererek daraltma YAPMAZ — kullanıcı o parametreyi
değiştirebilir, yani güvenlik sınırı değildir (knowledge/access-control.md'deki
IDOR uyarısı). `useProjectListParams` yönetim dışı rolde `AdminScope`'u da
sorguya yazmıyor; bu güvenlik değil, sorgunun tutarlılığı için.

⚠️ **Doğrulanmamış varsayım:** `GET /api/projects`'in token'daki firmaya göre
daraltıp daraltmadığı frontend'den görülemiyor ve sözleşme yorumunda yazmıyor.
Daraltmıyorsa proje firması kullanıcısı tüm projeleri görür. Backend'de
doğrulanmalı.

## Proje firması anasayfası

`pages/firmUser/FirmUserHomePage.tsx` — yönetici panosunun küçültülmüşü DEĞİL,
onunla hiçbir uç paylaşmıyor (`/api/admin/dashboard` yönetim kapsamı üzerine
kurulu). İki gerçek uçtan besleniyor: `GET /api/projects/status-counts` (dört
durum kartı) ve `GET /api/projects` (taslaklar + onay bekleyenler, `pageSize`
küçük).

Tarih aralığı liste ekranının VARSAYILANIYLA aynı (`lastMonthRange`): liste
parametresizken hep son bir ayı süzüyor, pano tüm zamanı saysaydı kart "12"
derken tıklanan liste 3 satır gösterirdi.

Eksik evrak / poliçe toplamı / bekleyen aksiyon kartları YOK: uçları yok ve
uydurulmuş sayı bir demoda gerçek sanılırdı.

## Poliçeler menüde KALIYOR (uç yokken bile)

Proje firması kullanıcısının menüsündeki "Poliçeler", ortak `PolicyListPage`'e
gidiyor — o ekranın verisinin TAMAMI hâlâ mock: `GET /api/policies`,
`POST /api/projects/{id}/policies`, sigorta şirketi ve acente uçlarının hiçbiri
sunucuda yok (`UNIMPLEMENTED_ENDPOINTS`). Firma genelindeki poliçeleri dönen
sayfalı bir uç da yok; var olan akış proje bazlı.

Madde yine de kaldı (kullanıcı kararı, 2026-08). Gerekçe: ekran üretim
derlemesinde poliçe listesi artık GERÇEK uçtan (`GET /api/policies`) besleniyor;
eksik uç şeridi ve `mockGate` K160'ta silindi. Maddeyi menüden düşürmek rolün
bir işlevini görünmez kılardı; uç açıldığında ise menüyü ve rotayı yeniden
kurmak gerekirdi.

⚠️ Bu maddeyi "ekran çalışmıyor" diye menüden ÇIKARMA — bilinçli bırakıldı.
N adet proje için döngüyle poliçe çekip "firma poliçe listesi" üretmek de
seçenek DEĞİL (N+1 istek, olmayan bir sözleşmeyi taklit eder).

## Gaz dağıtım kullanıcısı — bilerek ertelendi

`MANAGEMENT_SCREEN_ROLES` bugün `[Admin, GasDistributionUser]`. Bu GEÇİCİ ve
tek bir yerde: o rolün ekran kümesi için ProjectFirmUser'da yapılan gereksinim
turunun aynısı gerekiyor, varsayarak daraltmak bugün çalışan bir rolü sessizce
kapı dışında bırakırdı. Küme belirlenince dizi yalnız `admin` kalacak ve o rolün
maddeleri `AdminNavItem.roles` alanlarına tek tek eklenecek — başka hiçbir yer
değişmeyecek.

## İsimlendirme tuzağı

Rolün parçaları `ui/admin/firmUser/` ve `pages/firmUser/` altında.
`projectFirmUser/` (tekil) AÇILMADI: `ui/admin/projectFirmUsers/` (çoğul) zaten
var ve o admin'in *kullanıcı yönetimi* ekranı — bir harf farkla iki ayrı kavram
olurdu.
