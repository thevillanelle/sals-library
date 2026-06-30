import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { ChevronRight, SkipForward, Check, BookOpen } from 'lucide-react'

const QUESTIONS = [
  { key:'title_author', type:'book_search', q:'What book did you just finish?',    hint:'Start typing the title or author' },
  { key:'rating',       type:'rating',      q:'How would you rate it?',             hint:'Your honest gut reaction' },
  { key:'one_thing',    type:'text',        q:"What's the one thing you'll remember?", hint:'A scene, a line, a feeling — whatever stuck', placeholder:'The thing that lingers…' },
  { key:'best_moment',  type:'text',        q:'Was there a best scene or moment?',  hint:"Just enough so you'll know what you meant", placeholder:'The moment that got you…' },
  { key:'dragged',      type:'text',        q:'Did it drag anywhere?',              hint:'Be honest. No book is perfect.', placeholder:'Where it lost you, or "Not really"…' },
  { key:'give_to',      type:'text',        q:'Who would you hand this to?',        hint:'A person, a type of reader, a mood', placeholder:'This book is for someone who…' },
  { key:'compare',      type:'text',        q:'What does it remind you of?',        hint:'Another book, a movie, an author style', placeholder:'Reminds me of…' },
  { key:'recommend',    type:'recommend',   q:'Would you recommend it?',            hint:'Your final word' },
]

const RATING_LABELS = ['', 'Not for me.', 'It was okay.', 'Pretty good.', 'Really enjoyed it.', 'One of the best.']

const inputStyle = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '10px 14px', color: 'var(--text)', fontSize: 15, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
}

