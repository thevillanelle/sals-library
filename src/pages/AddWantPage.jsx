import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { Search, Plus, Check, BookMarked } from 'lucide-react'

export default function AddWantPage({ navigate, theme, toggleTheme, session }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [newBook, setNewBook] = useState({ title: '', author_first: '', author_last: '', series: '', series_num: '' })

  const uid = session.user.id

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    setNoMatch(false)
    const { data } = await supabase.from('books')
      .select('id,title,author_first,author_last,series,series_num')
      .or(`title.ilike.%${query}%,author_last.ilike.%${query}%`)
      .limit(10)
    setSearching(false)
    setResults(data || [])
    if ((data || []).length === 0) setNoMatch(true)
  }

  const handleKey = e => { if (e.key === 'Enter') search() }

  const save = async () => {
    setSaving(true)
    let bookId = selected?.id

    if (!bookId) {
      const { data: inserted } = await supabase.from('books')
        .insert({ title: newBook.title.trim(), author_first: newBook.author_first.trim() || null, author_last: newBook.author_last.trim() || null, series: newBook.series.trim() || null, series_num: newBook.series_num ? Number(newBook.series_num) : null })
        .select('id')
        .single()
      bookId = inserted?.id
    }

    if (bookId) {
      await supabase.from('user_books').upsert({ user_id: uid, book_id: bookId, status: 'want-to-read' }, { onConflict: 'user_id,book_id' })
    }

    setSaving(false)
    setDone(true)
  }

  const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }

  if (done) {
    const title = selected?.title || newBook.title
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#7a9e8a20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Check size={28} color="#7a9e8a" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Added to the list</h2>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 32, fontStyle: 'italic' }}>"{title}"</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setDone(false); setSelected(null); setQuery(''); setResults([]); setNoMatch(false); setNewBook({ title: '', author_first: '', author_last: '', series: '', series_num: '' }) }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '12px 24px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
              Add another
            </button>
            <button onClick={() => navigate('home')}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', color: '#0f0e0c', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              Back home
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>A book I want</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Search the library, or add something new.</p>
        </div>

        {!selected && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
                  placeholder="Search by title or author…"
                  style={{ ...inputStyle, paddingLeft: 38 }} />
              </div>
              <button onClick={search} disabled={searching || !query.trim()}
                style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', opacity: (!query.trim()) ? 0.5 : 1 }}>
                {searching ? '…' : 'Search'}
              </button>
            </div>

            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
                {results.map(b => {
                  const author = [b.author_first, b.author_last].filter(Boolean).join(' ')
                  return (
                    <button key={b.id} onClick={() => setSelected(b)}
                      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--bg2)'}>
                      <BookMarked size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>{b.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{author}{b.series ? ` · ${b.series}${b.series_num ? ` #${b.series_num}` : ''}` : ''}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {noMatch && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24 }}>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>Not in the library yet. Add it:</p>
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
              </div>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>Add this to your want-to-read list?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setSelected(null); setResults([]) }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 20px', color: 'var(--text2)', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
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
