import { Sun, Moon, BookOpen, ArrowLeft, Eye, EyeOff, Pencil } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import OnboardingStepper from './OnboardingStepper'

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

function AppTitle({ title, onSave, onNavigateHome }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  useEffect(() => { setDraft(title) }, [title])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) onSave(trimmed)
    else setDraft(title)
  }

  if (editing) {
    return (
      <input
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') { setDraft(title); setEditing(false) }
        }}
        style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 6, padding: '2px 8px', outline: 'none', width: 220 }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div onClick={onNavigateHome} style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <BookOpen size={18} color="var(--gold)" />
        {title}
      </div>
      <button onClick={() => setEditing(true)} aria-label="Rename app" title="Rename"
        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2, opacity: 0.6, display: 'flex' }}>
        <Pencil size={12} />
      </button>
    </div>
  )
}

const SIZE_LABELS = ['Sm', 'Md', 'Lg', 'XL']

function TextSizeControl({ textSizeIndex, setTextSizeByIndex }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Adjust text size"
        style={{ background: open ? 'var(--gold-pale)' : 'none', border: '1px solid var(--border2)', borderRadius: 8, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 14, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>
        A
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, display: 'flex', border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100 }}>
          {SIZE_LABELS.map((label, i) => (
            <button key={i} onClick={() => { setTextSizeByIndex(i); setOpen(false) }}
              style={{
                background: i === textSizeIndex ? 'var(--gold)' : 'none',
                border: 'none',
                borderRight: i < SIZE_LABELS.length - 1 ? '1px solid var(--border2)' : 'none',
                color: i === textSizeIndex ? '#1a1300' : 'var(--text3)',
                cursor: 'pointer', fontSize: 11, fontWeight: i === textSizeIndex ? 600 : 400,
                padding: '0 12px', height: 34, transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Shell({ children, showBack = false, backPage = '/' }) {
  const navigate = useNavigate()
  const { theme, toggleTheme, weather, textSizeIndex, setTextSizeByIndex, zoom, isAliased, standardView, toggleStandardView, appTitle, setAppTitle, onboardingOpen, dismissOnboarding } = useApp()

  useEffect(() => { document.title = appTitle }, [appTitle])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {onboardingOpen && <OnboardingStepper onClose={dismissOnboarding} />}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 50 }}>
        <AppTitle title={appTitle} onSave={setAppTitle} onNavigateHome={() => navigate('/')} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DateWeather weather={weather} />
          {showBack && (
            <button onClick={() => navigate(backPage)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
              <ArrowLeft size={14} /> {backPage === '/library' ? 'Library' : 'Home'}
            </button>
          )}
          {isAliased && (
            <button onClick={toggleStandardView}
              aria-label={standardView ? "Switch back to Sal's library" : 'Preview standard user view'}
              title={standardView ? "Viewing as a standard user — click to return to Sal's library" : "Viewing Sal's library — click to preview a standard user's view"}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: standardView ? 'var(--gold-pale)' : 'none', border: `1px solid ${standardView ? 'var(--gold)' : 'var(--border2)'}`, borderRadius: 8, height: 34, padding: '0 12px', color: standardView ? 'var(--gold)' : 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: standardView ? 500 : 400, whiteSpace: 'nowrap' }}>
              {standardView ? <EyeOff size={13} /> : <Eye size={13} />}
              {standardView ? 'Standard view' : "Sal's library"}
            </button>
          )}
          <TextSizeControl textSizeIndex={textSizeIndex} setTextSizeByIndex={setTextSizeByIndex} />
          <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
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
