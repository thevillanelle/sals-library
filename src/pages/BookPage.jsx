import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { Star, BookOpen, ArrowLeft, Trash2, RefreshCw } from 'lucide-react'
import { statusColors, statusLabels, GENRE_KEYWORDS, deriveGenre, deriveFiction, fetchSummaryFromGoogleBooks } from '../lib/bookUtils'

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
  const [saved, setSaved] = useState(false)
  useEffect(() => { setVal(value || ''); setDirty(false) }, [value])

  const handleSave = (v) => {
    onSave(v)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const base = {
    background: 'var(--bg3)',
    border: `1px solid ${saved ? '#2d6b2d' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-sans)',
    resize: 'vertical',
    transition: 'border-color 0.3s',
  }
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <Tag
        value={val}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        onChange={e => { setVal(e.target.value); setDirty(true) }}
        onBlur={() => { if (dirty) handleSave(val) }}
        onKeyDown={e => { if (!multiline && e.key === 'Enter') { handleSave(val); e.target.blur() } }}
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

async function fetchFromOpenLibrary(title, authorLast) {
  try {
    const q = encodeURIComponent(`${title} ${authorLast || ''}`)
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,author_name,first_publish_year,number_of_pages_median,subject`)
    if (!res.ok) return null
    const data = await res.json()
    const doc = (data.docs || []).find(d =>
      d.author_name?.some(a => a.toLowerCase().includes((authorLast || '').toLowerCase()))
    ) || data.docs?.[0]
    if (!doc?.key) return null

    const subjects = doc.subject || []
    const result = {
      genre: deriveGenre(subjects),
      fiction: deriveFiction(subjects),
      year_published: doc.first_publish_year || null,
      page_count: doc.number_of_pages_median || null,
      summary: null,
      dewey: null,
    }

    const [summaryResult, edRes] = await Promise.all([
      fetchSummaryFromGoogleBooks(title, authorLast),
      fetch(`https://openlibrary.org/works/${doc.key.replace('/works/', '')}/editions.json?limit=10`),
    ])

    result.summary = summaryResult

    if (edRes.ok) {
      const edData = await edRes.json()
      const withDewey = (edData.entries || []).find(e => e.dewey_decimal_class?.length)
      const raw = withDewey?.dewey_decimal_class?.find(d => /^\d/.test(d)) || withDewey?.dewey_decimal_class?.[0]
      if (raw) result.dewey = raw.trim()
    }

    return result
  } catch { return null }
}

