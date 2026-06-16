import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import * as XLSX from 'xlsx'
import { Search, Grid, List, Download, Star, ChevronLeft, ChevronRight, X } from 'lucide-react'

const PAGE_SIZE = 24

const statusLabels = { read: 'Read', 'want-to-read': 'Want to read', reading: 'Reading', dnf: 'DNF' }
const statusColors = { read: '#7a9e8a', 'want-to-read': '#8a7eb8', reading: '#6a9ab0', dnf: '#b87a5a' }

function Stars({ rating }) {
  if (!rating) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} fill={i <= rating ? 'var(--gold)' : 'none'} color={i <= rating ? 'var(--gold)' : 'var(--text3)'} />
      ))}
    </span>
  )
}

function BookCard({ book, view, onClick }) {
  const [hov, setHov] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
  const ub = book.user_books?.[0]

  if (view === 'list') {
    return (
      <div onClick={onClick} onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: hov ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{author}{book.series ? ` · ${book.series}${book.series_num ? ` #${book.series_num}` : ''}` : ''}</div>
        </div>
        <Stars rating={ub?.rating} />
        {ub?.status && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: (statusColors[ub.status] || 'var(--gold)') + '20', color: statusColors[ub.status] || 'var(--gold)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {statusLabels[ub.status] || ub.status}
          </span>
        )}
      </div>
    )
  }

  return (
    <div onClick={onClick} onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
      style={{ background: hov ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${hov ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '20px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, lineHeight: 1.35, flexGrow: 1 }}>{book.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{author}</div>
      {book.series && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Stars rating={ub?.rating} />
        {ub?.status && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: (statusColors[ub.status] || 'var(--gold)') + '20', color: statusColors[ub.status] || 'var(--gold)' }}>
            {statusLabels[ub.status] || ub.status}
          </span>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

function BookModal({ book, onClose }) {
  const ub = book.user_books?.[0] || {}
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', padding: 32, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, marginBottom: 4, paddingRight: 24 }}>{book.title}</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 4 }}>{author}</p>
        {book.series && <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 4 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</p>}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ub.status && <DetailRow label="Status" value={statusLabels[ub.status] || ub.status} />}
          {ub.rating && <DetailRow label="Rating" value={<Stars rating={ub.rating} />} />}
          {ub.date_read && <DetailRow label="Date read" value={new Date(ub.date_read).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />}
          {ub.one_thing && <DetailRow label="One thing" value={ub.one_thing} />}
          {ub.best_moment && <DetailRow label="Best moment" value={ub.best_moment} />}
          {ub.dragged && <DetailRow label="Dragged" value={ub.dragged} />}
          {ub.give_to && <DetailRow label="Give to" value={ub.give_to} />}
          {ub.compare && <DetailRow label="Reminds me of" value={ub.compare} />}
          {ub.recommend && <DetailRow label="Recommend?" value={{ yes: 'Yes', maybe: 'Maybe', no: 'Probably not' }[ub.recommend] || ub.recommend} />}
        </div>
      </div>
    </div>
  )
}

export default function LibraryPage({ navigate, theme, toggleTheme, session }) {
  const [books, setBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [authors, setAuthors] = useState([])
  const [view, setView] = useState('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const uid = session.user.id

  const load = useCallback(async () => {
    setLoading(true)
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let q = supabase
      .from('books')
      .select('*, user_books!left(status,rating,date_read,one_thing,best_moment,dragged,give_to,compare,recommend)', { count: 'exact' })
      .eq('user_books.user_id', uid)

    if (search) q = q.or(`title.ilike.%${search}%,author_last.ilike.%${search}%,author_first.ilike.%${search}%`)
    if (filterStatus) q = q.eq('user_books.status', filterStatus)
    if (filterRating) q = q.gte('user_books.rating', Number(filterRating))
    if (filterAuthor) q = q.eq('author_last', filterAuthor)

    const { data, count, error } = await q.order('author_last').range(from, to)
    if (!error) { setBooks(data || []); setTotal(count || 0) }
    setLoading(false)
  }, [uid, search, filterStatus, filterRating, filterAuthor, currentPage])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('books').select('author_last').order('author_last').then(({ data }) => {
      const unique = [...new Set((data || []).map(b => b.author_last).filter(Boolean))]
      setAuthors(unique)
    })
  }, [])

  useEffect(() => { setCurrentPage(1) }, [search, filterStatus, filterRating, filterAuthor])

  const exportExcel = async () => {
    const { data } = await supabase
      .from('books')
      .select('*, user_books!left(status,rating,date_read,one_thing,recommend)')
      .eq('user_books.user_id', uid)
      .order('author_last')

    const rows = (data || []).map(b => ({
      Title: b.title,
      'Author First': b.author_first,
      'Author Last': b.author_last,
      Series: b.series || '',
      'Series #': b.series_num || '',
      Status: b.user_books?.[0]?.status || '',
      Rating: b.user_books?.[0]?.rating || '',
      'Date Read': b.user_books?.[0]?.date_read || '',
      'One Thing': b.user_books?.[0]?.one_thing || '',
      Recommend: b.user_books?.[0]?.recommend || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Library')
    XLSX.writeFile(wb, 'sals-library.xlsx')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filterActive = search || filterStatus || filterRating || filterAuthor
  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterRating(''); setFilterAuthor('') }

  const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' }

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>The Library</h1>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>{loading ? '…' : `${total.toLocaleString()} book${total !== 1 ? 's' : ''}`}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              {view === 'grid' ? <List size={15} /> : <Grid size={15} />}
              {view === 'grid' ? 'List view' : 'Grid view'}
            </button>
            <button onClick={exportExcel}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', color: '#0f0e0c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
              <Download size={15} /> Export
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or author…"
              style={{ ...inputStyle, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r}+ stars</option>)}
          </select>
          <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">All authors</option>
            {authors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {filterActive && (
            <button onClick={clearFilters}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Opening the shelves…</div>
        ) : books.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <p style={{ color: 'var(--text3)', fontSize: 15 }}>No books found.</p>
            {filterActive && <button onClick={clearFilters} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 14 }}>Clear filters</button>}
          </div>
        ) : (
          <div style={view === 'grid'
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12 }
            : { display: 'flex', flexDirection: 'column', gap: 6 }}>
            {books.map(book => <BookCard key={book.id} book={book} view={view} onClick={() => setSelected(book)} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: currentPage === 1 ? 'var(--text3)' : 'var(--text)', cursor: currentPage === 1 ? 'default' : 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: currentPage === totalPages ? 'var(--text3)' : 'var(--text)', cursor: currentPage === totalPages ? 'default' : 'pointer' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {selected && <BookModal book={selected} onClose={() => setSelected(null)} />}
    </Shell>
  )
}
