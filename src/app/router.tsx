import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { LOGIN_PATH, RequireAuth } from './RequireAuth'
import { AdminHomePage } from '../pages/AdminHomePage'
import { AdminTodoPage } from '../pages/AdminTodoPage'
import { EditorPage } from '../pages/EditorPage'
import { GasDistributionFirmsPage } from '../pages/GasDistributionFirmsPage'
import { LoginPage } from '../pages/LoginPage'
import { ProjectListPage } from '../pages/ProjectListPage'
import { RegisterPage } from '../pages/RegisterPage'
import { PROJECT_LIST_PATH } from '../pages/useCloseEditor'
import { AdminLayout } from '../ui/admin/AdminLayout'
import { PROJECT_CREATE_PATH } from '../ui/admin/adminNavItems'

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
              yoksa /projects/new editörü "new" kimliğiyle açmaya çalışırdı. */}
          <Route path={PROJECT_CREATE_PATH} element={<AdminTodoPage title="Yeni Proje" />} />
        </Route>

        {/* Editör kabuk dışında: tam ekran çizim alanı. */}
        <Route
          path="/projects/:projectId"
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
          <Route
            path="gas-distribution-firms/new"
            element={<AdminTodoPage title="Gaz Dağıtım Firma Ekle" />}
          />
          <Route
            path="gas-distribution-firms/:firmId"
            element={<AdminTodoPage title="Gaz Dağıtım Firma Güncelle" />}
          />
        </Route>

        <Route path="*" element={<Navigate to={PROJECT_LIST_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
