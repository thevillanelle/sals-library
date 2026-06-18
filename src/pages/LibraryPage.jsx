import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import * as XLSX from 'xlsx'
import { Search, Grid, List, Download, Star, ChevronLeft, ChevronRight, X, Layers, ArrowUpDown } from 'lucide-react'

const statusLabels = { read: 'Read', 'want-to-read': 'Want to read', reading: 'Reading', dnf: 'DNF' }
const statusColors = { read: '#7a9e8a', 'want-to-read': '#8a7eb8', reading: '#6a9ab0', dnf: '#b87a5a' }
const PAGE_SIZE = 24

const SORT_OPTIONS = [
  { value: 'author_asc',  label: 'Author A → Z' },
  { value: 'author_desc', label: 'Author Z → A' },
  { value: 'title_asc',   label: 'Title A → Z' },
  { value: 'title_desc',  label: 'Title Z → A' },
  { value: 'rating_desc', label: 'Rating ↓' },
  { value: 'rating_asc',  label: 'Rating ↑' },
  { value: 'series_asc',  label: 'Series A → Z' },
]

function Stars({ rating }) {
  if (!rating) return null
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={10} fill={i <= rating ? 'var(--gold)' : 'none'} color={i <= rating ? 'var(--gold)' : 'var(--text3)'} />
      ))}
    </span>
  )
}

function SeriesPill({ series, num }) {
  if (!series) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--gold)', color: 'var(--gold)', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {series}{num ? ` #${num}` : ''}
    </span>
  )
}

function BookCard({ book, view, onClick }) {
  const [flipped, setFlipped] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
  const ub = book.user_books?.[0]

  if (view === 'list') {
    const [hov, setHov] = useState(false)
    return (
      <div onClick={onClick} onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: hov ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: ub?.rating ? 'var(--gold)' : 'var(--border)', flexShrink: 0, opacity: ub?.rating ? 0.7 : 0.3 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{book.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{author}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <SeriesPill series={book.series} num={book.series_num} />
          <Stars rating={ub?.rating} />
        </div>
      </div>
    )
  }

  const accentColor = ub?.rating ? 'var(--gold)' : 'var(--border)'
  const accentOpacity = ub?.rating ? 0.8 : 0.25

  const faceStyle = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: 'var(--radius-lg)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    background: 'var(--bg2)',
    border: `1px solid var(--border)`,
  }

  return (
    <div
      onClick={() => flipped ? onClick() : setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      style={{ perspective: 1000, cursor: 'pointer', minHeight: 160 }}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%', minHeight: 160,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.45s cubic-bezier(0.4,0.2,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* FRONT */}
        <div style={faceStyle}>
          <div style={{ height: 3, background: accentColor, opacity: accentOpacity }} />
          <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{book.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', letterSpacing: '0.01em' }}>{author}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Stars rating={ub?.rating} />
              <SeriesPill series={book.series} num={book.series_num} />
            </div>
            {ub?.one_thing && (
              <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                "{ub.one_thing}"
              </div>
            )}
          </div>
        </div>

        {/* BACK */}
        <div style={{ ...faceStyle, transform: 'rotateY(180deg)', background: 'var(--bg3)', border: `1px solid var(--gold)`, justifyContent: 'space-between' }}>
          <div style={{ height: 3, background: 'var(--gold)', opacity: 0.6 }} />
          <div style={{ padding: '14px 14px 0', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: 6, opacity: 0.8 }}>{book.title}</div>
            {book.summary
              ? <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 7, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>{book.summary}</p>
              : <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', margin: 0 }}>No description available.</p>
            }
          </div>
          <div style={{ padding: '10px 14px 12px', fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>click to open</div>
        </div>
      </div>
    </div>
  )
}

function SeriesGroup({ seriesName, books, view, onSelect }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 24 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 10, padding: 0, width: '100%', textAlign: 'left' }}>
        <div style={{ height: 1, background: 'var(--border)', flexGrow: 1 }} />
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--gold)', whiteSpace: 'nowrap', padding: '0 12px' }}>
          {seriesName} <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>({books.length})</span>
        </span>
        <div style={{ height: 1, background: 'var(--border)', flexGrow: 1 }} />
        <span style={{ color: 'var(--text3)', fontSize: 11, paddingLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={view === 'grid'
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12 }
          : { display: 'flex', flexDirection: 'column', gap: 6 }}>
          {books.map(book => <BookCard key={book.id} book={book} view={view} onClick={() => onSelect(book)} />)}
        </div>
      )}
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
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, marginBottom: 4, paddingRight: 24 }}>{book.title}</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 4 }}>{author}</p>
        {book.series && <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 4 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</p>}
        {book.summary && (
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginTop: 12 }}>{book.summary}</p>
        )}
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

