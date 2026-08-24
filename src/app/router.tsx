import { LoaderCircle } from 'lucide-react'
import { Suspense, lazy } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'

import { LOGIN_PATH, RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { importEditorPage } from './editorChunk'
import { ROLE_CODES } from '../api/roles'
import { LoginPage } from '../pages/LoginPage'
import { PROJECT_LIST_PATH } from '../pages/useCloseEditor'
import { AdminLayout } from '../ui/admin/AdminLayout'
import {
  DOCUMENTS_PATH,
  DOCUMENT_CREATE_PATH,
  FIRM_HOME_PATH,
  FORBIDDEN_PATH,
  GAS_DISTRIBUTION_GROUPS_PATH,
  GAS_DISTRIBUTION_GROUPS_VIEWER_ROLES,
  GAS_DISTRIBUTION_HOME_PATH,
  GAS_DISTRIBUTION_USERS_PATH,
  GAS_DISTRIBUTION_USER_CREATE_PATH,
  MANAGEMENT_SCREEN_ROLES,
  POLICIES_PATH,
  PROJECT_CONTENT_WRITER_ROLES,
  POLICY_CREATE_ROUTE,
  PROFILE_PATH,
  PROJECT_CREATE_PATH,
  PROJECT_FIRMS_PATH,
  PROJECT_FIRM_CREATE_PATH,
  PROJECT_FIRM_UPDATE_ROUTE,
  PROJECT_FIRM_USERS_PATH,
  PROJECT_FIRM_USER_CREATE_PATH,
} from '../ui/admin/adminNavItems'


/**
 * Rota bazlı kod bölme. GİRİŞ ekranı dışındaki her sayfa ayrı bir parçaya
 * çıkıyor: eskiden tek bir paket vardı ve giriş ekranını açan kullanıcı, hiç
 * girmeyeceği çizim editörünün three.js/R3F dünyasını da indiriyordu.
 *
 * `LoginPage` bilerek STATİK: ilk boyanan ekran o, tembel yüklemek yalnız
 * gereksiz bir bekleme karesi eklerdi. `AdminLayout` da statik — kabuk her
 * yönetici rotasında zaten gerekli, ayrı parçaya çıkarmak fazladan istek olurdu.
 */
// `import()` ifadesi editorChunk.ts'te: detay ekranı da aynı parçayı ısıtıyor.
const EditorPage = lazy(async () => ({ default: (await importEditorPage()).EditorPage }))
const RegisterPage = lazy(async () => ({
  default: (await import('../pages/RegisterPage')).RegisterPage,
}))
const AdminHomePage = lazy(async () => ({
  default: (await import('../pages/AdminHomePage')).AdminHomePage,
}))
const DocumentListPage = lazy(async () => ({
  default: (await import('../pages/DocumentListPage')).DocumentListPage,
}))
const GasDistributionFirmFormPage = lazy(async () => ({
  default: (await import('../pages/GasDistributionFirmFormPage')).GasDistributionFirmFormPage,
}))
const GasDistributionFirmsPage = lazy(async () => ({
  default: (await import('../pages/GasDistributionFirmsPage')).GasDistributionFirmsPage,
}))
const GasDistributionUserFormPage = lazy(async () => ({
  default: (await import('../pages/GasDistributionUserFormPage')).GasDistributionUserFormPage,
}))
const GasDistributionUsersPage = lazy(async () => ({
  default: (await import('../pages/GasDistributionUsersPage')).GasDistributionUsersPage,
}))
const NewDocumentPage = lazy(async () => ({
  default: (await import('../pages/NewDocumentPage')).NewDocumentPage,
}))
const NewPolicyPage = lazy(async () => ({
  default: (await import('../pages/NewPolicyPage')).NewPolicyPage,
}))
const NewProjectFirmPage = lazy(async () => ({
  default: (await import('../pages/NewProjectFirmPage')).NewProjectFirmPage,
}))
const NewProjectPage = lazy(async () => ({
  default: (await import('../pages/NewProjectPage')).NewProjectPage,
}))
const PolicyListPage = lazy(async () => ({
  default: (await import('../pages/PolicyListPage')).PolicyListPage,
}))
const ProjectDetailPage = lazy(async () => ({
  default: (await import('../pages/ProjectDetailPage')).ProjectDetailPage,
}))
const ProjectFirmUserFormPage = lazy(async () => ({
  default: (await import('../pages/ProjectFirmUserFormPage')).ProjectFirmUserFormPage,
}))
const ProjectFirmUsersPage = lazy(async () => ({
  default: (await import('../pages/ProjectFirmUsersPage')).ProjectFirmUsersPage,
}))
const ProjectFirmUpdatePage = lazy(async () => ({
  default: (await import('../pages/ProjectFirmUpdatePage')).ProjectFirmUpdatePage,
}))
const ProjectFirmsPage = lazy(async () => ({
  default: (await import('../pages/ProjectFirmsPage')).ProjectFirmsPage,
}))
const ProjectListPage = lazy(async () => ({
  default: (await import('../pages/ProjectListPage')).ProjectListPage,
}))
const ProfilePage = lazy(async () => ({
  default: (await import('../pages/ProfilePage')).ProfilePage,
}))
const ForbiddenPage = lazy(async () => ({
  default: (await import('../pages/ForbiddenPage')).ForbiddenPage,
}))
const FirmUserHomePage = lazy(async () => ({
  default: (await import('../pages/firmUser/FirmUserHomePage')).FirmUserHomePage,
}))
const GasDistributionGroupsPage = lazy(async () => ({
  default: (await import('../pages/GasDistributionGroupsPage')).GasDistributionGroupsPage,
}))
const GasDistributionHomePage = lazy(async () => ({
  default: (await import('../pages/gasDistributionUser/GasDistributionHomePage'))
    .GasDistributionHomePage,
}))

/** Sayfa parçası inerken görünen ara ekran; boş beyaz kare bırakmaz. */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center gap-2 p-6 text-sm text-ink-muted"
    >
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      Yükleniyor…
    </div>
  )
}

