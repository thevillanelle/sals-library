import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { BookCheck, Star, TrendingUp, BookMarked, Calendar, Library, Layers, PenLine } from 'lucide-react'

function StatCard({ icon: Icon, accent, label, value, sub }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={accent} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, lineHeight: 1, marginBottom: sub ? 4 : 0 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, marginBottom: 0 }}>{sub}</p>}
    </div>
  )
}

function BarChart({ data, color = 'var(--gold)', labelWidth = 110 }) {
  if (!data.length) return <p style={{ color: 'var(--text3)', fontSize: 14 }}>No data yet.</p>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: labelWidth, fontSize: 13, color: 'var(--text2)', textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</div>
          <div style={{ flexGrow: 1, height: 22, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease', minWidth: d.value > 0 ? 4 : 0 }} />
          </div>
          <div style={{ width: 32, fontSize: 13, color: 'var(--text3)', flexShrink: 0, textAlign: 'right' }}>{d.value}</div>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
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

function DonutStat({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg3)" strokeWidth="10" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(pct / 100) * 201} 201`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500 }}>{pct}%</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{value.toLocaleString()} books</div>
    </div>
  )
}

export default function StatsPage() {
  const navigate = useNavigate()
  const { session } = useApp()
  const [tab, setTab] = useState('reading')
  const [reading, setReading] = useState(null)
  const [library, setLibrary] = useState(null)
  const [loading, setLoading] = useState(true)
  const uid = session.user.id

  useEffect(() => {
    const load = async () => {
      const [{ data: ubAll }, { data: allBooks }, { data: sessData }] = await Promise.all([
        supabase.from('user_books')
          .select('status, rating, date_read, one_thing, book_id, books(author_first, author_last, series, genre, fiction)')
          .eq('user_id', uid),
        supabase.from('books')
          .select('id, genre, fiction, series, author_first, author_last, summary, dewey, year_published, user_books!inner(user_id)')
          .eq('user_books.user_id', uid),
        supabase.from('reading_sessions')
          .select('streak_count').eq('user_id', uid).order('session_date', { ascending: false }).limit(1),
      ])

      // ── Reading analytics ──────────────────────────────────────────
      const ub = ubAll || []
      const read = ub.filter(u => u.status === 'read')
      const rated = read.filter(u => u.rating)
      const debriefed = read.filter(u => u.one_thing)
      const avgRating = rated.length ? rated.reduce((s, u) => s + u.rating, 0) / rated.length : 0

      const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const u of rated) ratingDist[u.rating] = (ratingDist[u.rating] || 0) + 1

      const authorCounts = {}
      for (const u of read) {
        if (!u.books) continue
        const key = [u.books.author_first, u.books.author_last].filter(Boolean).join(' ') || 'Unknown'
        authorCounts[key] = (authorCounts[key] || 0) + 1
      }
      const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))

      const byYear = {}
      for (const u of read) {
        if (!u.date_read) continue
        const yr = new Date(u.date_read).getFullYear()
        byYear[yr] = (byYear[yr] || 0) + 1
      }
      const byYearData = Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a)).slice(0, 8).map(([label, value]) => ({ label, value }))

      const readGenres = {}
      for (const u of read) {
        if (u.books?.genre) readGenres[u.books.genre] = (readGenres[u.books.genre] || 0) + 1
      }
      const topReadGenres = Object.entries(readGenres).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))

      setReading({
        total: ub.length,
        read: read.length,
        rated: rated.length,
        debriefed: debriefed.length,
        avgRating,
        ratingDist,
        topAuthors,
        byYearData,
        topReadGenres,
        wantToRead: ub.filter(u => u.status === 'want-to-read').length,
        inProgress: ub.filter(u => u.status === 'reading').length,
        dnf: ub.filter(u => u.status === 'dnf').length,
        streak: sessData?.[0]?.streak_count || 0,
      })

      // ── Library analytics ──────────────────────────────────────────
      const books = allBooks || []
      const withGenre = books.filter(b => b.genre)
      const withSummary = books.filter(b => b.summary)
      const withDewey = books.filter(b => b.dewey)
      const fiction = books.filter(b => b.fiction === true)
      const nonfiction = books.filter(b => b.fiction === false)
      const withSeries = books.filter(b => b.series)
      const standalone = books.filter(b => !b.series)

      const libGenres = {}
      for (const b of withGenre) libGenres[b.genre] = (libGenres[b.genre] || 0) + 1
      const topLibGenres = Object.entries(libGenres).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))

      const libAuthors = {}
      for (const b of books) {
        const key = [b.author_first, b.author_last].filter(Boolean).join(' ') || 'Unknown'
        libAuthors[key] = (libAuthors[key] || 0) + 1
      }
      const topLibAuthors = Object.entries(libAuthors).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }))

      const seriesCounts = {}
      for (const b of withSeries) seriesCounts[b.series] = (seriesCounts[b.series] || 0) + 1
      const topSeries = Object.entries(seriesCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))

      const byDecade = {}
      for (const b of books) {
        if (!b.year_published) continue
        const decade = Math.floor(b.year_published / 10) * 10
        byDecade[decade] = (byDecade[decade] || 0) + 1
      }
      const byDecadeData = Object.entries(byDecade).sort(([a], [b]) => Number(b) - Number(a)).slice(0, 10).map(([label, value]) => ({ label: `${label}s`, value }))

      setLibrary({
        total: books.length,
        fiction: fiction.length,
        nonfiction: nonfiction.length,
        unknownFiction: books.length - fiction.length - nonfiction.length,
        withSeries: withSeries.length,
        standalone: standalone.length,
        uniqueSeries: Object.keys(seriesCounts).length,
        withGenre: withGenre.length,
        withSummary: withSummary.length,
        withDewey: withDewey.length,
        topLibGenres,
        topLibAuthors,
        topSeries,
        byDecadeData,
      })

      setLoading(false)
    }
    load()
  }, [uid])

  const tabStyle = (t) => ({
    padding: '8px 20px',
    background: tab === t ? 'var(--gold)' : 'none',
    border: `1px solid ${tab === t ? 'var(--gold)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    color: tab === t ? '#1a1300' : 'var(--text2)',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: tab === t ? 500 : 400,
    transition: 'all 0.15s',
  })

  if (loading) return (
    <Shell showBack>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)', fontFamily: 'var(--font-serif)', fontSize: 18 }}>Crunching the numbers…</div>
    </Shell>
  )

  return (
    <Shell showBack>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, marginBottom: 4 }}>My reading life</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>A life measured in books.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
          <button style={tabStyle('reading')} onClick={() => setTab('reading')}>My reading</button>
          <button style={tabStyle('library')} onClick={() => setTab('library')}>The library</button>
        </div>

        {/* ── MY READING TAB ── */}
        {tab === 'reading' && reading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, marginBottom: 48 }}>
              <StatCard icon={BookCheck} accent="#7a9e8a" label="Books read" value={reading.read.toLocaleString()} />
              <StatCard icon={PenLine} accent="#c9963c" label="Debriefed" value={reading.debriefed.toLocaleString()} sub={reading.read > 0 ? `${Math.round((reading.debriefed/reading.read)*100)}% of read` : ''} />
              <StatCard icon={Star} accent="#c9963c" label="Avg rating" value={reading.avgRating ? reading.avgRating.toFixed(1) : '—'} sub={`${reading.rated} rated`} />
              <StatCard icon={TrendingUp} accent="#b87a5a" label="Day streak" value={reading.streak || '—'} />
              <StatCard icon={BookMarked} accent="#8a7eb8" label="Want to read" value={reading.wantToRead.toLocaleString()} />
              <StatCard icon={Calendar} accent="#6a9ab0" label="In progress" value={reading.inProgress} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 48 }}>
              <div>
                <SectionHead title="Top authors" sub="By books read" />
                <BarChart data={reading.topAuthors} color="var(--gold)" />
              </div>
              <div>
                <SectionHead title="Rating breakdown" />
                <StarDist distribution={reading.ratingDist} />
              </div>
            </div>

            {reading.byYearData.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <SectionHead title="Books read by year" />
                <BarChart data={reading.byYearData} color="#6a9ab0" />
              </div>
            )}

            {reading.topReadGenres.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <SectionHead title="Genres you've been reading" />
                <BarChart data={reading.topReadGenres} color="#7a9e8a" />
              </div>
            )}

            <div style={{ marginBottom: 48 }}>
              <SectionHead title="Library breakdown" />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Read', value: reading.read, color: '#6dbf6d', total: reading.total },
                  { label: 'Want to read', value: reading.wantToRead, color: '#c4a84a', total: reading.total },
                  { label: 'In progress', value: reading.inProgress, color: '#6daebf', total: reading.total },
                  { label: 'DNF', value: reading.dnf, color: '#bf6d6d', total: reading.total },
                ].map(s => (
                  <div key={s.label} style={{ flex: '1 1 140px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.total > 0 ? `${Math.round((s.value/s.total)*100)}%` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── THE LIBRARY TAB ── */}
        {tab === 'library' && library && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, marginBottom: 48 }}>
              <StatCard icon={Library} accent="#c9963c" label="Total books" value={library.total.toLocaleString()} />
              <StatCard icon={Layers} accent="#8a7eb8" label="Series" value={library.uniqueSeries} sub={`${library.withSeries} books in series`} />
              <StatCard icon={BookCheck} accent="#7a9e8a" label="Standalone" value={library.standalone.toLocaleString()} />
              <StatCard icon={BookMarked} accent="#6a9ab0" label="With summary" value={library.withSummary.toLocaleString()} sub={`${Math.round((library.withSummary/library.total)*100)}% coverage`} />
            </div>

            <div style={{ marginBottom: 48 }}>
              <SectionHead title="Fiction vs nonfiction" sub={`${library.unknownFiction} books not yet classified`} />
              <div style={{ display: 'flex', gap: 40, padding: '24px 0' }}>
                <DonutStat label="Fiction" value={library.fiction} total={library.total} color="#c9963c" />
                <DonutStat label="Nonfiction" value={library.nonfiction} total={library.total} color="#7a9e8a" />
                <DonutStat label="Classified" value={library.fiction + library.nonfiction} total={library.total} color="#8a7eb8" />
              </div>
            </div>

            {library.topLibGenres.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <SectionHead title="Library by genre" sub="All books, not just read ones" />
                <BarChart data={library.topLibGenres} color="#c9963c" />
              </div>
            )}

            <div style={{ marginBottom: 48 }}>
              <SectionHead title="Most collected authors" sub="By total books in the library" />
              <BarChart data={library.topLibAuthors} color="var(--gold)" />
            </div>

            {library.topSeries.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <SectionHead title="Biggest series" sub="By number of books in the library" />
                <BarChart data={library.topSeries} color="#8a7eb8" />
              </div>
            )}

            {library.byDecadeData.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <SectionHead title="Books by decade published" />
                <BarChart data={library.byDecadeData} color="#6a9ab0" />
              </div>
            )}

            <div style={{ marginBottom: 48 }}>
              <SectionHead title="Data coverage" sub="How complete the library records are" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Genre tagged', value: library.withGenre },
                  { label: 'Has summary', value: library.withSummary },
                  { label: 'Dewey decimal', value: library.withDewey },
                  { label: 'Fiction/nonfiction', value: library.fiction + library.nonfiction },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 130, fontSize: 13, color: 'var(--text2)', flexShrink: 0 }}>{row.label}</div>
                    <div style={{ flexGrow: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(row.value / library.total) * 100}%`, background: 'var(--gold)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', flexShrink: 0, width: 80, textAlign: 'right' }}>
                      {row.value.toLocaleString()} / {library.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
