import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'
import LandingPage from './pages/LandingPage.jsx'
import AppLayout from './pages/AppLayout.jsx'
import UploadPage from './pages/UploadPage.jsx'
import VideoPage from './pages/VideoPage.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<UploadPage />} />
            <Route path="video/:videoId" element={<VideoPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  )
}
