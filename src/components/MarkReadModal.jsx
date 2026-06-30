import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Star, Check, X } from 'lucide-react'

export default function MarkReadModal({ book, uid, onClose, onSaved }) {
  const [rating, setRating] = useState(0)
  const [hov, setHov] = useState(0)
  const [dateRead, setDateRead] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('user_books').upsert(
      { user_id: uid, book_id: book.id, status: 'read', rating: rating || null, date_read: dateRead || null },
      { onConflict: 'user_id,book_id' }
    )
    setSaving(false)
    if (err) { setError('Could not save. Please try again.'); return }
    setDone(true)
    setTimeout(() => { onSaved(); onClose() }, 800)
  }

  const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Marking as read</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, lineHeight: 1.3 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{[book.author_first, book.author_last].filter(Boolean).join(' ')}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Rating</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i === rating ? 0 : i)}
                  onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(0)}
                  aria-label={`${i} star${i !== 1 ? 's' : ''}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={22} fill={(hov || rating) >= i ? 'var(--gold)' : 'none'} color={(hov || rating) >= i ? 'var(--gold)' : 'var(--border2)'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="mark-read-date" style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Date read</label>
            <input id="mark-read-date" type="date" value={dateRead} onChange={e => setDateRead(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && <p style={{ color: '#bf6d6d', fontSize: 13, marginTop: 12, marginBottom: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button onClick={save} disabled={saving || done}
            style={{ background: done ? '#2d6b2d' : 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 24px', color: done ? '#6dbf6d' : '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', transition: 'all 0.2s' }}>
            {done ? <><Check size={15} /> Moved to library!</> : saving ? 'Saving…' : 'Mark as read'}
          </button>
        </div>
      </div>
    </div>
  )
}