function seriesKey(b) {
  // Within an author, series books sort before standalones, then by series name + number
  if (!b.series) return '￿' // standalones last
  return b.series + String(Number(b.series_num) || 0).padStart(6, '0')
}

function sortBooks(books, sortKey) {
  const sorted = [...books]
  switch (sortKey) {
    case 'author_asc':
      return sorted.sort((a, b) =>
        (a.author_last || '').localeCompare(b.author_last || '') ||
        (a.author_first || '').localeCompare(b.author_first || '') ||
        seriesKey(a).localeCompare(seriesKey(b)) ||
        a.title.localeCompare(b.title))
    case 'author_desc':
      return sorted.sort((a, b) =>
        (b.author_last || '').localeCompare(a.author_last || '') ||
        (b.author_first || '').localeCompare(a.author_first || '') ||
        seriesKey(a).localeCompare(seriesKey(b)) ||
        a.title.localeCompare(b.title))
    case 'title_asc':   return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'title_desc':  return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'rating_desc': return sorted.sort((a, b) => (b.user_books?.[0]?.rating || 0) - (a.user_books?.[0]?.rating || 0) || a.title.localeCompare(b.title))
    case 'rating_asc':  return sorted.sort((a, b) => (a.user_books?.[0]?.rating || 0) - (b.user_books?.[0]?.rating || 0) || a.title.localeCompare(b.title))
    case 'series_asc':  return sorted.sort((a, b) => (a.series || 'zzz').localeCompare(b.series || 'zzz') || (Number(a.series_num) || 0) - (Number(b.series_num) || 0))
    default: return sorted
  }
}

function groupBySeries(books) {
  const seriesMap = {}
  const standalone = []
  for (const book of books) {
    if (book.series) {
      if (!seriesMap[book.series]) seriesMap[book.series] = []
      seriesMap[book.series].push(book)
    } else {
      standalone.push(book)
    }
  }
  // Sort books within each series by series_num
  for (const s of Object.keys(seriesMap)) {
    seriesMap[s].sort((a, b) => (Number(a.series_num) || 0) - (Number(b.series_num) || 0))
  }
  // Sort series names A-Z
  const sortedSeries = Object.keys(seriesMap).sort((a, b) => a.localeCompare(b))
  return { seriesMap, sortedSeries, standalone }
}

