export const statusColors = {
  read:          { bg: '#1a3a1a', border: '#2d6b2d', text: '#6dbf6d' },
  reading:       { bg: '#1a2f3a', border: '#2d5a6b', text: '#6daebf' },
  'want-to-read':{ bg: '#2a2515', border: '#5a4d1a', text: '#c4a84a' },
  dnf:           { bg: '#2a1515', border: '#5a2020', text: '#bf6d6d' },
}

export const statusLabels = { read: 'Read', 'want-to-read': 'Want to read', reading: 'Reading', dnf: 'DNF' }

export const GENRE_KEYWORDS = [
  ['Science Fiction',    ['science fiction', 'sci-fi', 'space opera', 'cyberpunk', 'dystopian']],
  ['Fantasy',            ['fantasy', 'magic', 'dragons', 'wizards', 'sword and sorcery']],
  ['Horror',             ['horror', 'supernatural fiction', 'ghost stories']],
  ['Mystery',            ['mystery', 'detective', 'whodunit', 'noir']],
  ['Thriller',           ['thriller', 'suspense', 'espionage', 'spy']],
  ['Crime',              ['crime', 'murder', 'heist', 'true crime']],
  ['Historical Fiction', ['historical fiction', 'historical novel']],
  ['Literary Fiction',   ['literary fiction', 'psychological fiction']],
  ['Biography',          ['biography', 'autobiography', 'memoir', 'personal memoirs']],
  ['History',            ['history', 'world war', 'civil war', 'military history']],
  ['Science',            ['science', 'natural history', 'evolution', 'physics', 'biology']],
  ['Adventure',          ['adventure', 'survival', 'exploration']],
  ['Western',            ['western stories', 'frontier']],
  ['Romance',            ['romance', 'love stories']],
  ['Classic',            ['classics', '19th century fiction', 'victorian']],
]

export function deriveGenre(subjects) {
  const lower = subjects.map(s => s.toLowerCase())
  for (const [genre, keywords] of GENRE_KEYWORDS) {
    if (keywords.some(k => lower.some(s => s.includes(k)))) return genre
  }
  return null
}

export function deriveFiction(subjects) {
  const lower = subjects.join(' ').toLowerCase()
  if (/\bnonfiction\b|non-fiction|biography|autobiography|memoir|history|true crime|science|essays/.test(lower)) return false
  if (/\bfiction\b|novel|stories/.test(lower)) return true
  return null
}

export async function fetchSummaryFromGoogleBooks(title, authorLast) {
  try {
    const q = encodeURIComponent(`intitle:"${title}"${authorLast ? `+inauthor:${authorLast}` : ''}`)
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&langRestrict=en`)
    if (!res.ok) return null
    const data = await res.json()
    const item = (data.items || []).find(i => (i.volumeInfo?.description?.length || 0) > 60)
    const desc = item?.volumeInfo?.description
    if (!desc) return null
    return desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 800)
  } catch { return null }
}
