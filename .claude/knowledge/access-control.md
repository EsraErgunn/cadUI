# decision: Proje erişim kuralı — üç rol, kullanıcı başına TEK rol

**Durum: KESİNLEŞTİ** (2026-08, backend'de kod olarak). Bu dosya daha önce
`open-question` idi; karar cadapi'de verilmiş, aşağısı onun frontend karşılığı.

**Rol modeli:** `User.RoleId → Role` doğrudan FK. Bir kullanıcının **tam bir**
rolü var; eski `UserRole` N:N junction kaldırıldı. Üç rol birbirini dışlar:
`Admin` / `GasDistributionUser` / `ProjectFirmUser`. Rol kontrolü kırılgan id
veya ad metniyle değil `Role.Code` sabitiyle yapılır.
(Kaynak: cadapi `.claude/knowledge/single-role.md`.)

Bir zamanlar "birden fazla rol" işareti sayılan `ProjectFirmUser`, meğer bir ara
tablo değil bir **rol kodu**. Eski taslaktaki `Project.OwnerUserId` varsayımı da
geçerli değil.

## API fail-closed — frontend'i doğrudan ilgilendiren kısım

`Program.cs`'te global `FallbackPolicy = RequireAuthenticatedUser()`. Yani
`[AllowAnonymous]` işaretlenmemiş **her** uç token ister; tokensız istek 401,
yetkisiz rol 403 döner. Anonim olan yalnız `/api/health`, `/api/auth/login` ve
dev'de Scalar/OpenAPI.

Sonuç: yeni bir uç tüketen kod yazarken "bu açık mıdır" diye düşünmeye gerek yok
— değildir. Token `api/http.ts`'te TEK yerde ekleniyor, çağıranlar başlık
kurmaz. Bu yüzden `fetch`'i http.ts'i atlayarak doğrudan çağırma; isteğin
sessizce 401 dönmesinin en kolay yolu budur.

**401 gelince token atılır** (`http.ts` → `setAuthSession(undefined)`). Süresi
dolmuş token elde tutulsaydı `RequireAuth` oturumu "hâlâ var" görür ve kullanıcı
her sayfada 401 alan bir döngüye girerdi.

**Oturum `api/authToken.ts`'te**, zustand store'da DEĞİL: http.ts token'ı okumak
zorunda ve store api/auth.ts → http.ts zincirini import ederdi (döngü). React
tarafı `useAuthSession` (useSyncExternalStore) ile abone olur; ikinci bir kopya
tutulmaz.

## Hâlâ açık olan

Rol modeli netleşti ama **kimin hangi PROJEYİ görebileceği** ayrı bir soru:
`GET /api/projects` henüz yok. O uç gelince listenin sunucuda role göre mi
filtrelendiği yoksa frontend'in mi süzdüğü netleşmeli — ikincisi IDOR demektir,
varsayarak kod yazma. Yetki kontrolü uçta açık bir serviste toplanmalı, URL'deki
id'ye güvenip global query filter'a bırakılmamalı.

`api/permissions.ts` hâlâ mock düz izin listesi döndürüyor
(`GET /api/me/permissions` diye bir uç yok). Rol artık login yanıtında
(`roleCode`) geldiğine göre o dosya ya gerçek uca bağlanmalı ya da rol koduna
devredilmeli — ikisini birden taşımak iki ayrı yetki kaynağı demek.
