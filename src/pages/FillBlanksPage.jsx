import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { HelpCircle, ChevronRight, Check, Flame, SkipForward } from 'lucide-react'

const FIELDS = [
  { key: 'rating',       label: 'Rating',             prompt: 'How many stars?',                   type: 'rating' },
  { key: 'one_thing',    label: 'One thing',           prompt: "What's the one thing you'll remember?", type: 'text' },
  { key: 'best_moment',  label: 'Best moment',         prompt: 'Was there a best scene or moment?',  type: 'text' },
  { key: 'give_to',      label: 'Who would you give it to?', prompt: 'Who would you hand this to?',   type: 'text' },
  { key: 'recommend',    label: 'Recommend?',          prompt: 'Would you recommend it?',            type: 'recommend' },
]

function StarPicker({ value, onChange }) {
  const [hov, setHov] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i)} onMouseOver={() => setHov(i)} onMouseOut={() => setHov(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.1s', transform: hov >= i ? 'scale(1.2)' : 'scale(1)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill={(hov || value) >= i ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function FillBlanksPage({ navigate, theme, toggleTheme, session }) {
  const [books, setBooks] = useState([])
  const [idx, setIdx] = useState(0)
  const [fieldIdx, setFieldIdx] = useState(0)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [streak, setStreak] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const [noneFound, setNoneFound] = useState(false)

  const uid = session.user.id

  useEffect(() => {
    const load = async () => {
      const { data: ubData } = await supabase
        .from('user_books')
        .select('book_id, rating, one_thing, best_moment, give_to, recommend, books(id,title,author_first,author_last)')
        .eq('user_id', uid)
        .eq('status', 'read')

      if (!ubData?.length) { setNoneFound(true); setLoading(false); return }

      const incomplete = ubData.filter(ub =>
        FIELDS.some(f => !ub[f.key] || ub[f.key] === null)
      ).slice(0, 5)

      if (!incomplete.length) { setAllDone(true); setLoading(false); return }

      setBooks(incomplete.map(ub => ({ ...ub.books, ub })))

      const { data: sess } = await supabase.from('reading_sessions')
        .select('streak_count').eq('user_id', uid).order('session_date', { ascending: false }).limit(1)
      setStreak(sess?.[0]?.streak_count || 0)
      setLoading(false)
    }
    load()
  }, [uid])

  const currentBook = books[idx]
  const missingFields = currentBook ? FIELDS.filter(f => !currentBook.ub[f.key]) : []
  const currentField = missingFields[fieldIdx]

  const handleSave = async () => {
    if (!currentField) return
    if (currentField.type !== 'recommend' && !value.trim() && currentField.type !== 'rating') return

    setSaving(true)
    const update = { [currentField.key]: currentField.type === 'rating' ? value : value.trim() }
    await supabase.from('user_books')
      .update(update)
      .eq('user_id', uid)
      .eq('book_id', currentBook.id)

    const newCompleted = completed + 1

    const nextFieldIdx = fieldIdx + 1
    if (nextFieldIdx < missingFields.length) {
      setFieldIdx(nextFieldIdx)
      setValue('')
      setSaving(false)
      setCompleted(newCompleted)
      return
    }

    const nextIdx = idx + 1
    if (nextIdx < books.length) {
      setIdx(nextIdx)
      setFieldIdx(0)
      setValue('')
      setSaving(false)
      setCompleted(newCompleted)
      return
    }

    await updateStreak()
    setCompleted(newCompleted)
    setAllDone(true)
    setSaving(false)
  }

  const handleSkip = () => {
    setValue('')
    const nextFieldIdx = fieldIdx + 1
    if (nextFieldIdx < missingFields.length) { setFieldIdx(nextFieldIdx); return }
    const nextIdx = idx + 1
    if (nextIdx < books.length) { setIdx(nextIdx); setFieldIdx(0); return }
    setAllDone(true)
  }

  const updateStreak = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('reading_sessions')
      .select('id,streak_count,session_date').eq('user_id', uid).order('session_date', { ascending: false }).limit(1)

    const last = existing?.[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = last?.session_date === today ? last.streak_count : (last?.session_date === yesterday ? (last.streak_count || 0) + 1 : 1)

    await supabase.from('reading_sessions').upsert({ user_id: uid, session_date: today, streak_count: newStreak }, { onConflict: 'user_id,session_date' })
    setStreak(newStreak)
  }

  if (loading) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Finding the gaps…</div>
      </Shell>
    )
  }

  if (noneFound) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 12 }}>No read books yet</div>
          <p style={{ color: 'var(--text2)', marginBottom: 28 }}>Debrief a book first, then come back.</p>
          <button onClick={() => navigate('debrief')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500 }}>
            Debrief a book
          </button>
        </div>
      </Shell>
    )
  }

  if (allDone) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#b87a5a18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            {streak > 0 ? <Flame size={32} color="#b87a5a" /> : <Check size={32} color="#7a9e8a" />}
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
            {completed > 0 ? "All filled in!" : "Already caught up!"}
          </h2>
          {streak > 0 && <p style={{ color: '#b87a5a', fontSize: 15, marginBottom: 8 }}>{streak} day streak 🔥</p>}
          {completed > 0 && <p style={{ color: 'var(--text2)', marginBottom: 28 }}>You filled in {completed} blank{completed !== 1 ? 's' : ''} today.</p>}
          <button onClick={() => navigate('home')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500 }}>
            Back home
          </button>
        </div>
      </Shell>
    )
  }

  const bookAuthor = [currentBook?.author_first, currentBook?.author_last].filter(Boolean).join(' ')
  const totalFields = books.reduce((acc, b) => acc + FIELDS.filter(f => !b.ub[f.key]).length, 0)
  const doneFields = books.slice(0, idx).reduce((acc, b) => acc + FIELDS.filter(f => !b.ub[f.key]).length, 0) + fieldIdx
  const progress = totalFields > 0 ? doneFields / totalFields : 0

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, marginBottom: 2 }}>Fill in the blanks</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Book {idx + 1} of {books.length} · {doneFields} of {totalFields} filled</p>
          </div>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#b87a5a18', border: '1px solid #b87a5a40', borderRadius: 'var(--radius)', padding: '8px 14px' }}>
              <Flame size={16} color="#b87a5a" />
              <span style={{ color: '#b87a5a', fontSize: 14, fontWeight: 500 }}>{streak}</span>
            </div>
          )}
        </div>

        <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--gold)', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#b87a5a18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HelpCircle size={18} color="#b87a5a" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500 }}>{currentBook?.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{bookAuthor}</div>
            </div>
          </div>

          <p style={{ fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>{currentField?.prompt}</p>

          {currentField?.type === 'rating' && (
            <StarPicker value={value} onChange={v => setValue(v)} />
          )}
          {currentField?.type === 'text' && (
            <textarea value={value} onChange={e => setValue(e.target.value)}
              placeholder="Write something…"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: 100, resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
          )}
          {currentField?.type === 'recommend' && (
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ v: 'yes', l: 'Yes' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Probably not' }].map(opt => (
                <button key={opt.v} onClick={() => setValue(opt.v)}
                  style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius)', border: `1px solid ${value === opt.v ? 'var(--gold)' : 'var(--border)'}`, background: value === opt.v ? 'var(--gold-pale)' : 'var(--bg3)', color: value === opt.v ? 'var(--gold)' : 'var(--text2)', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>
                  {opt.l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSkip}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 20px', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <SkipForward size={14} /> Skip
          </button>
          <button onClick={handleSave} disabled={saving || (currentField?.type === 'text' && !value.trim()) || (currentField?.type === 'rating' && !value) || (currentField?.type === 'recommend' && !value)}
            style={{ flexGrow: 1, background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (saving || (currentField?.type === 'text' && !value.trim()) || (currentField?.type === 'rating' && !value) || (currentField?.type === 'recommend' && !value)) ? 0.5 : 1 }}>
            {saving ? 'Saving…' : <><ChevronRight size={16} /> Save &amp; continue</>}
          </button>
        </div>
      </div>
    </Shell>
  )
}
