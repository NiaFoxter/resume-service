import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import ToastContainer from './components/ui/ToastContainer'
import ConfirmModal from './components/ui/ConfirmModal'
import LoginModal from './components/ui/LoginModal'
import RegisterModal from './components/ui/RegisterModal'

import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import TemplatesPage from './pages/TemplatesPage'
import EditorPage from './pages/EditorPage'
import AnalysisPage from './pages/AnalysisPage'

import { useAuthStore } from './store/authStore'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const openLogin = useAuthStore(s => s.openLogin)

  useEffect(() => {
    if (!token) openLogin()
  }, [token, openLogin])

  if (!token) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <ToastContainer />
      <ConfirmModal />
      <LoginModal />
      <RegisterModal />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />
        <Route path="/editor/:id?" element={
          <PrivateRoute><EditorPage /></PrivateRoute>
        } />
        <Route path="/analysis" element={
          <PrivateRoute><AnalysisPage /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}