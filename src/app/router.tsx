import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { EditorPage } from '../pages/EditorPage'
import { LoginPage } from '../pages/LoginPage'
import { ProjectListPage } from '../pages/ProjectListPage'
import { RegisterPage } from '../pages/RegisterPage'
import { PROJECT_LIST_PATH } from '../pages/useCloseEditor'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path={PROJECT_LIST_PATH} element={<ProjectListPage />} />
        <Route path="/projects/:projectId" element={<EditorPage />} />
        <Route path="*" element={<Navigate to={PROJECT_LIST_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}