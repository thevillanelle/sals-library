import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { BookPlus, BookMarked, Shuffle, BookOpen, ChevronRight, Star } from 'lucide-react'

function Stars({ rating }) {
  return (
    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i <= rating ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 3 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

function BookRow({ book, onNavigate, onStart, starting }) {
  const [hov, setHov] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? 'var(--bg3)' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onNavigate}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{book.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {author}
          {book.series && <span style={{ color: 'var(--text3)' }}>· {book.series}{book.series_num ? ` #${book.series_num}` : ''}</span>}
          {book.genre && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--gold-pale)', border: '1px solid var(--gold)', color: 'var(--gold)' }}>{book.genre}</span>}
          {book.fiction != null && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, border: '1px solid var(--border2)', color: 'var(--text3)' }}>{book.fiction ? 'Fiction' : 'Nonfiction'}</span>}
        </div>
      </div>
      {hov && (
        <button onClick={onStart} disabled={starting}
          style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px', color: '#1a1300', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <BookOpen size={13} /> {starting ? '…' : 'Start reading'}
        </button>
      )}
    </div>
  )
}

export default function NextReadPage() {
  const navigate = useNavigate()
  const { session } = useApp()
  const [sections, setSections] = useState([])
  const [wantBooks, setWantBooks] = useState([])  // flat list for random pick
  const [avgMap, setAvgMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [pick, setPick] = useState(null)
  const [starting, setStarting] = useState(null)

  const uid = session.user.id

  useEffect(() => {
    const load = async () => {
      const [{ data: want }, { data: readBooks }] = await Promise.all([
        supabase.from('user_books')
          .select('book_id, books(id, title, author_first, author_last, series, series_num, genre, fiction)')
          .eq('user_id', uid).eq('status', 'want-to-read'),
        supabase.from('user_books')
          .select('rating, books(author_last)')
          .eq('user_id', uid).eq('status', 'read').not('rating', 'is', null),
      ])

      if (!want?.length) { setEmpty(true); setLoading(false); return }

      const authorRatings = {}
      for (const ub of (readBooks || [])) {
        if (!ub.books?.author_last) continue
        if (!authorRatings[ub.books.author_last]) authorRatings[ub.books.author_last] = []
        authorRatings[ub.books.author_last].push(ub.rating)
      }
      const avgs = {}
      for (const [k, r] of Object.entries(authorRatings)) {
        avgs[k] = r.reduce((a, b) => a + b, 0) / r.length
      }
      setAvgMap(avgs)

      const books = want.map(ub => ub.books).filter(Boolean)
      setWantBooks(books)

      const byAuthor = {}
      for (const b of books) {
        const key = b.author_last || b.author_first || 'Unknown'
        if (!byAuthor[key]) byAuthor[key] = { books: [], first: b.author_first, last: b.author_last, avg: avgs[key] || null }
        byAuthor[key].books.push(b)
      }

      const sorted = Object.entries(byAuthor)
        .sort(([, a], [, b]) => (b.avg || 0) - (a.avg || 0) || (a.last || '').localeCompare(b.last || ''))
        .map(([, d]) => d)

      setSections(sorted)
      setLoading(false)
    }
    load()
  }, [uid])

  // Weighted random pick — authors with higher avg rating get more weight
  function pickOne() {
    if (!wantBooks.length) return
    const weighted = wantBooks.map(b => {
      const authorKey = b.author_last || b.author_first || ''
      const avg = avgMap[authorKey] || 2.5
      const weight = avg * avg  // square it to amplify preference
      return { book: b, weight }
    })
    const total = weighted.reduce((s, w) => s + w.weight, 0)
    let rand = Math.random() * total
    for (const { book, weight } of weighted) {
      rand -= weight
      if (rand <= 0) { setPick(book); return }
    }
    setPick(weighted[weighted.length - 1].book)
  }

  async function startReading(book) {
    setStarting(book.id)
    await supabase.from('user_books')
      .update({ status: 'reading', date_started: new Date().toISOString().split('T')[0] })
      .eq('user_id', uid).eq('book_id', book.id)
    navigate('/book/' + book.id)
  }

  if (loading) return (
    <Shell showBack>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Scanning the shelves…</div>
    </Shell>
  )

  if (empty) return (
    <Shell showBack>
      <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <BookPlus size={28} color="var(--gold)" />
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 12 }}>Nothing on the list yet</div>
        <p style={{ color: 'var(--text2)', marginBottom: 28 }}>Add books you want to read and they'll show up here.</p>
        <button onClick={() => navigate('/add-want')}
          style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500 }}>
          Add a book
        </button>
      </div>
    </Shell>
  )

  const total = sections.reduce((n, s) => n + s.books.length, 0)

  return (
    <Shell showBack>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>What to read next</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>{total} book{total !== 1 ? 's' : ''} on the list</p>
        </div>

        {/* Pick one for me */}
        {!pick ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 6 }}>Can't decide?</div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>I'll pick one — weighted toward authors you've rated highly.</p>
            <button onClick={pickOne}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Shuffle size={16} /> Pick one for me
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '2px solid var(--gold)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Your next read</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{pick.title}</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}>
              {[pick.author_first, pick.author_last].filter(Boolean).join(' ')}
              {pick.series && <span style={{ color: 'var(--text3)', marginLeft: 8 }}>· {pick.series}{pick.series_num ? ` #${pick.series_num}` : ''}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {pick.genre && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--gold-pale)', border: '1px solid var(--gold)', color: 'var(--gold)' }}>{pick.genre}</span>}
              {pick.fiction != null && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border2)', color: 'var(--text3)' }}>{pick.fiction ? 'Fiction' : 'Nonfiction'}</span>}
              {avgMap[pick.author_last] && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#c9963c18', border: '1px solid #c9963c40', color: '#c9963c' }}>
                  You avg {avgMap[pick.author_last].toFixed(1)}★ for this author
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => startReading(pick)} disabled={!!starting}
                style={{ flex: 1, background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '11px 20px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14 }}>
                <BookOpen size={15} /> {starting === pick.id ? 'Starting…' : "Let's read it"}
              </button>
              <button onClick={() => navigate('/book/' + pick.id)}
                style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                View <ChevronRight size={14} />
              </button>
              <button onClick={pickOne}
                style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <Shuffle size={14} /> Again
              </button>
            </div>
          </div>
        )}

        {/* Full list by author */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {sections.map((section, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#c9963c18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Star size={15} color="#c9963c" fill="#c9963c" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>{[section.first, section.last].filter(Boolean).join(' ')}</div>
                  {section.avg ? <Stars rating={section.avg} /> : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Not yet rated</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.books.map(book => (
                  <BookRow key={book.id} book={book} onNavigate={() => navigate('/book/' + book.id)} onStart={() => startReading(book)} starting={starting === book.id} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 40, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => navigate('/add-want')}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 22px', color: '#0f0e0c', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <BookPlus size={14} /> Add more books
          </button>
          <button onClick={() => navigate('/library')}
            style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '10px 22px', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <BookMarked size={14} /> Browse library
          </button>
        </div>
      </div>
    </Shell>
  )
}
