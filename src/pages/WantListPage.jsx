import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { Search, Plus, Check } from 'lucide-react'
import MarkReadModal from '../components/MarkReadModal'

function BookRow({ book, onMarkRead }) {
  const [hov, setHov] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: hov ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', transition: 'all 0.15s' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{book.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
          {author}
          {book.series && <span style={{ color: 'var(--text3)', marginLeft: 8 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</span>}
          {book.year_published && <span style={{ color: 'var(--text3)', marginLeft: 8 }}>{book.year_published}</span>}
        </div>
        {(book.genre || book.fiction != null) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {book.fiction != null && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, border: '1px solid var(--border2)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{book.fiction ? 'Fiction' : 'Nonfiction'}</span>}
            {book.genre && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--gold-pale)', border: '1px solid var(--gold)', color: 'var(--gold)', letterSpacing: '0.04em' }}>{book.genre}</span>}
          </div>
        )}
      </div>
      <button onClick={() => onMarkRead(book)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: hov ? 'var(--gold)' : 'var(--bg3)', border: `1px solid ${hov ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '7px 14px', color: hov ? '#0f0e0c' : 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: hov ? 500 : 400, transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <Check size={13} /> I read this
      </button>
    </div>
  )
}

export default function WantListPage() {
  const navigate = useNavigate()
  const { session } = useApp()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const uid = session.user.id

  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('books')
      .select('id, title, author_first, author_last, series, series_num, genre, fiction, year_published, user_books!inner(status)')
      .eq('user_books.user_id', uid)
      .eq('user_books.status', 'want-to-read')
      .order('author_last')

    if (debouncedSearch) q = q.or(`title.ilike.%${debouncedSearch}%,author_last.ilike.%${debouncedSearch}%,author_first.ilike.%${debouncedSearch}%`)

    const { data } = await q
    setBooks(data || [])
    setLoading(false)
  }, [uid, debouncedSearch])

  useEffect(() => { load() }, [load])

  return (
    <Shell showBack>
      {modal && (
        <MarkReadModal
          book={modal}
          uid={uid}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>Want to Read</h1>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>{loading ? '…' : `${books.length} book${books.length !== 1 ? 's' : ''} on the list`}</p>
          </div>
          <button onClick={() => navigate('/add-want')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            <Plus size={15} /> Add a book
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your list…"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: 40, paddingLeft: 36, paddingRight: 16, color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Loading your list…</div>
        ) : books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <p style={{ color: 'var(--text3)', fontSize: 15, marginBottom: 20 }}>{search ? 'No books match that search.' : 'Nothing on the list yet.'}</p>
            {!search && (
              <button onClick={() => navigate('/add-want')}
                style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                Add your first book
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {books.map(book => (
              <BookRow key={book.id} book={book} onMarkRead={setModal} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
