import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LOGIN_PATH, RequireAuth } from './RequireAuth'
import { AdminHomePage } from '../pages/AdminHomePage'
import { AnnouncementsPage } from '../pages/AnnouncementsPage'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { EditorPage } from '../pages/EditorPage'
import { GasDistributionFirmFormPage } from '../pages/GasDistributionFirmFormPage'
import { GasDistributionFirmsPage } from '../pages/GasDistributionFirmsPage'
import { LoginPage } from '../pages/LoginPage'
import { NewProjectFirmPage } from '../pages/NewProjectFirmPage'
import { NewProjectPage } from '../pages/NewProjectPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { ProjectFirmUserFormPage } from '../pages/ProjectFirmUserFormPage'
import { ProjectFirmUsersPage } from '../pages/ProjectFirmUsersPage'
import { ProjectFirmsPage } from '../pages/ProjectFirmsPage'
import { ProjectListPage } from '../pages/ProjectListPage'
import { RegisterPage } from '../pages/RegisterPage'
import { PROJECT_LIST_PATH } from '../pages/useCloseEditor'
import { AdminLayout } from '../ui/admin/AdminLayout'
import {
  ANNOUNCEMENTS_PATH,
  DOCUMENTS_PATH,
  DOCUMENT_CREATE_PATH,
  POLICIES_PATH,
  POLICY_CREATE_PATH,
  PROJECT_CREATE_PATH,
  PROJECT_FIRMS_PATH,
  PROJECT_FIRM_CREATE_PATH,
  PROJECT_FIRM_USERS_PATH,
  PROJECT_FIRM_USER_CREATE_PATH,
} from '../ui/admin/adminNavItems'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
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
        </Route>

        {/* Editör kabuk dışında: tam ekran çizim alanı. Detay ekranı
            /projects/:projectId adresini devraldığı için editör alt yolda (K50). */}
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

          {/* Sol menünün ve anasayfadaki hızlı işlemlerin ekranı YAZILMAMIŞ
              hedefleri. Ekran gelince YALNIZ buradaki element değişecek; yolun
              kendisi bugünden doğru, bağlantılara dokunulmayacak. */}
          {/* Firma adının hedefi; güncelleme ekranı kendi issue'sunda gelecek.
              Rota olmasaydı tıklama yakalayıcı route'a düşüp kullanıcıyı proje
              listesine atardı. */}
          <Route
            path={`${PROJECT_FIRMS_PATH}/:firmId`}
            element={<ComingSoonPage title="Proje Firması Güncelle" section="Firmalar" />}
          />
          <Route path={DOCUMENTS_PATH} element={<ComingSoonPage title="Evraklar" />} />
          <Route path={POLICIES_PATH} element={<ComingSoonPage title="Poliçeler" />} />
          {/* Proje detayındaki "Evrak Ekle" / "Poliçelendir" hedefleri (KK-9).
              Statik parça dinamik olandan önce gelmeli kuralı burada geçerli
              değil: iki yolun da dinamik kardeşi yok. */}
          <Route
            path={DOCUMENT_CREATE_PATH}
            element={<ComingSoonPage title="Evrak Ekle" section="Evraklar" />}
          />
          <Route
            path={POLICY_CREATE_PATH}
            element={<ComingSoonPage title="Poliçe Oluşturma" section="Poliçeler" />}
          />
        </Route>

        <Route path="*" element={<Navigate to={PROJECT_LIST_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
