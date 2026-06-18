import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { Star, BookOpen, ArrowLeft } from 'lucide-react'

const statusLabels = { read: 'Read', 'want-to-read': 'Want to read', reading: 'Reading', dnf: 'DNF' }
const statusColors = {
  read:          { bg: '#1a3a1a', border: '#2d6b2d', text: '#6dbf6d' },
  reading:       { bg: '#1a2f3a', border: '#2d5a6b', text: '#6daebf' },
  'want-to-read':{ bg: '#2a2515', border: '#5a4d1a', text: '#c4a84a' },
  dnf:           { bg: '#2a1515', border: '#5a2020', text: '#bf6d6d' },
}
const genres = ['Biography','Classic','Crime','Fantasy','Historical Fiction','History','Horror','Literary Fiction','Mystery','Nonfiction','Science','Science Fiction','Short Stories','Thriller','Western','Other']
const formats = ['Hardcover','Paperback','Mass Market Paperback','Ebook','Audiobook','Library']

function Stars({ rating, onRate }) {
  const [hov, setHov] = useState(0)
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i}
          width="20" height="20" viewBox="0 0 24 24"
          fill={i <= (hov || rating || 0) ? 'var(--gold)' : 'none'}
          stroke="var(--gold)" strokeWidth="1.5"
          style={{ cursor: onRate ? 'pointer' : 'default', transition: 'fill 0.1s' }}
          onMouseEnter={() => onRate && setHov(i)}
          onMouseLeave={() => onRate && setHov(0)}
          onClick={() => onRate && onRate(i)}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>{label}</div>
      {children}
    </div>
  )
}

function TextInput({ value, onSave, placeholder, multiline }) {
  const [val, setVal] = useState(value || '')
  const [dirty, setDirty] = useState(false)
  useEffect(() => { setVal(value || ''); setDirty(false) }, [value])
  const base = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', resize: 'vertical' }
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <Tag
        value={val}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        onChange={e => { setVal(e.target.value); setDirty(true) }}
        onBlur={() => { if (dirty) { onSave(val); setDirty(false) } }}
        onKeyDown={e => { if (!multiline && e.key === 'Enter') { onSave(val); setDirty(false); e.target.blur() } }}
        style={base}
      />
    </div>
  )
}

function SelectInput({ value, options, onSave, placeholder }) {
  return (
    <select value={value || ''} onChange={e => onSave(e.target.value || null)}
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: value ? 'var(--text)' : 'var(--text3)', fontSize: 14, outline: 'none', width: '100%', cursor: 'pointer' }}>
      <option value="">{placeholder || 'Select…'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Toggle({ value, onSave, labelTrue, labelFalse }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[true, false].map(v => (
        <button key={String(v)} onClick={() => onSave(v)}
          style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', border: `1px solid ${value === v ? 'var(--gold)' : 'var(--border)'}`, background: value === v ? 'var(--gold-pale)' : 'var(--bg3)', color: value === v ? 'var(--gold)' : 'var(--text2)' }}>
          {v ? labelTrue : labelFalse}
        </button>
      ))}
    </div>
  )
}

async function fetchSummaryFromOpenLibrary(title, authorLast) {
  try {
    const q = encodeURIComponent(`${title} ${authorLast}`)
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,author_name`)
    if (!res.ok) return null
    const data = await res.json()
    const doc = (data.docs || []).find(d =>
      d.author_name?.some(a => a.toLowerCase().includes((authorLast || '').toLowerCase()))
    ) || data.docs?.[0]
    if (!doc?.key) return null
    const work = await fetch(`https://openlibrary.org${doc.key}.json`)
    if (!work.ok) return null
    const w = await work.json()
    let desc = w.description
    if (typeof desc === 'object') desc = desc.value
    if (!desc || desc.length < 60) return null
    return desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 800)
  } catch { return null }
}

