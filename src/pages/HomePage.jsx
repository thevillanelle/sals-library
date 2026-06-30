import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { useApp } from '../context/AppContext'
import { BookMarked, BookCheck, Library, HelpCircle, Compass, BarChart2, LogOut, Layers, Users, Swords, BookOpen } from 'lucide-react'

const mainTiles = [
  { key:'guide',    icon:BookOpen,   label:'How to use this app',       sub:'A guide written just for you',  accent:'#7a6ab0', path:'/guide'     },
  { key:'library',  icon:Library,    label:'The library',               sub:'Browse, search, export',        accent:'#8a7eb8', path:'/library'   },
  { key:'debrief',  icon:BookCheck,  label:'A book I finished',         sub:'Sit down for a debrief',        accent:'#c9963c', path:'/debrief'   },
  { key:'stats',    icon:BarChart2,  label:'My Dashboard',              sub:'Stats & insights',              accent:'#9a7a60', path:'/stats'     },
  { key:'series',   icon:Layers,     label:'Series Tracker',            sub:'See every series, spot the gaps',accent:'#6a9070', path:'/series'   },
  { key:'want',     icon:BookMarked, label:'Want to Read',              sub:'Your list — mark books as read', accent:'#7a9e8a', path:'/want-list' },
]

const gameTiles = [
  { key:'next',     icon:Compass,    label:'What should I read next?',  sub:'From your own shelf',           accent:'#6a9ab0', path:'/next-read' },
  { key:'versus',   icon:Swords,     label:'Head to Head',              sub:'Pick a fight between two books', accent:'#9a6a8a', path:'/versus'    },
  { key:'fill',     icon:HelpCircle, label:'Fill in the blanks',        sub:'Go back and add missing notes',  accent:'#b87a5a', path:'/fill'      },
]

function Tile({ tile, navigate }) {
  const Icon = tile.icon
  return (
    <button onClick={() => navigate(tile.path)}
      style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px 20px', textAlign:'left', cursor:'pointer', display:'flex', flexDirection:'column', gap:12, transition:'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=tile.accent+'60'; e.currentTarget.style.background='var(--bg3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg2)' }}>
      <div style={{ width:40, height:40, borderRadius:10, background:tile.accent+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={18} color={tile.accent} />
      </div>
      <div>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500, marginBottom:3, lineHeight:1.3 }}>{tile.label}</div>
        <div style={{ fontSize:12, color:'var(--text2)' }}>{tile.sub}</div>
      </div>
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { session, uid } = useApp()
  const [stats, setStats] = useState({ total:0, read:0, rated:0, streak:'—' })
  const [onThisDay, setOnThisDay] = useState([])
  const name = session?.user?.user_metadata?.full_name?.split(' ')[0]
    || session?.user?.email?.split('@')[0]
    || 'Reader'

  useEffect(() => {
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')

    Promise.all([
      supabase.from('user_books').select('*',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('user_books').select('*',{count:'exact',head:true}).eq('user_id',uid).not('one_thing','is',null),
      supabase.from('user_books').select('*',{count:'exact',head:true}).eq('user_id',uid).not('rating','is',null),
      supabase.from('reading_sessions').select('streak_count').eq('user_id',uid).order('session_date',{ascending:false}).limit(1),
      supabase.from('user_books').select('book_id, date_read, rating, books!user_books_book_id_fkey(id,title,author_first,author_last)').eq('user_id',uid).like('date_read', `%-${mm}-${dd}`).not('date_read','is',null).lt('date_read', `${today.getFullYear()}-01-01`),
    ]).then(([{count:total},{count:read},{count:rated},{data:sess},{data:otd}]) => {
      setStats({ total:total||0, read:read||0, rated:rated||0, streak:sess?.[0]?.streak_count||'—' })
      setOnThisDay(otd || [])
    })
  }, [uid])

  const greeting = () => { const h = new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

  return (
    <Shell>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ marginBottom:32 }}>
          <p style={{ color:'var(--text3)', fontSize:13, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{greeting()},</p>
          <h1 style={{ fontSize:44, fontWeight:400, letterSpacing:'-0.02em', marginBottom:4 }}>{name}.</h1>
          <p style={{ color:'var(--text2)', fontSize:16 }}>What are we doing today?</p>
        </div>

        {/* On this day */}
        {onThisDay.length > 0 && (
          <div style={{ background:'var(--bg2)', border:'1px solid var(--gold)', borderLeft:'3px solid var(--gold)', borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:32 }}>
            <div style={{ fontSize:11, color:'var(--gold)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>On this day</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {onThisDay.map(row => {
                const b = row.books
                const year = row.date_read?.split('-')[0]
                const yearsAgo = new Date().getFullYear() - Number(year)
                const author = [b?.author_first, b?.author_last].filter(Boolean).join(' ')
                return (
                  <div key={row.book_id} onClick={() => navigate('/book/' + b?.id)} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:15, flex:1 }}>{b?.title}</div>
                    <div style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>{author}</div>
                    <div style={{ fontSize:11, color:'var(--gold)', flexShrink:0, whiteSpace:'nowrap' }}>{yearsAgo} year{yearsAgo !== 1 ? 's' : ''} ago</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:48 }}>
          {[{label:'In the library',value:stats.total},{label:'Debriefed',value:stats.read},{label:'Rated',value:stats.rated},{label:'Day streak',value:stats.streak}].map(s => (
            <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:28, fontWeight:400 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Main tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {mainTiles.map(tile => <Tile key={tile.key} tile={tile} navigate={navigate} />)}
        </div>

        {/* Games section */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ height:1, background:'var(--border)', flex:1 }} />
          <span style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Games</span>
          <div style={{ height:1, background:'var(--border)', flex:1 }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:48 }}>
          {gameTiles.map(tile => <Tile key={tile.key} tile={tile} navigate={navigate} />)}
        </div>

        <div style={{ borderTop:'1px solid var(--border)', paddingTop:24, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => supabase.auth.signOut()} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--text3)', fontSize:13, cursor:'pointer' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </Shell>
  )
}
