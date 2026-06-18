import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { Search, Plus, Check, BookMarked, Globe } from 'lucide-react'

const GENRE_KEYWORDS = [
  ['Science Fiction',    ['science fiction', 'sci-fi', 'space opera', 'cyberpunk', 'dystopian']],
  ['Fantasy',            ['fantasy', 'magic', 'dragons', 'wizards', 'sword and sorcery']],
  ['Horror',             ['horror', 'supernatural fiction', 'ghost stories']],
  ['Mystery',            ['mystery', 'detective', 'whodunit', 'noir']],
  ['Thriller',           ['thriller', 'suspense', 'espionage', 'spy']],
  ['Crime',              ['crime', 'murder', 'heist', 'true crime']],
  ['Historical Fiction', ['historical fiction', 'historical novel']],
  ['Literary Fiction',   ['literary fiction', 'psychological fiction']],
  ['Biography',          ['biography', 'autobiography', 'memoir', 'personal memoirs']],
  ['History',            ['history', 'world war', 'civil war', 'military history']],
  ['Science',            ['science', 'natural history', 'evolution', 'physics', 'biology']],
  ['Adventure',          ['adventure', 'survival', 'exploration']],
  ['Western',            ['western stories', 'frontier']],
  ['Romance',            ['romance', 'love stories']],
  ['Classic',            ['classics', '19th century fiction', 'victorian']],
]

function deriveGenre(subjects) {
  const lower = subjects.map(s => s.toLowerCase())
  for (const [genre, keywords] of GENRE_KEYWORDS) {
    if (keywords.some(k => lower.some(s => s.includes(k)))) return genre
  }
  return null
}

function deriveFiction(subjects) {
  const lower = subjects.join(' ').toLowerCase()
  if (/\bnonfiction\b|non-fiction|biography|autobiography|memoir|history|true crime|science|essays/.test(lower)) return false
  if (/\bfiction\b|novel|stories/.test(lower)) return true
  return null
}

async function searchOpenLibrary(query) {
  try {
    const q = encodeURIComponent(query)
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=8&fields=key,title,author_name,first_publish_year,number_of_pages_median,subject`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs || []).map(d => ({
      _olKey: d.key,
      _subjects: d.subject || [],
      title: d.title,
      author_first: d.author_name?.[0]?.split(' ').slice(0, -1).join(' ') || '',
      author_last: d.author_name?.[0]?.split(' ').slice(-1)[0] || d.author_name?.[0] || '',
      year_published: d.first_publish_year || null,
      page_count: d.number_of_pages_median || null,
    }))
  } catch { return [] }
}

async function enrichFromOpenLibrary(olKey, subjects) {
  const genre = deriveGenre(subjects)
  const fiction = deriveFiction(subjects)

  let dewey = null
  let summary = null

  try {
    const workId = olKey.replace('/works/', '')
    const [edRes, workRes] = await Promise.all([
      fetch(`https://openlibrary.org/works/${workId}/editions.json?limit=10`),
      fetch(`https://openlibrary.org${olKey}.json`),
    ])
    if (edRes.ok) {
      const edData = await edRes.json()
      const withDewey = (edData.entries || []).find(e => e.dewey_decimal_class?.length)
      const raw = withDewey?.dewey_decimal_class?.find(d => /^\d/.test(d)) || withDewey?.dewey_decimal_class?.[0]
      if (raw) dewey = raw.trim()
    }
    if (workRes.ok) {
      const workData = await workRes.json()
      const desc = workData.description
      if (desc) summary = typeof desc === 'string' ? desc : desc.value || null
    }
  } catch { /* best effort */ }

  return { genre, fiction, dewey, summary }
}

