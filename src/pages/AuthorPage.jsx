import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { Star } from 'lucide-react'

const STATUS_STYLE = {
  read:          { bg: '#1a3a1a', border: '#2d6b2d', text: '#6dbf6d', label: 'Read' },
  reading:       { bg: '#1a2f3a', border: '#2d5a6b', text: '#6daebf', label: 'Reading' },
  'want-to-read':{ bg: '#2a2515', border: '#5a4d1a', text: '#c4a84a', label: 'Want' },
}

export default function AuthorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { uid } = useApp()
  const { authorFirst, authorLast } = location.state || {}

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authorLast) { navigate('/library'); return }
    supabase.from('books')
      .select('id,title,author_first,author_last,series,series_num,genre,fiction,user_books!inner(status,rating,one_thing,date_read)')
      .eq('author_last', authorLast)
      .eq('user_books.user_id', uid)
      .order('series', { ascending: true, nullsFirst: false })
      .order('series_num', { ascending: true })
      .order('title', { ascending: true })
      .then(({ data }) => { setBooks(data || []); setLoading(false) })
  }, [authorLast, uid])

  if (loading) return <Shell showBack><div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Loading…</div></Shell>

  const authorName = [authorFirst, authorLast].filter(Boolean).join(' ')
  const read = books.filter(b => b.user_books?.[0]?.status === 'read')
  const ratings = read.map(b => b.user_books?.[0]?.rating).filter(Boolean)
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null
  const quotes = books.map(b => b.user_books?.[0]?.one_thing).filter(Boolean)

  // Group by series, then standalone
  const seriesMap = {}
  const standalone = []
  books.forEach(b => {
    if (b.series) {
      if (!seriesMap[b.series]) seriesMap[b.series] = []
      seriesMap[b.series].push(b)
    } else {
      standalone.push(b)
    }
  })

  const BookRow = ({ book }) => {
    const [hov, setHov] = useState(false)
    const ub = book.user_books?.[0]
    const sc = STATUS_STYLE[ub?.status]
    return (
      <div onClick={() => navigate('/book/' + book.id)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: hov ? 'var(--bg3)' : 'transparent', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'background 0.15s' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500 }}>{book.title}</div>
          {ub?.one_thing && (
            <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>"{ub.one_thing}"</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {ub?.rating && <span style={{ fontSize: 12, color: 'var(--gold)' }}>{'★'.repeat(ub.rating)}</span>}
          {sc && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{sc.label}</span>}
        </div>
      </div>
    )
  }

  return (
    <Shell showBack backPage="/library">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Author header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Author</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 400, marginBottom: 20, lineHeight: 1.1 }}>{authorLast}{authorFirst ? `, ${authorFirst}` : ''}</h1>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'In the library', value: books.length },
              { label: 'Read', value: read.length },
              { label: 'Avg rating', value: avgRating ? `${avgRating} ★` : '—' },
              { label: 'Series', value: Object.keys(seriesMap).length },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 18px', minWidth: 100 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote from their work */}
        {quotes.length > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderLeft: '3px solid var(--gold)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>What you remember</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.6 }}>
              "{quotes[Math.floor(Math.random() * quotes.length)]}"
            </div>
          </div>
        )}

        {/* Series */}
        {Object.entries(seriesMap).map(([seriesName, seriesBooks]) => (
          <div key={seriesName} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{seriesName}</div>
              <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{seriesBooks.length} books</div>
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {seriesBooks.map((book, i) => (
                <div key={book.id} style={{ borderBottom: i < seriesBooks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <BookRow book={book} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Standalone */}
        {standalone.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Standalone</div>
              <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {standalone.map((book, i) => (
                <div key={book.id} style={{ borderBottom: i < standalone.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <BookRow book={book} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
