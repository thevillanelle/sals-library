import { Sun, Moon, BookOpen, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Shell({ children, showBack = false, backPage = '/' }) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useApp()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 50 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <BookOpen size={18} color="var(--gold)" />
          Sal's Library
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showBack && (
            <button onClick={() => navigate(backPage)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>
              <ArrowLeft size={15} /> {backPage === '/library' ? 'Library' : 'Home'}
            </button>
          )}
          <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>
      <div style={{ padding: '40px 32px', maxWidth: 1100, margin: '0 auto' }}>{children}</div>
    </div>
  )
}