export default function BookPage() {
  const { id: bookId } = useParams()
  const navigate = useNavigate()
  const { session } = useApp()
  const [book, setBook] = useState(null)
  const [ub, setUb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingDesc, setFetchingDesc] = useState(false)
  const uid = session.user.id

  useEffect(() => {
    if (!bookId) return
    const load = async () => {
      const { data: b } = await supabase.from('books').select('*').eq('id', bookId).single()
      const { data: u } = await supabase.from('user_books').select('*').eq('user_id', uid).eq('book_id', bookId).single()
      setBook(b)
      setUb(u || {})
      setLoading(false)

      // Auto-fetch summary if missing
      if (b && !b.summary) {
        setFetchingDesc(true)
        const desc = await fetchSummaryFromOpenLibrary(b.title, b.author_last)
        if (desc) {
          await supabase.from('books').update({ summary: desc }).eq('id', b.id)
          setBook(prev => ({ ...prev, summary: desc }))
        }
        setFetchingDesc(false)
      }
    }
    load()
  }, [bookId, uid])

  const saveBook = async (field, value) => {
    setBook(prev => ({ ...prev, [field]: value }))
    await supabase.from('books').update({ [field]: value }).eq('id', bookId)
  }

  const saveUb = async (field, value) => {
    setUb(prev => ({ ...prev, [field]: value }))
    await supabase.from('user_books').update({ [field]: value }).eq('user_id', uid).eq('book_id', bookId)
  }

  if (loading) return (
    <Shell showBack backPage="/library">
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Opening…</div>
    </Shell>
  )

  if (!book) return (
    <Shell showBack backPage="/library">
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)' }}>Book not found.</div>
    </Shell>
  )

  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
  const sc = statusColors[ub?.status] || statusColors.read

  return (
    <Shell showBack backPage="/library">
      <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate('/library')}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0, marginBottom: 20 }}>
            <ArrowLeft size={14} /> Back to library
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, marginBottom: 6, lineHeight: 1.2 }}>{book.title}</h1>
              <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 4 }}>{author}</p>
              {book.series && <p style={{ color: 'var(--text3)', fontSize: 13 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              {/* Status pill */}
              <select value={ub?.status || 'read'} onChange={e => saveUb('status', e.target.value)}
                style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 13, color: sc.text, cursor: 'pointer', outline: 'none', fontFamily: 'var(--font-sans)' }}>
                {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Stars rating={ub?.rating} onRate={r => saveUb('rating', r)} />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 10 }}>About this book</div>
          {fetchingDesc
            ? <p style={{ color: 'var(--text3)', fontSize: 14, fontStyle: 'italic' }}>Fetching description…</p>
            : book.summary
              ? <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{book.summary}</p>
              : <p style={{ color: 'var(--text3)', fontSize: 14, fontStyle: 'italic', margin: 0 }}>No description found.</p>
          }
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Book metadata */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>Book details</div>

            <Field label="Fiction / Nonfiction">
              <Toggle value={book.fiction} onSave={v => saveBook('fiction', v)} labelTrue="Fiction" labelFalse="Nonfiction" />
            </Field>

            <Field label="Genre">
              <SelectInput value={book.genre} options={genres} onSave={v => saveBook('genre', v)} placeholder="Select genre…" />
            </Field>

            <Field label="Format">
              <SelectInput value={book.format} options={formats} onSave={v => saveBook('format', v)} placeholder="Select format…" />
            </Field>

            <Field label="Year published">
              <TextInput value={book.year_published?.toString()} onSave={v => saveBook('year_published', v ? parseInt(v) : null)} placeholder="e.g. 1998" />
            </Field>

            <Field label="Page count">
              <TextInput value={book.page_count?.toString()} onSave={v => saveBook('page_count', v ? parseInt(v) : null)} placeholder="e.g. 384" />
            </Field>

            <Field label="Dewey decimal">
              <TextInput value={book.dewey} onSave={v => saveBook('dewey', v || null)} placeholder="e.g. 813.54" />
            </Field>

            <Field label="Awards / notable">
              <TextInput value={book.awards} onSave={v => saveBook('awards', v || null)} placeholder="Pulitzer, Booker Prize…" />
            </Field>

            <Field label="Language">
              <TextInput value={book.language} onSave={v => saveBook('language', v || 'English')} placeholder="English" />
            </Field>
          </div>

          {/* Reading record */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>Your record</div>

            <Field label="Date started">
              <input type="date" value={ub?.date_started || ''} onChange={e => saveUb('date_started', e.target.value || null)}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </Field>

            <Field label="Date finished">
              <input type="date" value={ub?.date_read || ''} onChange={e => saveUb('date_read', e.target.value || null)}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </Field>

            <Field label="Would read again">
              <Toggle value={ub?.reread} onSave={v => saveUb('reread', v)} labelTrue="Yes" labelFalse="No" />
            </Field>

            <Field label="Gifted to">
              <TextInput value={ub?.gifted_to} onSave={v => saveUb('gifted_to', v || null)} placeholder="Who you passed it to" />
            </Field>

            <Field label="Recommended to">
              <TextInput value={ub?.give_to} onSave={v => saveUb('give_to', v || null)} placeholder="Who should read this" />
            </Field>

            <Field label="Private notes">
              <TextInput value={book.notes} onSave={v => saveBook('notes', v || null)} placeholder="Anything you want to remember…" multiline />
            </Field>
          </div>
        </div>

        {/* Debrief */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.02em' }}>Debrief</div>

          <Field label="One thing you'll remember">
            <TextInput value={ub?.one_thing} onSave={v => saveUb('one_thing', v || null)} placeholder="The one lasting impression…" multiline />
          </Field>

          <Field label="Best moment">
            <TextInput value={ub?.best_moment} onSave={v => saveUb('best_moment', v || null)} placeholder="A scene, a line, a chapter…" multiline />
          </Field>

          <Field label="What dragged">
            <TextInput value={ub?.dragged} onSave={v => saveUb('dragged', v || null)} placeholder="Slow parts or frustrations…" multiline />
          </Field>

          <Field label="Reminds me of">
            <TextInput value={ub?.compare} onSave={v => saveUb('compare', v || null)} placeholder="Another book or author…" />
          </Field>

          <Field label="Recommend?">
            <div style={{ display: 'flex', gap: 8 }}>
              {[['yes','Yes'],['maybe','Maybe'],['no','Probably not']].map(([v, l]) => (
                <button key={v} onClick={() => saveUb('recommend', v)}
                  style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)', border: `1px solid ${ub?.recommend === v ? 'var(--gold)' : 'var(--border)'}`, background: ub?.recommend === v ? 'var(--gold-pale)' : 'var(--bg3)', color: ub?.recommend === v ? 'var(--gold)' : 'var(--text2)' }}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>

      </div>
    </Shell>
  )
}