/**
 * Tek sınır: hangi rotaya gidilirse gidilsin parçası inerken aynı ara ekran
 * görünür, her rotaya ayrı Suspense sarmak gerekmiyor. Veri router'ında
 * `<Routes>` sarmalayıcısı olmadığı için KÖK ROTA'nın elemanı olarak duruyor.
 */
function SuspenseLayout() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  )
}

/**
 * Veri router'ı (`createBrowserRouter`), düz `BrowserRouter` DEĞİL: gezinmeyi
 * durdurabilen `useBlocker` yalnız burada çalışıyor ve editör kaydedilmemiş
 * çizimle çıkılırken tarayıcının GERİ tuşunu da yakalamak zorunda (K112).
 * Rota ağacı JSX olarak kalıyor — `createRoutesFromElements` aynı ağacı okuyor,
 * yolların ve sıralama yorumlarının hiçbiri değişmedi.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<SuspenseLayout />}>
      {/* Korumasız olan YALNIZ bu ikisi; gerisi RequireAuth'un altında. */}
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Proje listesi yönetici kabuğunun altında ama yolu /projects kalıyor:
          editörden çıkış (useCloseEditor) ve sol menü bu yola bağlı. Yol
          taşınırsa iki ayrı yerde kırılma olurdu. Koruma kabuğun DIŞINDA:
          giriş yapmamış kullanıcıya menü/üst bar bir an bile görünmesin. */}
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path={PROJECT_LIST_PATH} element={<ProjectListPage />} />
        {/* Statik parça dinamik olandan önce eşleşir (React Router sıralaması),
            yoksa /projects/new detayı "new" kimliğiyle açmaya çalışırdı.

            Proje AÇMA rol kapısının arkasında: sunucu da `POST /api/projects`'i
            yalnız Admin ve ProjectFirmUser'a açıyor. Gaz dağıtım kullanıcısı
            düğmeyi görmüyor; adresi elle yazarsa da form açılmamalı — yoksa
            doldurup kaydedince 403 alırdı. */}
        <Route
          element={
            <RequireRole allowed={PROJECT_CONTENT_WRITER_ROLES}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path={PROJECT_CREATE_PATH} element={<NewProjectPage />} />
          {/* Proje detayındaki "Poliçelendir" hedefi (KK-9). Poliçe bölümünün
              altında DEĞİL projenin altında (K68): sihirbaz bir projenin işlemi,
              sol menüde "Projeler" işaretli kalmalı. */}
          <Route path={POLICY_CREATE_ROUTE} element={<NewPolicyPage />} />
        </Route>
        {/* Proje detayı kabuğun İÇİNDE: sol menü ve üst bar duruyor, kırılım
            "Anasayfa / Projeler / Proje Detay" (KK-1). Rol kapısı YOK: üç rol de
            projeyi görüntüleyebiliyor, kapsamı sunucu veriyor. */}
        <Route path={`${PROJECT_LIST_PATH}/:projectId`} element={<ProjectDetailPage />} />

        {/* Rol anasayfaları. Üçü de `/admin` index'inden AYRI ekranlar ve her
            biri kendi rolüne kapalı: `/admin` yönetimin, `/firm` proje
            firmasının, `/gas-distribution` gaz dağıtım kullanıcısının. Tek
            adrese rolüne göre farklı ekran basmak, korumayı rota ağacından
            çıkarıp bileşenin içine gömerdi. */}
        <Route
          element={
            <RequireRole allowed={[ROLE_CODES.projectFirmUser]}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path={FIRM_HOME_PATH} element={<FirmUserHomePage />} />
        </Route>

        <Route
          element={
            <RequireRole allowed={[ROLE_CODES.gasDistributionUser]}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path={GAS_DISTRIBUTION_HOME_PATH} element={<GasDistributionHomePage />} />
        </Route>

        {/* Rolü yetmeyen kullanıcının indiği ekran. Rol kapısının DIŞINDA
            olmak zorunda: kapının kendisi buraya yönlendiriyor, korumalı
            olsaydı kendi kendine dönen bir döngü kurardı. */}
        <Route path={FORBIDDEN_PATH} element={<ForbiddenPage />} />
      </Route>

      {/* Editör kabuk dışında: tam ekran çizim alanı. Detay ekranı
          /projects/:projectId adresini devraldığı için editör alt yolda (K53). */}
      <Route
        path="/projects/:projectId/editor"
        element={
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        }
      />

      {/* Yönetici ekranları ortak kabuğu paylaşır; giriş sonrası buraya otomatik
          yönlendirme YOK — firma listesine yalnız sol menüden gelinir. */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        {/* YÖNETİM ekranları: rol kapısı burada, tek yerde. Sol menüden
            gizlemek yetmez — adres çubuğuna yazan kullanıcı ekranı yine
            görürdü. Kapı yalnız GÖRÜNÜRLÜĞÜ kesiyor; uçların kendisi
            fail-closed (knowledge/access-control.md). */}
        <Route
          element={
            <RequireRole allowed={MANAGEMENT_SCREEN_ROLES}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route index element={<AdminHomePage />} />
          <Route path="gas-distribution-firms" element={<GasDistributionFirmsPage />} />
          {/* Statik parça dinamik olandan ÖNCE eşleşir (React Router sıralaması),
              yoksa /new formu "new" kimliğiyle güncelleme modunda açardı. */}
          <Route path="gas-distribution-firms/new" element={<GasDistributionFirmFormPage />} />
          <Route path="gas-distribution-firms/:firmId" element={<GasDistributionFirmFormPage />} />

          <Route path={PROJECT_FIRMS_PATH} element={<ProjectFirmsPage />} />
          {/* Statik parça dinamik olandan ÖNCE eşleşir (React Router sıralaması),
              yoksa /new güncelleme rotasına "new" kimliğiyle düşerdi. */}
          <Route path={PROJECT_FIRM_CREATE_PATH} element={<NewProjectFirmPage />} />
          {/* Firma adının hedefi. Kayıt TEKİL uçtan çekilir, form onunla
              doldurulur ve `PUT /api/projectfirms/{id}` ile kaydedilir. */}
          <Route path={PROJECT_FIRM_UPDATE_ROUTE} element={<ProjectFirmUpdatePage />} />

          <Route path={PROJECT_FIRM_USERS_PATH} element={<ProjectFirmUsersPage />} />
          {/* Statik parça dinamik olandan ÖNCE eşleşir (React Router sıralaması),
              yoksa /new formu "new" kimliğiyle güncelleme modunda açardı. */}
          <Route path={PROJECT_FIRM_USER_CREATE_PATH} element={<ProjectFirmUserFormPage />} />
          <Route
            path={`${PROJECT_FIRM_USERS_PATH}/:userId`}
            element={<ProjectFirmUserFormPage />}
          />

          {/* Gaz dağıtım kullanıcıları: LİSTE de OLUŞTURMA da yönetim kapısının
              içinde. Liste bir süre kapının dışındaydı ve gaz dağıtım kullanıcısı
              kendi firmasının kullanıcılarını görüyordu; o rolün kendi anasayfası
              olduğu için ekran yönetime bırakıldı. Güncelleme rotası YOK: uç
              yalnız oluşturmayı destekliyor (`POST /api/auth/register`).

              Statik parça dinamik olandan ÖNCE eşleşir kuralı burada gerekmiyor:
              /new'in dinamik kardeşi yok. */}
          <Route path={GAS_DISTRIBUTION_USERS_PATH} element={<GasDistributionUsersPage />} />
          <Route
            path={GAS_DISTRIBUTION_USER_CREATE_PATH}
            element={<GasDistributionUserFormPage />}
          />
        </Route>

        {/* Buradan aşağısı rol kapısının DIŞINDA: üç kullanıcı tipinin de
            kullandığı ekranlar. Yolları `/admin` altında kalıyor çünkü adres
            taşımak `DOCUMENT_CREATE_PATH` gibi sabitleri ve onlara bağlı
            kırılımları da taşımak olurdu — yol bir adres, yetki değil. */}

        {/* Kişi Bilgileri: üst bardaki kullanıcı menüsünden açılıyor, sol
            menüde maddesi yok — kişisel ayar, yönetim bölümü değil. */}
        <Route path={PROFILE_PATH} element={<ProfilePage />} />

        {/* Grup firmaları salt okuma; `GET /api/gasdistributiongroups` her role
            açık. Menüde proje firması ve gaz dağıtım kullanıcısında görünüyor. */}
        <Route
          element={
            <RequireRole allowed={GAS_DISTRIBUTION_GROUPS_VIEWER_ROLES}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path={GAS_DISTRIBUTION_GROUPS_PATH} element={<GasDistributionGroupsPage />} />
        </Route>

        <Route path={DOCUMENTS_PATH} element={<DocumentListPage />} />
        {/* Statik parça dinamik olandan ÖNCE eşleşir kuralı burada gerekmiyor:
            /new'in dinamik kardeşi yok. Proje kimliği yolda değil query'de
            (`?project=`), çünkü evrak GELİNEN projeye bağlanıyor.

            Yazma rotası: sunucu `POST /api/docs`'u yalnız Admin ve
            ProjectFirmUser'a açıyor. Gaz dağıtım kullanıcısı düğmeyi görmüyor;
            adresi elle yazarsa da form açılmamalı. */}
        <Route
          element={
            <RequireRole allowed={PROJECT_CONTENT_WRITER_ROLES}>
              <Outlet />
            </RequireRole>
          }
        >
          <Route path={DOCUMENT_CREATE_PATH} element={<NewDocumentPage />} />
        </Route>

        {/* Poliçe LİSTESİ: bütün projelerin poliçeleri. Oluşturma akışı burada
            DEĞİL, projenin altında (K68). */}
        <Route path={POLICIES_PATH} element={<PolicyListPage />} />
      </Route>

      <Route path="*" element={<Navigate to={PROJECT_LIST_PATH} replace />} />
    </Route>,
  ),
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