export default function BookPage() {
  const { id: bookId } = useParams()
  const navigate = useNavigate()
  const { uid } = useApp()
  const [book, setBook] = useState(null)
  const [ub, setUb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchingDesc, setFetchingDesc] = useState(false)
  const [refreshingSummary, setRefreshingSummary] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)

  useEffect(() => {
    if (!bookId) return
    const load = async () => {
      const { data: b } = await supabase.from('books').select('*').eq('id', bookId).single()
      const { data: u } = await supabase.from('user_books').select('*').eq('user_id', uid).eq('book_id', bookId).single()
      setBook(b)
      setUb(u || {})
      setLoading(false)

      const needsEnrich = b && (!b.summary || !b.genre || b.fiction == null || !b.year_published || !b.page_count)
      if (needsEnrich) {
        setFetchingDesc(true)
        const ol = await fetchFromOpenLibrary(b.title, b.author_last)
        if (ol) {
          const updates = {}
          if (!b.summary && ol.summary)                    updates.summary        = ol.summary
          if (!b.genre && ol.genre)                        updates.genre          = ol.genre
          if (b.fiction == null && ol.fiction != null)     updates.fiction        = ol.fiction
          if (!b.year_published && ol.year_published)      updates.year_published = ol.year_published
          if (!b.page_count && ol.page_count)              updates.page_count     = ol.page_count
          if (!b.dewey && ol.dewey)                        updates.dewey          = ol.dewey
          if (Object.keys(updates).length > 0) {
            await supabase.from('books').update(updates).eq('id', b.id)
            setBook(prev => ({ ...prev, ...updates }))
          }
        }
        setFetchingDesc(false)
      }
    }
    load()
  }, [bookId, uid])

  const refreshSummary = async () => {
    setRefreshingSummary(true)
    const desc = await fetchSummaryFromGoogleBooks(book.title, book.author_last)
    if (desc) {
      await supabase.from('books').update({ summary: desc }).eq('id', bookId)
      setBook(prev => ({ ...prev, summary: desc }))
    }
    setRefreshingSummary(false)
  }

  const handleRemove = async () => {
    await supabase.from('user_books').delete().eq('user_id', uid).eq('book_id', bookId)
    navigate('/library')
  }

  const saveBook = async (field, value) => {
    setBook(prev => ({ ...prev, [field]: value }))
    await supabase.from('books').update({ [field]: value }).eq('id', bookId)
  }

  const saveUb = async (field, value) => {
    setUb(prev => ({ ...prev, [field]: value }))
    await supabase.from('user_books').upsert(
      { user_id: uid, book_id: bookId, status: ub?.status || 'read', [field]: value },
      { onConflict: 'user_id,book_id' }
    )
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
              <p onClick={() => navigate('/author', { state: { authorFirst: book.author_first, authorLast: book.author_last } })} style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 4, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border2)', textUnderlineOffset: 3 }}>{author}</p>
              {book.series && <p style={{ color: 'var(--text3)', fontSize: 13 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <select value={ub?.status || 'read'} onChange={e => saveUb('status', e.target.value)}
                style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 13, color: sc.text, cursor: 'pointer', outline: 'none', fontFamily: 'var(--font-sans)' }}>
                {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Stars rating={ub?.rating} onRate={r => saveUb('rating', r)} />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>About this book</div>
            <button onClick={refreshSummary} disabled={refreshingSummary}
              aria-label="Refresh description"
              title="Refresh description"
              style={{ background: 'none', border: 'none', cursor: refreshingSummary ? 'default' : 'pointer', color: 'var(--text3)', padding: 2, display: 'flex', alignItems: 'center', opacity: refreshingSummary ? 0.4 : 1 }}>
              <RefreshCw size={11} style={{ animation: refreshingSummary ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          {fetchingDesc
            ? <p style={{ color: 'var(--text3)', fontSize: 14, fontStyle: 'italic' }}>Fetching description…</p>
            : book.summary
              ? <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{book.summary}</p>
              : <p style={{ color: 'var(--text3)', fontSize: 14, fontStyle: 'italic', margin: 0 }}>No description found.</p>
          }
        </div>

        {/* Debrief — moved above book details so the most personal content leads */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
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

          <Field label="Memorable passage">
            <TextInput value={ub?.passage} onSave={v => saveUb('passage', v || null)} placeholder="A sentence or paragraph that stays with you…" multiline />
          </Field>

          <Field label="Notes">
            <TextInput value={ub?.notes} onSave={v => saveUb('notes', v || null)} placeholder="Anything you want to remember…" multiline />
          </Field>
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
              <SelectInput value={book.format} options={formats} onSave={v => saveBook('format', v)} placeholder="Select format���" />
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
          </div>
        </div>

        {/* Remove from library */}
        <div style={{ paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          {removeConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>Remove this book from your library?</span>
              <button onClick={() => setRemoveConfirm(false)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleRemove}
                style={{ background: '#2a1515', border: '1px solid #5a2020', borderRadius: 'var(--radius)', padding: '6px 14px', color: '#bf6d6d', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Remove
              </button>
            </div>
          ) : (
            <button onClick={() => setRemoveConfirm(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0 }}>
              <Trash2 size={13} /> Remove from library
            </button>
          )}
        </div>

      </div>
    </Shell>
  )
}
