import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { Shuffle, BookOpen, Trophy, RotateCcw } from 'lucide-react'

const ROUNDS = 5

function BookCard({ book, onPick, winner }) {
  const [hov, setHov] = useState(false)
  const author = [book.author_first, book.author_last].filter(Boolean).join(' ')

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onPick}
      style={{
        flex: 1, background: hov ? 'var(--bg3)' : 'var(--bg2)',
        border: `2px solid ${hov ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: '28px 24px',
        cursor: 'pointer', transition: 'all 0.2s', display: 'flex',
        flexDirection: 'column', gap: 12, minHeight: 200,
      }}>
      {book.genre && (
        <span style={{ alignSelf: 'flex-start', fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--gold-pale)', border: '1px solid var(--gold)', color: 'var(--gold)', letterSpacing: '0.04em' }}>{book.genre}</span>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, lineHeight: 1.3, marginBottom: 8 }}>{book.title}</div>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>{author}</div>
        {book.series && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{book.series}{book.series_num ? ` #${book.series_num}` : ''}</div>}
      </div>
      <div style={{
        textAlign: 'center', padding: '10px', borderRadius: 'var(--radius)',
        background: hov ? 'var(--gold)' : 'transparent',
        border: `1px solid ${hov ? 'var(--gold)' : 'var(--border2)'}`,
        color: hov ? '#1a1300' : 'var(--text3)',
        fontSize: 13, fontWeight: hov ? 600 : 400,
        transition: 'all 0.2s',
      }}>
        This one was better →
      </div>
    </div>
  )
}

export default function VersusPage() {
  const navigate = useNavigate()
  const { session } = useApp()
  const [pool, setPool] = useState([])
  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)
  const [round, setRound] = useState(0)
  const [winner, setWinner] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const uid = session.user.id
    supabase.from('user_books')
      .select('book_id, books(id,title,author_first,author_last,series,series_num,genre,fiction)')
      .eq('user_id', uid)
      .eq('status', 'read')
      .then(({ data }) => {
        const books = (data || []).map(r => r.books).filter(Boolean)
        setPool(books)
        if (books.length >= 2) dealPair(books)
        setLoading(false)
      })
  }, [session])

  const dealPair = useCallback((books) => {
    const shuffled = [...books].sort(() => Math.random() - 0.5)
    setLeft(shuffled[0])
    setRight(shuffled[1])
  }, [])

  const pick = (chosen, other) => {
    const newRound = round + 1
    if (newRound >= ROUNDS) {
      setWinner(chosen)
    } else {
      setRound(newRound)
      // Keep winner, bring in a new challenger (not the loser or winner)
      const remaining = pool.filter(b => b.id !== chosen.id && b.id !== other.id)
      if (remaining.length > 0) {
        const challenger = remaining[Math.floor(Math.random() * remaining.length)]
        // 50/50 which side the winner stays on
        if (Math.random() > 0.5) { setLeft(chosen); setRight(challenger) }
        else { setLeft(challenger); setRight(chosen) }
      } else {
        setWinner(chosen)
      }
    }
  }

  const reset = () => {
    setRound(0)
    setWinner(null)
    dealPair(pool)
  }

  if (loading) return <Shell showBack><div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Loading your shelf…</div></Shell>

  if (pool.length < 2) return (
    <Shell showBack>
      <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--text2)', marginBottom: 20 }}>You need at least 2 read books to play. Debrief a few books first.</p>
        <button onClick={() => navigate('/debrief')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>Debrief a book →</button>
      </div>
    </Shell>
  )

  if (winner) return (
    <Shell showBack>
      <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-pale)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Trophy size={28} color="var(--gold)" />
        </div>
        <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginBottom: 8 }}>The winner</p>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 400, marginBottom: 8, lineHeight: 1.2 }}>{winner.title}</h2>
        <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 8 }}>{[winner.author_first, winner.author_last].filter(Boolean).join(' ')}</p>
        {winner.series && <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 32 }}>{winner.series}{winner.series_num ? ` #${winner.series_num}` : ''}</p>}
        {!winner.series && <div style={{ marginBottom: 32 }} />}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/book/' + winner.id)} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', color: '#1a1300', fontWeight: 500, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={14} /> View profile
          </button>
          <button onClick={reset} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '12px 24px', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={13} /> Play again
          </button>
        </div>
      </div>
    </Shell>
  )

  return (
    <Shell showBack>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 8 }}>Head to Head</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Which was the better read?</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < round ? 'var(--gold)' : 'var(--border2)', transition: 'background 0.3s' }} />
            ))}
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Round {round + 1} of {ROUNDS}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <BookCard book={left} onPick={() => pick(left, right)} />
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>VS</div>
          </div>
          <BookCard book={right} onPick={() => pick(right, left)} />
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Shuffle size={13} /> Reshuffle
          </button>
        </div>
      </div>
    </Shell>
  )
}
