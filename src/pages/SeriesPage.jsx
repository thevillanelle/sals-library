import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { BookOpen, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronRight } from 'lucide-react'

const STATUS_STYLE = {
  read:          { bg: '#1a3a1a', border: '#2d6b2d', text: '#6dbf6d', label: 'Read' },
  reading:       { bg: '#1a2f3a', border: '#2d5a6b', text: '#6daebf', label: 'Reading' },
  'want-to-read':{ bg: '#2a2515', border: '#5a4d1a', text: '#c4a84a', label: 'Want to read' },
  missing:       { bg: '#2a1a1a', border: '#5a2a2a', text: '#bf7070', label: 'Missing from library' },
}

function SeriesCard({ seriesName, books, allBooks, onNavigate }) {
  const [open, setOpen] = useState(true)

  // Build a complete list including gap detection
  const maxNum = Math.max(...books.map(b => b.series_num || 0))
  const bookMap = {}
  books.forEach(b => { if (b.series_num) bookMap[b.series_num] = b })

  const rows = []
  for (let i = 1; i <= maxNum; i++) {
    if (bookMap[i]) {
      rows.push({ ...bookMap[i], gap: false })
    } else {
      rows.push({ series_num: i, title: `Book #${i}`, gap: true })
    }
  }
  // Books without a series_num (num = null/0) — add at end
  books.filter(b => !b.series_num).forEach(b => rows.push({ ...b, gap: false }))

  const totalRead = books.filter(b => b.user_books?.[0]?.status === 'read').length
  const author = [books[0]?.author_first, books[0]?.author_last].filter(Boolean).join(' ')

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{seriesName}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{author} · {books.length} book{books.length !== 1 ? 's' : ''} · {totalRead} read</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {rows.map((b, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: b.gap ? STATUS_STYLE.missing.border : b.user_books?.[0]?.status === 'read' ? STATUS_STYLE.read.border : b.user_books?.[0]?.status === 'reading' ? STATUS_STYLE.reading.border : 'var(--border2)' }} />
            ))}
          </div>
          {open ? <ChevronDown size={16} color="var(--text3)" /> : <ChevronRight size={16} color="var(--text3)" />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {rows.map((book, i) => {
            const ub = book.user_books?.[0]
            const status = book.gap ? 'missing' : (ub?.status || 'want-to-read')
            const sc = STATUS_STYLE[status] || STATUS_STYLE['want-to-read']
            return (
              <div key={i}
                onClick={book.gap ? undefined : () => onNavigate(book.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', cursor: book.gap ? 'default' : 'pointer', opacity: book.gap ? 0.5 : 1, transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!book.gap) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}>
                <div style={{ width: 28, textAlign: 'right', fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {book.series_num ? `#${book.series_num}` : '—'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontFamily: book.gap ? 'var(--font-sans)' : 'var(--font-serif)', fontStyle: book.gap ? 'italic' : 'normal', color: book.gap ? 'var(--text3)' : 'var(--text)' }}>{book.title}</div>
                  {ub?.rating && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>{'★'.repeat(ub.rating)}{'☆'.repeat(5 - ub.rating)}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, flexShrink: 0 }}>
                  {sc.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SeriesPage() {
  const navigate = useNavigate()
  const { uid } = useApp()
  const [seriesMap, setSeriesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.from('books')
      .select('id,title,author_first,author_last,series,series_num,user_books!inner(status,rating)')
      .not('series', 'is', null)
      .eq('user_books.user_id', uid)
      .order('series_num', { ascending: true })
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(b => {
          if (!map[b.series]) map[b.series] = []
          map[b.series].push(b)
        })
        setSeriesMap(map)
        setLoading(false)
      })
  }, [uid])

  const allSeries = Object.entries(seriesMap).sort(([a], [b]) => a.localeCompare(b))

  const filtered = allSeries.filter(([name, books]) => {
    if (filter === 'all') return true
    if (filter === 'complete') return books.every(b => b.user_books?.[0]?.status === 'read')
    if (filter === 'in-progress') return books.some(b => b.user_books?.[0]?.status === 'read') && !books.every(b => b.user_books?.[0]?.status === 'read')
    if (filter === 'gaps') {
      const nums = books.map(b => b.series_num).filter(Boolean).sort((a, b) => a - b)
      if (nums.length < 2) return false
      for (let i = nums[0]; i <= nums[nums.length - 1]; i++) {
        if (!nums.includes(i)) return true
      }
      return false
    }
    return true
  })

  const btnStyle = (active) => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
    background: active ? 'var(--gold)' : 'var(--bg2)',
    border: active ? 'none' : '1px solid var(--border2)',
    color: active ? '#1a1300' : 'var(--text2)', fontWeight: active ? 600 : 400,
  })

  if (loading) return (
    <Shell showBack>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Loading series…</div>
    </Shell>
  )

  return (
    <Shell showBack>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 6 }}>Series Tracker</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>{allSeries.length} series across the library</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {[['all','All'],['complete','Complete'],['in-progress','In Progress'],['gaps','Has Gaps']].map(([val, label]) => (
            <button key={val} style={btnStyle(filter === val)} onClick={() => setFilter(val)}>{label}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No series match this filter.</div>
        )}

        {filtered.map(([name, books]) => (
          <SeriesCard key={name} seriesName={name} books={books} onNavigate={(id) => navigate('/book/' + id)} />
        ))}
      </div>
    </Shell>
  )
}
