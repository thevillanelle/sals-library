import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { Star, BookMarked, Plus } from 'lucide-react'

function StarRow({ rating }) {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= rating ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

function BookPill({ book, onAdd, added }) {
  const [hov, setHov] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
  return (
    <div onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
      style={{ background: hov ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${hov ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '16px 18px', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, marginBottom: 3, lineHeight: 1.3 }}>{book.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{author}</div>
        {book.series && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</div>}
      </div>
      {!added ? (
        <button onClick={() => onAdd(book)}
          style={{ background: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#0f0e0c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
          <Plus size={12} /> Want
        </button>
      ) : (
        <span style={{ fontSize: 11, color: '#7a9e8a', flexShrink: 0 }}>Added ✓</span>
      )}
    </div>
  )
}

export default function NextReadPage({ navigate, theme, toggleTheme, session }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState({})
  const [empty, setEmpty] = useState(false)

  const uid = session.user.id

  useEffect(() => {
    const load = async () => {
      const { data: readBooks } = await supabase
        .from('user_books')
        .select('rating, books(id, author_first, author_last, series)')
        .eq('user_id', uid)
        .eq('status', 'read')
        .not('rating', 'is', null)

      if (!readBooks?.length) { setEmpty(true); setLoading(false); return }

      const authorRatings = {}
      for (const ub of readBooks) {
        const key = ub.books.author_last || ub.books.author_first || 'Unknown'
        if (!authorRatings[key]) authorRatings[key] = { ratings: [], first: ub.books.author_first, last: ub.books.author_last, readIds: new Set() }
        authorRatings[key].ratings.push(ub.rating)
        authorRatings[key].readIds.add(ub.books.id)
      }

      const topAuthors = Object.entries(authorRatings)
        .map(([last, d]) => ({ last, first: d.first, avg: d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length, readIds: d.readIds }))
        .filter(a => a.avg >= 3.5)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 6)

      if (!topAuthors.length) { setEmpty(true); setLoading(false); return }

      const { data: wantedBooks } = await supabase
        .from('user_books')
        .select('book_id')
        .eq('user_id', uid)

      const ownedIds = new Set((wantedBooks || []).map(ub => ub.book_id))

      const results = await Promise.all(topAuthors.map(async author => {
        const { data: authorBooks } = await supabase
          .from('books')
          .select('id, title, author_first, author_last, series, series_num')
          .eq('author_last', author.last)
          .not('id', 'in', `(${[...author.readIds].join(',')})`)

        const unread = (authorBooks || []).filter(b => !ownedIds.has(b.id))
        if (!unread.length) return null

        return { author, books: unread.slice(0, 4) }
      }))

      setSections(results.filter(Boolean))
      setLoading(false)
    }
    load()
  }, [uid])

  const addToWant = async book => {
    await supabase.from('user_books').upsert({ user_id: uid, book_id: book.id, status: 'want-to-read' }, { onConflict: 'user_id,book_id' })
    setAdded(a => ({ ...a, [book.id]: true }))
  }

  if (loading) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Scanning the shelves…</div>
      </Shell>
    )
  }

  if (empty || !sections.length) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 12 }}>Not enough data yet</div>
          <p style={{ color: 'var(--text2)', marginBottom: 28 }}>Rate a few books and we'll surface what to read next.</p>
          <button onClick={() => navigate('debrief')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500 }}>
            Debrief a book
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>What should I read next?</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Based on your highest-rated authors.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {sections.map(({ author, books }) => (
            <div key={author.last}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#6a9ab018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={16} color="#6a9ab0" fill="#6a9ab0" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{[author.first, author.last].filter(Boolean).join(' ')}</div>
                  <StarRow rating={author.avg} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {books.map(book => <BookPill key={book.id} book={book} onAdd={addToWant} added={!!added[book.id]} />)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 40, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => navigate('library')}
            style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '10px 22px', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <BookMarked size={14} /> Browse the full library
          </button>
        </div>
      </div>
    </Shell>
  )
}
