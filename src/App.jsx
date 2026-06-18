import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import DebriefPage from './pages/DebriefPage'
import AddWantPage from './pages/AddWantPage'
import FillBlanksPage from './pages/FillBlanksPage'
import NextReadPage from './pages/NextReadPage'
import StatsPage from './pages/StatsPage'
import BookPage from './pages/BookPage'

function AppRoutes() {
  const { session, loading, theme, toggleTheme } = useApp()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text2)' }}>Opening the library…</div>
    </div>
  )

  if (!session) return <LoginPage theme={theme} toggleTheme={toggleTheme} />

  return (
    <Routes>
      <Route path="/"          element={<HomePage />} />
      <Route path="/library"   element={<LibraryPage />} />
      <Route path="/book/:id"  element={<BookPage />} />
      <Route path="/debrief"   element={<DebriefPage />} />
      <Route path="/add-want"  element={<AddWantPage />} />
      <Route path="/fill"      element={<FillBlanksPage />} />
      <Route path="/next-read" element={<NextReadPage />} />
      <Route path="/stats"     element={<StatsPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
