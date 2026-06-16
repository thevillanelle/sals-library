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
      {[1, 2, 3].map(i => (
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
        style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 16px', background: hov ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{book.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: ub?.one_thing ? 4 : 0 }}>
            {author}{book.series ? ` · ${book.series}${book.series_num ? ` #${book.series_num}` : ''}` : ''}
          </div>
          {ub?.one_thing && (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{ub.one_thing}"
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Stars rating={ub?.rating} />
          {ub?.status && (
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: (statusColors[ub.status] || 'var(--gold)') + '20', color: statusColors[ub.status] || 'var(--gold)', whiteSpace: 'nowrap' }}>
              {statusLabels[ub.status] || ub.status}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClick} onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
      style={{ background: hov ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${hov ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '20px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{book.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{author}</div>
      {book.series && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</div>}
      {ub?.one_thing && (
        <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 2 }}>
          "{ub.one_thing}"
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 }}>
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

function sortBooks(books, sortKey) {
  const sorted = [...books]
  switch (sortKey) {
    case 'author_asc':  return sorted.sort((a, b) => (a.author_last || '').localeCompare(b.author_last || '') || (a.author_first || '').localeCompare(b.author_first || '') || a.title.localeCompare(b.title))
    case 'author_desc': return sorted.sort((a, b) => (b.author_last || '').localeCompare(a.author_last || '') || a.title.localeCompare(b.title))
    case 'title_asc':   return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'title_desc':  return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'rating_desc': return sorted.sort((a, b) => (b.user_books?.[0]?.rating || 0) - (a.user_books?.[0]?.rating || 0) || a.title.localeCompare(b.title))
    case 'rating_asc':  return sorted.sort((a, b) => (a.user_books?.[0]?.rating || 0) - (b.user_books?.[0]?.rating || 0) || a.title.localeCompare(b.title))
    case 'series_asc':  return sorted.sort((a, b) => (a.series || 'zzz').localeCompare(b.series || 'zzz') || (a.series_num || 0) - (b.series_num || 0))
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
    seriesMap[s].sort((a, b) => (a.series_num || 0) - (b.series_num || 0))
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

  const selectStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0 32px 0 12px',
    height: 38,
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    flexShrink: 0,
  }

  const iconBtnStyle = (active) => ({
    background: active ? 'var(--gold-pale)' : 'var(--bg2)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    width: 38, height: 38,
    color: active ? 'var(--gold)' : 'var(--text3)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
    flexShrink: 0,
  })

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>The Library</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>{loading ? '…' : `${total.toLocaleString()} book${total !== 1 ? 's' : ''}`}</p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: 38, paddingLeft: 32, paddingRight: 12, color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Status */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, minWidth: 110, color: filterStatus ? 'var(--gold)' : 'var(--text)', borderColor: filterStatus ? 'var(--gold)' : 'var(--border)' }}>
            <option value="">Status</option>
            {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {/* Rating */}
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)} style={{ ...selectStyle, minWidth: 100, color: filterRating ? 'var(--gold)' : 'var(--text)', borderColor: filterRating ? 'var(--gold)' : 'var(--border)' }}>
            <option value="">Rating</option>
            {[3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)}+</option>)}
          </select>

          {/* Author */}
          <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} style={{ ...selectStyle, minWidth: 130, color: filterAuthor ? 'var(--gold)' : 'var(--text)', borderColor: filterAuthor ? 'var(--gold)' : 'var(--border)' }}>
            <option value="">Author</option>
            {authors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

          {/* By series toggle */}
          <button onClick={() => setGroupSeries(g => !g)} title="Group by series" style={iconBtnStyle(groupSeries)}>
            <Layers size={15} />
          </button>

          {/* Grid / List toggle */}
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} title={view === 'grid' ? 'List view' : 'Grid view'} style={iconBtnStyle(false)}>
            {view === 'grid' ? <List size={15} /> : <Grid size={15} />}
          </button>

          {/* Export */}
          <button onClick={exportExcel} title="Export to Excel"
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', width: 38, height: 38, color: '#0f0e0c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Download size={15} />
          </button>

          {filterActive && (
            <button onClick={clearFilters} title="Clear filters"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: 38, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: 13, flexShrink: 0 }}>
              <X size={13} /> Clear
            </button>
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
