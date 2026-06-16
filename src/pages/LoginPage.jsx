import { supabase } from '../lib/supabase'
import { Sun, Moon, BookOpen } from 'lucide-react'

export default function LoginPage({ theme, toggleTheme }) {
  const signIn = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"20px 32px" }}>
        <button onClick={toggleTheme} style={{ background:"none", border:"1px solid var(--border2)", borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text2)", cursor:"pointer" }}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
        <BookOpen size={40} color="var(--gold)" style={{ marginBottom:20 }} />
        <h1 style={{ fontSize:42, fontWeight:400, marginBottom:12 }}>Sal's Library</h1>
        <p style={{ color:"var(--text2)", fontSize:17, maxWidth:340, marginBottom:40 }}>A private catalogue for a life spent reading.</p>
        <div style={{ width:"100%", maxWidth:340, background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:32 }}>
          <button onClick={signIn} style={{ width:"100%", padding:"13px 20px", borderRadius:"var(--radius)", background:"var(--bg3)", border:"1px solid var(--border2)", color:"var(--text)", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}