export default function AddWantPage() {
  const navigate = useNavigate()
  const { session } = useApp()
  const [query, setQuery] = useState('')
  const [localResults, setLocalResults] = useState([])
  const [olResults, setOlResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [newBook, setNewBook] = useState({ title: '', author_first: '', author_last: '', series: '', series_num: '' })

  const uid = session.user.id

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setLocalResults([])
    setOlResults([])
    setShowManual(false)

    const [{ data: local }, ol] = await Promise.all([
      supabase.from('books')
        .select('id,title,author_first,author_last,series,series_num')
        .or(`title.ilike.%${query}%,author_last.ilike.%${query}%`)
        .limit(8),
      searchOpenLibrary(query),
    ])

    setLocalResults(local || [])
    // Only show OL results not already in local
    const localTitles = new Set((local || []).map(b => b.title.toLowerCase()))
    setOlResults(ol.filter(b => !localTitles.has(b.title.toLowerCase())))
    setSearching(false)
  }

  const handleKey = e => { if (e.key === 'Enter') search() }

  const save = async () => {
    setSaving(true)
    let bookId = selected?.id

    if (!bookId) {
      let payload
      if (selected?._olKey) {
        const enriched = await enrichFromOpenLibrary(selected._olKey, selected._subjects || [])
        payload = {
          title: selected.title,
          author_first: selected.author_first || null,
          author_last: selected.author_last || null,
          year_published: selected.year_published || null,
          page_count: selected.page_count || null,
          genre: enriched.genre || null,
          fiction: enriched.fiction,
          dewey: enriched.dewey || null,
          summary: enriched.summary || null,
        }
      } else {
        payload = { title: newBook.title.trim(), author_first: newBook.author_first.trim() || null, author_last: newBook.author_last.trim() || null, series: newBook.series.trim() || null, series_num: newBook.series_num ? Number(newBook.series_num) : null }
      }

      const { data: inserted } = await supabase.from('books').insert(payload).select('id').single()
      bookId = inserted?.id
    }

    if (bookId) {
      await supabase.from('user_books').upsert({ user_id: uid, book_id: bookId, status: 'want-to-read' }, { onConflict: 'user_id,book_id' })
    }

    setSaving(false)
    setDone(true)
  }

  const reset = () => { setDone(false); setSelected(null); setQuery(''); setLocalResults([]); setOlResults([]); setShowManual(false); setNewBook({ title: '', author_first: '', author_last: '', series: '', series_num: '' }) }

  const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }

  if (done) {
    const title = selected?.title || newBook.title
    return (
      <Shell showBack>
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#7a9e8a20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Check size={28} color="#7a9e8a" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Added to the list</h2>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 32, fontStyle: 'italic' }}>"{title}"</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={reset} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '12px 24px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>Add another</button>
            <button onClick={() => navigate('/')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', color: '#0f0e0c', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Back home</button>
          </div>
        </div>
      </Shell>
    )
  }

  const ResultRow = ({ book, icon, onPick }) => {
    const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
    return (
      <button onClick={() => onPick(book)}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, width: '100%', transition: 'background 0.15s' }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--bg3)'}
        onMouseOut={e => e.currentTarget.style.background = 'var(--bg2)'}>
        {icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>{book.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {author}
            {book.series ? ` · ${book.series}${book.series_num ? ` #${book.series_num}` : ''}` : ''}
            {book.year_published ? ` · ${book.year_published}` : ''}
          </div>
        </div>
      </button>
    )
  }

  return (
    <Shell showBack>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>A book I want</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Search the library or the whole internet.</p>
        </div>

        {!selected && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
                  placeholder="Search by title or author…"
                  style={{ ...inputStyle, paddingLeft: 38 }} />
              </div>
              <button onClick={search} disabled={searching || !query.trim()}
                style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', opacity: !query.trim() ? 0.5 : 1 }}>
                {searching ? '…' : 'Search'}
              </button>
            </div>

            {localResults.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 8 }}>In your library</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {localResults.map(b => <ResultRow key={b.id} book={b} icon={<BookMarked size={16} color="var(--gold)" style={{ flexShrink: 0 }} />} onPick={setSelected} />)}
                </div>
              </div>
            )}

            {olResults.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 8 }}>From the web</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {olResults.map((b, i) => <ResultRow key={i} book={b} icon={<Globe size={16} color="var(--text3)" style={{ flexShrink: 0 }} />} onPick={setSelected} />)}
                </div>
              </div>
            )}

            {(localResults.length > 0 || olResults.length > 0) && (
              <button onClick={() => setShowManual(m => !m)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 16 }}>
                Not seeing it? Add manually
              </button>
            )}

            {(showManual || (query && localResults.length === 0 && olResults.length === 0 && !searching)) && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>Add it manually:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={newBook.title} onChange={e => setNewBook(b => ({ ...b, title: e.target.value }))} placeholder="Title *" style={inputStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input value={newBook.author_first} onChange={e => setNewBook(b => ({ ...b, author_first: e.target.value }))} placeholder="Author first name" style={inputStyle} />
                    <input value={newBook.author_last} onChange={e => setNewBook(b => ({ ...b, author_last: e.target.value }))} placeholder="Author last name" style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <input value={newBook.series} onChange={e => setNewBook(b => ({ ...b, series: e.target.value }))} placeholder="Series (optional)" style={inputStyle} />
                    <input value={newBook.series_num} onChange={e => setNewBook(b => ({ ...b, series_num: e.target.value }))} placeholder="#" type="number" style={inputStyle} />
                  </div>
                  <button onClick={save} disabled={saving || !newBook.title.trim()}
                    style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !newBook.title.trim() ? 0.5 : 1 }}>
                    <Plus size={16} /> {saving ? 'Adding…' : 'Add to want list'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {selected && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#7a9e8a18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookMarked size={18} color="#7a9e8a" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginBottom: 2 }}>{selected.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{[selected.author_first, selected.author_last].filter(Boolean).join(' ')}</div>
                {selected.series && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{selected.series}{selected.series_num ? ` #${selected.series_num}` : ''}</div>}
                {selected.year_published && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{selected.year_published}{selected.page_count ? ` · ${selected.page_count} pages` : ''}</div>}
              </div>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>Add this to your want-to-read list?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 20px', color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{ background: '#7a9e8a', border: 'none', borderRadius: 'var(--radius)', padding: '10px 24px', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={15} /> {saving ? 'Adding…' : 'Add to list'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
