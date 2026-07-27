import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { EditorPage } from '../pages/EditorPage'
import { ProjectListPage } from '../pages/ProjectListPage'
import { PROJECT_LIST_PATH } from '../pages/useCloseEditor'

/**
 * Giriş koruması (RequireAuth) SADECE bu dosyaya eklenir — kimlik doğrulama
 * issue'sunda aşağıdaki route'lar onunla sarılacak.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PROJECT_LIST_PATH} element={<ProjectListPage />} />
        <Route path="/projects/:projectId" element={<EditorPage />} />
        <Route path="*" element={<Navigate to={PROJECT_LIST_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
