import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Shell from '../components/Shell'
import { BookMarked, BookCheck, Library, HelpCircle, Compass, BarChart2, LogOut } from 'lucide-react'

const tiles = [
  { key:'debrief', icon:BookCheck,  label:'A book I finished',        sub:'Sit down for a debrief',   accent:'#c9963c', page:'debrief'   },
  { key:'want',    icon:BookMarked,  label:'A book I want',            sub:'Add it to the list',        accent:'#7a9e8a', page:'add-want'  },
  { key:'library', icon:Library,     label:'The library',              sub:'Browse, search, export',    accent:'#8a7eb8', page:'library'   },
  { key:'fill',    icon:HelpCircle,  label:'Fill in the blanks',       sub:"Today's daily game",       accent:'#b87a5a', page:'fill'      },
  { key:'next',    icon:Compass,     label:'What should I read next?', sub:'From your own shelf',       accent:'#6a9ab0', page:'next-read' },
  { key:'stats',   icon:BarChart2,   label:'My reading life',          sub:'Stats & insights',          accent:'#9a7a60', page:'stats'     },
]

export default function HomePage({ navigate, theme, toggleTheme, session }) {
  const [stats, setStats] = useState({ total:0, read:0, rated:0, streak:'—' })
  const name = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Sal'

  useEffect(() => {
    const uid = session.user.id
    Promise.all([
      supabase.from('user_books').select('*',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('user_books').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('status','read'),
      supabase.from('user_books').select('*',{count:'exact',head:true}).eq('user_id',uid).not('rating','is',null),
      supabase.from('reading_sessions').select('streak_count').eq('user_id',uid).order('session_date',{ascending:false}).limit(1),
    ]).then(([{count:total},{count:read},{count:rated},{data:sess}]) => {
      setStats({ total:total||0, read:read||0, rated:rated||0, streak:sess?.[0]?.streak_count||'—' })
    })
  }, [session])

  const greeting = () => { const h = new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

  return (
    <Shell navigate={navigate} theme={theme} toggleTheme={toggleTheme}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ marginBottom:48 }}>
          <p style={{ color:'var(--text3)', fontSize:13, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{greeting()},</p>
          <h1 style={{ fontSize:44, fontWeight:400, letterSpacing:'-0.02em', marginBottom:4 }}>{name}.</h1>
          <p style={{ color:'var(--text2)', fontSize:16 }}>What are we doing today?</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:48 }}>
          {[{label:'In the library',value:stats.total},{label:'Books read',value:stats.read},{label:'Rated',value:stats.rated},{label:'Day streak',value:stats.streak}].map(s => (
            <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:28, fontWeight:400 }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:48 }}>
          {tiles.map(tile => {
            const Icon = tile.icon
            return (
              <button key={tile.key} onClick={() => navigate(tile.page)}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px 24px', textAlign:'left', cursor:'pointer', display:'flex', flexDirection:'column', gap:14, transition:'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor=tile.accent+'60'; e.currentTarget.style.background='var(--bg3)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg2)' }}>
                <div style={{ width:44, height:44, borderRadius:10, background:tile.accent+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={20} color={tile.accent} />
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:17, fontWeight:500, marginBottom:4, lineHeight:1.3 }}>{tile.label}</div>
                  <div style={{ fontSize:13, color:'var(--text2)' }}>{tile.sub}</div>
                </div>
              </button>
            )
          })}
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