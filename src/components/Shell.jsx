import { Sun, Moon, BookOpen, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function DateWeather({ weather }) {
  const now = new Date()
  const day = now.toLocaleDateString('en-US', { weekday: 'short' })
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text3)' }}>
      <span>{day}, {date}</span>
      {weather && (
        <>
          <span style={{ color: 'var(--border2)' }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{weather.emoji}</span>
            <span>{weather.temp}°F</span>
            <span style={{ color: 'var(--border2)', fontSize: 11 }}>{weather.condition}</span>
          </span>
        </>
      )}
    </div>
  )
}

const SIZE_LABELS = { sm: 'Sm', md: 'Md', lg: 'Lg', xl: 'XL' }

function TextSizeToggle({ textSize, cycleTextSize }) {
  return (
    <button
      onClick={cycleTextSize}
      title="Adjust text size"
      style={{
        background: 'none', border: '1px solid var(--border2)', borderRadius: 8,
        height: 34, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5,
        color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 500,
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, color: 'var(--gold)' }}>A</span>
      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{SIZE_LABELS[textSize]}</span>
    </button>
  )
}

export default function Shell({ children, showBack = false, backPage = '/' }) {
  const navigate = useNavigate()
  const { theme, toggleTheme, weather, textSize, cycleTextSize, zoom } = useApp()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 50 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <BookOpen size={18} color="var(--gold)" />
          Sal's Library
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DateWeather weather={weather} />
          {showBack && (
            <button onClick={() => navigate(backPage)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
              <ArrowLeft size={14} /> {backPage === '/library' ? 'Library' : 'Home'}
            </button>
          )}
          <TextSizeToggle textSize={textSize} cycleTextSize={cycleTextSize} />
          <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </nav>
      <div style={{ padding: '40px 32px', maxWidth: 1100, margin: '0 auto', zoom }}>
        {children}
      </div>
    </div>
  )
}
