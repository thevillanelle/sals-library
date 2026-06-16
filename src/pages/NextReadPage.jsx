import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { Star, BookMarked, BookPlus } from 'lucide-react'

function Stars({ rating }) {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= rating ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

function BookPill({ book, authorAvg }) {
  const [hov, setHov] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
  return (
    <div onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
      style={{ background: hov ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${hov ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '16px 18px', transition: 'all 0.15s' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, marginBottom: 3, lineHeight: 1.3 }}>{book.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{author}</div>
      {book.series && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</div>}
    </div>
  )
}

export default function NextReadPage({ navigate, theme, toggleTheme, session }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)

  const uid = session.user.id

  useEffect(() => {
    const load = async () => {
      // Get want-to-read books with their book details
      const { data: wantBooks } = await supabase
        .from('user_books')
        .select('book_id, books(id, title, author_first, author_last, series, series_num)')
        .eq('user_id', uid)
        .eq('status', 'want-to-read')

      if (!wantBooks?.length) { setEmpty(true); setLoading(false); return }

      // Get avg rating per author from read books
      const { data: readBooks } = await supabase
        .from('user_books')
        .select('rating, books(author_last, author_first)')
        .eq('user_id', uid)
        .eq('status', 'read')
        .not('rating', 'is', null)

      const authorAvgs = {}
      for (const ub of (readBooks || [])) {
        if (!ub.books) continue
        const key = ub.books.author_last || ub.books.author_first || ''
        if (!authorAvgs[key]) authorAvgs[key] = []
        authorAvgs[key].push(ub.rating)
      }
      const avgMap = {}
      for (const [k, ratings] of Object.entries(authorAvgs)) {
        avgMap[k] = ratings.reduce((a, b) => a + b, 0) / ratings.length
      }

      // Group want-to-read books by author
      const byAuthor = {}
      for (const ub of wantBooks) {
        if (!ub.books) continue
        const b = ub.books
        const key = b.author_last || b.author_first || 'Unknown'
        if (!byAuthor[key]) byAuthor[key] = { books: [], first: b.author_first, last: b.author_last, avg: avgMap[key] || null }
        byAuthor[key].books.push(b)
      }

      // Sort authors by avg rating desc, then alphabetically
      const sorted = Object.entries(byAuthor)
        .sort(([, a], [, b]) => (b.avg || 0) - (a.avg || 0) || (a.last || '').localeCompare(b.last || ''))
        .map(([, d]) => d)

      setSections(sorted)
      setLoading(false)
    }
    load()
  }, [uid])

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
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <BookPlus size={28} color="var(--gold)" />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 12 }}>Nothing on the list yet</div>
          <p style={{ color: 'var(--text2)', marginBottom: 28 }}>Add books you want to read and they'll show up here, sorted by your favorite authors.</p>
          <button onClick={() => navigate('add-want')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500 }}>
            Add a book
          </button>
        </div>
      </Shell>
    )
  }

  const total = sections.reduce((n, s) => n + s.books.length, 0)

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>What to read next</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>{total} book{total !== 1 ? 's' : ''} on the list · sorted by your favorite authors</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {sections.map((section, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#6a9ab018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={16} color="#6a9ab0" fill="#6a9ab0" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{[section.first, section.last].filter(Boolean).join(' ')}</div>
                  {section.avg ? <Stars rating={section.avg} /> : <span style={{ fontSize: 12, color: 'var(--text3)' }}>No ratings yet</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.books.map(book => <BookPill key={book.id} book={book} />)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 40, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => navigate('add-want')}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 22px', color: '#0f0e0c', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <BookPlus size={14} /> Add more books
          </button>
          <button onClick={() => navigate('library')}
            style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '10px 22px', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <BookMarked size={14} /> Browse library
          </button>
        </div>
      </div>
    </Shell>
  )
}