export default function DebriefPage() {
  const navigate = useNavigate()
  const { weather, uid } = useApp()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [bookSearch, setBookSearch] = useState('')
  const [bookResults, setBookResults] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [current, setCurrent] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const q = QUESTIONS[step]
  const progress = (step / QUESTIONS.length) * 100
  const searchTimer = useRef(null)

  async function runBookSearch(val) {
    if (val.length < 2) { setBookResults([]); return }
    const { data } = await supabase.from('books')
      .select('id,title,author_last,author_first,series,series_num')
      .or(`title.ilike.%${val}%,author_last.ilike.%${val}%,author_first.ilike.%${val}%`)
      .limit(8)
    setBookResults(data || [])
  }

  function searchBooks(val) {
    setBookSearch(val)
    clearTimeout(searchTimer.current)
    if (val.length < 2) { setBookResults([]); return }
    searchTimer.current = setTimeout(() => runBookSearch(val), 300)
  }

  function advance(val) {
    const newAnswers = { ...answers }
    if (q.key !== 'title_author') newAnswers[q.key] = val ?? current
    setAnswers(newAnswers)
    setCurrent('')
    if (step + 1 >= QUESTIONS.length) saveDebrief(newAnswers)
    else setStep(s => s + 1)
  }

  function skip() {
    setCurrent('')
    if (step + 1 >= QUESTIONS.length) saveDebrief(answers)
    else setStep(s => s + 1)
  }

  async function saveDebrief(finalAnswers) {
    if (!selectedBook) return
    setSaving(true)
    const { error } = await supabase.from('user_books').upsert({
      user_id: uid,
      book_id: selectedBook.id,
      status: 'read',
      rating: finalAnswers.rating || null,
      one_thing: finalAnswers.one_thing || null,
      best_moment: finalAnswers.best_moment || null,
      dragged: finalAnswers.dragged || null,
      give_to: finalAnswers.give_to || null,
      compare: finalAnswers.compare || null,
      recommend: finalAnswers.recommend || null,
      date_read: new Date().toISOString().split('T')[0],
      weather_condition: weather?.condition || null,
      weather_temp: weather?.temp || null,
    }, { onConflict: 'user_id,book_id' })
    setSaving(false)
    if (!error) setDone(true)
  }

  // ── Done screen ──────────────────────────────────────────────────
  if (done) {
    const captured = [
      answers.rating     && { label: 'Rating',       value: '★'.repeat(answers.rating) + ` — ${RATING_LABELS[answers.rating]}` },
      answers.one_thing  && { label: 'The one thing', value: answers.one_thing },
      answers.best_moment&& { label: 'Best moment',  value: answers.best_moment },
      answers.give_to    && { label: 'Give to',       value: answers.give_to },
      answers.compare    && { label: 'Reminds me of', value: answers.compare },
      answers.recommend  && { label: 'Recommend?',    value: { yes: "Yes — press it into someone's hands", maybe: 'Maybe — for the right person', no: 'Probably not' }[answers.recommend] },
    ].filter(Boolean)

    return (
      <Shell showBack>
        <div style={{ maxWidth: 560, margin: '40px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-pale)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={28} color="var(--gold)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, marginBottom: 6 }}>Debrief saved.</h2>
            <p style={{ color: 'var(--text2)', fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontSize: 16 }}>"{selectedBook?.title}"</p>
          </div>

          {captured.length > 0 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 16 }}>What you said</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {captured.map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: label === 'The one thing' || label === 'Best moment' ? 'var(--font-serif)' : 'var(--font-sans)', fontStyle: label === 'The one thing' ? 'italic' : 'normal', lineHeight: 1.5 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setDone(false); setStep(0); setAnswers({}); setSelectedBook(null); setBookSearch(''); setBookResults([]); setCurrent(''); setRating(0) }}
              style={{ flex: 1, padding: '11px 20px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
              Debrief another
            </button>
            <button onClick={() => navigate('/book/' + selectedBook?.id)}
              style={{ flex: 1, padding: '11px 20px', background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', color: '#1a1300', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
              View book
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── Main flow ────────────────────────────────────────────────────
  return (
    <Shell showBack>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>

        {/* Progress bar */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Debrief</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{step + 1} / {QUESTIONS.length}</span>
          </div>
          <div style={{ height: 2, background: 'var(--border2)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Persistent book banner — visible after selection */}
        {selectedBook && step > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--gold-pale)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={14} color="var(--gold)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedBook.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{[selectedBook.author_first, selectedBook.author_last].filter(Boolean).join(' ')}</div>
            </div>
          </div>
        )}

        {/* Question */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 400, marginBottom: 8, lineHeight: 1.3, fontFamily: 'var(--font-serif)' }}>{q.q}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>{q.hint}</p>
        </div>

        {/* Book search */}
        {q.type === 'book_search' && (
          <div>
            <input type="text" value={bookSearch} onChange={e => searchBooks(e.target.value)}
              placeholder="Search title or author…" autoFocus
              style={{ ...inputStyle, marginBottom: 12 }} />
            {selectedBook ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{selectedBook.title}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{selectedBook.author_first} {selectedBook.author_last}</div>
                </div>
                <button onClick={() => { setSelectedBook(null); setBookSearch('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>change</button>
              </div>
            ) : bookResults.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
                {bookResults.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBook(b); setBookResults([]); setBookSearch('') }}
                    style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', display: 'block' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span style={{ fontFamily: 'var(--font-serif)' }}>{b.title}</span>
                    <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 8 }}>{b.author_first} {b.author_last}</span>
                    {b.series && <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 6 }}>· {b.series}{b.series_num ? ` #${b.series_num}` : ''}</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedBook && (
              <button onClick={() => advance()}
                style={{ width: '100%', padding: '12px 20px', background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', color: '#1a1300', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
                That's the one <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}

        {/* Star rating */}
        {q.type === 'rating' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'none', border: 'none', fontSize: 44, cursor: 'pointer', opacity: (hoverRating || rating) >= n ? 1 : 0.2, transition: 'opacity 0.1s, transform 0.1s', transform: (hoverRating || rating) >= n ? 'scale(1.1)' : 'scale(1)', padding: 0, lineHeight: 1 }}>★</button>
              ))}
            </div>
            {rating > 0 && <p style={{ color: 'var(--text2)', marginBottom: 24, fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic' }}>{RATING_LABELS[rating]}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => advance(rating)} disabled={!rating}
                style={{ flex: 1, padding: '12px 20px', background: rating ? 'var(--gold)' : 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: rating ? '#1a1300' : 'var(--text3)', fontWeight: 500, cursor: rating ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Continue <ChevronRight size={16} />
              </button>
              <button onClick={skip}
                style={{ padding: '12px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <SkipForward size={14} /> Skip
              </button>
            </div>
          </div>
        )}

        {/* Free text */}
        {q.type === 'text' && (
          <div>
            <textarea value={current} onChange={e => setCurrent(e.target.value)}
              placeholder={q.placeholder} autoFocus rows={4}
              style={{ ...inputStyle, marginBottom: 16, resize: 'vertical', lineHeight: 1.6, minHeight: 110 }}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) advance() }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => advance()}
                style={{ flex: 1, padding: '12px 20px', background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', color: '#1a1300', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {step + 1 < QUESTIONS.length ? <><span>Next</span><ChevronRight size={16} /></> : 'Finish debrief'}
              </button>
              <button onClick={skip}
                style={{ padding: '12px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <SkipForward size={14} /> Skip
              </button>
            </div>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>⌘ + Enter to continue</p>
          </div>
        )}

        {/* Recommend */}
        {q.type === 'recommend' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { val: 'yes',   label: "Yes — I'd press it into someone's hands" },
                { val: 'maybe', label: 'Maybe — for the right person' },
                { val: 'no',    label: 'Probably not' },
              ].map(opt => (
                <button key={opt.val} onClick={() => advance(opt.val)}
                  style={{ padding: '14px 18px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontSize: 15, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-pale)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--bg2)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={skip}
              style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <SkipForward size={14} /> Skip
            </button>
          </div>
        )}

        {saving && <p style={{ color: 'var(--text2)', marginTop: 16, fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>Saving your debrief…</p>}
      </div>
    </Shell>
  )
}
