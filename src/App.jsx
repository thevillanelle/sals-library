import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import DebriefPage from './pages/DebriefPage'
import AddWantPage from './pages/AddWantPage'
import FillBlanksPage from './pages/FillBlanksPage'
import NextReadPage from './pages/NextReadPage'
import StatsPage from './pages/StatsPage'
import BookPage from './pages/BookPage'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('home')
  const [pageData, setPageData] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('sl-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sl-theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const navigate = (p, data = null) => { setPage(p); setPageData(data); window.scrollTo(0, 0) }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ fontFamily:"var(--font-serif)", fontSize:20, color:"var(--text2)" }}>Opening the library…</div>
    </div>
  )

  if (!session) return <LoginPage theme={theme} toggleTheme={() => setTheme(t => t==="dark"?"light":"dark")} />

  const props = { navigate, theme, toggleTheme: () => setTheme(t => t==="dark"?"light":"dark"), session, pageData }

  return (
    <>
      {page==="home"      && <HomePage      {...props} />}
      {page==="library"   && <LibraryPage   {...props} />}
      {page==="debrief"   && <DebriefPage   {...props} />}
      {page==="add-want"  && <AddWantPage   {...props} />}
      {page==="fill"      && <FillBlanksPage {...props} />}
      {page==="next-read" && <NextReadPage  {...props} />}
      {page==="stats"     && <StatsPage     {...props} />}
      {page==="book"      && <BookPage      {...props} />}
    </>
  )
}