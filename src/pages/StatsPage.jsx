import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { BookCheck, Star, TrendingUp, Users, Calendar } from 'lucide-react'

function StatCard({ icon: Icon, accent, label, value, sub }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, lineHeight: 1, marginBottom: sub ? 4 : 0 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function SectionHead({ title }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{title}</h2>
  )
}

function BarChart({ data, color = 'var(--gold)' }) {
  if (!data.length) return <p style={{ color: 'var(--text3)', fontSize: 14 }}>No data yet.</p>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: 13, color: 'var(--text2)', textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
          <div style={{ flexGrow: 1, height: 22, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease', minWidth: d.value > 0 ? 4 : 0 }} />
          </div>
          <div style={{ width: 28, fontSize: 13, color: 'var(--text3)', flexShrink: 0 }}>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

function StarDist({ distribution }) {
  const max = Math.max(...Object.values(distribution), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[5, 4, 3, 2, 1].map(star => {
        const count = distribution[star] || 0
        return (
          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 50, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{star}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div style={{ flexGrow: 1, height: 20, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: 'var(--gold)', borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ width: 28, fontSize: 13, color: 'var(--text3)', flexShrink: 0 }}>{count}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function StatsPage({ navigate, theme, toggleTheme, session }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const uid = session.user.id

  useEffect(() => {
    const load = async () => {
      const { data: ubAll } = await supabase
        .from('user_books')
        .select('status, rating, date_read, book_id, books(author_first, author_last, series)')
        .eq('user_id', uid)

      if (!ubAll) { setLoading(false); return }

      const read = ubAll.filter(ub => ub.status === 'read')
      const rated = read.filter(ub => ub.rating)
      const avgRating = rated.length ? (rated.reduce((s, ub) => s + ub.rating, 0) / rated.length) : 0

      const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const ub of rated) ratingDist[ub.rating] = (ratingDist[ub.rating] || 0) + 1

      const authorCounts = {}
      const authorRatings = {}
      for (const ub of read) {
        if (!ub.books) continue
        const key = [ub.books.author_first, ub.books.author_last].filter(Boolean).join(' ') || 'Unknown'
        authorCounts[key] = (authorCounts[key] || 0) + 1
        if (ub.rating) {
          if (!authorRatings[key]) authorRatings[key] = []
          authorRatings[key].push(ub.rating)
        }
      }

      const topAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({ label, value }))

      const byYear = {}
      for (const ub of read) {
        if (!ub.date_read) continue
        const yr = new Date(ub.date_read).getFullYear()
        byYear[yr] = (byYear[yr] || 0) + 1
      }
      const byYearData = Object.entries(byYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .slice(0, 8)
        .map(([label, value]) => ({ label, value }))

      const seriesCounts = {}
      for (const ub of ubAll) {
        if (ub.books?.series) seriesCounts[ub.books.series] = (seriesCounts[ub.books.series] || 0) + 1
      }
      const topSeries = Object.entries(seriesCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }))

      const { data: sessData } = await supabase.from('reading_sessions')
        .select('streak_count').eq('user_id', uid).order('session_date', { ascending: false }).limit(1)

      setStats({
        total: ubAll.length,
        read: read.length,
        rated: rated.length,
        avgRating,
        ratingDist,
        topAuthors,
        byYearData,
        topSeries,
        wantToRead: ubAll.filter(ub => ub.status === 'want-to-read').length,
        streak: sessData?.[0]?.streak_count || 0,
      })
      setLoading(false)
    }
    load()
  }, [uid])

  if (loading) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Crunching the numbers…</div>
      </Shell>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 12 }}>No data yet</div>
          <p style={{ color: 'var(--text2)', marginBottom: 28 }}>Start logging books to see your reading life take shape.</p>
          <button onClick={() => navigate('debrief')} style={{ background: 'var(--gold)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', color: '#0f0e0c', cursor: 'pointer', fontWeight: 500 }}>
            Debrief a book
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme} showBack>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>My reading life</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>The numbers behind the books.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 48 }}>
          <StatCard icon={BookCheck} accent="#7a9e8a" label="Books read" value={stats.read} />
          <StatCard icon={Star} accent="#c9963c" label="Avg rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'} sub={`${stats.rated} rated`} />
          <StatCard icon={TrendingUp} accent="#b87a5a" label="Day streak" value={stats.streak || '—'} />
          <StatCard icon={Users} accent="#8a7eb8" label="Want to read" value={stats.wantToRead} />
          <StatCard icon={Calendar} accent="#6a9ab0" label="In library" value={stats.total} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <SectionHead title="Top authors" />
            <BarChart data={stats.topAuthors} color="var(--gold)" />
          </div>
          <div>
            <SectionHead title="Rating breakdown" />
            <StarDist distribution={stats.ratingDist} />
          </div>
        </div>

        {stats.byYearData.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <SectionHead title="Books read by year" />
            <BarChart data={stats.byYearData} color="#6a9ab0" />
          </div>
        )}

        {stats.topSeries.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <SectionHead title="Series in the library" />
            <BarChart data={stats.topSeries} color="#8a7eb8" />
          </div>
        )}
      </div>
    </Shell>
  )
}
