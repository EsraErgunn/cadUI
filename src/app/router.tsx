import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Proje listesi yönetici kabuğunun altında ama yolu /projects kalıyor:
            editörden çıkış (useCloseEditor) ve sol menü bu yola bağlı. Yol
            taşınırsa iki ayrı yerde kırılma olurdu. */}
        <Route element={<AdminLayout />}>
          <Route path={PROJECT_LIST_PATH} element={<ProjectListPage />} />
          {/* Statik parça dinamik olandan önce eşleşir (React Router sıralaması),
              yoksa /projects/new editörü "new" kimliğiyle açmaya çalışırdı. */}
          <Route path={PROJECT_CREATE_PATH} element={<AdminTodoPage title="Yeni Proje" />} />
        </Route>
        <Route path="/projects/:projectId" element={<EditorPage />} />

        {/* Yönetici ekranları ortak kabuğu paylaşır; giriş sonrası buraya otomatik
            yönlendirme YOK — firma listesine yalnız sol menüden gelinir. */}
        <Route path="/admin" element={<AdminLayout />}>
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
