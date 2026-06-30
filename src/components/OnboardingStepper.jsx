import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Library, BookMarked, BookCheck, Layers, X } from 'lucide-react'

const STEPS = [
  {
    icon: BookOpen, color: 'var(--gold)',
    title: 'Welcome',
    body: "This is your private library — every book you've read, want to read, or are in the middle of, all in one place. Here's a quick tour of what it can do.",
  },
  {
    icon: Library, color: '#8a7eb8',
    title: 'The Library',
    body: 'Browse your whole collection in grid or list view. Search by title or author, filter by status, genre, or fiction/nonfiction, and click any book to open its full profile.',
    path: '/library', cta: 'Open the Library',
  },
  {
    icon: BookMarked, color: '#7a9e8a',
    title: 'Add a Book',
    body: "Search by title or author — it checks your library and the web at once. Pick a result and it's added to your want-to-read shelf automatically.",
    path: '/add-want', cta: 'Add a book',
  },
  {
    icon: BookCheck, color: '#c9963c',
    title: 'A Book I Finished',
    body: "When you finish something, come here. A few quick questions capture your rating and the one thing you'll remember — nothing required, just a quick ritual.",
    path: '/debrief', cta: 'Try a debrief',
  },
  {
    icon: Layers, color: '#6a9070',
    title: 'Series & Dashboard',
    body: 'The Series Tracker shows every series and flags gaps in what you own. Your Dashboard has stats on your reading habits and the library itself.',
    path: '/stats', cta: 'See your stats',
  },
]

export default function OnboardingStepper({ onClose }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const Icon = s.icon
  const isLast = step === STEPS.length - 1

  const go = (path) => { onClose(); navigate(path) }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 460, position: 'relative' }}>
        <button onClick={onClose} aria-label="Skip tour" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= step ? 'var(--gold)' : 'var(--border2)', transition: 'background 0.2s' }} />
          ))}
        </div>

        <div style={{ width: 48, height: 48, borderRadius: 12, background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon size={22} color={s.color} />
        </div>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, marginBottom: 12 }}>{s.title}</h2>
        <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>{s.body}</p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {step > 0 && (
            <button onClick={() => setStep(v => v - 1)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>
              Back
            </button>
          )}
          {s.path && (
            <button onClick={() => go(s.path)}
              style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '10px 18px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
              {s.cta}
            </button>
          )}
          <button onClick={() => isLast ? onClose() : setStep(v => v + 1)}
            style={{ marginLeft: 'auto', background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 22px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 20 }}>
          {step + 1} of {STEPS.length} — the full guide is always in{' '}
          <button onClick={() => go('/guide')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}>
            How to use this app
          </button>
        </p>
      </div>
    </div>
  )
}