export default function LibraryPage({ navigate, theme, toggleTheme, session }) {
  const [allBooks, setAllBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [authors, setAuthors] = useState([])
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState('author_asc')
  const [groupSeries, setGroupSeries] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const uid = session.user.id

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('books')
      .select('*, user_books!left(status,rating,date_read,one_thing,best_moment,dragged,give_to,compare,recommend)', { count: 'exact' })
      .eq('user_books.user_id', uid)

    if (search) q = q.or(`title.ilike.%${search}%,author_last.ilike.%${search}%,author_first.ilike.%${search}%,series.ilike.%${search}%`)
    if (filterStatus) q = q.eq('user_books.status', filterStatus)
    if (filterRating) q = q.gte('user_books.rating', Number(filterRating))
    if (filterAuthor) q = q.eq('author_last', filterAuthor)

    const { data, count, error } = await q.order('author_last').limit(2000)
    if (!error) { setAllBooks(data || []); setTotal(count || 0) }
    setLoading(false)
  }, [uid, search, filterStatus, filterRating, filterAuthor])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('books').select('author_last').order('author_last').then(({ data }) => {
      setAuthors([...new Set((data || []).map(b => b.author_last).filter(Boolean))])
    })
  }, [])

  useEffect(() => { setCurrentPage(1) }, [search, filterStatus, filterRating, filterAuthor, sort, groupSeries])

  const sorted = sortBooks(allBooks, sort)

  // Paginate only when not grouping by series
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = groupSeries ? sorted : sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const { seriesMap, sortedSeries, standalone } = groupBySeries(paginated)

  const exportExcel = async () => {
    const rows = sorted.map(b => ({
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

  const filterActive = search || filterStatus || filterRating || filterAuthor
  const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterRating(''); setFilterAuthor('') }

  const chipSelect = (value, onChange, placeholder, options, colored) => (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', background: 'none', border: 'none', outline: 'none',
          color: (colored && value) ? 'var(--gold)' : 'var(--text2)',
          fontSize: 13, cursor: 'pointer', paddingRight: 16, paddingLeft: 0,
          fontFamily: 'var(--font-sans)',
        }}>
        {options}
      </select>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ position: 'absolute', right: 0, pointerEvents: 'none', color: (colored && value) ? 'var(--gold)' : 'var(--text3)' }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )

  const iconBtnStyle = (active) => ({
    background: active ? 'var(--gold-pale)' : 'transparent',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    width: 34, height: 34,
    color: active ? 'var(--gold)' : 'var(--text3)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
    flexShrink: 0,
  })

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>The Library</h1>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>{loading ? '…' : `${total.toLocaleString()} book${total !== 1 ? 's' : ''}`}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setGroupSeries(g => !g)} title="Group by series" style={iconBtnStyle(groupSeries)}>
              <Layers size={14} />
            </button>
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} title={view === 'grid' ? 'List view' : 'Grid view'} style={iconBtnStyle(false)}>
              {view === 'grid' ? <List size={14} /> : <Grid size={14} />}
            </button>
            <button onClick={exportExcel} title="Export to Excel"
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', width: 34, height: 34, color: '#0f0e0c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Download size={14} />
            </button>
          </div>
        </div>

        {/* Search row */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, or series…"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: 40, paddingLeft: 36, paddingRight: 16, color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
        </div>

        {/* Filter pill row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 16px', height: 38, overflowX: 'auto' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 10, flexShrink: 0 }}>Sort</span>
          {chipSelect(sort, setSort, 'Sort', SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>), false)}

          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 14px', flexShrink: 0 }} />

          <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 10, flexShrink: 0 }}>Status</span>
          {chipSelect(filterStatus, setFilterStatus, 'Status',
            <><option value="">All</option>{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</>, true)}

          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 14px', flexShrink: 0 }} />

          <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 10, flexShrink: 0 }}>Rating</span>
          {chipSelect(filterRating, setFilterRating, 'Rating',
            <><option value="">Any</option>{[3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)}+</option>)}</>, true)}

          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 14px', flexShrink: 0 }} />

          <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 10, flexShrink: 0 }}>Author</span>
          {chipSelect(filterAuthor, setFilterAuthor, 'Author',
            <><option value="">All</option>{authors.map(a => <option key={a} value={a}>{a}</option>)}</>, true)}

          {filterActive && (
            <>
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 14px', flexShrink: 0 }} />
              <button onClick={clearFilters}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0, flexShrink: 0 }}>
                <X size={12} /> Clear
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Opening the shelves…</div>
        ) : allBooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <p style={{ color: 'var(--text3)', fontSize: 15 }}>No books found.</p>
            {filterActive && <button onClick={clearFilters} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 14 }}>Clear filters</button>}
          </div>
        ) : groupSeries ? (
          <div>
            {sortedSeries.map(s => (
              <SeriesGroup key={s} seriesName={s} books={seriesMap[s]} view={view} onSelect={setSelected} />
            ))}
            {standalone.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ height: 1, background: 'var(--border)', flexGrow: 1 }} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--text3)', whiteSpace: 'nowrap', padding: '0 12px' }}>
                    Standalone <span style={{ fontSize: 12 }}>({standalone.length})</span>
                  </span>
                  <div style={{ height: 1, background: 'var(--border)', flexGrow: 1 }} />
                </div>
                <div style={view === 'grid'
                  ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12 }
                  : { display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {standalone.map(book => <BookCard key={book.id} book={book} view={view} onClick={() => setSelected(book)} />)}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={view === 'grid'
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12 }
            : { display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paginated.map(book => <BookCard key={book.id} book={book} view={view} onClick={() => setSelected(book)} />)}
          </div>
        )}

        {!groupSeries && totalPages > 1 && (
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
