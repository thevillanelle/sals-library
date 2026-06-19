import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

// WMO weather code → { label, icon emoji, lucide icon name }
function interpretWeather(code, isDay = true) {
  if (code === 0)              return { condition: 'Clear',         emoji: isDay ? '☀️' : '🌙' }
  if (code <= 2)               return { condition: 'Partly cloudy', emoji: '⛅' }
  if (code === 3)              return { condition: 'Overcast',      emoji: '☁️' }
  if (code <= 48)              return { condition: 'Foggy',         emoji: '🌫️' }
  if (code <= 55)              return { condition: 'Drizzle',       emoji: '🌦️' }
  if (code <= 65)              return { condition: 'Rainy',         emoji: '🌧️' }
  if (code <= 75)              return { condition: 'Snowy',         emoji: '❄️' }
  if (code <= 82)              return { condition: 'Showers',       emoji: '🌦️' }
  if (code <= 86)              return { condition: 'Snow showers',  emoji: '🌨️' }
  return                              { condition: 'Stormy',        emoji: '⛈️' }
}

async function fetchWeather() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto`
          const res = await fetch(url)
          if (!res.ok) { resolve(null); return }
          const data = await res.json()
          const c = data.current
          const { condition, emoji } = interpretWeather(c.weather_code, c.is_day === 1)
          resolve({
            condition,
            emoji,
            temp: Math.round(c.temperature_2m),
            code: c.weather_code,
          })
        } catch { resolve(null) }
      },
      () => resolve(null),
      { timeout: 8000 }
    )
  })
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('sl-theme') || 'light')
  const [weather, setWeather] = useState(null)
  const [textSize, setTextSize] = useState(() => localStorage.getItem('sl-text-size') || 'md')

  const TEXT_SIZES = ['sm', 'md', 'lg', 'xl']
  const TEXT_ZOOM = { sm: 0.9, md: 1, lg: 1.15, xl: 1.3 }
  const setTextSizeByIndex = (i) => {
    const next = TEXT_SIZES[i] || 'md'
    setTextSize(next)
    localStorage.setItem('sl-text-size', next)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sl-theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    fetchWeather().then(setWeather)
    // Refresh every 30 minutes
    const interval = setInterval(() => fetchWeather().then(setWeather), 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <AppContext.Provider value={{ session, loading, theme, toggleTheme, weather, textSize, textSizeIndex: TEXT_SIZES.indexOf(textSize), setTextSizeByIndex, zoom: TEXT_ZOOM[textSize] || 1 }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
