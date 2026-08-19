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
import { importEditorPage } from './editorChunk'
import { LoginPage } from '../pages/LoginPage'
import { PROJECT_LIST_PATH } from '../pages/useCloseEditor'
import { AdminLayout } from '../ui/admin/AdminLayout'
import {
  ANNOUNCEMENTS_PATH,
  DOCUMENTS_PATH,
  DOCUMENT_CREATE_PATH,
  POLICIES_PATH,
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
const AnnouncementsPage = lazy(async () => ({
  default: (await import('../pages/AnnouncementsPage')).AnnouncementsPage,
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
            yoksa /projects/new detayı "new" kimliğiyle açmaya çalışırdı. */}
        <Route path={PROJECT_CREATE_PATH} element={<NewProjectPage />} />
        {/* Proje detayı kabuğun İÇİNDE: sol menü ve üst bar duruyor, kırılım
            "Anasayfa / Projeler / Proje Detay" (KK-1). */}
        <Route path={`${PROJECT_LIST_PATH}/:projectId`} element={<ProjectDetailPage />} />
        {/* Proje detayındaki "Poliçelendir" hedefi (KK-9). Poliçe bölümünün
            altında DEĞİL projenin altında (K68): sihirbaz bir projenin işlemi,
            sol menüde "Projeler" işaretli kalmalı. */}
        <Route path={POLICY_CREATE_ROUTE} element={<NewPolicyPage />} />
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

        <Route path={PROJECT_FIRM_USERS_PATH} element={<ProjectFirmUsersPage />} />
        {/* Statik parça dinamik olandan ÖNCE eşleşir (React Router sıralaması),
            yoksa /new formu "new" kimliğiyle güncelleme modunda açardı. */}
        <Route path={PROJECT_FIRM_USER_CREATE_PATH} element={<ProjectFirmUserFormPage />} />
        <Route
          path={`${PROJECT_FIRM_USERS_PATH}/:userId`}
          element={<ProjectFirmUserFormPage />}
        />

        <Route path={ANNOUNCEMENTS_PATH} element={<AnnouncementsPage />} />

        {/* Kişi Bilgileri: üst bardaki kullanıcı menüsünden açılıyor, sol
            menüde maddesi yok — kişisel ayar, yönetim bölümü değil. */}
        <Route path={PROFILE_PATH} element={<ProfilePage />} />

        {/* Sol menünün ve anasayfadaki hızlı işlemlerin ekranı YAZILMAMIŞ
            hedefleri. Ekran gelince YALNIZ buradaki element değişecek; yolun
            kendisi bugünden doğru, bağlantılara dokunulmayacak. */}
        {/* Firma adının hedefi. Kayıt TEKİL uçtan çekilir, form onunla
            doldurulur ve `PUT /api/projectfirms/{id}` ile kaydedilir. */}
        <Route path={PROJECT_FIRM_UPDATE_ROUTE} element={<ProjectFirmUpdatePage />} />
        <Route path={DOCUMENTS_PATH} element={<DocumentListPage />} />
        {/* Statik parça dinamik olandan ÖNCE eşleşir kuralı burada gerekmiyor:
            /new'in dinamik kardeşi yok. Proje kimliği yolda değil query'de
            (`?project=`), çünkü evrak GELİNEN projeye bağlanıyor. */}
        <Route path={DOCUMENT_CREATE_PATH} element={<NewDocumentPage />} />

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
