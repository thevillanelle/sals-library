import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { BookPlus, BookMarked, Shuffle, BookOpen, ChevronRight, Star, Sparkles } from 'lucide-react'

const DISCOVERIES = [
  { title: 'Still Life', author: 'Louise Penny', why: 'First in a 19-book Quebec detective series — literary, warm, and impossible to put down. Similar feel to a long Baldacci run.' },
  { title: 'The Cold Dish', author: 'Craig Johnson', why: 'Walt Longmire, Wyoming sheriff. If you love C.J. Box\'s Joe Pickett, this is the same country and the same soul. 18 books in the series.' },
  { title: 'A Gentleman in Moscow', author: 'Amor Towles', why: 'A Russian count sentenced to house arrest in a grand hotel. Beautifully plotted, quietly funny, and deeply satisfying.' },
  { title: 'The Pillars of the Earth', author: 'Ken Follett', why: 'Building a cathedral in medieval England. 900 pages that disappear. If you liked Jean Auel\'s epics, this is in the same company.' },
  { title: 'All the Light We Cannot See', author: 'Anthony Doerr', why: 'WWII France and Germany told through two teenagers. Pulitzer Prize. Right in the territory of Band of Brothers and D-Day.' },
  { title: 'Tinker Tailor Soldier Spy', author: 'John le Carré', why: 'Cold War spy fiction at its finest — methodical, cerebral, and deeply satisfying. Nothing like the movies.' },
  { title: 'Lonesome Dove', author: 'Larry McMurtry', why: 'The great American Western. Pulitzer Prize. Two retired Texas Rangers drive a cattle herd to Montana. Unforgettable characters.' },
  { title: 'Unbroken', author: 'Laura Hillenbrand', why: 'WWII survival story — an Olympic athlete becomes a POW. Reads like a thriller. Same nonfiction drive as Stephen Ambrose.' },
  { title: 'The Thursday Murder Club', author: 'Richard Osman', why: 'Four retirees in a sleepy English village solve murders that baffle the police. Witty, warm, and four books deep.' },
  { title: 'In the Woods', author: 'Tana French', why: 'Dublin detective with a buried past investigates a child\'s murder near the woods where he lost his memory as a boy. Literary crime at its best.' },
  { title: 'Wolf Hall', author: 'Hilary Mantel', why: 'Thomas Cromwell rising through Henry VIII\'s court. Booker Prize. Historical fiction as sharp as a blade — think Jeffrey Archer but Tudor England.' },
  { title: 'The Longest Day', author: 'Cornelius Ryan', why: 'D-Day told through hundreds of eyewitness accounts. The original narrative nonfiction on Normandy — what Ambrose built on.' },
  { title: 'The Girl with the Dragon Tattoo', author: 'Stieg Larsson', why: 'A Swedish journalist and a fierce hacker investigate a decades-old family disappearance. Gripping trilogy.' },
  { title: 'The Shadow of the Wind', author: 'Carlos Ruiz Zafón', why: 'Post-war Barcelona. A boy finds a mysterious novel and discovers the author has been erased from history. Mystery and literature entwined.' },
  { title: 'The Boys in the Boat', author: 'Daniel James Brown', why: 'Nine working-class Americans row against Hitler\'s Germany at the 1936 Olympics. Nonfiction that reads like fiction.' },
  { title: 'Educated', author: 'Tara Westover', why: 'A woman who grew up in an extremist survivalist family and taught herself out. One of the most gripping memoirs in years.' },
  { title: 'The Last Lecture', author: 'Randy Pausch', why: 'A computer science professor with terminal cancer delivers his final lecture. If Tuesdays with Morrie moved you, this will too.' },
  { title: 'The Name of the Rose', author: 'Umberto Eco', why: 'A monk investigates a series of murders in a 14th-century Italian monastery. Dense, brilliant, and deeply satisfying.' },
  { title: 'Master and Commander', author: 'Patrick O\'Brian', why: 'Napoleonic-era naval warfare — 20 books following Captain Jack Aubrey. The seafaring equivalent of a long thriller series.' },
  { title: 'Where the Crawdads Sing', author: 'Delia Owens', why: 'A girl raised alone in the North Carolina marshes becomes a murder suspect. Mystery wrapped around a coming-of-age story.' },
  { title: 'The Power of the Dog', author: 'Don Winslow', why: 'The American drug war from both sides of the border — sprawling, novelistic crime fiction over a trilogy. If you like Baldacci\'s scope, try this.' },
  { title: 'Shōgun', author: 'James Clavell', why: 'A 16th-century English navigator shipwrecked in Japan and swept into its civil wars. Historical epic fiction at its grandest.' },
  { title: 'The Kite Runner', author: 'Khaled Hosseini', why: 'Afghanistan before and after the Taliban, told through a lifelong friendship and a son\'s search for redemption.' },
  { title: 'The Covenant of Water', author: 'Abraham Verghese', why: 'Three generations of a South Indian family across 70 years. Sweeping, beautiful, and medically precise.' },
  { title: 'Lonesome Dove', author: 'Larry McMurtry', why: 'The great American Western. Pulitzer Prize. Two retired Texas Rangers drive a cattle herd to Montana. Unforgettable characters.' },
]

// dedupe (Lonesome Dove appeared twice above — remove the dup cleanly)
const UNIQUE_DISCOVERIES = DISCOVERIES.filter((d, i, arr) => arr.findIndex(x => x.title === d.title) === i)

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

function DiscoverSection() {
  const [discovery, setDiscovery] = useState(null)
  const suggest = () => setDiscovery(UNIQUE_DISCOVERIES[Math.floor(Math.random() * UNIQUE_DISCOVERIES.length)])
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Discover something new</span>
        <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
      </div>
      {!discovery ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, marginBottom: 4 }}>Not sure what's next?</div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>24 hand-picked titles based on what you love — long series, crime fiction, WWII history, sweeping epics.</p>
          </div>
          <button onClick={suggest}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '11px 20px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, flexShrink: 0 }}>
            <Sparkles size={15} /> Suggest one
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>You might like</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, marginBottom: 2 }}>{discovery.title}</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 12 }}>{discovery.author}</div>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 20, borderLeft: '2px solid var(--gold)', paddingLeft: 14 }}>{discovery.why}</p>
          <button onClick={suggest}
            style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '9px 18px', color: 'var(--text2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Shuffle size={13} /> Show another
          </button>
        </div>
      )}
    </div>
  )
}

export default function NextReadPage() {
  const navigate = useNavigate()
  const { session, weather } = useApp()
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
      .update({ status: 'reading', date_started: new Date().toISOString().split('T')[0], weather_condition: weather?.condition || null, weather_temp: weather?.temp || null })
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
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>What to read next</h1>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 6 }}>No want-to-read list yet</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>Add books you're planning to read and they'll show up here.</p>
          <button onClick={() => navigate('/add-want')}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 22px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
            <BookPlus size={13} style={{ display: 'inline', marginRight: 6 }} /> Add a book
          </button>
        </div>
        <DiscoverSection />
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

        <DiscoverSection />

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
